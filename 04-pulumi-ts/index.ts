import * as network from './src/resources/network/vpc';
import * as ecs from './src/resources/ecs/ecs';
import * as database from './src/resources/database/database';


export const { vpcId, subnetPublicId,
subnetPrivateId, vpcCidr, publicSecurityGroupId,
privateSecurityGroupId,regionName,environment } = network;

export const { ecsServiceName, ecsServiceArn,
ecsClusterName, loadBalancerDns } = ecs;

export const { databaseEndpoint, databasePort, databaseAddress } = database;