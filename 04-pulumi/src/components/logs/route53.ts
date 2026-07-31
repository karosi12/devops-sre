import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface Route53LogsComponentArgs {
  hostedZoneId: pulumi.Input<string>;
  logGroupName?: pulumi.Input<string>;
  retentionInDays?: pulumi.Input<number>;
  environment?: pulumi.Input<string>;
}

export class Route53LogsComponent extends pulumi.ComponentResource {
  public readonly logGroup: aws.cloudwatch.LogGroup;

  constructor(
    name: string,
    args: Route53LogsComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('custom:logs:Route53LogsComponent', name, {}, opts);

    // It is importatn to create the log group in us-east-1 for Route53
    const provider = new aws.Provider(
      `${name}-us-east-1`,
      {
        region: 'us-east-1',
      },
      { parent: this },
    );
    this.logGroup = new aws.cloudwatch.LogGroup(
      `${name}-log-group`,
      {
        name: args.logGroupName || `/aws/route53/${name}-query-logs`,
        retentionInDays: args.retentionInDays || 30,
        tags: {
          Name: `${name}-query-logs`,
          Environment: args.environment || 'dev',
        },
      },
      { parent: this, provider },
    );

    new aws.cloudwatch.LogResourcePolicy(
      `${name}-log-group-policy`,
      {
        policyName: `${name}-route53-logging-policy`,
        policyDocument: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [{
          "Sid": "AllowRoute53QueryLogging",
          "Effect": "Allow",
          "Principal": { "Service": "route53.amazonaws.com" },
          "Action": [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Resource": "${this.logGroup.arn}:*"
        }]
      }`,
      },
      { parent: this },
    );

    new aws.route53.QueryLog(
      `${name}-query-log`,
      {
        cloudwatchLogGroupArn: this.logGroup.arn,
        zoneId: args.hostedZoneId,
      },
      { parent: this },
    );

    this.registerOutputs({
      logGroupName: this.logGroup.name,
      logGroupArn: this.logGroup.arn,
    });
  }
}
