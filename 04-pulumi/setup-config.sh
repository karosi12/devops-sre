#!/usr/bin/env bash

set -e

set_config_if_missing () {
  KEY=$1
  VALUE=$2

  if ! pulumi config get "$KEY" >/dev/null 2>&1; then
    echo "+ Setting $KEY"
    pulumi config set "$KEY" "$VALUE"
  else
    echo "✔ $KEY already set"
  fi
}

echo "🔧 Ensuring Pulumi config..."

set_config_if_missing infra:projectName demo
set_config_if_missing infra:awsRegion us-west-2
set_config_if_missing infra:cidrBlock 10.0.0.0/16
set_config_if_missing infra:subnetCidrBlock1 10.0.1.0/24
set_config_if_missing infra:subnetCidrBlock2 10.0.2.0/24
set_config_if_missing infra:subnetCidrBlock3 10.0.3.0/24
set_config_if_missing infra:environment dev
set_config_if_missing infra:instanceType t3.micro
set_config_if_missing infra:myIpAddress 102.216.181.10/32
set_config_if_missing infra:brokerType rabbitmq
set_config_if_missing infra:dbUsername admin
set_config_if_missing infra:dbPassword "!password123#"
set_config_if_missing infra:enablePrivateSubnets true
set_config_if_missing infra:dbMultiAz true
set_config_if_missing infra:dbDeletionProtection true
set_config_if_missing infra:dbBackupRetentionDays 30
set_config_if_missing infra:dbAllocatedStorage 20
set_config_if_missing infra:dbInstanceIdentifier mydbinstance
set_config_if_missing infra:dbName mydatabase
set_config_if_missing infra:dbEngine mysql
set_config_if_missing infra:dbEngineVersion 8.0.35
set_config_if_missing infra:dbInstanceType db.t3.micro

echo "✅ Config check complete"