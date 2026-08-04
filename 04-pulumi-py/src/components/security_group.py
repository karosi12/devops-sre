"""Security group component for Pulumi Python"""

import pulumi
import pulumi_aws as aws
from typing import Dict

class SecurityGroups:
    def __init__(self, env: str, vpc_id: pulumi.Output):
        self.env = env
        self.eks_sg = aws.ec2.SecurityGroup(
            f"{env}-eks-sg",
            vpc_id=vpc_id,
            description="Allow HTTPS and SSH",
            ingress=[
                {"protocol": "tcp", "from_port": 443, "to_port": 443, "cidr_blocks": ["0.0.0.0/0"]},
                {"protocol": "tcp", "from_port": 22, "to_port": 22, "cidr_blocks": ["10.0.0.0/16"]},
            ],
            egress=[{"protocol": "-1", "from_port": 0, "to_port": 0, "cidr_blocks": ["0.0.0.0/0"]}],
            tags={"Environment": env},
        )
        self.rds_sg = aws.ec2.SecurityGroup(
            f"{env}-rds-sg",
            vpc_id=vpc_id,
            description="Allow PostgreSQL",
            ingress=[
                {"protocol": "tcp", "from_port": 5432, "to_port": 5432, "cidr_blocks": ["10.0.0.0/16"]},
            ],
            egress=[{"protocol": "-1", "from_port": 0, "to_port": 0, "cidr_blocks": ["0.0.0.0/0"]}],
            tags={"Environment": env},
        )
        self.eks_sg_id = self.eks_sg.id
        self.rds_sg_id = self.rds_sg.id
        self.outputs: Dict[str, pulumi.Output] = {
            "eks_sg_id": self.eks_sg.id,
            "rds_sg_id": self.rds_sg.id,
        }