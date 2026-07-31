# 03 - Terraform

Infrastructure as Code with Terraform on AWS.

## Topics
- EC2 provisioning
- VPC networking
- ECS clusters
- Lambda functions
- RDS databases
- Modules and workspaces

## Projects
- `ec2/` - Single EC2 instance with security groups
- `vpc/` - VPC with public/private subnets
- `ecs/` - Container orchestration with ECS
- `rds/` - Managed database setup
- `lambda/` - Serverless functions
- `elasticache/` - Redis cache cluster
- `message_broker/` - SQS/SNS setup

## Getting Started
```bash
cd 03-terraform/ec2
terraform init
terraform plan
terraform apply
```

## Exercises
1. Create a VPC with public and private subnets
2. Deploy a containerized app to ECS
3. Set up an RDS instance with read replicas
