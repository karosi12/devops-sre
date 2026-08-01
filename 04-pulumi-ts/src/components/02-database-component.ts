import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { DatabaseComponentArgs } from '../utils/types/database-rds';

/**
 * Database Component - Creates RDS database with proper security
 * 
 * Features:
 * - Automatic DB Subnet Group creation
 * - Multi-AZ support for high availability
 * - Encryption at rest
 * - Automated backups
 * - Security: NOT publicly accessible by default
 */
export class DatabaseComponent extends pulumi.ComponentResource {
  public readonly instance: aws.rds.Instance;
  public readonly dbSubnetGroup?: aws.rds.SubnetGroup;
  public readonly instanceEndpoint: pulumi.Output<string>;
  public readonly instancePort: pulumi.Output<number>;
  public readonly instanceAddress: pulumi.Output<string>;
  
  constructor(
    name: string,
    args: DatabaseComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:rds:DatabaseComponent', name, {}, opts);

    const environment = args.Environment ?? 'dev';
    
    // Default configuration
    const engine = args.engine ?? 'postgres';
    const engineVersion = args.engineVersion;  // Will be undefined if not specified
    const instanceType = args.instanceType;
    const allocatedStorage = args.allocatedStorage ?? 20;
    const storageType = args.storageType ?? 'gp3';
    const iops = args.iops ?? (storageType === 'io1' ? 3000 : undefined);
    const multiAz = args.multiAz ?? false;
    const backupRetentionDays = args.backupRetentionDays ?? 7;
    const backupWindow = args.backupWindow ?? '03:00-04:00';
    const maintenanceWindow = args.maintenanceWindow ?? 'mon:04:00-mon:05:00';
    const deletionProtection = args.deletionProtection ?? false;
    const skipFinalSnapshot = args.skipFinalSnapshot ?? true;
    const storageEncrypted = args.storageEncrypted ?? true;
    const performanceInsightsEnabled = args.performanceInsightsEnabled ?? false;
    
    // Default port based on engine
    const defaultPort = engine === 'mysql' ? 3306 : 5432;
    const port = args.port ?? defaultPort;

    // Get subnet IDs - either from args or from existing configuration
    const subnetIds = args.subnetIds;
    
    // Create DB Subnet Group if not provided
    let dbSubnetGroupName: pulumi.Input<string>;
    if (args.subnetGroupName) {
      dbSubnetGroupName = args.subnetGroupName;
    } else if (subnetIds) {
      // Create a new DB Subnet Group
      this.dbSubnetGroup = new aws.rds.SubnetGroup(
        `${name}-subnet-group`,
        {
          name: `${name}-subnet-group`,
          subnetIds: subnetIds,
          tags: {
            Name: `${name}-subnet-group`,
            Environment: environment,
          },
        },
        { parent: this },
      );
      dbSubnetGroupName = this.dbSubnetGroup.name;
    } else {
      throw new Error('DatabaseComponent requires either subnetGroupName or subnetIds');
    }

    // Create the RDS Instance
    this.instance = new aws.rds.Instance(
      `${name}-instance`,
      {
        // Engine configuration
        engine,
        ...(engineVersion ? { engineVersion } : {}),
        
        // Instance configuration
        instanceClass: instanceType,
        allocatedStorage,
        storageType,
        iops,
        
        // Database configuration
        dbName: args.dbName,
        username: args.username,
        password: args.password,
        port,
        
        // Network configuration
        dbSubnetGroupName,
        vpcSecurityGroupIds: args.vpcSecurityGroupIds,
        publiclyAccessible: false,  // SECURITY: Always false by default!
        
        // Multi-AZ (requires multiple subnets)
        multiAz,
        
        // Backup configuration
        backupRetentionPeriod: backupRetentionDays,
        backupWindow,
        maintenanceWindow,
        
        // Security
        deletionProtection,
        skipFinalSnapshot,
        finalSnapshotIdentifier: skipFinalSnapshot ? undefined : args.finalSnapshotIdentifier,
        
        // Encryption
        storageEncrypted,
        kmsKeyId: args.kmsKeyArn,
        
        // Performance Insights
        performanceInsightsEnabled,
        performanceInsightsKmsKeyId: args.performanceInsightsKmsKeyId,
        
        // Parameter group
        parameterGroupName: args.parameterGroupName,
        optionGroupName: args.optionGroupName,
        
        // License
        licenseModel: args.licenseModel,
        
        // Tags
        tags: {
          Name: `${name}-instance`,
          Environment: environment,
        },
      },
      { parent: this },
    );

    // Expose endpoint info
    this.instanceEndpoint = this.instance.endpoint;
    this.instancePort = this.instance.port;
    this.instanceAddress = this.instance.address;

    this.registerOutputs({
      instanceId: this.instance.id,
      instanceArn: this.instance.arn,
      instanceEndpoint: this.instanceEndpoint,
      instancePort: this.instancePort,
      instanceAddress: this.instanceAddress,
      dbSubnetGroupName,
    });
  }
}
