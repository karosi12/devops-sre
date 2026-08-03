# Jenkins CI/CD example

This folder provides a Jenkins controller image and a multibranch pipeline that builds a Docker image, pushes it to a container registry, and deploys it over SSH. Branches map to environments as follows:

| Branch | Target environment | Deployment behavior |
| --- | --- | --- |
| `dev` | `dev` | Builds, pushes, and deploys automatically. |
| `staging` | `staging` | Builds, pushes, and deploys automatically. |
| `main` | `prod` | Builds and pushes, then waits for a manual approval before deployment. |

Other branches still run the build and push stages, but do not load an environment file or deploy. Adjust the pipeline `when` conditions if feature branches must not publish images.

## Files

| File | Purpose |
| --- | --- |
| `Dockerfile` | Builds a Jenkins LTS (JDK 21) controller image with Git, Docker CLI, AWS CLI v2 (in a Python virtual environment), Node.js 20, and common utilities. |
| `jenkins-docker-aws.sh` | Builds the custom controller image and starts Jenkins with persistent data and access to the host Docker daemon. |
| `Jenkins` | Declarative Jenkinsfile for checkout, image build/push, branch-aware deployment, cleanup, and Slack notification. Copy or rename it to `Jenkinsfile` in the application repository. |
| `script.groovy` | Helper functions loaded by the Jenkinsfile: environment-file loading, Docker operations, SSH deployment, cleanup, and Slack notification. Keep it beside the Jenkinsfile in the application repository. |

## Start Jenkins locally or on a Linux host

From this directory, make the launcher executable and run it:

```bash
chmod +x jenkins-docker-aws.sh
./jenkins-docker-aws.sh
```

The script builds `jenkins-with-awscli`, removes an existing container named `jenkins`, then starts a new one with:

- Jenkins UI on port `8080` and inbound-agent port `50000`;
- persistent Jenkins data at `/opt/jenkins` on the host;
- `/var/run/docker.sock` mounted into the controller, so pipeline Docker commands use the host Docker daemon;
- the socket group added to the container, allowing the `jenkins` user to access Docker.

Open `http://<host>:8080` and retrieve the initial password with:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Mounting the Docker socket gives Jenkins high-level control of the host. Use a dedicated, hardened host or a separate build agent for untrusted jobs; do not expose this Jenkins instance publicly without TLS, authentication, firewall rules, and regular updates.

## Jenkins configuration

1. Complete Jenkins setup and create a **Multibranch Pipeline** (recommended) connected to the application repository. Configure branch discovery for `dev`, `staging`, and `main`.
2. Install the required plugins:

   - Pipeline and Pipeline Utility Steps (`readProperties`)
   - Git
   - Credentials Binding
   - SSH Agent
   - Workspace Cleanup
   - Docker Pipeline (recommended for Docker-capable agents)

3. Ensure the Jenkins agent running the job can use `docker`, `ssh`, and `curl`. The supplied controller image includes their clients; production setups should normally run builds on dedicated agents rather than the controller.
4. Add these Jenkins credentials, using the exact IDs referenced by `script.groovy`:

   | Credential ID | Type | Used for |
   | --- | --- | --- |
   | `docker-registry-creds` | Username with password | Logs in to `$DOCKER_REGISTRY_URL` before pushing the image. |
   | `ec2-ssh-key` | SSH Username with private key | Connects to the deployment host. |
   | `slack-webhook` | Secret text | Sends success/failure notifications to Slack. |

## Application repository setup

Copy `Jenkins` to the repository root as `Jenkinsfile`, and copy `script.groovy` to the same root. Add these three Java-properties-style files to the application repository (or change their names in the Jenkinsfile):

- `dev.env`
- `staging.env`
- `prod.env`

Each must provide the values used by the pipeline. Example `dev.env`:

```properties
DOCKER_REGISTRY_URL=registry.example.com
IMAGE_REPOSITORY=my-team/my-app
EC2_HOST=203.0.113.10
EC2_USER=ubuntu
CONTAINER_NAME=my-app-dev
HOST_PORT=80
CONTAINER_PORT=8080
```

Keep non-secret deployment values in these files only if they are appropriate for source control. Put passwords, private keys, and webhooks in Jenkins credentials—not in `.env` files. The deployment host needs Docker installed and its SSH user needs permission to run Docker.

## Pipeline behavior

The pipeline checks out the source, loads `script.groovy`, selects the target environment, reads that environment's properties file, and tags the container image with Jenkins’ `BUILD_NUMBER`. It pushes the image using:

```text
$DOCKER_REGISTRY_URL/$IMAGE_REPOSITORY:$BUILD_NUMBER
```

For a deployment, it SSHs to the configured host, pulls that immutable tag, stops/removes the existing named container, and starts a new one with the configured host/container port mapping. The post section removes local image tags, cleans the workspace, and posts success or failure to Slack.

## Recommended hardening and improvements

- Replace `StrictHostKeyChecking=no` with a managed `known_hosts` file to prevent SSH host impersonation.
- Add a health check and rollback strategy; the current deployment replaces the existing container before verifying the new one is healthy.
- Add `--restart unless-stopped` (and any required environment variables, volumes, or network) to the remote `docker run` command.
- Add pipeline `options { disableConcurrentBuilds() }` or environment-specific locks so an older build cannot deploy after a newer one.
- Restrict which branches may build/push and protect `main` with branch protections and approval rules.
- Run builds on dedicated ephemeral agents and avoid mounting the host Docker socket into the Jenkins controller for production workloads.
