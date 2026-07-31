import { DynamoDbComponent } from '../../components/07-dynamodb-component';

const dynamodb = new DynamoDbComponent('dynamodb', {
  attributes: [
    {
      name: 'id',
      type: 'S',
    },
  ],
  streamEnabled: true,
  streamViewType: 'NEW_AND_OLD_IMAGES',
  hashKey: 'id',
  billingMode: 'PAY_PER_REQUEST',
});

export const dynamodbTableName = dynamodb.table.name;
export const dynamodbTableArn = dynamodb.table.arn;
