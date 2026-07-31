import * as pulumi from '@pulumi/pulumi';
const config = new pulumi.Config();

import * as network from '../network/vpc';
import {
  MessageBrokerArgs,
  MessageBrokerOutputs,
} from '../../utils/types/message-broker';
import { MessageBroker } from '../../components/11-message-component';

const title = `${config.require('projectName')}-message-broker`;
const { subnetPublicId, subnetPrivateId, vpcId } = network;
export const messageBroker = new MessageBroker(title, {
  type: config.require<MessageBrokerArgs['type']>('brokerType'),
  vpcId: vpcId,
  subnetIds: [subnetPublicId, subnetPrivateId],
  name: title,
  tags: {
    Project: config.require('projectName'),
    Environment: config.require('environment'),
  },
} as MessageBrokerArgs);

export const messageBrokerOutputs: MessageBrokerOutputs = {
  type: messageBroker.type,
  endpoint: messageBroker.endpoint,
  arn: messageBroker.arn,
};
