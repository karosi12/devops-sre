import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { EcsComponentArgs } from '../utils/types/ecs';

/**
 * ECS Component with lazy/alternative resource creation
 * 
 * This component follows the factoring pattern to allow:
 * - External ALB security group injection (won't create if provided)
 * - Configurable health checks
 * - Environment variables and secrets support
 * - Optional HTTPS support
 * - Configurable public IP assignment
 */
export class EcsComponent extends pulumi.ComponentResource {
  public readonly service: aws.ecs.Service;
  public readonly loadBalancerDns: pulumi.Output<string>;
  public readonly cluster: aws.ecs.Cluster;
  public readonly alb: aws.lb.LoadBalancer;
  public readonly targetGroup: aws.lb.TargetGroup;
  public readonly listener: aws.lb.Listener;
  public readonly httpsListener?: aws.lb.Listener;
  public readonly albSecurityGroup?: aws.ec2.SecurityGroup;
  public readonly taskSecurityGroup?: aws.ec2.SecurityGroup;
  
  constructor(
    name: string,
    args: EcsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:ecs:EcsComponent', name, {}, opts);

    // Configuration with sensible defaults
    const containerPort = args.containerPort || 80;
    const vpcId = args.vpcId;
    if (!vpcId) {
      throw new Error('EcsComponent requires vpcId (target group and ALB security group).');
    }

    const environment = args.Environment ?? 'dev';
    const ecsType = args.ecsType || 'FARGATE';
    // Default to FALSE for security - containers should ONLY be accessible via ALB
    // Set to true only if you need direct SSH/console access to containers
    const assignPublicIp = args.assignPublicIp ?? false;
    
    // Health check configuration with defaults
    const healthCheckCommand = args.healthCheck?.command || 
      ['CMD-SHELL', `curl -f http://localhost:${containerPort} || exit 1`];
    const healthCheckInterval = args.healthCheck?.interval ?? 30;
    const healthCheckTimeout = args.healthCheck?.timeout ?? 5;
    const healthCheckRetries = args.healthCheck?.retries ?? 3;
    const healthCheckStartPeriod = args.healthCheck?.startPeriod ?? 60;
    const healthCheckGracePeriod = args.healthCheckGracePeriodSeconds ?? 60;

    // Resolve cluster name (handle Input<string>)
    const clusterName = pulumi.output(args.clusterName).apply(cn => cn || `${name}-cluster`);

    // ECS Cluster (use provided name or generate one)
    this.cluster = new aws.ecs.Cluster(
      `${name}-cluster`,
      {
        name: clusterName,
        tags: {
          Name: clusterName,
          Environment: environment,
        },
      },
      { parent: this },
    );

    // Build container definition with optional env vars and secrets
    const containerDefinition: Record<string, unknown> = {
      name: `${name}-container`,
      image: args.containerImage,
      portMappings: [
        {
          containerPort,
          protocol: 'tcp',
        },
      ],
      essential: true,
      healthCheck: {
        command: healthCheckCommand,
        interval: healthCheckInterval,
        timeout: healthCheckTimeout,
        retries: healthCheckRetries,
        startPeriod: healthCheckStartPeriod,
      },
    };

    // Add environment variables if provided
    if (args.environmentVariables && args.environmentVariables.length > 0) {
      containerDefinition.environment = args.environmentVariables;
    }

    // Add secrets if provided
    if (args.secrets && args.secrets.length > 0) {
      containerDefinition.secrets = args.secrets;
    }

    // Task Definition
    const taskDefinition = new aws.ecs.TaskDefinition(
      `${name}-task`,
      {
        family: `${name}-task-family`,
        cpu: args.taskCpu || '256',
        memory: args.taskMemory || '512',
        networkMode: 'awsvpc',
        requiresCompatibilities: [ecsType],
        executionRoleArn: aws.iam
          .getRole({
            name: 'ecsTaskExecutionRole',
          })
          .then((role) => role.arn),
        taskRoleArn: args.taskRoleArn,
        containerDefinitions: JSON.stringify([containerDefinition]),
        tags: {
          Name: `${name}-task`,
          Environment: environment,
        },
      },
      { parent: this },
    );

    // Target Group
    this.targetGroup = new aws.lb.TargetGroup(
      `${name}-tg`,
      {
        port: containerPort,
        protocol: 'HTTP',
        targetType: 'ip',
        vpcId,
        healthCheck: {
          enabled: true,
          path: '/',
          protocol: 'HTTP',
          matcher: '200',
          interval: 30,
          timeout: 5,
          healthyThreshold: 2,
          unhealthyThreshold: 3,
        },
        tags: {
          Name: `${name}-tg`,
          Environment: environment,
        },
      },
      { parent: this },
    );

    // ALB Security Group - LAZY CREATION (only if not provided externally)
    // Create security group conditionally based on whether external ID is provided
    const albSecurityGroupResource = pulumi.output(args.albSecurityGroupId).apply(sgId => {
      if (sgId) {
        // External security group provided - don't create
        return null;
      }
      // Create new security group
      return new aws.ec2.SecurityGroup(
        `${name}-alb-sg`,
        {
          vpcId,
          description: 'ALB: HTTP/HTTPS from internet, egress to VPC targets',
          name: `${name}-alb-sg`,
          ingress: [
            {
              protocol: 'tcp',
              fromPort: 80,
              toPort: 80,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTP from internet',
            },
            {
              protocol: 'tcp',
              fromPort: 443,
              toPort: 443,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTPS from internet',
            },
          ],
          egress: [
            {
              protocol: '-1',
              fromPort: 0,
              toPort: 0,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'Allow all outbound traffic',
            },
          ],
          tags: {
            Name: `${name}-alb-sg`,
            Environment: environment,
          },
        },
        { parent: this },
      );
    });

    // Store reference to created security group (if any)
    this.albSecurityGroup = albSecurityGroupResource as unknown as aws.ec2.SecurityGroup | undefined;
    
    // Get the security group ID to use (external or created)
    // Need to handle the case where createdSg.id is itself an Output
    const albSecurityGroupId: pulumi.Output<string> = pulumi.all([
      args.albSecurityGroupId, 
      albSecurityGroupResource
    ]).apply(([externalId, createdSg]) => {
      if (externalId) {
        return pulumi.output(externalId);
      }
      if (createdSg) {
        return pulumi.output(createdSg.id);
      }
      return pulumi.output('');
    }).apply(x => x); // Unwrap the nested output

    // Task Security Group - Separate from ALB SG for proper security
    // This SG allows traffic ONLY from the ALB, not from the internet
    const taskSecurityGroupResource = pulumi.output(args.taskSecurityGroupId).apply(taskSgId => {
      if (taskSgId) {
        // External task security group provided - don't create
        return null;
      }
      // Create new task security group that allows traffic from ALB only
      return new aws.ec2.SecurityGroup(
        `${name}-task-sg`,
        {
          vpcId,
          description: 'ECS Task: Allows traffic from ALB only (not from internet)',
          name: `${name}-task-sg`,
          // Inbound: Only allow traffic from ALB security group (not internet!)
          ingress: [
            {
              protocol: 'tcp',
              fromPort: containerPort,
              toPort: containerPort,
              // Use security group reference - not CIDR!
              securityGroups: [albSecurityGroupId],
              description: `HTTP traffic from ALB security group`,
            },
            {
              protocol: 'tcp',
              fromPort: 443,
              toPort: 443,
              securityGroups: [albSecurityGroupId],
              description: `HTTPS traffic from ALB security group`,
            },
          ],
          // Outbound: Allow all traffic to internet (for package downloads, APIs, etc.)
          egress: [
            {
              protocol: '-1',
              fromPort: 0,
              toPort: 0,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'Allow all outbound traffic',
            },
          ],
          tags: {
            Name: `${name}-task-sg`,
            Environment: environment,
          },
        },
        { parent: this },
      );
    });

    // Store reference to created task security group
    this.taskSecurityGroup = taskSecurityGroupResource as unknown as aws.ec2.SecurityGroup | undefined;
    
    // Get the task security group ID (external or created)
    const taskSecurityGroupId: pulumi.Output<string> = pulumi.all([
      args.taskSecurityGroupId, 
      taskSecurityGroupResource
    ]).apply(([externalId, createdSg]) => {
      if (externalId) {
        return pulumi.output(externalId);
      }
      if (createdSg) {
        return pulumi.output(createdSg.id);
      }
      return pulumi.output('');
    }).apply(x => x);

    // Application Load Balancer
    this.alb = new aws.lb.LoadBalancer(
      `${name}-alb`,
      {
        name: `${name}-alb`,
        internal: false,
        loadBalancerType: 'application',
        securityGroups: [albSecurityGroupId],
        subnets: args.subnetIds,
        tags: {
          Name: `${name}-alb`,
          Environment: environment,
        },
      },
      { parent: this },
    );

    this.loadBalancerDns = this.alb.dnsName;

    // HTTP Listener (always created)
    this.listener = new aws.lb.Listener(
      `${name}-listener`,
      {
        loadBalancerArn: this.alb.arn,
        port: 80,
        protocol: 'HTTP',
        defaultActions: [
          {
            type: 'forward',
            targetGroupArn: this.targetGroup.arn,
          },
        ],
      },
      { parent: this },
    );

    // HTTPS Listener (LAZY - only if HTTPS is enabled and certificate provided)
    const enableHttps = args.enableHttps ?? false;
    if (enableHttps && args.certificateArn) {
      this.httpsListener = new aws.lb.Listener(
        `${name}-listener-https`,
        {
          loadBalancerArn: this.alb.arn,
          port: 443,
          protocol: 'HTTPS',
          certificateArn: args.certificateArn,
          sslPolicy: 'ELBSecurityPolicy-TLS13-1-2-2021-06',
          defaultActions: [
            {
              type: 'forward',
              targetGroupArn: this.targetGroup.arn,
            },
          ],
        },
        { parent: this },
      );
    }

    // ECS Service
    // Use task security group (not ALB SG!) for proper security
    // The task SG allows traffic ONLY from the ALB, not from the internet
    const ecsSecurityGroups = args.vpcSecurityGroupIds 
      ? args.vpcSecurityGroupIds 
      : [taskSecurityGroupId];
    
    this.service = new aws.ecs.Service(
      `${name}-service`,
      {
        name: `${name}-service`,
        cluster: this.cluster.arn,
        desiredCount: args.desiredCount || 1,
        launchType: ecsType,
        taskDefinition: taskDefinition.arn,
        networkConfiguration: {
          subnets: args.subnetIds,
          securityGroups: ecsSecurityGroups,
          assignPublicIp,
        },
        loadBalancers: [
          {
            targetGroupArn: pulumi.output(this.targetGroup.arn),
            containerName: `${name}-container`,
            containerPort,
          },
        ],
        healthCheckGracePeriodSeconds: healthCheckGracePeriod,
        propagateTags: 'SERVICE',
        tags: {
          Name: `${name}-service`,
          Environment: environment,
        },
      },
      { 
        parent: this, 
        dependsOn: [this.listener, this.targetGroup],
      },
    );

    // Auto Scaling Target
    const autoScalingTarget = new aws.appautoscaling.Target(
      `${name}-asg`,
      {
        maxCapacity: args.autoScalingConfig?.maxCapacity || 5,
        minCapacity: args.autoScalingConfig?.minCapacity || 1,
        resourceId: pulumi.interpolate`service/${this.cluster.name}/${this.service.name}`,
        scalableDimension: 'ecs:service:DesiredCount',
        serviceNamespace: 'ecs',
      },
      { parent: this },
    );

    // Auto Scaling Policy
    const scalingPolicy = new aws.appautoscaling.Policy(
      `${name}-scaling-policy`,
      {
        name: `${name}-scaling-policy`,
        policyType: 'TargetTrackingScaling',
        resourceId: autoScalingTarget.resourceId,
        scalableDimension: autoScalingTarget.scalableDimension,
        serviceNamespace: autoScalingTarget.serviceNamespace,
        targetTrackingScalingPolicyConfiguration: {
          predefinedMetricSpecification: {
            predefinedMetricType: 'ECSServiceAverageCPUUtilization',
          },
          targetValue: args.targetCpuUtilization || 50.0,
          scaleInCooldown: args.coolingPeriod || 300,
          scaleOutCooldown: args.coolingPeriod || 300,
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      serviceName: this.service.name,
      serviceArn: this.service.arn,
      clusterName: this.cluster.name,
      clusterArn: this.cluster.arn,
      autoScalingTarget,
      scalingPolicy,
      loadBalancerDns: this.loadBalancerDns,
      albArn: this.alb.arn,
      targetGroupArn: this.targetGroup.arn,
      listenerArn: this.listener?.arn,
      httpsListenerArn: this.httpsListener?.arn,
      albSecurityGroupId: albSecurityGroupId,
      taskSecurityGroupId: taskSecurityGroupId,
    });
  }
}
