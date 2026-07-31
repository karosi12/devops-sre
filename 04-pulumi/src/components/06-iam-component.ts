import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export interface IAMComponentArgs {
  Environment?: pulumi.Input<string>;
}

export class IAMComponent extends pulumi.ComponentResource {
  public readonly role: aws.iam.Role;

  constructor(
    name: string,
    args: IAMComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:iam:IAMComponent', name, {}, opts);

    this.role = new aws.iam.Role(
      `${name}-role`,
      {
        assumeRolePolicy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Principal: {
                Service: 'ec2.amazonaws.com',
              },
              Effect: 'Allow',
              Sid: `${name}-assume-role-${Date.now()}`,
            },
          ],
        }),
        tags: {
          Name: `${name}-role`,
          Environment: args.Environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      roleArn: this.role.arn,
    });
  }
}
