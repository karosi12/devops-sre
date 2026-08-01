import * as pulumi from '@pulumi/pulumi';
export type BrokerType = 'kafka' | 'rabbitmq' | 'sqs';

export interface BrokerFeatures {
  dlq?: boolean;
  encryption?: boolean;
  monitoring?: boolean;
}

interface BaseBrokerArgs {
  name: string;
  tags?: Record<string, string>;
  features?: BrokerFeatures;
}

export interface SqsBrokerArgs extends BaseBrokerArgs {
  type: 'sqs';
  visibilityTimeout?: number;
  fifo?: boolean;
}

export interface RabbitMqBrokerArgs extends BaseBrokerArgs {
  type: 'rabbitmq';
  vpcId: pulumi.Input<string>;
  subnetIds: pulumi.Input<pulumi.Input<string>[]>;
  securityGroupIds?: pulumi.Input<pulumi.Input<string>[]>;
  username?: pulumi.Input<string>;
  password?: pulumi.Input<string>;
  instanceType?: string;
  engineVersion?: string;
}

export interface KafkaBrokerArgs extends BaseBrokerArgs {
  type: 'kafka';
  vpcId: pulumi.Input<string>;
  subnetIds: pulumi.Input<pulumi.Input<string>[]>;
  securityGroupIds?: pulumi.Input<pulumi.Input<string>[]>;
  kafkaVersion?: string;
  brokerNodes?: number;
}

export type MessageBrokerArgs =
  | SqsBrokerArgs
  | RabbitMqBrokerArgs
  | KafkaBrokerArgs;

export interface MessageBrokerOutputs {
  type: BrokerType;
  endpoint: pulumi.Output<string>;
  arn?: pulumi.Output<string>;
}

export interface BrokerResource {
  endpoint: pulumi.Output<string>;
  arn?: pulumi.Output<string>;
}
