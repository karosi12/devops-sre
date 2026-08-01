import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { NetworkComponent, VpcComponent } from '../../components/01-network-component';

const config = new pulumi.Config('infra');
const cidrBlock = config.require('cidrBlock');
const title = `${config.require('projectName')}-${config.require('environment')}`;
const region = aws.config.region || 'us-east-2';
const Environment = config.require('environment');

/**
 * LAZY RESOURCE CREATION PATTERN
 * 
 * By default, we only create essential resources to minimize costs:
 * - VPC (always required)
 * - Public subnets with Internet Gateway (for internet-facing resources)
 * - Security groups (for access control)
 * 
 * Non-essential resources are created only when explicitly enabled:
 * - Private subnets with NAT Gateway (~$32/month) - enable with enablePrivateSubnets: true
 * 
 * Configuration options (in Pulumi.dev.yaml):
 * - infra:enablePrivateSubnets: "true"  # Creates private subnets + NAT Gateway
 * - infra:createSecurityGroups: "false" # Skip default security groups
 * - infra:myIpAddress: "203.0.113.0/32" # Your IP for SSH access
 */

// Option 1: Use full NetworkComponent with lazy creation (RECOMMENDED)
const network = new NetworkComponent(title, {
  cidrBlock,
  Environment,
  // Public subnets are enabled by default (for ALB, EC2, etc.)
  enablePublicSubnets: true,
  // Private subnets and NAT Gateway are DISABLED by default to save costs
  // Set to true only when you need resources without public IPs that need internet access
  enablePrivateSubnets: config.getBoolean('enablePrivateSubnets') || false,
  // Security groups are created by default
  createSecurityGroups: config.getBoolean('createSecurityGroups') ?? true,
  // Your IP for SSH access (CIDR format)
  myIpAddress: config.get('myIpAddress'),
  // Custom subnet configurations (optional - defaults are used if not provided)
  // IMPORTANT: For RDS/Multi-AZ, you need at least 2 subnets in different AZs
  publicSubnetConfigs: [
    { cidrBlock: config.get('subnetCidrBlock1') || '10.0.1.0/24', azIndex: 0 },
    { cidrBlock: config.get('subnetCidrBlock2') || '10.0.2.0/24', azIndex: 1 },
  ],
  // RDS requires at least 2 AZs for Multi-AZ deployments
  // Creating 2 private subnets by default to support RDS
  privateSubnetConfigs: config.getBoolean('enablePrivateSubnets') ? [
    { cidrBlock: config.get('subnetCidrBlock3') || '10.0.3.0/24', azIndex: 0 },
    { cidrBlock: config.get('subnetCidrBlock4') || '10.0.4.0/24', azIndex: 1 },
  ] : undefined,
});

// Option 2: Use minimal VpcComponent if you need custom networking (advanced use case)
// const { vpc } = new VpcComponent(`${title}-vpc`, { cidrBlock, Environment });
// Then create subnets, route tables, etc. manually

/**
 * Exported Values
 * 
 * These exports provide a stable interface for other resources to consume.
 * Resources are undefined when their creation is disabled (lazy pattern).
 */
export const vpcId = network.vpc.id;
export const vpcCidr = network.vpc.cidrBlock;
export const subnetPublicId = network.publicSubnets[0]?.id;
export const subnetPublicId2 = network.publicSubnets[1]?.id;
export const subnetPrivateId = network.privateSubnets[0]?.id;
export const subnetPrivateId2 = network.privateSubnets[1]?.id;  // Second private subnet for Multi-AZ RDS
export const publicSecurityGroupId = network.publicSecurityGroup?.id;
export const privateSecurityGroupId = network.privateSecurityGroup?.id;
export const natGatewayId = network.natGateway?.id;
export const internetGatewayId = network.internetGateway?.id;
export const regionName = region;
export const environment = Environment;
export const availabilityZone = aws.getAvailabilityZones({ state: 'available' })
  .then((zones) => zones.names[0]);

// Additional useful exports
export const publicSubnetIds = network.publicSubnets.map(s => s.id);
export const privateSubnetIds = network.privateSubnets.map(s => s.id);
