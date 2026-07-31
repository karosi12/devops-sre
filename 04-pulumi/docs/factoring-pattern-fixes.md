# Factoring Pattern & Lazy Resource Creation Fixes

## Overview

This document details the refactoring of the pulumi-aws-ts network infrastructure to implement the **factoring pattern** with **lazy resource creation**. This approach defers the creation of non-essential resources until they are explicitly needed, resulting in significant cost savings and improved modularity.

---

## Problem Statement

### Original Design Issues

The original network design in [`vpc.ts`](../src/resources/network/vpc.ts) created **all resources unconditionally**:

```typescript
// BEFORE: All resources created regardless of need
const { vpc } = new VpcComponent(`${title}-vpc`, { cidrBlock, Environment });
const subnetPublic = new aws.ec2.Subnet(...);    // Always created
const subnetPublic2 = new aws.ec2.Subnet(...);   // Always created
const subnetPrivate = new aws.ec2.Subnet(...);   // Always created
const igw = new aws.ec2.InternetGateway(...);    // Always created
const natGatewayEip = new aws.ec2.Eip(...);      // Always created
const natGateway = new aws.ec2.NatGateway(...);  // Always created (EXPENSIVE!)
const publicSg = new aws.ec2.SecurityGroup(...); // Always created
const privateSg = new aws.ec2.SecurityGroup(...);// Always created
```

### Cost Impact

| Resource | Monthly Cost | Always Created? |
|----------|--------------|-----------------|
| VPC | $0.00 | Yes (required) |
| Internet Gateway | $0.00 | Yes (for public access) |
| Subnets | $0.00 | Yes |
| Security Groups | $0.00 | Yes |
| **NAT Gateway** | **~$32.40/month** | **Yes (problem!)** |
| EIP (for NAT) | ~$3.60/month | Yes (if NAT exists) |

**Problem**: A simple dev environment was costing **$36+/month** for NAT Gateway + EIP even when no private resources were being used.

---

## Solution: Factoring Pattern with Lazy Creation

### Design Principles

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FACTORING PATTERN                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐    │
│  │  VpcComponent   │    │        NetworkComponent              │    │
│  │  (Minimal)      │    │  (Full - with lazy creation)         │    │
│  │                 │    │                                     │    │
│  │  • VPC only     │    │  • VPC (always)                     │    │
│  │                 │    │  • Public Subnets (default: ON)     │    │
│  │  Use when you   │    │  • IGW (default: ON)                │    │
│  │  need custom    │    │  • Security Groups (default: ON)    │    │
│  │  networking     │    │  • Private Subnets (default: OFF) ★ │    │
│  │                 │    │  • NAT Gateway (default: OFF) ★     │    │
│  └─────────────────┘    │                                     │    │
│                         │  ★ = Lazy/conditional creation       │    │
│                         └─────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Changes

#### 1. Split into Two Components

**File**: [`01-network-component.ts`](../src/components/01-network-component.ts)

```typescript
// NEW: Minimal VPC component (VPC only)
export class VpcComponent extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;
  // Creates ONLY the VPC resource
}

// NEW: Full Network component with lazy creation
export class NetworkComponent extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;
  public readonly internetGateway?: aws.ec2.InternetGateway;     // Optional
  public readonly natGateway?: aws.ec2.NatGateway;               // Lazy 
  public readonly natGatewayEip?: aws.ec2.Eip;                   // Lazy 
  public readonly publicSubnets: aws.ec2.Subnet[];               // Default ON
  public readonly privateSubnets: aws.ec2.Subnet[] = [];         // Lazy 
  public readonly publicSecurityGroup?: aws.ec2.SecurityGroup;   // Default ON
  public readonly privateSecurityGroup?: aws.ec2.SecurityGroup;  // Lazy 
}
```

#### 2. Configuration-Driven Creation

**File**: [`network.ts`](../src/utils/types/network.ts)

```typescript
export interface NetworkArgs {
  cidrBlock: pulumi.Input<string>;
  Environment?: pulumi.Input<string>;
  
  // LAZY CREATION FLAGS
  /** Enable public subnets and Internet Gateway (default: true) */
  enablePublicSubnets?: pulumi.Input<boolean>;
  
  /** 
   * Enable private subnets and NAT Gateway (default: false)
   * WARNING: NAT Gateway costs ~$32/month - only enable when needed
   */
  enablePrivateSubnets?: pulumi.Input<boolean>;  // ★ LAZY
  
  /** Create default security groups (default: true) */
  createSecurityGroups?: pulumi.Input<boolean>;
  
  /** Your IP address for SSH access */
  myIpAddress?: pulumi.Input<string>;
}
```

#### 3. Conditional Resource Creation

**File**: [`01-network-component.ts`](../src/components/01-network-component.ts)

```typescript
// LAZY: NAT Gateway and private resources only created if explicitly enabled
if (args.enablePrivateSubnets) {
  // These resources are ONLY created when needed
  this.natGatewayEip = new aws.ec2.Eip(...);      // ~$3.60/month
  this.natGateway = new aws.ec2.NatGateway(...);  // ~$32.40/month
  
  // Private subnets
  this.privateSubnets = [...];
  
  // Private security group
  this.privateSecurityGroup = new aws.ec2.SecurityGroup(...);
}
```

---

## Implementation Details

### Resource File Usage

**File**: [`vpc.ts`](../src/resources/network/vpc.ts)

```typescript
// NEW: Configuration-driven resource creation
const network = new NetworkComponent(title, {
  cidrBlock,
  Environment,
  
  // Essential resources (enabled by default)
  enablePublicSubnets: true,
  
  // Non-essential resources (disabled by default) ★
  enablePrivateSubnets: config.getBoolean('enablePrivateSubnets') || false,
  
  // Security groups (enabled by default)
  createSecurityGroups: config.getBoolean('createSecurityGroups') ?? true,
  
  // Your IP for SSH access
  myIpAddress: config.get('myIpAddress'),
});
```

### Pulumi Configuration

**File**: [`Pulumi.dev.yaml`](../Pulumi.dev.yaml)

```yaml
config:
  infra:projectName: platform-infra
  infra:environment: dev
  infra:cidrBlock: 10.0.0.0/16
  
  # COST OPTIMIZATION: Disable private subnets by default
  # infra:enablePrivateSubnets: "true"  # Uncomment only when needed
  
  # Security configuration
  infra:myIpAddress: "203.0.113.0/32"
```

### Handling Optional Exports

**File**: [`vpc.ts`](../src/resources/network/vpc.ts)

```typescript
// Exports handle optional resources gracefully
export const vpcId = network.vpc.id;  // Always available
export const subnetPublicId = network.publicSubnets[0]?.id;  // Optional chaining
export const subnetPrivateId = network.privateSubnets[0]?.id; // Undefined if not created
export const publicSecurityGroupId = network.publicSecurityGroup?.id;
export const privateSecurityGroupId = network.privateSecurityGroup?.id; // Undefined if no private subnets
export const natGatewayId = network.natGateway?.id; // Undefined if disabled
```

**File**: [`ecs.ts`](../src/resources/ecs/ecs.ts)

```typescript
// Consumers use pulumi.all() to handle optional values
const vpcSecurityGroupIds = configuredSecurityGroupIds 
  ? pulumi.output(configuredSecurityGroupIds)
  : pulumi.all([network.publicSecurityGroupId])
      .apply(([sgId]) => sgId ? [sgId] : []);

const subnetIds = configuredSubnetIds
  ? pulumi.output(configuredSubnetIds)
  : pulumi.all([network.subnetPublicId, network.subnetPublicId2])
      .apply(([id1, id2]) => [id1, id2].filter((id): id is string => id !== undefined));
```

---

## Cost Comparison

### Before (Always Create Everything)

```yaml
# Monthly Cost Breakdown
Resources:
  - VPC:                           $0.00
  - Internet Gateway:              $0.00
  - 3 Subnets:                     $0.00
  - 2 Security Groups:             $0.00
  - NAT Gateway:                   $32.40
  - Elastic IP (for NAT):          $3.60
  - Private Route Table:           $0.00
  ----------------------------------------
  Total:                           $36.00/month
```

### After (Lazy Creation - Dev Environment)

```yaml
# Monthly Cost Breakdown (Default Config)
Resources:
  - VPC:                           $0.00
  - Internet Gateway:              $0.00
  - 2 Public Subnets:              $0.00
  - 1 Security Group:              $0.00
  - NAT Gateway:                   $0.00  ★ NOT CREATED
  - Elastic IP (for NAT):          $0.00  ★ NOT CREATED
  - Private Subnets:               $0.00  ★ NOT CREATED
  ----------------------------------------
  Total:                           $0.00/month
  
Savings: $36.00/month (100% for basic dev setup)
```

### After (Lazy Creation - Production with Private Subnets)

```yaml
# Monthly Cost Breakdown (With Private Subnets Enabled)
Resources:
  - VPC:                           $0.00
  - Internet Gateway:              $0.00
  - 2 Public Subnets:              $0.00
  - 1 Private Subnet:              $0.00
  - 2 Security Groups:             $0.00
  - NAT Gateway:                   $32.40  ★ CREATED (needed)
  - Elastic IP (for NAT):          $3.60   ★ CREATED (needed)
  ----------------------------------------
  Total:                           $36.00/month
  
Note: Costs only incurred when actually needed
```

---

## Usage Scenarios

### Scenario 1: Public-Only Resources (EC2, ECS with public IPs)

```yaml
# Pulumi.dev.yaml
config:
  infra:environment: dev
  # enablePrivateSubnets NOT SET (defaults to false)
```

**Created Resources**:
- VPC
- 2 Public Subnets
- Internet Gateway
- Public Route Table
- Public Security Group

**Monthly Cost**: $0.00

### Scenario 2: Private Resources (RDS, internal services)

```yaml
# Pulumi.prod.yaml
config:
  infra:environment: prod
  infra:enablePrivateSubnets: "true"
  infra:myIpAddress: "203.0.113.0/32"
```

**Created Resources**:
- VPC
- 2 Public Subnets + Internet Gateway
- 1+ Private Subnets + NAT Gateway + EIP
- Public Security Group
- Private Security Group

**Monthly Cost**: ~$36.00 (only when needed)

### Scenario 3: Custom Networking (Advanced)

```typescript
// Use VpcComponent for full control
const { vpc } = new VpcComponent(`${title}-vpc`, { 
  cidrBlock, 
  Environment 
});

// Manually create only what you need
const subnet1 = new aws.ec2.Subnet(...);
// Skip NAT Gateway entirely - use VPC endpoints instead
```

---

## Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Cost Savings** | Save ~$36/month per environment when private subnets aren't needed |
| **Faster Provisioning** | Fewer resources = faster `pulumi up` |
| **Cleaner State** | Pulumi state only contains actually-used resources |
| **Explicit Intent** | `enablePrivateSubnets: true` clearly documents the requirement |
| **Flexibility** | Same code supports both simple and complex network topologies |
| **Testability** | Easy to spin up minimal environments for testing |

---

## Migration Guide

### For Existing Environments

1. **Check current resource usage**:
   ```bash
   pulumi stack export --show-secrets | grep -i "nat\|private"
   ```

2. **Update configuration**:
   ```yaml
   # Pulumi.dev.yaml
   config:
     infra:enablePrivateSubnets: "true"  # If using private resources
   ```

3. **Preview changes**:
   ```bash
   pulumi preview
   ```

4. **Apply if no resources will be deleted**:
   ```bash
   pulumi up
   ```

### Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| `subnetPrivateId` is now optional | Code using it may need null checks | Use optional chaining (`?.`) or `pulumi.all()` |
| `privateSecurityGroupId` is optional | Same as above | Same as above |
| Resource naming changed | Pulumi may try to replace resources | Use `aliases` option or import existing resources |

---

## Best Practices

1. **Always set `myIpAddress`** for SSH access in public security groups
2. **Use private subnets for databases** (RDS, ElastiCache) and internal services
3. **Skip NAT Gateway in dev** unless you specifically need outbound internet from private resources
4. **Consider VPC Endpoints** as a cheaper alternative to NAT Gateway for AWS service access
5. **Tag all resources** with Environment for cost tracking

---

## Files Modified

| File | Changes |
|------|---------|
| [`src/components/01-network-component.ts`](../src/components/01-network-component.ts) | Added `NetworkComponent` with lazy creation; kept `VpcComponent` minimal |
| [`src/utils/types/network.ts`](../src/utils/types/network.ts) | Added `NetworkArgs` and `SubnetConfig` interfaces |
| [`src/resources/network/vpc.ts`](../src/resources/network/vpc.ts) | Refactored to use `NetworkComponent` with configuration-driven creation |
| [`src/resources/ecs/ecs.ts`](../src/resources/ecs/ecs.ts) | Updated to handle optional exports with `pulumi.all()` |

---

## References

- [AWS NAT Gateway Pricing](https://aws.amazon.com/vpc/pricing/)
- [Pulumi Component Resources](https://www.pulumi.com/docs/concepts/resources/components/)
- [Pulumi Input/Output](https://www.pulumi.com/docs/concepts/inputs-outputs/)
- [AWS VPC Design Patterns](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-design-patterns.html)