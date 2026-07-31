import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export interface DynamoDbComponentArgs {
  Environment?: pulumi.Input<string>;
  attributes: pulumi.Input<
    pulumi.Input<aws.types.input.dynamodb.TableAttribute>[]
  >;
  hashKey: pulumi.Input<string>;
  rangeKey?: pulumi.Input<string>;
  billingMode?: pulumi.Input<string>;
  globalSecondaryIndexes?: pulumi.Input<
    pulumi.Input<aws.types.input.dynamodb.TableGlobalSecondaryIndex>[]
  >;
  localSecondaryIndexes?: pulumi.Input<
    pulumi.Input<aws.types.input.dynamodb.TableLocalSecondaryIndex>[]
  >;
  streamEnabled?: pulumi.Input<boolean>;
  streamViewType?: pulumi.Input<string>;
}
