# GitHub Actions workflow examples

This directory contains independent GitHub Actions templates for building a container image, deploying it to AWS, and running Pulumi Infrastructure as Code (IaC). Choose the workflow that matches the deployment target; do not enable multiple deployment templates for the same branch unless that is intentional.

## Before you start

1. Copy a template to `.github/workflows/` in the application or infrastructure repository and give it a meaningful name. For example:

   ```bash
   cp 05-cicd/github-actions/github/dev-ecs.yaml .github/workflows/deploy-dev-ecs.yaml
   ```

2. Replace every `your-*`, `<your-org>`, and `<ACCOUNT_ID>` placeholder. The container workflows expect a `Dockerfile` at the repository root unless you change `file` or the `docker build` command.
3. Create the GitHub Actions environment(s) used for production deployments and configure required reviewers there. This gives production changes an approval gate without storing deployment settings in the workflow.
4. Prefer AWS OIDC over long-lived AWS access keys. The ECR, ECS, EKS, and Pulumi workflows can use `aws-actions/configure-aws-credentials` with an IAM role trusted by GitHub’s OIDC provider. Restrict that role’s trust policy to the repository, branch, or GitHub environment that should deploy.

## Workflow guide

| File | Trigger | Purpose | Required configuration |
| --- | --- | --- | --- |
| `dev-ec2.yaml` | Push to `dev`, manual | Builds an ECR image and replaces a Docker container on an EC2 host. | ECR repository; `CONTAINER_NAME`, ports; AWS and EC2 secrets. |
| `prod.yaml` | Push to `main`, manual | Production counterpart of `dev-ec2.yaml`. | Same as `dev-ec2.yaml`; protect the production environment/branch. |
| `dev-ecs.yaml` | Push to `dev`, manual | Builds an ECR image, renders an ECS task definition, and deploys it to an ECS service. | ECR, cluster, service, task-definition file, and container name; AWS credentials. |
| `dev-k8s.yaml` | Push to `dev`, manual | Builds an ECR image and updates an existing EKS Deployment. | ECR, EKS cluster, namespace, Deployment, and container name; AWS credentials. |
| `ci-cd-stage-nodejs.yaml` | Push to `develop` or `staging`, manual | Runs Node quality checks, then builds and publishes an image to GHCR, Docker Hub, ECR, or all three. | Node scripts, image names, and registry credentials. |
| `ci-cd-stage-flask-api.yaml` | Push/PR to `develop`, `staging`, `main`, manual | Runs Ruff and pytest, then builds and publishes a Flask image. | Python dependency/test tooling, image names, and registry credentials. |
| `ci-cd-ts-py.yaml` | Push to `develop` or `stage`, manual | Runs Node lint/format checks and optionally publishes to GHCR, Docker Hub, and ECR. | Node scripts, valid Docker Hub variables, ECR repository, and registry credentials. |
| `pulumi-python.yaml` | PR to `main`, push to `main` | Calls the reusable Pulumi workflow for a Python IaC project. | A callable reusable workflow, stack name, AWS OIDC role, and Pulumi token. |
| `pulumi-nodejs.yaml` | PR to `main`, push to `main` | Calls the reusable Pulumi workflow for a Node.js IaC project. | Same as the Python caller, with `package.json`/lockfile. |
| `pulumi-reusable.yaml` | `workflow_call` only | Shared Pulumi preview/up implementation used by the caller workflows. | Store it in the repository referenced by the callers and configure OIDC plus `PULUMI_ACCESS_TOKEN`. |

## EC2 workflows: `dev-ec2.yaml` and `prod.yaml`

Set `ECR_REPOSITORY`, `CONTAINER_NAME`, `HOST_PORT`, and `CONTAINER_PORT`. Create these repository secrets:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` (or, preferably, change the workflow to use `AWS_GITHUB_ACTIONS_ROLE_ARN` with OIDC).
- `EC2_HOST`, `EC2_USER`, and `EC2_SSH_KEY`.

The target host must have Docker installed and the EC2 user must be able to run Docker. A push builds an image tagged with the first 12 characters of the commit SHA, pushes it to ECR, pulls that immutable tag on the host, removes the current named container, and starts the replacement. Use `dev-ec2.yaml` for `dev`; use `prod.yaml` for `main` only after adding GitHub environment protection and a health check/rollback strategy.

**Required fix before use:** the SSH script reads `${{ env.IMAGE_URI }}`, but `IMAGE_URI` is written to `GITHUB_ENV` during the preceding step and is not available through the expression context. Export it as a step output from the build step and pass `${{ steps.<build-step-id>.outputs.image_uri }}` to the SSH action (or compute the image URI again inside that script). Apply the same correction to both templates.

## ECS workflow: `dev-ecs.yaml`

Update `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`, `ECS_TASK_DEFINITION`, and `CONTAINER_NAME`. Commit the ECS task definition JSON at the configured path; its container definition name must exactly match `CONTAINER_NAME`.

Add AWS credentials as described above. The workflow serializes development deployments through its `concurrency` group, pushes an immutable SHA tag, updates the task definition image, and waits for the service to stabilize. The IAM principal needs ECR push access plus ECS task-definition registration, service update, and `iam:PassRole` permissions for the task roles.

## EKS workflow: `dev-k8s.yaml`

Update `ECR_REPOSITORY`, `EKS_CLUSTER`, `K8S_NAMESPACE`, `K8S_DEPLOYMENT`, and `K8S_CONTAINER`. The deployment and container must already exist in the cluster. Configure AWS credentials with access to the EKS cluster and ensure the IAM role is authorized by EKS access entries or Kubernetes RBAC.

On a `dev` push, the workflow pushes a SHA-tagged ECR image, runs `kubectl set image`, and waits up to five minutes for the rollout. Add `kubectl rollout undo` or a deployment controller if automatic rollback is required.

## Registry publishing workflows

### `ci-cd-stage-nodejs.yaml`

This template requires `package-lock.json` and these package scripts: `lint`, `format:check`, `test`, and `build`. Set `APP_NAME`, `DOCKERHUB_IMAGE`, `AWS_REGION`, and `ECR_REPOSITORY`. Add `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and `AWS_GITHUB_ACTIONS_ROLE_ARN` secrets as applicable.

The registry is selected automatically: `develop` uses GHCR and `staging` uses Docker Hub. A manual run can choose `ghcr`, `dockerhub`, `ecr`, or `all`. The `environment` input is currently not used; alter the version job if manual runs need to choose the image environment.

**Required fix before use:** define `GHCR_IMAGE` in `env` (for example, `ghcr.io/${{ github.repository }}`), or rename the later `GHCR_IMAGE` references to `REGISTRY_IMAGE`. Without this, a GHCR build creates invalid tags.

### `ci-cd-stage-flask-api.yaml`

This template expects `requirements.txt`, Ruff, pytest, and pytest-cov to be installed (typically through `requirements-dev.txt`). Set `DOCKERHUB_IMAGE`, `AWS_REGION`, and `ECR_REPOSITORY`, then add `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and `AWS_GITHUB_ACTIONS_ROLE_ARN` as needed.

Pull requests run quality checks but also continue to the image-publishing jobs. For secure repositories, make publishing conditional on `github.event_name != 'pull_request'`; otherwise PRs—especially from trusted same-repository branches—may publish images. As with the Node template, the manual `environment` input is not consumed, so branch logic determines the tag environment.

### `ci-cd-ts-py.yaml`

Set `AWS_REGION`, `ECR_REPOSITORY`, and the Docker Hub repository. Add `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and `AWS_ROLE_ARN` secrets. Manual runs expose three checkboxes to select registry targets; pushed commits publish to all three.

**Required fix before use:** correct `DOCKERHUB_REPOSITORY` to use `vars`, not `var`:

```yaml
DOCKERHUB_REPOSITORY: ${{ vars.DOCKERHUB_USERNAME }}/${{ vars.DOCKERHUB_REPOSITORY_NAME }}
```

Or set the full image name directly. Do not place `DOCKERHUB_TOKEN` in top-level `env`; use it only in the Docker login step so it has the narrowest practical scope. This workflow currently only runs Node checks; uncomment and adapt the Python section if it is meant to validate Python too.

## Pulumi workflows

Place `pulumi-reusable.yaml` in the central repository at `.github/workflows/pulumi-reusable.yml` (or change the caller paths to match its actual filename). In `pulumi-python.yaml` or `pulumi-nodejs.yaml`, replace:

- `<your-org>/<central-repo>` with the reusable workflow repository;
- `your-org/your-project/dev` with the target Pulumi stack;
- `arn:aws:iam::<ACCOUNT_ID>:role/pulumi-deploy-role` with the AWS OIDC role ARN.

Set `PULUMI_ACCESS_TOKEN` in the caller repository, or use a Pulumi ESC/environment integration. The reusable workflow installs dependencies in the repository that calls it: Python projects need `requirements.txt`; Node projects need `package.json` and a lockfile compatible with `npm ci`. PRs to `main` run `pulumi preview` and comment on the PR; pushes to `main` run `pulumi up`.

Add `permissions` to each caller workflow as well—at minimum `contents: read` and `id-token: write`, plus `pull-requests: write` when PR comments are desired. A called workflow cannot elevate permissions that its caller did not grant. Also validate `inputs.language` and `inputs.command` in the reusable workflow (or separate preview/up entry points) so only supported values can run.

For production, use separate stacks and roles for development, staging, and production. Gate the `up` job with a GitHub Environment, pin third-party actions to commit SHAs according to your supply-chain policy, and pass an explicit Pulumi CLI version if reproducibility is important.

## Review checklist and recommended improvements

- Add `concurrency` groups to the EC2 and registry workflows so an older run cannot deploy after a newer commit.
- Add GitHub Environments and `environment:` to deployment jobs, especially production, to require approvals and scope secrets.
- Replace AWS access-key authentication in the EC2/ECS/EKS templates with OIDC and least-privilege IAM roles.
- Pin third-party actions to full commit SHAs and enable Dependabot updates for GitHub Actions.
- Build multi-architecture images only when required; otherwise keep `linux/amd64` explicit when the deployment target is x86_64.
- Add an image scan, SBOM/provenance generation, and a post-deployment health check before treating a release as successful.
- Ensure ECR repositories exist before running the EC2 templates; unlike `ci-cd-ts-py.yaml`, they do not create missing repositories.
