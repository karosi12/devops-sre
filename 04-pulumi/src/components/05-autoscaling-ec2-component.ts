import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { AutoScalingArgs } from '../utils/types/autoscaling-ec2';

export class AutoScalingComponent extends pulumi.ComponentResource {
  public readonly albDnsName: pulumi.Output<string>;
  public readonly albArn: pulumi.Output<string>;
  public readonly asgName: pulumi.Output<string>;

  constructor(
    name: string,
    args: AutoScalingArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('infra:aws:AutoScaling', name, {}, opts);

    const tags = args.tags ?? {};

    /**
     * 1) Launch Template (Immutable Compute)
     */
    const launchTemplate = new aws.ec2.LaunchTemplate(`${name}-lt`, {
      imageId: args.instance.amiId,
      instanceType: args.instance.instanceType,
      keyName: args.instance.keyName,
      vpcSecurityGroupIds: args.instance.securityGroupIds,
      userData: args.instance.userData,
      tagSpecifications: [
        {
          resourceType: 'instance',
          tags: { Name: `${args.name}-instance`, ...tags },
        },
      ],
    });

    /**
     * 2) Application Load Balancer (Public)
     */
    const alb = new aws.lb.LoadBalancer(`${name}-alb`, {
      loadBalancerType: 'application',
      internal: false,
      securityGroups: args.alb.securityGroupIds,
      subnets: args.publicSubnetIds,
      tags: { Name: `${args.name}-alb`, ...tags },
    });

    /**
     * 3) Target Group (Private Instances)
     */
    const targetGroup = new aws.lb.TargetGroup(`${name}-tg`, {
      vpcId: args.vpcId,
      port: 80,
      protocol: 'HTTP',
      targetType: 'instance',
      healthCheck: {
        path: '/health',
        protocol: 'HTTP',
        interval: 15,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
      tags: { Name: `${args.name}-tg`, ...tags },
    });

    /**
     * 4) HTTP → HTTPS Redirect Listener
     */
    new aws.lb.Listener(`${name}-http-listener`, {
      loadBalancerArn: alb.arn,
      port: 80,
      protocol: 'HTTP',
      defaultActions: [
        {
          type: 'redirect',
          redirect: {
            protocol: 'HTTPS',
            port: '443',
            statusCode: 'HTTP_301',
          },
        },
      ],
    });

    /**
     * 5) HTTPS Listener (Forward to Target Group)
     */
    new aws.lb.Listener(`${name}-https-listener`, {
      loadBalancerArn: alb.arn,
      port: 443,
      protocol: 'HTTPS',
      certificateArn: args.domain.certificateArn,
      sslPolicy: 'ELBSecurityPolicy-TLS13-1-2-2021-06',
      defaultActions: [
        {
          type: 'forward',
          targetGroupArn: targetGroup.arn,
        },
      ],
    });

    /**
     * 6) Auto Scaling Group (Private Subnets)
     */
    const asg = new aws.autoscaling.Group(`${name}-asg`, {
      vpcZoneIdentifiers: args.privateSubnetIds,
      minSize: args.autoscaling.minSize,
      maxSize: args.autoscaling.maxSize,
      desiredCapacity: args.autoscaling.desiredCapacity,
      healthCheckType: 'ELB',
      healthCheckGracePeriod: 120,
      launchTemplate: {
        id: launchTemplate.id,
        version: '$Latest',
      },
      targetGroupArns: [targetGroup.arn],
      instanceRefresh: {
        strategy: 'Rolling',
        preferences: {
          minHealthyPercentage: 90,
          instanceWarmup: '60',
        },
      },
      tags: [
        {
          key: 'Name',
          value: `${args.name}-asg`,
          propagateAtLaunch: true,
        },
      ],
    });

    /**
     * 7) Scaling Policies (Target Tracking)
     */
    new aws.autoscaling.Policy(`${name}-cpu-scaling`, {
      autoscalingGroupName: asg.name,
      policyType: 'TargetTrackingScaling',
      targetTrackingConfiguration: {
        predefinedMetricSpecification: {
          predefinedMetricType: 'ASGAverageCPUUtilization',
        },
        targetValue: args.scalingPolicies?.cpuTargetUtilization ?? 60,
      },
    });

    new aws.autoscaling.Policy(`${name}-alb-req-scaling`, {
      autoscalingGroupName: asg.name,
      policyType: 'TargetTrackingScaling',
      targetTrackingConfiguration: {
        predefinedMetricSpecification: {
          predefinedMetricType: 'ALBRequestCountPerTarget',
          resourceLabel: pulumi.interpolate`${alb.arnSuffix}/${targetGroup.arnSuffix}`,
        },
        targetValue: args.scalingPolicies?.requestPerTarget ?? 1000,
      },
    });

    /**
     * 8) Route53 Domain → ALB
     */
    // This is optional; if you don't want to create a DNS record, just skip this part
    if (args.domain.hostedZoneId && args.domain.domainName) {
      new aws.route53.Record(`${name}-dns`, {
        zoneId: args.domain.hostedZoneId,
        name: args.domain.domainName,
        type: 'A',
        aliases: [
          {
            name: alb.dnsName,
            zoneId: alb.zoneId,
            evaluateTargetHealth: true,
          },
        ],
      });
    }

    this.albDnsName = alb.dnsName;
    this.albArn = alb.arn;
    this.asgName = asg.name;

    this.registerOutputs({
      albDnsName: this.albDnsName,
      albArn: this.albArn,
      asgName: this.asgName,
    });
  }
}
