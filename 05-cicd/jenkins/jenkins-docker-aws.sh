#!/bin/bash

docker build --no-cache -t jenkins-with-awscli .
docker rm -f jenkins || true

# Get the Docker socket group ID from host
DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)

# Run the Jenkins container with correct group access
docker run -d \
  --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v /opt/jenkins:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --group-add $DOCKER_GID \
  jenkins-with-awscli
