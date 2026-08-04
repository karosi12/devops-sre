# Infrastructure as Code - EKS and RDS in Secure Subnets

This document explains how to create an EKS cluster and RDS database in a secure private subnet without internet access using Pulumi Python, following the TypeScript modular approach.

## Architecture Overview

The infrastructure follows a standard VPC pattern with public and private subnets:

```
VPC (10.0.0.0/16)
├── Public Subnet (10.0.1.0/24)
│   ├── Internet Gateway
│   ├── Public Route Table (0.0.0.0/0 -> IGW)
│   └── Route Table Association
└── Private Subnet (10.0.2.0/24)
    ├── EKS Cluster (Private Endpoint)
    ├── RDS PostgreSQL Database
    ├── EKS Security Group (HTTPS:443, SSH:22)
    └── RDS Security Group (PostgreSQL:5432)
```

## Key Components

### 1. VPC (`aws.ec2.Vpc`)
- CIDR: `10.0.0.0/16`
- Tagged with environment for identification

### 2. Public Subnet (`aws.ec2.Subnet`)
- CIDR: `10.0.1.0/24`
- AZ: `us-east-1a`
- `map_public_ip_on_launch = true` for internet access
- Associated with public route table

### 3. Internet Gateway & Route Table
- Internet Gateway attached to VPC
- Public route table with default route `0.0.0.0/0` via IGW
- Route table associated with public subnet

### 4. Private Subnet (`aws.ec2.Subnet`)
- CIDR: `10.0.2.0/24`
- AZ: `us-east-1a`
- No public IP mapping (no internet access)
- Used for both EKS and RDS

### 5. Security Groups
- **EKS SG**: Allows HTTPS (443) from anywhere and SSH (22) from VPC CIDR
- **RDS SG**: Allows PostgreSQL (5432) from VPC CIDR (10.0.0.0/16)
- Both have unrestricted egress

### 6. EKS Cluster (`aws.eks.Cluster`)
- Version: `1.27`
- Private endpoint only (`endpoint_private_access = true`, `endpoint_public_access = false`)
- Uses private subnet and EKS security group
- Requires IAM role ARN from config

### 7. RDS Database (`aws.rds.DatabaseInstance`)
- Engine: PostgreSQL 15.5
- Instance class: `db.t3.micro`
- Storage: 20 GB
- `publicly_accessible = false` (critical for security)
- Uses private subnet via DB subnet group
- Uses RDS security group
- Credentials from Pulumi config

## Configuration

Required Pulumi config values:
```bash
pulumi config set environment dev
pulumi config set eks_role_arn arn:aws:iam::123456789012:role/eks-role
pulumi config set rds_username admin
pulumi config set rds_password --secret "securePassword4321!"
```

## Exports (Following TypeScript Style)

```python
pulumi.export('vpc_id', vpc.id)
pulumi.export('private_subnet_id', private_subnet.id)
pulumi.export('eks_cluster_name', eks_cluster.name)
pulumi.export('database_endpoint', rds_instance.endpoint)
pulumi.export('database_port', rds_instance.port)
pulumi.export('database_address', rds_instance.address)
```

## Security Features

1. **No Internet Access for Private Resources**: Private subnet has no NAT Gateway or route to IGW
2. **Private EKS Endpoint**: Kubernetes API only accessible within VPC
3. **RDS Not Publicly Accessible**: Database cannot be reached from internet
4. **Least Privilege Security Groups**: Only required ports open from specific CIDR blocks
5. **Secrets Management**: Database password stored as Pulumi secret

## Deployment

```bash
cd 04-pulumi-py
pulumi up
```

## Cleanup

```bash
pulumi destroy
```