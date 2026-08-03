#!/usr/bin/env groovy

def buildDockerImage() {
    echo "Building Docker image ${env.DOCKER_REGISTRY_URL}/${env.IMAGE_REPOSITORY}:${env.IMAGE_TAG}..."
    sh 'docker build -t $DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG .'
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
    echo "Deploying to ${targetEnv} environment..."
    deployImage()
}

def deployImage() {
    echo 'Deploying...'
    sshagent(credentials: ['ec2-ssh-key']) {
        sh '''
            ssh -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST bash -s <<'REMOTE_CMDS'
docker pull $DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true
docker run -d --name $CONTAINER_NAME -p $HOST_PORT:$CONTAINER_PORT $DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$IMAGE_TAG
REMOTE_CMDS
        '''
    }
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