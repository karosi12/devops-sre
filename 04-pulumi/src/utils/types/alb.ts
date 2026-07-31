import * as pulumi from '@pulumi/pulumi';

export interface AlbLogsComponentArgs {
  albArn: string;
  albName: pulumi.Input<string>;
  subnets: pulumi.Input<string[]>;
  securityGroups: pulumi.Input<string[]>;
  logBucketName: pulumi.Input<string>;
  logPrefix?: pulumi.Input<string>;
  environment?: pulumi.Input<string>;
}
