import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { CloudFrontLogsComponentArgs } from '../../utils/types/cloudfront';

export class CloudFrontLogsComponent extends pulumi.ComponentResource {
  public readonly logBucket: aws.s3.Bucket;
  public readonly distribution: aws.cloudfront.Distribution;

  constructor(
    name: string,
    args: CloudFrontLogsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:logs:CloudFrontLogsComponent', name, {}, opts);

    this.logBucket = new aws.s3.Bucket(
      `${name}-log-bucket`,
      {
        bucket: args.logBucketName,
        acl: 'private',
        forceDestroy: true,
        tags: {
          Name: `${name}-log-bucket`,
          Environment: args.environment ?? 'dev',
        },
      },
      { parent: this },
    );

    this.distribution = new aws.cloudfront.Distribution(
      `${name}-distribution`,
      {
        enabled: true,
        origins: args.origins,
        defaultCacheBehavior: args.defaultCacheBehavior,
        restrictions: args.restrictions,
        viewerCertificate: args.viewerCertificate,

        loggingConfig: {
          bucket: this.logBucket.bucketDomainName, // REQUIRED
          prefix: args.logPrefix ?? 'cloudfront-logs/',
          includeCookies: false,
        },
      },
      {
        parent: this,
        import: args.distributionId,
      },
    );

    this.registerOutputs({
      logBucketName: this.logBucket.bucket,
      distributionId: this.distribution.id,
    });
  }
}
