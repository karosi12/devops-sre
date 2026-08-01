import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

import { CloudFrontComponentArgs } from '../utils/types/cloudfront';

export class CloudFrontComponent extends pulumi.ComponentResource {
  public readonly distribution: aws.cloudfront.Distribution;

  constructor(
    name: string,
    args: CloudFrontComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:cloudfront:CloudFrontComponent', name, {}, opts);

    this.distribution = new aws.cloudfront.Distribution(
      `${name}-distribution`,
      {
        origins: args.origins,
        enabled: args.enabled ?? true,
        defaultCacheBehavior: args.defaultCacheBehavior,
        priceClass: args.priceClass || 'PriceClass_100',
        restrictions: args.restrictions,
        viewerCertificate: args.viewerCertificate,
        tags: {
          Name: `${name}-distribution`,
          Environment: args.Environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      distributionId: this.distribution.id,
      domainName: this.distribution.domainName,
    });
  }
}
