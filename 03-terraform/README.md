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

## terraform.tfvars for each module
Create a `terraform.tfvars` file in each module folder and add the values below.

> Replace the placeholder values with your own AWS IDs, subnet IDs, and credentials. Do not commit real secrets.

### `03-terraform/ec2/terraform.tfvars`
```hcl
vpc_name            = "dev-vpc"
region              = "us-east-1"
access_key          = "YOUR_AWS_ACCESS_KEY_ID"
secret_key          = "YOUR_AWS_SECRET_ACCESS_KEY"
cidr_block          = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"
availability_zone  = "us-east-1a"
environment         = "dev"
instance_name       = "dev-ec2"
```

### `03-terraform/elasticache/terraform.tfvars`
```hcl
vpc_id        = "vpc-xxxxxxxx"
vpc_cidr      = "10.0.0.0/16"
private_subnets = ["subnet-aaaaaaaa", "subnet-bbbbbbbb"]
cluster_id    = "dev-redis-cluster"
environment   = "dev"
```

### `03-terraform/message_broker/terraform.tfvars`
```hcl
broker_name        = "dev-msk-broker"
engine_version     = "3.7.0"
host_instance_type = "kafka.m5.large"
broker_nodes       = 2
subnet_ids         = ["subnet-aaaaaaaa", "subnet-bbbbbbbb"]
vpc_id             = "vpc-xxxxxxxx"
ecs_tasks_sg_id    = "sg-xxxxxxxx"
environment         = "dev"
```

### `03-terraform/rds/terraform.tfvars`
```hcl
vpc_id                  = "vpc-xxxxxxxx"
vpc_cidr                = "10.0.0.0/16"
proxy_name              = "dev-rds-proxy"
private_subnets         = ["subnet-aaaaaaaa", "subnet-bbbbbbbb"]
cluster_identifier      = "dev-db-cluster"
master_username         = "adminuser"
master_password         = "ChangeMe123!"
database_name           = "appdb"
rds_proxy_secret_name  = "dev-rds-proxy-secret"
environment             = "dev"
```

## Exercises
1. Create a VPC with public and private subnets
2. Deploy a containerized app to ECS
3. Set up an RDS instance with read replicas
