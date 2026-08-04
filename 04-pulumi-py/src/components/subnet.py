"""Subnet component for Pulumi Python"""

import pulumi
import pulumi_aws as aws
from typing import Dict

class Subnet:
    def __init__(self, env: str, vpc_id: pulumi.Output, cidr: str,
                 availability_zone: str, map_public_ip: bool = False,
                 tier: str = "private"):
        self.env = env
        self.subnet = aws.ec2.Subnet(
            f"{env}-{tier}-subnet",
            vpc_id=vpc_id,
            cidr_block=cidr,
            availability_zone=availability_zone,
            map_public_ip_on_launch=map_public_ip,
            tags={"Environment": env, "Tier": tier},
        )
        self.id = self.subnet.id
        self.outputs: Dict[str, pulumi.Output] = {
            "id": self.subnet.id,
            "cidr_block": self.subnet.cidr_block,
            "availability_zone": self.subnet.availability_zone,
        }