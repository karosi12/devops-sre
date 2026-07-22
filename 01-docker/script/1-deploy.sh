#!/bin/bash

# This script automates the process of pulling a Docker image from a registry, backing up the current version, and deploying the new version. It also includes a rollback strategy in case the deployment fails.
#  if the docker image is hosted on ecr use step 1.1, if it is hosted on github container registry use step 1.2, if it is hosted on both use both steps
# Quick note: Make sure to replace the placeholders (e.g., <aws-account-id>, <region>, <repository-name>, <network-name>) with your actual values before running the script.
# Step 1.1: Log in to AWS ECR
aws ecr get-login-password --region us-<region> | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.us-<region>.amazonaws.com

# Step 1.2: Log in to GitHub Container Registry
cat ghp_token | docker login ghcr.io -u karosi12 --password-stdin

# Step 2: Pull the desired version of the Docker image
docker pull <aws-account-id>.dkr.ecr.us-<region>.amazonaws.com/<repository-name>:image-name-service

# Step 3: Back up the current "latest" image (if it exists)
if docker images image-name-service:latest; then
    echo "Backing up the current latest image..."
    docker tag image-name-service:latest image-name-service:backup
fi

# # Step 4: Save the backup image to a tar file
# mkdir -p /home/ubuntu/docker_backups
# docker save -o /home/ubuntu/docker_backups/image-name-service_backup.tar image-name-service:latest

# Step 5: Tag the pulled image as the latest version
docker tag <aws-account-id>.dkr.ecr.us-<region>.amazonaws.com/<repository-name>:image-name-service image-name-service:latest

# Step 6: Remove the old version of the pulled image
docker rmi <aws-account-id>.dkr.ecr.us-<region>.amazonaws.com/<repository-name>:image-name-service

# Step 7: Stop the running container and deploy the new image
if docker ps | grep -q "image-name-service"; then
    echo "Stopping and removing the current container..."
    docker stop image-name-service && docker rm image-name-service
fi

docker run -d --env-file=/home/ubuntu/.config/service-envs/image-name-service/.env \
# Mounting the necessary files for the service
-v /home/ubuntu/.config/mount-file/keyToMount:/usr/src/app/keyToMount \
--name image-name-service --restart=always -p <host-port>:<container-port> \
--health-cmd="wget --spider -q http://localhost:<container-port>/v1/health || exit 1" \
--health-interval=60s \
--health-timeout=30s \
--health-retries=3 \
--health-start-period=10s \
--net=<network-name> --memory=1g --memory-swap=1g --log-opt max-size=50m --log-opt max-file=2 image-name-service

# Step 8: Rollback strategy in case of deployment failure
if [ $? -ne 0 ]; then
    echo "Deployment failed! Rolling back to the backup image..."
    if docker images | grep -q "image-name-service:backup"; then
        docker tag image-name-service:backup image-name-service:latest
        docker compose up -d
        echo "Rollback completed successfully!"
    else
        echo "No backup image found. Unable to rollback!"
    fi
else
    echo "Deployment succeeded!"
fi