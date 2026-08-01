import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { Ec2ComponentArgs } from '../utils/types/ec2';
const config = new pulumi.Config();

export class Ec2Component extends pulumi.ComponentResource {
  public readonly instance: aws.ec2.Instance;
  constructor(
    name: string,
    args: Ec2ComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:ec2:Ec2Component', name, {}, opts);
    const ami = aws.ec2.getAmi({
      filters: [
        {
          name: 'name',
          values: ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*'], //['amzn2-ami-hvm-*-x86_64-gp2'],
        },
      ],
      owners: ['099720109477'], //['137112412989'], // Amazon
      mostRecent: true,
    });
    this.instance = new aws.ec2.Instance(
      `${name}-instance`,
      {
        ami: ami.then((a) => a.id),
        instanceType: args.instanceType || config.require('instanceType'),
        subnetId: args.subnetId,
        vpcSecurityGroupIds: args.securityGroupId
          ? [args.securityGroupId]
          : undefined,
        availabilityZone: args.availabilityZone,
        keyName: args.keyName,
        tags: {
          Name: `${name}-instance`,
          Environment: args.Environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      instanceId: this.instance.id,
    });
  }
}
