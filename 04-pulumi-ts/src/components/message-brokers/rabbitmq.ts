import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { RabbitMqBrokerArgs } from '../../utils/types/message-broker';

export class RabbitMqBroker extends pulumi.ComponentResource {
  public readonly endpoint: pulumi.Output<string>;
  public readonly arn: pulumi.Output<string>;

  constructor(
    name: string,
    args: RabbitMqBrokerArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('custom:infra:RabbitMQ', name, {}, opts);

    if (!args.vpcId || !args.subnetIds || !args.username || !args.password) {
      throw new Error('RabbitMQ requires vpcId, subnetIds, username, password');
    }

    const broker = new aws.mq.Broker(
      name,
      {
        brokerName: name,
        engineType: 'RabbitMQ', // value should come from config or args in future(RabbitMQ or ActiveMQ)
        engineVersion: '3.11.20', // value should come from config or args in future
        hostInstanceType: 'mq.t3.micro', // value should come from config or args in future
        subnetIds: args.subnetIds,
        users: [{ username: args.username, password: args.password }],
      },
      { parent: this },
    );

    this.endpoint = broker.instances.apply((i) => i[0].endpoints[0]);

    this.arn = broker.arn;

    this.registerOutputs({
      endpoint: this.endpoint,
      arn: this.arn,
    });
  }
}
