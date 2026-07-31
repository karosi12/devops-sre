import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface CloudWatchLogsComponentArgs {
  logGroupName: pulumi.Input<string>;
  retentionInDays?: pulumi.Input<number>;
  environment?: pulumi.Input<string>;
}

export class CloudWatchLogsComponent extends pulumi.ComponentResource {
  public readonly logGroup: aws.cloudwatch.LogGroup;

  constructor(
    name: string,
    args: CloudWatchLogsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:logs:CloudWatchLogsComponent', name, {}, opts);

    this.logGroup = new aws.cloudwatch.LogGroup(
      `${name}-log-group`,
      {
        name: args.logGroupName,
        retentionInDays: args.retentionInDays || 30,
        tags: {
          Name: `${name}-log-group`,
          Environment: args.environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      logGroupName: this.logGroup.name,
    });
  }
}
