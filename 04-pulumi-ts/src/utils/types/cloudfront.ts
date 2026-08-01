import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export interface CloudFrontComponentArgs {
  Environment?: pulumi.Input<string>;
  origins: pulumi.Input<
    pulumi.Input<aws.types.input.cloudfront.DistributionOrigin>[]
  >;
  enabled?: pulumi.Input<boolean>;
  defaultCacheBehavior: pulumi.Input<aws.types.input.cloudfront.DistributionDefaultCacheBehavior>;
  priceClass?: pulumi.Input<string>;
  restrictions: pulumi.Input<aws.types.input.cloudfront.DistributionRestrictions>;
  viewerCertificate: pulumi.Input<aws.types.input.cloudfront.DistributionViewerCertificate>;
}

export interface CloudFrontLogsComponentArgs {
  distributionId: string;
  logBucketName: pulumi.Input<string>;
  logPrefix?: pulumi.Input<string>;
  environment?: pulumi.Input<string>;
  origins: pulumi.Input<
    pulumi.Input<aws.types.input.cloudfront.DistributionOrigin>[]
  >;
  defaultCacheBehavior: pulumi.Input<aws.types.input.cloudfront.DistributionDefaultCacheBehavior>;
  restrictions: pulumi.Input<aws.types.input.cloudfront.DistributionRestrictions>;
  viewerCertificate: pulumi.Input<aws.types.input.cloudfront.DistributionViewerCertificate>;
}
