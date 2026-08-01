import * as pulumi from '@pulumi/pulumi';

/**
 * Container environment variable
 */
export interface ContainerEnvironment {
  name: string;
  value: string;
}

/**
 * Container secret (from AWS Secrets Manager or Parameter Store)
 */
export interface ContainerSecret {
  name: string;
  valueFrom: string;
}

/**
 * Health check configuration for container
 */
export interface HealthCheckConfig {
  /** Command to run for health check (default: ['CMD-SHELL', 'curl -f http://localhost || exit 1']) */
  command?: string[];
  /** Interval in seconds (default: 30) */
  interval?: number;
  /** Timeout in seconds (default: 5) */
  timeout?: number;
  /** Number of retries (default: 3) */
  retries?: number;
  /** Start period in seconds (default: 60) */
  startPeriod?: number;
}

/**
 * Arguments for ECS Component with lazy/alternative resource creation
 * 
 * Use this interface to control which resources are created and how they're configured:
 * - albSecurityGroupId: Pass external ALB security group (lazy - won't create new one)
 * - assignPublicIp: Control public IP assignment (default: true for FARGATE)
 * - environmentVariables: Pass env vars to container
 * - secrets: Pass secrets from AWS Secrets Manager
 * - taskRoleArn: IAM role for task (not execution role)
 * - healthCheck: Custom health check configuration
 */
export interface EcsComponentArgs {
  Environment?: pulumi.Input<string>;
  clusterName?: pulumi.Input<string>;
  taskCpu?: pulumi.Input<string>;
  taskMemory?: pulumi.Input<string>;
  desiredCount?: pulumi.Input<number>;
  containerPort?: pulumi.Input<number>;
  vpcSecurityGroupIds?: pulumi.Input<pulumi.Input<string>[]>;
  subnetIds: pulumi.Input<pulumi.Input<string>[]>;
  containerImage: pulumi.Input<string>;
  autoScalingConfig?: {
    minCapacity?: pulumi.Input<number>;
    maxCapacity?: pulumi.Input<number>;
  };
  ecsType?: pulumi.Input<string>;
  coolingPeriod?: pulumi.Input<number>;
  targetCpuUtilization?: pulumi.Input<number>;
  vpcId?: pulumi.Input<string>;
  containerHealthCheckCommand?: pulumi.Input<string[]>;
  
  /**
   * External ALB security group ID (lazy creation)
   * If provided, component won't create its own ALB security group
   * If not provided, component creates a default ALB SG with HTTP/HTTPS
   */
  albSecurityGroupId?: pulumi.Input<string>;
  
  /**
   * External task security group ID (lazy creation)
   * If provided, component won't create its own task security group
   * If not provided, component creates a task SG that allows traffic ONLY from ALB
   * 
   * SECURITY: The task SG is SEPARATE from ALB SG and only allows traffic from ALB,
   * not directly from the internet. This is the recommended secure configuration.
   */
  taskSecurityGroupId?: pulumi.Input<string>;
  
  /** 
   * Assign public IP to tasks (default: true)
   * Set to false if using private subnets with NAT Gateway
   */
  assignPublicIp?: pulumi.Input<boolean>;
  
  /** 
   * Health check configuration for container
   * Defaults to HTTP check on container port
   */
  healthCheck?: HealthCheckConfig;
  
  /** 
   * Health check grace period in seconds (default: 60)
   * Time to wait before health checks start
   */
  healthCheckGracePeriodSeconds?: pulumi.Input<number>;
  
  /** 
   * Environment variables to pass to container
   */
  environmentVariables?: ContainerEnvironment[];
  
  /** 
   * Secrets to pass to container (from AWS Secrets Manager or Parameter Store)
   */
  secrets?: ContainerSecret[];
  
  /** 
   * IAM role ARN for the task (not the execution role)
   * Required if container needs AWS API access
   */
  taskRoleArn?: pulumi.Input<string>;
  
  /** 
   * Enable HTTPS (port 443) on ALB
   * Requires certificateArn if set to true
   */
  enableHttps?: pulumi.Input<boolean>;
  
  /** 
   * ACM certificate ARN for HTTPS
   * Required if enableHttps is true
   */
  certificateArn?: pulumi.Input<string>;
}
