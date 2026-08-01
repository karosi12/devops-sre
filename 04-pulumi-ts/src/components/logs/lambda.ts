import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface LamdaFunctionLogsComponentArgs {
  logBucketName: pulumi.Input<string>;
  logPrefix?: pulumi.Input<string>;
  environment?: pulumi.Input<string>;
}

export class LamdaFunctionLogsComponent extends pulumi.ComponentResource {
  public readonly logBucket: aws.s3.Bucket;

  constructor(
    name: string,
    args: LamdaFunctionLogsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:logs:LamdaFunctionLogsComponent', name, {}, opts);

    this.logBucket = new aws.s3.Bucket(
      `${name}-log-bucket`,
      {
        bucket: args.logBucketName,
        tags: {
          Name: `${name}-log-bucket`,
          Environment: args.environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      logBucketName: this.logBucket.bucket,
    });
  }
}
