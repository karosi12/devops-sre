FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        git \
        ca-certificates \
        gnupg \
        unzip \
        python3 \
        python3-venv \
        python3-pip \
        gosu \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI (official repo — "docker-cli" is not a valid apt package)
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# AWS CLI (PEP 668 compliant)
RUN python3 -m venv /opt/awscli-venv && \
    /opt/awscli-venv/bin/pip install --no-cache-dir awscli

ENV PATH="/opt/awscli-venv/bin:$PATH"

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

USER jenkins