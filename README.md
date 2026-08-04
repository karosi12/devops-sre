# Cloud-Native Engineering Learning Lab

An applied DevOps learning workspace for building, shipping, operating, and observing cloud-native services. The repository progresses from containers and Kubernetes to infrastructure as code, delivery automation, observability, configuration management, backend services, data, and serverless patterns.

It is designed for hands-on study: each numbered directory is an independent module with examples that can be adapted to a sandbox AWS account, local Docker environment, or Kubernetes cluster.

> **Cloud-cost and security notice:** Infrastructure examples can create billable AWS resources. Review every plan before applying it, use a non-production account, scope IAM permissions tightly, and destroy resources when finished. Never commit credentials, tokens, passwords, state files containing secrets, or environment files.

## Repository map

| Module | Focus | Key material | Start here |
| --- | --- | --- | --- |
| [01-docker](01-docker/) | Container fundamentals | Dockerfiles, multi-stage builds, networks, volumes, Compose | [Module guide](01-docker/README.md) |
| [02-kubernetes](02-kubernetes/) | Container orchestration | Manifests, workloads, services, storage, ingress, Helm | [Module guide](02-kubernetes/README.md) |
| [03-terraform](03-terraform/) | Declarative AWS IaC | EC2, VPC, ECS, RDS, Lambda, ElastiCache, messaging | [Module guide](03-terraform/README.md) |
| [04-pulumi-ts](04-pulumi-ts/) | Programmatic AWS IaC (TypeScript) | TypeScript components, resources, stacks, shared config | [Module guide](04-pulumi-ts/README.md) |
| [04-pulumi-py](04-pulumi-py/) | Programmatic AWS IaC (Python) | Component-based VPC, EKS, and RDS with IAM roles | [Module guide](04-pulumi-py/README.md) |
| [05-cicd](05-cicd/) | Continuous delivery | Jenkins, GitHub Actions, deployment templates, runners | [Module guide](05-cicd/README.md) |
| [06-monitoring](06-monitoring/) | Observability | Prometheus, Grafana, Loki, Tempo, OpenTelemetry, Alertmanager | [Stack configuration](06-monitoring/docker-compose.yaml) |
| [07-ansible](07-ansible/) | Configuration automation | Inventory, playbooks, roles, templates, handlers | [Module guide](07-ansible/README.md) |
| [08-backend](08-backend/) | Deployable services | Node/Express and Python/FastAPI APIs | [Module guide](08-backend/README.md) |
| [09-database](09-database/) | Data-layer learning | SQL and NoSQL notes and exercises | [SQL notes](09-database/sql/note.md) |
| [10-serverless](10-serverless/) | Event-driven/serverless patterns | Serverless learning assets | [Module folder](10-serverless/) |

`08-frontend/` is a reserved area for future frontend material. Both Python Pulumi implementation (`04-pulumi-py/`) and TypeScript Pulumi implementation (`04-pulumi-ts/`) are now available.

## What you will practice

```text
Application code
  └─> Docker image
       └─> CI validation and registry publication
            └─> Kubernetes / ECS / serverless deployment
                 └─> Metrics, logs, traces, alerts

Infrastructure as code (Terraform or Pulumi)
  └─> Network, identity, compute, data, and messaging foundations
       └─> Versioned review, plan/preview, controlled apply, teardown
```

The modules are intentionally complementary. Docker and backend examples provide deployable workloads; Terraform and Pulumi provision the platform; CI/CD automates the path to an environment; monitoring closes the feedback loop; and Ansible supports host-level configuration where it is still required.

## Recommended learning paths

### Core DevOps path

```text
01 Docker → 02 Kubernetes → 05 CI/CD → 06 Monitoring → 07 Ansible
```

Use this path to learn how an application moves from a container image to a deployed, observable service.

### Cloud infrastructure path

```text
03 Terraform → 04 Pulumi TypeScript → 05 CI/CD → 06 Monitoring
```

Start with Terraform’s declarative workflow, then implement reusable platform components in Pulumi. Treat them as alternative IaC approaches for the same class of problem—not tools that should manage the same resources simultaneously.

### Platform Engineer path

```text
01 Docker → 02 Kubernetes → 03 Terraform or 04 Pulumi TypeScript
→ 05 CI/CD → 06 Monitoring → 07 Ansible
```

Follow this path to build a self-service platform foundation: standardized workloads, reusable infrastructure, automated delivery, observability, and host configuration where needed.

### Full-stack platform path

```text
08 Backend → 01 Docker → 03 Terraform or 04 Pulumi → 02 Kubernetes
→ 05 CI/CD → 06 Monitoring → 09 Database → 10 Serverless
```

This sequence is useful for building an end-to-end portfolio project: an API, its image, its infrastructure, delivery pipeline, observability, and supporting data/event capabilities.

## Prerequisites

Install only the tools needed for the module you are currently running.

| Tool | Typical use |
| --- | --- |
| Git | Clone, branch, and review changes |
| Docker Engine and Docker Compose plugin | Local images and multi-container stacks |
| Node.js 18+ and npm | Pulumi TypeScript and Node backend projects |
| Python 3.10+ and pip | FastAPI and Python tooling |
| kubectl and a local or managed Kubernetes cluster | Kubernetes manifests and Helm exercises |
| Helm | Kubernetes package-management exercises |
| Terraform 1.x | Terraform modules |
| Pulumi CLI | Pulumi stack preview and deployment |
| AWS CLI v2 | AWS identity verification and service access |
| Ansible | Configuration-management exercises |

For AWS work, authenticate through a named profile, IAM Identity Center, or a short-lived role. Before running an IaC command, verify which account is active:

```bash
aws sts get-caller-identity
```

## Quick start

```bash
git clone https://github.com/karosi12/devops.git
cd devops

# Begin with a local, low-risk module.
cd 01-docker
```

Read the selected module README before executing its examples. For a practical first workflow, choose an API in `08-backend/`, build it with Docker, then use the CI/CD and monitoring modules to understand its operational lifecycle.

## Common workflows

### Local containers

```bash
cd 01-docker/docker-compose
docker compose up --build
docker compose down
```

Use `docker compose config` first to inspect the resolved configuration. Use `docker compose down -v` only when you intentionally want to delete local volumes and their data.

### Kubernetes manifests

```bash
cd 02-kubernetes
kubectl config current-context
kubectl apply -f pvc-pv.yaml
kubectl get pods,svc,pvc
```

Confirm the active context before applying resources. In shared clusters, use a dedicated namespace and label every resource consistently.

### Terraform

```bash
cd 03-terraform/<module>
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Create local `terraform.tfvars` files from the module’s documented inputs; they are deliberately excluded from version control. Review the plan for destructive replacements, public exposure, overly broad security groups, and unexpected costs. When the exercise is complete, run `terraform destroy` only after reviewing its plan.

### Pulumi TypeScript

```bash
cd 04-pulumi-ts
npm ci
pulumi stack select <stack-name>
pulumi preview
pulumi up
```

Keep each environment in a separate stack and configure secrets with `pulumi config set --secret`. Do not place plaintext credentials in source files or stack configuration committed to Git.

### CI/CD templates

The Jenkins and GitHub Actions files are templates, not a turnkey production deployment. Copy a workflow into the target repository, replace placeholders, configure secrets and environment protection rules, and grant only the IAM permissions the deployment requires. Prefer GitHub Actions OIDC to long-lived AWS access keys.

See the [Jenkins guide](05-cicd/jenkins/Readme.md) and [GitHub Actions guide](05-cicd/github-actions/github/Readme.md) for setup details.

### Observability stack

```bash
cd 06-monitoring
docker compose up -d
docker compose ps
docker compose logs -f
```

The stack configuration connects metrics, logs, traces, dashboards, and alerting. Review local `.env` values before startup and treat them as sensitive if they contain credentials. Stop the stack with `docker compose down` when finished.

## Engineering conventions

- Keep secrets out of Git: use `.env` files, secret managers, CI secret stores, and Pulumi encrypted configuration as appropriate.
- Pin meaningful versions for images, actions, providers, and dependencies; avoid relying on floating `latest` tags in deployment workflows.
- Use immutable image tags such as a commit SHA, not only a mutable release tag.
- Validate before deploying: format, lint, test, build, run IaC validation, and inspect plans/previews.
- Separate development, staging, and production by account, stack, namespace, or at minimum explicit configuration boundaries.
- Prefer least-privilege IAM roles, protected branches, required reviews, and environment approvals for production changes.
- Tag cloud resources with owner, service, environment, and cost-center metadata so they can be discovered and cleaned up.
- Make services observable by exposing structured logs, metrics, health checks, and traces before declaring an environment ready.

## Safe cleanup checklist

After completing a cloud exercise:

1. Review and destroy resources with the same IaC tool that created them.
2. Verify no test load balancers, databases, snapshots, elastic IPs, or container registries remain unexpectedly.
3. Revoke temporary credentials and delete local secrets or credentials files that are no longer needed.
4. Check the cloud cost dashboard over the following days for delayed charges.

## Contributing

Contributions should keep examples reproducible and safe to run.

1. Create a focused branch.
2. Add or update the relevant module documentation with prerequisites, inputs, expected outputs, and cleanup steps.
3. Run the appropriate formatter, linter, tests, and IaC validation for the changed module.
4. Do not add real credentials, private endpoints, generated state, or large build artifacts.
5. Open a pull request describing the learning outcome and how you verified the change.

## Further reading in this repository

- [Docker fundamentals](01-docker/README.md)
- [Kubernetes exercises](02-kubernetes/README.md)
- [Terraform AWS modules](03-terraform/README.md)
- [Pulumi platform components](04-pulumi-ts/README.md)
- [CI/CD examples](05-cicd/README.md)
- [Backend services](08-backend/README.md)
