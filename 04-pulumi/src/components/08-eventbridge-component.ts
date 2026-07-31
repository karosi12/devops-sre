import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export interface EventBridgeComponentArgs {
  Environment?: pulumi.Input<string>;
  eventBusName: pulumi.Input<string>;
}

export class EventBridgeComponent extends pulumi.ComponentResource {
  public readonly eventBus: aws.cloudwatch.EventBus;

  constructor(
    name: string,
    args: EventBridgeComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:eventbridge:EventBridgeComponent', name, {}, opts);

    this.eventBus = new aws.cloudwatch.EventBus(
      `${name}-eventbus`,
      {
        name: args.eventBusName,
        tags: {
          Name: `${name}-eventbus`,
          Environment: args.Environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      eventBusArn: this.eventBus.arn,
      eventBusName: this.eventBus.name,
    });
  }
}
