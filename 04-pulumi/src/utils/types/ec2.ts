import * as pulumi from '@pulumi/pulumi';

export interface Ec2ComponentArgs {
  Environment?: pulumi.Input<string>;
  instanceType: pulumi.Input<string>;
  subnetId?: pulumi.Input<string>;
  securityGroupId?: pulumi.Input<string>;
  availabilityZone?: pulumi.Input<string>;
  keyName?: pulumi.Input<string>;
}
