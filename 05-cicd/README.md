# 05 - CI/CD

Examples for continuous integration, container-image publishing, and application or infrastructure deployment with Jenkins and GitHub Actions.

## What is included

| Area | Contents | Start here |
| --- | --- | --- |
| Jenkins | A custom Jenkins controller image, a Docker launcher, a branch-aware declarative pipeline, and shared Groovy deployment helpers. The pipeline builds an image, publishes it to a registry, deploys it over SSH, and notifies Slack. | [Jenkins guide](jenkins/Readme.md) |
| GitHub Actions | Templates for EC2, ECS, EKS, multi-registry Node/Flask builds, and reusable Pulumi workflows for Python and Node.js. | [GitHub Actions guide](github-actions/github/Readme.md) |
| Self-hosted runner | A starter workflow that targets a runner with the `self-hosted` and `build` labels. | `github-actions/self-hosted/self-host-runner.yml` |

## Structure

```text
05-cicd/
├── README.md
├── jenkins/
│   ├── Dockerfile                 # Jenkins LTS image with Docker, AWS CLI, and Node.js
│   ├── jenkins-docker-aws.sh      # Builds and starts the Jenkins controller
│   ├── Jenkins                    # Declarative pipeline template (copy as Jenkinsfile)
│   ├── script.groovy              # Pipeline helper functions
│   └── Readme.md                  # Jenkins setup and pipeline guide
└── github-actions/
    ├── github/                    # GitHub-hosted-runner workflow templates and guide
    └── self-hosted/               # Self-hosted-runner starter workflow
```

## Quick start

### Jenkins

1. Read the [Jenkins guide](jenkins/Readme.md) for the required plugins, credentials, and application environment files.
2. From `05-cicd/jenkins`, run `chmod +x jenkins-docker-aws.sh` and `./jenkins-docker-aws.sh` on a secured Linux host with Docker.
3. Copy `Jenkins` to an application repository as `Jenkinsfile`, add `script.groovy`, and create `dev.env`, `staging.env`, and `prod.env` with deployment settings.

The Jenkins pipeline deploys `dev` and `staging` automatically; deployments from `main` require manual approval before targeting production.

### GitHub Actions

1. Choose one workflow template from `github-actions/github/` for the deployment target.
2. Copy it to the application or infrastructure repository’s `.github/workflows/` directory.
3. Replace every placeholder and configure its required GitHub secrets, repository variables, AWS IAM permissions, and target infrastructure.
4. Follow the [GitHub Actions guide](github-actions/github/Readme.md) for the complete workflow-by-workflow instructions and known template fixes.

For AWS deployments, use GitHub OIDC with a least-privilege IAM role instead of long-lived access keys wherever possible. Protect production branches and GitHub Environments with required reviewers.

## Exercises

1. Configure the Jenkins example for a Dockerized Node.js or Python application and deploy it to a non-production host.
2. Adapt `dev-ecs.yaml` or `dev-k8s.yaml` to deploy a SHA-tagged image to an existing AWS service.
3. Configure a reusable Pulumi workflow for separate development, staging, and production stacks.
4. Register a self-hosted GitHub runner with the `build` label and complete the starter workflow.
