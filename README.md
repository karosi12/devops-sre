# DevOps Learning Monorepo

A comprehensive DevOps curriculum for engineers covering infrastructure as code, containers, orchestration, CI/CD, monitoring, and backend development.

## Quick Navigation

| Module | Description |
|--------|-------------|
| [01-docker](01-docker/) | Container fundamentals with Docker |
| [02-kubernetes](02-kubernetes/) | K8s orchestration & KCNA prep |
| [03-terraform](03-terraform/) | Terraform IaC for AWS |
| [04-pulumi](04-pulumi/) | Pulumi TypeScript IaC |
| [05-cicd](05-cicd/) | CI/CD pipelines |
| [06-monitoring](06-monitoring/) | Observability stack |
| [07-ansible](07-ansible/) | Configuration management |
| [08-backend](08-backend/) | Backend services |

---

## Module Overview

### [01 - Docker](01-docker/)
**Purpose:** Learn containerization fundamentals

Containerize applications using Docker. Build images, manage networks/volumes, and orchestrate multi-container apps with docker-compose.

**Topics:** Dockerfile syntax, multi-stage builds, Docker networking, volumes, docker-compose

**Start:** [README](01-docker/README.md)

---

### [02 - Kubernetes](02-kubernetes/)
**Purpose:** Container orchestration and KCNA certification prep

Deploy, scale, and manage containerized applications in production using Kubernetes.

**Topics:** Pods, Deployments, Services, ConfigMaps, Secrets, Ingress, Helm

**Start:** [README](02-kubernetes/README.md)

---

### [03 - Terraform](03-terraform/)
**Purpose:** Infrastructure as Code with Terraform

Provision and manage cloud infrastructure on AWS using declarative Terraform configurations.

**Projects:**
- `ec2/` - Single EC2 instance provisioning
- `vpc/` - VPC with public/private subnets
- `ecs/` - Container orchestration with ECS Fargate
- `rds/` - Managed PostgreSQL databases
- `lambda/` - Serverless function deployment
- `elasticache/` - Redis cache clusters
- `message_broker/` - SQS/SNS messaging

**Start:** [README](03-terraform/README.md)

---

### [04 - Pulumi](04-pulumi/)
**Purpose:** Modern IaC with TypeScript

Define cloud infrastructure using familiar programming languages with Pulumi's TypeScript SDK.

**Topics:** Pulumi components, AWS resources, stack configurations, state management

**Start:** [README](04-pulumi/README.md)

---

### [05 - CI/CD](05-cicd/)
**Purpose:** Automate your deployment pipeline

Build continuous integration and continuous deployment pipelines using industry-standard tools.

**Structure:**
- `jenkins/` - Jenkins server setup and pipeline examples
  - `base/` - Basic Jenkins Docker setup
  - `abstract/` - Pipeline templates
- `github-actions/` - GitHub Actions workflows
  - `github/` - Dev/staging/prod workflows
  - `self-hosted/` - Self-hosted runner configuration

**Start:** [README](05-cicd/README.md)

---

### [06 - Monitoring](06-monitoring/)
**Purpose:** Observability and incident response

Implement full-stack observability: metrics, logs, and distributed tracing.

**Tools:** Prometheus, Grafana, Loki, Promtail, Tempo, Jaeger, Alertmanager

**Structure:**
- `prometheus/` - Metrics collection and exporters
- `grafana-stack/` - Dashboard templates
- `loki/` - Log aggregation
- `promtail/` - Log shipping
- `tempo/` - Distributed tracing backend
- `otel/` - OpenTelemetry configuration

**Start:** [README](06-monitoring/README.md)

---

### [07 - Ansible](07-ansible/)
**Purpose:** Configuration management and automation

Automate server configuration, deployment, and infrastructure management with Ansible.

**Topics:** Playbooks, roles, inventory, templates, handlers

**Start:** [README](07-ansible/README.md)

---

### [08 - Backend](08-backend/)
**Purpose:** Backend services for full-stack DevOps

Production-ready backend APIs in multiple languages, containerized and CI/CD integrated.

**[Node.js/Express](08-backend/nodejs-express/)** - TypeScript REST API
- Express.js with TypeScript
- PostgreSQL integration
- Jest testing
- Docker & Jenkins CI/CD

**[Python/FastAPI](08-backend/python-fastapi/)** - Async Python API
- FastAPI with Pydantic
- SQLAlchemy ORM
- Prometheus metrics
- OpenTelemetry tracing

**Start:** [README](08-backend/README.md)

---

## Learning Paths

### Path 1: DevOps Engineer
```
01-docker → 02-kubernetes → 05-cicd → 06-monitoring
```

### Path 2: Infrastructure Engineer
```
03-terraform → 04-pulumi → 05-cicd
```

### Path 3: Platform Engineer
```
01-docker → 02-kubernetes → 03-terraform → 04-pulumi → 05-cicd → 06-monitoring
```

### Path 4: Full-Stack DevOps
```
08-backend/nodejs-express or 08-backend/python-fastapi
→ 01-docker → 05-cicd → 06-monitoring
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | Latest | Containerization |
| Docker Compose | Latest | Multi-container apps |
| AWS CLI | v2 | AWS cloud access |
| Terraform | >= 1.0 | IaC provisioning |
| Pulumi | Latest | Modern IaC |
| kubectl | Latest | Kubernetes management |
| Node.js | >= 18 | Backend development |
| Python | >= 3.10 | Backend development |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/karosi12/devops.git
cd devops

# Choose your learning path
cd 01-docker

# Follow the module README
cat README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
