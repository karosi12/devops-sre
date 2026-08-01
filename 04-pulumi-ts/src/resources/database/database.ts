import * as pulumi from '@pulumi/pulumi';
import * as network from '../network/vpc';
import { DatabaseComponent } from '../../components/02-database-component';

const config = new pulumi.Config('infra');
const title = `${config.require('projectName')}-${config.require('environment')}-db`;
const Environment = config.require('environment');

/**
 * Database Configuration
 * 
 * IMPORTANT: Databases should be deployed in private subnets for security!
 * 
 * If enablePrivateSubnets is NOT set in Pulumi.dev.yaml, this will fail.
 * For dev environments without private subnets, you can use public subnets
 * but this is NOT recommended for production.
 */

// Get database configuration
const dbConfig = {
  instanceType: config.require('dbInstanceType'),
  dbName: config.require('dbName'),
  username: config.require('dbUsername'),
  password: config.requireSecret('dbPassword'),
  allocatedStorage: config.getNumber('dbAllocatedStorage') || 20,
  engine: config.get('dbEngine') || 'postgres',
  engineVersion: config.get('dbEngineVersion'),
  multiAz: config.getBoolean('dbMultiAz') || false,
  storageType: config.get('dbStorageType') || 'gp3',
  iops: config.getNumber('dbIops'),
  backupRetentionDays: config.getNumber('dbBackupRetentionDays') || 7,
  deletionProtection: config.getBoolean('dbDeletionProtection') ?? false,
  storageEncrypted: config.getBoolean('dbStorageEncrypted') ?? true,
  port: config.getNumber('dbPort'),
};

// Get subnet IDs - prefer private subnets for database
const subnetIds = pulumi.all([
  network.privateSubnetIds,
  network.publicSubnetIds,
]).apply(([privateIds, publicIds]) => {
  // Use private subnets if available (recommended for databases)
  if (privateIds && privateIds.length > 0) {
    return privateIds;
  }
  // Fall back to public subnets if private not available (dev only!)
  if (publicIds && publicIds.length > 0) {
    return publicIds;
  }
  throw new Error('Database requires at least one subnet. Please enable publicSubnets in NetworkComponent.');
});

// Get security group - prefer private security group
const securityGroupIds = pulumi.all([
  network.privateSecurityGroupId,
  network.publicSecurityGroupId,
]).apply(([privateSg, publicSg]) => {
  const groups = [];
  if (privateSg) groups.push(privateSg);
  if (publicSg) groups.push(publicSg);
  if (groups.length === 0) {
    throw new Error('Database requires at least one security group');
  }
  return groups;
});

// Create the database
export const database = new DatabaseComponent(title, {
  Environment,
  instanceType: dbConfig.instanceType,
  allocatedStorage: dbConfig.allocatedStorage,
  dbName: dbConfig.dbName,
  username: dbConfig.username,
  password: dbConfig.password,
  engine: dbConfig.engine as any,
  engineVersion: dbConfig.engineVersion,
  multiAz: dbConfig.multiAz,
  storageType: dbConfig.storageType,
  iops: dbConfig.iops,
  backupRetentionDays: dbConfig.backupRetentionDays,
  deletionProtection: dbConfig.deletionProtection,
  storageEncrypted: dbConfig.storageEncrypted,
  port: dbConfig.port,
  
  // Network - use private subnets for Multi-AZ
  subnetIds,
  vpcSecurityGroupIds: securityGroupIds,
});

// Export database information
export const databaseInstanceId = database.instance.id;
export const databaseInstanceArn = database.instance.arn;
export const databaseEndpoint = database.instanceEndpoint;
export const databasePort = database.instancePort;
export const databaseAddress = database.instanceAddress;
