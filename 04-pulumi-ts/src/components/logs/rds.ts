import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface RDSLogsComponentArgs {
  environment?: pulumi.Input<string>;
}

export class RDSLogsComponent extends pulumi.ComponentResource {
  public readonly cloudwatchLogBucket: aws.cloudwatch.LogGroup;

  constructor(
    name: string,
    args: RDSLogsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:logs:RDSLogsComponent', name, {}, opts);

    this.cloudwatchLogBucket = new aws.cloudwatch.LogGroup(
      `${name}-rds-log-group`,
      {
        name: `/aws/rds/instance/${name}`,
        retentionInDays: 30,
        tags: {
          Name: `${name}-rds-log-group`,
          Environment: args.environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      cloudwatchLogGroupName: this.cloudwatchLogBucket.name,
    });
  }
}
