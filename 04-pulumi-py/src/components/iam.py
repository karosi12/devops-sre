"""IAM component for Pulumi Python"""

import pulumi
import pulumi_aws as aws
from typing import Dict, Optional

class IAMRoles:
    def __init__(self, env: str):
        self.env = env
        
    def create_role(self, name: str, assume_role_policy_json: str) -> aws.iam.Role:
        return aws.iam.Role(
            f"{self.env}-{name}",
            assume_role_policy=assume_role_policy_json,
            tags={"Environment": self.env}
        )

    def attach_policy_to_role(self, role: aws.iam.Role, policy_arn: str, name: str):
        return aws.iam.RolePolicyAttachment(
            f"{self.env}-{name}",
            role=role.name,
            policy_arn=policy_arn,
            tags={"Environment": self.env}
        )
