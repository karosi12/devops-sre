"""VPC component for Pulumi Python"""

import pulumi
import pulumi_aws as aws
from typing import Dict
from src.components.subnet import Subnet

class VPC:
    def __init__(self, env: str, cidr: str = "10.0.0.0/16"):
        self.env = env
        self.vpc = aws.ec2.Vpc(
            f"{env}-vpc",
            cidr_block=cidr,
            tags={"Environment": env},
        )
        # Use Subnet component for public and private subnets
        self.public_subnet = Subnet(
            env, self.vpc.id, "10.0.1.0/24", "us-east-1a",
            map_public_ip=True, tier="public"
        )
        self.private_subnet = Subnet(
            env, self.vpc.id, "10.0.2.0/24", "us-east-1a",
            map_public_ip=False, tier="private"
        )
        self.igw = aws.ec2.InternetGateway(
            f"{env}-igw",
            vpc_id=self.vpc.id,
            tags={"Environment": env, "Tier": "public"},
        )
        self.public_rt = aws.ec2.RouteTable(
            f"{env}-public-rt",
            vpc_id=self.vpc.id,
            tags={"Environment": env, "Tier": "public"},
        )
        aws.ec2.Route(
            f"{env}-public-rt-default",
            route_table_id=self.public_rt.id,
            destination_cidr_block="0.0.0.0/0",
            gateway_id=self.igw.id,
        )
        aws.ec2.RouteTableAssociation(
            f"{env}-public-rt-assoc",
            subnet_id=self.public_subnet.outputs["id"],
            route_table_id=self.public_rt.id,
        )
        self.vpc_id = self.vpc.id
        self.public_subnet_id = self.public_subnet.outputs["id"]
        self.private_subnet_id = self.private_subnet.outputs["id"]
        self.outputs: Dict[str, pulumi.Output] = {
            "vpc_id": self.vpc.id,
            "public_subnet_id": self.public_subnet.outputs["id"],
            "private_subnet_id": self.private_subnet.outputs["id"],
        }