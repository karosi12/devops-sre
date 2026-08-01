import * as pulumi from '@pulumi/pulumi';
import * as network from '../network/vpc';
import { EcsComponent } from '../../components/03-ecs-component';

const config = new pulumi.Config('infra');
const Environment = config.require('environment');
const clusterName = config.get('clusterName') || `ecs-cluster-${Environment}`;
const taskCpu = config.get('taskCpu') || '256';
const taskMemory = config.get('taskMemory') || '512';
const desiredCount = config.getNumber('desiredCount') || 1;
const containerPort = config.getNumber('containerPort') || 80;

// Build security group IDs, filtering out undefined values (lazy pattern)
const configuredSecurityGroupIds = config.getObject<string[]>('vpcSecurityGroupIds');
const vpcSecurityGroupIds = configuredSecurityGroupIds 
  ? pulumi.output(configuredSecurityGroupIds)
  : pulumi.all([network.publicSecurityGroupId])
      .apply(([sgId]) => sgId ? [sgId] : []);

// Build subnet IDs, filtering out undefined values
const configuredSubnetIds = config.getObject<string[]>('subnetIds');
const subnetIds = configuredSubnetIds
  ? pulumi.output(configuredSubnetIds)
  : pulumi.all([network.subnetPublicId, network.subnetPublicId2])
      .apply(([id1, id2]) => [id1, id2].filter((id): id is string => id !== undefined));

const containerImage = config.get('containerImage') || 'nginx:latest';
// VPC ID is always available from network (VPC is never optional)
const vpcId = network.vpcId;

// LAZY CREATION OPTIONS
// These options control resource creation and behavior

// 1. External ALB Security Group (optional - lazy creation)
// If not provided, component creates one with HTTP/HTTPS
const externalAlbSecurityGroupId = config.get('albSecurityGroupId');

// 2. External Task Security Group (optional - lazy creation)
// If not provided, component creates one that allows traffic ONLY from ALB
const externalTaskSecurityGroupId = config.get('taskSecurityGroupId');

// 2. Public IP assignment
// Set to false if using private subnets with NAT Gateway
const assignPublicIp = config.getBoolean('assignPublicIp') ?? true; // Default to true for simplicity, but set to false for private subnets to save costs and improve security

// 3. Environment variables for container
const environmentVariables = config.getObject<{name: string, value: string}[]>('environmentVariables') || [];

// 4. Secrets from AWS Secrets Manager
const secrets = config.getObject<{name: string, valueFrom: string}[]>('secrets') || [];

// 5. Task role for container AWS API access
const taskRoleArn = config.get('taskRoleArn');

// 6. Health check configuration
const healthCheck = config.getObject<{
  command?: string[];
  interval?: number;
  timeout?: number;
  retries?: number;
  startPeriod?: number;
}>('healthCheck');

// 7. HTTPS configuration (requires ACM certificate)
const enableHttps = config.getBoolean('enableHttps') || false;
const certificateArn = config.get('certificateArn');

const ecsInstance = new EcsComponent('ecs-component', {
  Environment,
  clusterName,
  taskCpu,
  taskMemory,
  desiredCount,
  containerPort,
  vpcSecurityGroupIds,
  subnetIds,
  containerImage,
  vpcId,
  // NEW: Lazy/optional configurations
  albSecurityGroupId: externalAlbSecurityGroupId,
  taskSecurityGroupId: externalTaskSecurityGroupId,
  assignPublicIp,
  environmentVariables,
  secrets,
  taskRoleArn,
  healthCheck,
  enableHttps,
  certificateArn,
  // Auto-scaling configuration
  autoScalingConfig: {
    minCapacity: config.getNumber('autoScalingMin') || 1,
    maxCapacity: config.getNumber('autoScalingMax') || 5,
  },
  targetCpuUtilization: config.getNumber('targetCpuUtilization') || 50,
});

export const ecsServiceName = ecsInstance.service.name;
export const ecsServiceArn = ecsInstance.service.arn;
export const ecsClusterName = clusterName;
export const loadBalancerDns = ecsInstance.loadBalancerDns;
export const albArn = ecsInstance.alb.arn;
export const targetGroupArn = ecsInstance.targetGroup.arn;
export const ecsAlbSecurityGroupId = ecsInstance.albSecurityGroup?.id;
export const ecsTaskSecurityGroupId = ecsInstance.taskSecurityGroup?.id;
