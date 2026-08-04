"""RDS database resource definition"""

import pulumi
import pulumi_aws as aws
from typing import Dict

class RDSInstance:
    def __init__(self, env: str, subnet_id: pulumi.Output,
                 security_group_id: pulumi.Output,
                 db_name: str, username: str, password: str):
        self.env = env
        self.subnet_group = aws.rds.SubnetGroup(
            f"{env}-rds-subnet-group",
            subnet_ids=[subnet_id],
            tags={"Environment": env}
        )
        self.instance = aws.rds.DatabaseInstance(
            f"{env}-rds-instance",
            allocated_storage=20,
            engine="postgres",
            engine_version="15.5",
            instance_class="db.t3.micro",
            db_name=db_name,
            username=username,
            password=password,
            db_subnet_group_name=self.subnet_group.name,
            vpc_security_group_ids=[security_group_id],
            publicly_accessible=False,
            skip_final_snapshot=True,
            tags={"Environment": env}
        )

    def outputs(self) -> Dict[str, pulumi.Output]:
        return {
            "endpoint": self.instance.endpoint,
            "port": self.instance.port,
            "address": self.instance.address,
            "db_subnet_group_id": self.subnet_group.id,
        }