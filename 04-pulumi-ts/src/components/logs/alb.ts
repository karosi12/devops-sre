import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { AlbLogsComponentArgs } from '../../utils/types/alb';

export class AlbLogsComponent extends pulumi.ComponentResource {
  public readonly logBucket: aws.s3.Bucket;
  public readonly alb: aws.lb.LoadBalancer;

  constructor(
    name: string,
    args: AlbLogsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:alb:AlbLogsComponent', name, {}, opts);

    this.logBucket = new aws.s3.Bucket(
      `${name}-alb-logs`,
      {
        bucket: args.logBucketName,
        forceDestroy: true,
        tags: {
          Environment: args.environment ?? 'dev',
        },
      },
      { parent: this },
    );

    this.alb = new aws.lb.LoadBalancer(
      `${name}-alb`,
      {
        loadBalancerType: 'application',
        subnets: args.subnets,
        securityGroups: args.securityGroups,

        accessLogs: {
          bucket: this.logBucket.bucket,
          enabled: true,
          prefix: args.logPrefix ?? 'alb-logs',
        },
      },
      {
        parent: this,
        import: args.albArn, // 🔑 THIS IS THE KEY
      },
    );

    this.registerOutputs({
      logBucketName: this.logBucket.bucket,
      albArn: this.alb.arn,
    });
  }
}
