"""EKS cluster resource definition"""

import pulumi
import pulumi_aws as aws
from typing import Dict

class EKSCluster:
    def __init__(self, env: str, vpc_id: pulumi.Output, subnet_id: pulumi.Output,
                 security_group_id: pulumi.Output, role_arn: str):
        self.env = env
        self.cluster = aws.eks.Cluster(
            f"{env}-eks-cluster",
            name=f"{env}-eks-cluster",
            version="1.27",
            role_arn=role_arn,
            vpc_config={
                "subnet_ids": [subnet_id],
                "security_group_ids": [security_group_id],
                "endpoint_private_access": True,
                "endpoint_public_access": False,
            }
        )

    def outputs(self) -> Dict[str, pulumi.Output]:
        return {
            "cluster_name": self.cluster.name,
            "cluster_endpoint": self.cluster.endpoint,
            "cluster_role_arn": self.cluster.role_arn,
        }