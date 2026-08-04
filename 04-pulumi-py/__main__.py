"""Updated Pulumi Python program using components"""

import pulumi
from src.components.vpc import VPC
from src.components.security_group import SecurityGroups
from src.resources.eks import EKSCluster
from src.resources.rds import RDSInstance
from src.components.iam import IAMRoles

config = pulumi.Config()
environment = config.get("environment") or "dev"

# Create IAM roles using components
iam_roles = IAMRoles(environment)

# Create EKS role using a policy ARN that's required (e.g., for EKS cluster)
eks_assume_role_policy = """{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"Service": "eks.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }
    ]
}"""

eks_role = iam_roles.create_role(
    name="eks-role",
    assume_role_policy_json=eks_assume_role_policy
)

# Attach the EKS cluster policy to the role
# This assumes we have a policy ARN that allows EKS to use the role
eks_role_policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
eks_role_attachment = iam_roles.attach_policy_to_role(
    role=eks_role,
    policy_arn=eks_role_policy_arn,
    name="eks-eks-corr-policy"
)

# Create components with configuration
vpc = VPC(environment)
security_groups = SecurityGroups(environment, vpc.vpc_id)

# Create resources using component outputs
eks_cluster = EKSCluster(
    environment,
    vpc.vpc_id,
    vpc.private_subnet_id,
    security_groups.eks_sg_id,
    eks_role.name  # Using role name instead of ARN from config
)

rds_instance = RDSInstance(
    environment,
    vpc.private_subnet_id,
    security_groups.rds_sg_id,
    "mydatabase",
    config.require("rds_username"),
    config.require("rds_password")
)

# Export outputs
pulumi.export('vpc_id', vpc.outputs["vpc_id"])
pulumi.export('private_subnet_id', vpc.outputs["private_subnet_id"])
pulumi.export('eks_cluster_name', eks_cluster.outputs["cluster_name"])
pulumi.export('database_endpoint', rds_instance.outputs["endpoint"])
pulumi.export('database_port', rds_instance.outputs["port"])
pulumi.export('database_address', rds_instance.outputs["address"])

# Export required security group ID from RDS component
pulumi.export('rds_sg_id', security_groups.outputs["rds_sg_id"])

# Export role and attachment information
pulumi.export('eks_role_arn', eks_role.arn)
pulumi.export('eks_role_name', eks_role.name)
pulumi.export('eks_role_policy_arn', eks_role_policy_arn)