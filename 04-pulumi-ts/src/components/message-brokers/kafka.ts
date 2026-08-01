import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { KafkaBrokerArgs } from '../../utils/types/message-broker';

export class KafkaBroker extends pulumi.ComponentResource {
  public readonly endpoint: pulumi.Output<string>;
  public readonly arn: pulumi.Output<string>;

  constructor(
    name: string,
    args: KafkaBrokerArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('custom:infra:Kafka', name, {}, opts);

    if (!args.subnetIds) {
      throw new Error('Kafka requires subnetIds');
    }

    const cluster = new aws.msk.Cluster(
      name,
      {
        kafkaVersion: '3.6.0', // value should come from config or args in future
        numberOfBrokerNodes: 2, // value should come from config or args in future
        brokerNodeGroupInfo: {
          instanceType: 'kafka.t3.small', // value should come from config or args in future
          clientSubnets: args.subnetIds,
          securityGroups: args.securityGroupIds || [],
        },
      },
      { parent: this },
    );

    this.endpoint = cluster.bootstrapBrokers;
    this.arn = cluster.arn;

    this.registerOutputs({
      endpoint: this.endpoint,
      arn: this.arn,
    });
  }
}
