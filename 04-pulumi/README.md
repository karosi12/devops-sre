# 04 - Pulumi

Modern Infrastructure as Code with TypeScript/Pulumi for platform engineering.

## What this project is for
This Pulumi project is organized as a reusable infrastructure platform for AWS. It helps a platform engineer define, version, and manage cloud resources using TypeScript and Pulumi components instead of hand-built scripts.

## Core responsibilities of the platform
- Provision AWS networking, compute, databases, messaging, and observability services
- Encapsulate infrastructure into reusable components and resources
- Expose output values that can be consumed by application teams or CI/CD pipelines
- Provide a consistent pattern for environments such as dev, staging, and production

## Project structure and how to use it
```text
04-pulumi/
├── index.ts                  # Entry point that exports the main stack outputs
├── package.json              # Node.js dependencies and scripts
├── Pulumi.yaml               # Pulumi project definition
├── src/
│   ├── components/           # Reusable platform components
│   │   ├── 00-ec2-component.ts
│   │   ├── 01-network-component.ts
│   │   ├── 02-database-component.ts
│   │   ├── 03-ecs-component.ts
│   │   ├── 04-bucket-component.ts
│   │   ├── 05-autoscaling-ec2-component.ts
│   │   ├── 06-iam-component.ts
│   │   ├── 07-dynamodb-component.ts
│   │   ├── 08-eventbridge-component.ts
│   │   ├── 09-cloudfront-component.ts
│   │   ├── 10-lambdafunc-component.ts
│   │   ├── 11-message-component.ts
│   │   ├── 12-transfer-family.ts
│   │   ├── 13-k8s-component.ts
│   │   └── 14-kinesis-component.ts
│   ├── resources/           # Low-level resource implementations
│   │   ├── database/
│   │   ├── ec2/
│   │   ├── ecs/
│   │   ├── iam/
│   │   ├── k8s/
│   │   ├── message-broker/
│   │   ├── network/
│   │   └── transfer-family/
│   ├── utils/               # Shared configuration and typing helpers
│   │   ├── config.ts
│   │   └── types/
│   └── tests/               # Test scaffolding for infrastructure logic
```

## How to use this as a platform engineer

### 1. Understand the layers
- `src/components/` is where you assemble platform capabilities into higher-level building blocks.
- `src/resources/` contains the actual Pulumi resource definitions for AWS services.
- `src/utils/` is where shared configuration and types live so you avoid repeating values.
- `index.ts` is the top-level entry point that exposes outputs used by the platform.

### 2. Start from the components
Use the components directory when you want to create a reusable capability for a team. For example:
- `00-ec2-component.ts` for EC2 provisioning
- `01-network-component.ts` for VPC, subnets, and routing
- `02-database-component.ts` for database services
- `03-ecs-component.ts` for ECS clusters and services
- `13-k8s-component.ts` for Kubernetes-related resources

These components are designed to be composed into larger platform patterns rather than written ad hoc each time.

### 3. Extend the platform with resources
When you need to add or refine a specific AWS service, work in `src/resources/`.
Examples:
- `resources/network/` for VPC, subnets, security groups
- `resources/ecs/` for ECS clusters and services
- `resources/database/` for RDS and related services
- `resources/iam/` for policies, roles, and permissions
- `resources/message-broker/` for Kafka, SQS, or SNS patterns

### 4. Keep configuration centralized
Use `src/utils/config.ts` and `src/utils/types/` to manage environment-specific values and shared interfaces. This keeps the infrastructure code readable and consistent across stacks.

### 5. Expose outputs for consumers
The main stack should export meaningful values such as VPC IDs, subnet IDs, ECS service names, and database endpoints. These outputs are important for developers and CI/CD systems that depend on the platform.

## Getting started
```bash
cd 04-pulumi
npm install
pulumi login
pulumi stack init dev
pulumi up
```

## Recommended workflow for a platform engineer
1. Create or update a component in `src/components/`.
2. Implement or refine the underlying resources in `src/resources/`.
3. Add or update the config and typing in `src/utils/`.
4. Export any new outputs from `index.ts`.
5. Preview changes with `pulumi preview`.
6. Deploy with `pulumi up`.
7. Review stack outputs and share them with consuming teams.

## Common commands
```bash
# Install dependencies
npm install

# Preview infrastructure changes
pulumi preview

# Deploy infrastructure
pulumi up

# Destroy a stack if needed
pulumi destroy
```

## Exercises
1. Deploy an EC2 instance using Pulumi components.
2. Create a VPC with reusable network components.
3. Build an ECS cluster with a load balancer.
4. Add a new component for a database or messaging service and wire it into the stack.
