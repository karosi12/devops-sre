import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { BucketComponentArgs } from '../utils/types/bucket';

export class BucketComponent extends pulumi.ComponentResource {
  public readonly bucket: aws.s3.Bucket;

  constructor(
    name: string,
    args: BucketComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:s3:BucketComponent', name, {}, opts);

    this.bucket = new aws.s3.Bucket(
      name,
      {
        acl: args.acl || 'private',
        versioning: args.versioning,
        tags: {
          Name: name,
          Environment: args.Environment || 'dev',
          ...args.tags,
        },
      },
      { parent: this },
    );

    if (args.cleanupOnDelete) {
      new aws.s3.BucketLifecycleConfiguration(
        `${name}-lifecycle`,
        {
          bucket: this.bucket.id,
          rules: [
            {
              id: 'cleanup',
              status: 'Enabled',
              expiration: { days: 1 },
            },
          ],
        },
        { parent: this },
      );
    }

    if (args.storageClass) {
      new aws.s3.BucketObject(
        `${name}-storage-class`,
        {
          bucket: this.bucket.id,
          key: 'storage-class-object',
          content: 'This object defines the storage class.',
          storageClass: args.storageClass,
        },
        { parent: this },
      );
      new aws.s3.BucketLifecycleConfiguration(
        `${name}-storage-lifecycle`,
        {
          bucket: this.bucket.id,
          rules: [
            {
              id: 'storage-class-transition',
              status: 'Enabled',
              transitions: [
                {
                  days: 0, // move immediately (or change to 30, 60, etc.)
                  storageClass: args.storageClass,
                },
              ],
            },
          ],
        },
        { parent: this },
      );
    }

    this.registerOutputs({
      bucketId: this.bucket.id,
      bucketArn: this.bucket.arn,
    });
  }
}
