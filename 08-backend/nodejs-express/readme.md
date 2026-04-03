## Backend service

A simple a API CRUD

## Installation

First install [Node.js](http://nodejs.org/)

clone the repository then cd into the project folder run

`npm install` Install dependencies

`npm run dev` To run in dev environment

`npm run start` To run in production environment

`npm run test` For unit and integration test

`npm run test:unit` For unit test

`npm run test:integration` For integration test

`npm run format` For formatting code

`npm run lint` For linting code

Add/Update env.sample for new env key-value

Note: Copy the sample.env file then create an .env file in the root directory of the project and paste the keys then add the values.

## Jenkins CI/CD Pipeline for Nodejs Backend

This repository contains a **Jenkins declarative pipeline** that automates the build, test, security scanning, and deployment of the **Nodejs Backend Service**.

The pipeline ensures code quality, security, and consistent deployments using Docker and GitHub Container Registry (GHCR).

---

## Pipeline Overview

The pipeline consists of several well-defined stages to handle the complete CI/CD lifecycle:

| Stage | Description |
|--------|-------------|
| **Init** | Starts the build process and initializes environment variables. |
| **Clone Repo** | Authenticates with GitHub using stored credentials and clones the `main` branch of the `nodejs` repository. Installs dependencies via `npm ci`. |
| **Format Codebase** | Runs Prettier (or configured formatter) to ensure code formatting consistency across the project. |
| **Lint Codebase** | Executes ESLint to enforce coding standards and detect code issues. |
| **Integration Test** | Runs integration test suites defined in `npm run test:integration`. Ensures all service components interact correctly. |
| **Unit Test** | Runs unit tests defined in `npm run test:unit`. Validates individual functions and modules. |
| **Build Docker Image** | Builds the backend Docker image (`crud:latest`) using the project’s `Dockerfile`. |
| **Security Scan - Trivy** | Scans the built image with [Trivy](https://github.com/aquasecurity/trivy) for vulnerabilities. The build **fails if CRITICAL issues are found**. |
| **Push Docker Image to GHCR** | Tags and pushes the successfully built image to **GitHub Container Registry** (`ghcr.io/karosi12/nodejs:<commit_sha>`). |
| **Cleanup** | Removes temporary files, cloned repositories, and local Docker images to free up space on the Jenkins agent. |

---

## Environment Variables

| Variable | Description |
|-----------|-------------|
| `GIT_BRANCH` | Git branch to clone (default: `main`) |
| `TRIVY_DISABLE_VEX_NOTICE` | Disables Trivy vulnerability exceptions notice |
| `GITHUB_TOKEN` | GitHub Personal Access Token (stored as Jenkins credential `GHP_TOKEN`) |

---

## Jenkins Credentials

| ID | Type | Used For |
|----|------|-----------|
| `github-pat` | Username + Password | GitHub repository access for cloning |
| `GHP_TOKEN` | Secret Text | GitHub token for pushing Docker images to GHCR |

---

## Running the Pipeline

### Option 1: Run Manually in Jenkins UI
1. Open Jenkins Dashboard.
2. Select the pipeline job (e.g., `nodejs-pipeline`).
3. Click **Build Now**.
4. Monitor progress in the console output.

### Option 2: Run via Jenkinsfile
Ensure your Jenkinsfile is in the repository root, then trigger:
```bash
git push origin main
```

## To run the jenkins server as a docker container - optional
Here is a gitgist to pull and run the docker image
[jenkins-tf-docker-aws.sh](https://gist.github.com/karosi12/77ae16b257a726981caa55e3d999d354)
