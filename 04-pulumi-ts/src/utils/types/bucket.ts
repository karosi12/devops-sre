import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export interface BucketComponentArgs {
  Environment?: pulumi.Input<string>;
  acl?: pulumi.Input<string>;
  versioning?: pulumi.Input<aws.types.input.s3.BucketVersioning>;
  tags?: pulumi.Input<{ [key: string]: pulumi.Input<string> }>;
  cleanupOnDelete?: pulumi.Input<boolean>;
  storageClass?: pulumi.Input<
    | 'STANDARD' // default
    | 'REDUCED_REDUNDANCY' // lower cost, less redundancy
    | 'STANDARD_IA' // infrequent access
    | 'ONEZONE_IA' // infrequent access, single zone
    | 'INTELLIGENT_TIERING' // automatic cost savings
    | 'GLACIER_IR' // instant retrieval
    | 'GLACIER' // archival
    | 'DEEP_ARCHIVE' // long-term archival
    | 'OUTPOSTS' // on-premises storage
  >;
}
