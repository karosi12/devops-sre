#!/usr/bin/env groovy

def buildDockerImage() {
    echo "Building Docker image ${env.DOCKER_REGISTRY_URL}/${env.IMAGE_REPOSITORY}:${env.IMAGE_TAG}..."
    sh 'docker build -t $DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG .'
}

def scanFilesystem() {
    echo 'Scanning source code, dependencies, secrets, and IaC with Trivy...'
    sh '''
        docker run --rm \
          -v "$WORKSPACE:/src:ro" \
          -w /src \
          aquasec/trivy:0.67.2 fs \
          --scanners vuln,secret,misconfig \
          --severity HIGH,CRITICAL \
          --ignore-unfixed \
          --exit-code 1 \
          .
    '''
}

def scanDockerImage() {
    echo "Scanning Docker image ${env.DOCKER_REGISTRY_URL}/${env.IMAGE_REPOSITORY}:${env.IMAGE_TAG} with Trivy..."
    sh '''
        docker run --rm \
          -v /var/run/docker.sock:/var/run/docker.sock \
          aquasec/trivy:0.67.2 image \
          --severity HIGH,CRITICAL \
          --ignore-unfixed \
          --exit-code 1 \
          "$DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG"
    '''
}

def loadEnvironmentVariables(String targetEnv) {
    def envFileMap = [
        dev    : env.DEV_ENV_FILE,
        staging: env.STAGING_ENV_FILE,
        prod   : env.PROD_ENV_FILE
    ]
    def envFile = envFileMap[targetEnv]
    if (!envFile) {
        error("Unknown environment: ${targetEnv}")
    }
    def props = readProperties file: envFile
    props.each { key, value ->
        env."${key}" = value
    }
}

def pushDockerImageToContainerRegistry() {
    echo 'Pushing Docker image to container registry...'
    withCredentials([usernamePassword(
        credentialsId: 'docker-registry-creds',
        usernameVariable: 'DOCKER_REGISTRY_USERNAME',
        passwordVariable: 'DOCKER_REGISTRY_PASSWORD'
    )]) {
        sh '''
            echo "$DOCKER_REGISTRY_PASSWORD" | docker login "$DOCKER_REGISTRY_URL" -u "$DOCKER_REGISTRY_USERNAME" --password-stdin
            docker push $DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG
        '''
    }
}

def deployApplication(String targetEnv) {
    def validEnvs = ['dev', 'staging', 'prod']
    if (!validEnvs.contains(targetEnv)) {
        error("Unknown environment: ${targetEnv}")
    }

    // DEPLOY_TARGET is read from the environment-specific .env file. Retain
    // the SSH/EC2 deployment as the default for existing pipeline users.
    def deployTarget = (env.DEPLOY_TARGET ?: 'ec2').trim().toLowerCase()
    echo "Deploying to ${targetEnv} environment via ${deployTarget}..."

    switch (deployTarget) {
        case 'ec2':
            deployImage()
            break
        case 'ecs':
            deployToEcs()
            break
        case 'eks':
            deployToEks(targetEnv)
            break
        default:
            error("Unknown deployment target: ${deployTarget}. Set DEPLOY_TARGET to ec2, ecs, or eks.")
    }
}

def deployImage() {
    echo 'Deploying with health-check verification and rollback...'
    sshagent(credentials: ['ec2-ssh-key']) {
        sh '''
            ssh -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" bash -s -- \
              "$DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG" \
              "$CONTAINER_NAME" \
              "$HOST_PORT" \
              "$CONTAINER_PORT" \
              "${HEALTHCHECK_URL:-}" \
              "${HEALTHCHECK_RETRIES:-}" \
              "${HEALTHCHECK_INTERVAL_SECONDS:-}" \
              "${CONTAINER_ENV_FILE:-}" \
              "${DOCKER_NETWORK:-}" \
              "${DOCKER_VOLUMES:-}" \
              "$IMAGE_TAG" <<'REMOTE_CMDS'
set -eu

image="$1"
container_name="$2"
host_port="$3"
container_port="$4"
healthcheck_url="${5:-http://127.0.0.1:${host_port}/health}"
healthcheck_retries="${6:-12}"
healthcheck_interval="${7:-5}"
container_env_file="${8:-}"
docker_network="${9:-}"
docker_volumes="${10:-}"
build_tag="${11}"
previous_container="${container_name}-previous-${build_tag}"
has_previous=false

rollback() {
    echo "New container failed its health check; rolling back..." >&2
    docker rm -f "$container_name" || true
    if [ "$has_previous" = true ]; then
        docker rename "$previous_container" "$container_name"
        docker start "$container_name"
    fi
}

docker pull "$image"

if docker container inspect "$container_name" >/dev/null 2>&1; then
    docker stop "$container_name" || true
    docker rename "$container_name" "$previous_container"
    has_previous=true
fi

docker_run_args=(
    -d
    --name "$container_name"
    --restart unless-stopped
    -p "$host_port:$container_port"
)

if [ -n "$container_env_file" ]; then
    docker_run_args+=(--env-file "$container_env_file")
fi
if [ -n "$docker_network" ]; then
    docker_run_args+=(--network "$docker_network")
fi
if [ -n "$docker_volumes" ]; then
    IFS=$'\n' read -r -d '' -a volumes <<< "$docker_volumes" || true
    for volume in "${volumes[@]}"; do
        [ -n "$volume" ] && docker_run_args+=(-v "$volume")
    done
fi

if ! docker run "${docker_run_args[@]}" "$image"; then
    rollback
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo 'curl is required on the deployment host to verify the container health.' >&2
    rollback
    exit 1
fi

for attempt in $(seq 1 "$healthcheck_retries"); do
    if curl --fail --silent --show-error --max-time 10 "$healthcheck_url" >/dev/null; then
        docker rm "$previous_container" >/dev/null 2>&1 || true
        echo 'Deployment health check passed.'
        exit 0
    fi
    echo "Health check ${attempt}/${healthcheck_retries} failed; retrying in ${healthcheck_interval}s..." >&2
    sleep "$healthcheck_interval"
done

rollback
exit 1
REMOTE_CMDS
        '''
    }
}

def deployToEcs() {
    echo 'Deploying a new task definition revision to Amazon ECS...'
    sh '''
        set -eu
        : "${AWS_REGION:?Set AWS_REGION in the environment file or Jenkins agent}"
        : "${ECS_CLUSTER:?Set ECS_CLUSTER in the environment file}"
        : "${ECS_SERVICE:?Set ECS_SERVICE in the environment file}"
        : "${ECS_TASK_DEFINITION:?Set ECS_TASK_DEFINITION to a task-definition family or ARN}"
        : "${ECS_CONTAINER_NAME:?Set ECS_CONTAINER_NAME to the task-definition container name}"

        image_uri="$DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG"
        current_task_definition="$WORKSPACE/ecs-task-definition-current.json"
        updated_task_definition="$WORKSPACE/ecs-task-definition-updated.json"

        aws ecs describe-task-definition \
          --task-definition "$ECS_TASK_DEFINITION" \
          --query taskDefinition \
          --output json > "$current_task_definition"

        IMAGE_URI="$image_uri" ECS_CONTAINER_NAME="$ECS_CONTAINER_NAME" \
          python3 - "$current_task_definition" "$updated_task_definition" <<'PYTHON'
import json
import os
import sys

source_path, destination_path = sys.argv[1:]
with open(source_path, encoding='utf-8') as source:
    task_definition = json.load(source)

allowed_fields = (
    'family', 'taskRoleArn', 'executionRoleArn', 'networkMode',
    'containerDefinitions', 'volumes', 'placementConstraints',
    'requiresCompatibilities', 'cpu', 'memory', 'pidMode', 'ipcMode',
    'proxyConfiguration', 'inferenceAccelerators', 'ephemeralStorage',
    'runtimePlatform', 'enableFaultInjection'
)
registration = {
    field: task_definition[field]
    for field in allowed_fields
    if field in task_definition
}

container_name = os.environ['ECS_CONTAINER_NAME']
image_uri = os.environ['IMAGE_URI']
for container in registration['containerDefinitions']:
    if container['name'] == container_name:
        container['image'] = image_uri
        break
else:
    raise SystemExit(f'Container {container_name!r} was not found in the ECS task definition.')

with open(destination_path, 'w', encoding='utf-8') as destination:
    json.dump(registration, destination)
PYTHON

        task_definition_arn=$(aws ecs register-task-definition \
          --cli-input-json "file://$updated_task_definition" \
          --query 'taskDefinition.taskDefinitionArn' \
          --output text)

        aws ecs update-service \
          --cluster "$ECS_CLUSTER" \
          --service "$ECS_SERVICE" \
          --task-definition "$task_definition_arn" \
          --force-new-deployment >/dev/null
        aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE"
    '''
}

def deployToEks(String targetEnv) {
    echo 'Deploying the image to Amazon EKS...'
    sh '''
        set -eu
        : "${AWS_REGION:?Set AWS_REGION in the environment file or Jenkins agent}"
        : "${EKS_CLUSTER:?Set EKS_CLUSTER in the environment file}"
        : "${K8S_NAMESPACE:?Set K8S_NAMESPACE in the environment file}"
        : "${K8S_DEPLOYMENT:?Set K8S_DEPLOYMENT in the environment file}"
        : "${K8S_CONTAINER:?Set K8S_CONTAINER to the Deployment container name}"
        command -v kubectl >/dev/null || {
          echo 'kubectl is required on the Jenkins agent for EKS deployments.' >&2
          exit 1
        }

        export KUBECONFIG="$WORKSPACE/kubeconfig-$TARGET_ENV"
        trap 'rm -f "$KUBECONFIG"' EXIT
        aws eks update-kubeconfig \
          --name "$EKS_CLUSTER" \
          --region "$AWS_REGION" \
          --kubeconfig "$KUBECONFIG"

        kubectl --namespace "$K8S_NAMESPACE" set image \
          "deployment/$K8S_DEPLOYMENT" \
          "$K8S_CONTAINER=$DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG"
        kubectl --namespace "$K8S_NAMESPACE" rollout status \
          "deployment/$K8S_DEPLOYMENT" --timeout=5m
    '''
}

def removeLocalDockerImages() {
    echo 'Removing local Docker images to free agent disk space...'
    sh '''
        docker rmi "$DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG" || true
        docker rmi "$DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:latest" || true
    '''
}

def notifySlack(String status) {
    def emoji = (status == 'success') ? '✅' : '❌'
    def label = (status == 'success') ? 'Build Succeeded' : 'Build Failed'
    def suffix = (status == 'success') ? '' : " — <${env.BUILD_URL}|view log>"

    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_WEBHOOK')]) {
        sh """
            curl -X POST \\
              -H 'Content-type: application/json' \\
              --data '{"text":"${emoji} *${label}*: ${env.IMAGE_REPOSITORY} Service (build #${env.BUILD_NUMBER})${suffix}"}' \\
              "\$SLACK_WEBHOOK"
        """
    }
}

return this
