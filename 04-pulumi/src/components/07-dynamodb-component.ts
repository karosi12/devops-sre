import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { DynamoDbComponentArgs } from '../utils/types/dynamodb';

export class DynamoDbComponent extends pulumi.ComponentResource {
  public readonly table: aws.dynamodb.Table;

  constructor(
    name: string,
    args: DynamoDbComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:dynamodb:DynamoDbComponent', name, {}, opts);

    this.table = new aws.dynamodb.Table(
      `${name}-table`,
      {
        attributes: args.attributes,
        hashKey: args.hashKey,
        rangeKey: args.rangeKey,
        billingMode: args.billingMode || 'PAY_PER_REQUEST',
        globalSecondaryIndexes: args.globalSecondaryIndexes,
        localSecondaryIndexes: args.localSecondaryIndexes,
        streamEnabled: args.streamEnabled || false,
        streamViewType: args.streamViewType,
        tags: {
          Name: `${name}-table`,
          Environment: args.Environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      tableName: this.table.name,
      tableArn: this.table.arn,
    });
  }
}
