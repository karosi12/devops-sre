import * as pulumi from '@pulumi/pulumi';
import {
  MessageBrokerArgs,
  MessageBrokerOutputs,
  BrokerResource,
} from '../utils/types/message-broker';

import { KafkaBroker } from './message-brokers/kafka';
import { RabbitMqBroker } from './message-brokers/rabbitmq';
import { SqsBroker } from './message-brokers/sqs';

export class MessageBroker
  extends pulumi.ComponentResource
  implements MessageBrokerOutputs
{
  public readonly type;
  public readonly endpoint;
  public readonly arn?;

  constructor(
    name: string,
    args: MessageBrokerArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('platform:infra:MessageBroker', name, args, opts);

    const broker = this.createBroker(name, args);

    this.type = args.type;
    this.endpoint = broker.endpoint;
    this.arn = broker.arn;

    this.registerOutputs({
      type: this.type,
      endpoint: this.endpoint,
      arn: this.arn,
    });
  }

  private createBroker(name: string, args: MessageBrokerArgs): BrokerResource {
    switch (args.type) {
      case 'kafka':
        return new KafkaBroker(name, args, { parent: this });

      case 'rabbitmq':
        return new RabbitMqBroker(name, args, { parent: this });

      case 'sqs':
        return new SqsBroker(name, args, { parent: this });

      default: {
        // Exhaustiveness check
        const _exhaustive: never = args;
        throw new Error(`Unsupported broker type: ${_exhaustive}`);
      }
    }
  }
}
