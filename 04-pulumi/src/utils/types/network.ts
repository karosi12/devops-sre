import * as pulumi from '@pulumi/pulumi';

/**
 * Arguments for minimal VPC Component
 * Creates only the VPC resource without any networking infrastructure
 */
export interface VpcArgs {
  cidrBlock: pulumi.Input<string>;
  Environment?: pulumi.Input<string>;
  enableDnsSupport?: pulumi.Input<boolean>;
  enableDnsHostnames?: pulumi.Input<boolean>;
}

/**
 * Subnet configuration for NetworkComponent
 */
export interface SubnetConfig {
  cidrBlock: string;
  azIndex: number;
}

/**
 * Arguments for full Network Component with lazy resource creation
 * 
 * Use this interface to control which resources are created:
 * - enablePublicSubnets: Create public subnets with IGW (default: true)
 * - enablePrivateSubnets: Create private subnets with NAT Gateway (default: false) - COST OPTIMIZATION
 * - createSecurityGroups: Create default security groups (default: true)
 * - myIpAddress: IP for SSH access in public security group
 * - publicSubnetConfigs: Custom CIDR blocks and AZ distribution
 * - privateSubnetConfigs: Custom CIDR blocks and AZ distribution
 */
export interface NetworkArgs {
  cidrBlock: pulumi.Input<string>;
  Environment?: pulumi.Input<string>;
  enableDnsSupport?: pulumi.Input<boolean>;
  enableDnsHostnames?: pulumi.Input<boolean>;
  
  /** Enable public subnets and Internet Gateway (default: true) */
  enablePublicSubnets?: pulumi.Input<boolean>;
  
  /** 
   * Enable private subnets and NAT Gateway (default: false)
   * WARNING: NAT Gateway costs ~$32/month - only enable when needed
   */
  enablePrivateSubnets?: pulumi.Input<boolean>;
  
  /** Create default security groups (default: true) */
  createSecurityGroups?: pulumi.Input<boolean>;
  
  /** Your IP address for SSH access (CIDR format, e.g., "203.0.113.0/32") */
  myIpAddress?: pulumi.Input<string>;
  
  /** Configuration for public subnets (default: 2 subnets in AZ 0,1) */
  publicSubnetConfigs?: SubnetConfig[];
  
  /** Configuration for private subnets (default: 1 subnet in AZ 2) */
  privateSubnetConfigs?: SubnetConfig[];
}
