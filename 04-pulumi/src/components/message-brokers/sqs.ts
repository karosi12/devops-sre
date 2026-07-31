import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { SqsBrokerArgs } from '../../utils/types/message-broker';

export class SqsBroker extends pulumi.ComponentResource {
  public readonly endpoint: pulumi.Output<string>;
  public readonly arn: pulumi.Output<string>;

  constructor(
    name: string,
    args: SqsBrokerArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('custom:infra:MessageBroker', name, {}, opts);

    const queue = new aws.sqs.Queue(name, args, { parent: this });

    this.endpoint = queue.url;
    this.arn = queue.arn;

    this.registerOutputs({
      endpoint: this.endpoint,
      arn: this.arn,
    });
  }
}
