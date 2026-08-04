"""Configuration utilities for Pulumi Python"""

import pulumi

def get_required_config(config, keys: list[str]) -> dict[str, str]:
    """Get and validate required configuration values."""
    result = {}
    for key in keys:
        value = config.get(key)
        if not value:
            raise Exception(f"Missing required Pulumi config: {key}")
        result[key] = value
    return result

def get_tagged_env(tag_env: str) -> dict[str, str]:
    """Generate base tags for environment."""
    return {"Environment": tag_env}