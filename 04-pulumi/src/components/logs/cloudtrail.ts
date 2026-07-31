import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface CloudTrailLogsComponentArgs {
  trailName: pulumi.Input<string>;
  logBucketName: pulumi.Input<string>;
  logPrefix?: pulumi.Input<string>;
  environment?: pulumi.Input<string>;
}

export class CloudTrailLogsComponent extends pulumi.ComponentResource {
  public readonly logBucket: aws.s3.Bucket;
  public readonly cloudTrail: aws.cloudtrail.Trail;

  constructor(
    name: string,
    args: CloudTrailLogsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:logs:CloudTrailLogsComponent', name, {}, opts);

    this.logBucket = new aws.s3.Bucket(
      `${name}-log-bucket`,
      {
        bucket: args.logBucketName,
        acl: 'private',
        tags: {
          Name: `${name}-log-bucket`,
          Environment: args.environment || 'dev',
        },
      },
      { parent: this },
    );

    this.cloudTrail = new aws.cloudtrail.Trail(
      `${name}-cloudtrail`,
      {
        name: args.trailName,
        s3BucketName: this.logBucket.bucket,
        s3KeyPrefix: args.logPrefix || 'cloudtrail-logs/',
        isMultiRegionTrail: true,
        enableLogFileValidation: true,
        tags: {
          Name: `${name}-cloudtrail`,
          Environment: args.environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      logBucketName: this.logBucket.bucket,
      cloudTrailName: this.cloudTrail.name,
    });
  }
}
