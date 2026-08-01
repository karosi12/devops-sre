import * as pulumi from '@pulumi/pulumi';

export interface AutoScalingArgs {
  name: string;

  vpcId: pulumi.Input<string>;
  publicSubnetIds: pulumi.Input<string[]>;
  privateSubnetIds: pulumi.Input<string[]>;

  instance: {
    amiId: pulumi.Input<string>;
    instanceType: pulumi.Input<string>;
    keyName?: pulumi.Input<string>;
    securityGroupIds: pulumi.Input<string[]>;
    userData?: pulumi.Input<string>;
  };

  autoscaling: {
    minSize: number;
    maxSize: number;
    desiredCapacity: number;
  };

  alb: {
    securityGroupIds: pulumi.Input<string[]>;
  };

  domain: {
    hostedZoneId: pulumi.Input<string>;
    domainName: pulumi.Input<string>;
    certificateArn: pulumi.Input<string>;
  };

  scalingPolicies?: {
    cpuTargetUtilization?: number; // default 60%
    requestPerTarget?: number; // default 1000 req/min
  };

  tags?: Record<string, string>;
}
