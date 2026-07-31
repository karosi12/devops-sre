import * as pulumi from '@pulumi/pulumi';

/**
 * Database Engine Types
 */
export type DatabaseEngine = 'mysql' | 'postgres' | 'oracle-se1' | 'oracle-se2' | 'oracle-ee' | 'sqlserver-ee' | 'sqlserver-se' | 'sqlserver-ex' | 'sqlserver-web';

/**
 * Database Component Arguments
 * 
 * Supports both single-AZ and Multi-AZ deployments
 */
export interface DatabaseComponentArgs {
  /** Environment tag */
  Environment?: pulumi.Input<string>;
  
  /** Database engine (default: postgres) */
  engine?: DatabaseEngine;
  
  /** Engine version (e.g., "14.7" for PostgreSQL) */
  engineVersion?: pulumi.Input<string>;
  
  /** DB Instance class (e.g., db.t3.micro) */
  instanceType: pulumi.Input<string>;
  
  /** Allocated storage in GB */
  allocatedStorage?: pulumi.Input<number>;
  
  /** Storage type (gp2, gp3, io1) */
  storageType?: pulumi.Input<string>;
  
  /** IOPS for io1 storage type */
  iops?: pulumi.Input<number>;
  
  /** Database name */
  dbName: pulumi.Input<string>;
  
  /** Master username */
  username: pulumi.Input<string>;
  
  /** Master password (use pulumi.secret() for production!) */
  password: pulumi.Input<string>;
  
  /** 
   * DB Subnet Group name
   * If not provided, component creates one automatically from subnet IDs
   */
  subnetGroupName?: pulumi.Input<string>;
  
  /** Subnet IDs for the DB Subnet Group */
  subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
  
  /** Security group IDs for the database */
  vpcSecurityGroupIds?: pulumi.Input<pulumi.Input<string>[]>;
  
  /** Enable Multi-AZ deployment (default: false for dev, recommend true for prod) */
  multiAz?: pulumi.Input<boolean>;
  
  /** Backup retention period in days (default: 7) */
  backupRetentionDays?: pulumi.Input<number>;
  
  /** Backup window */
  backupWindow?: pulumi.Input<string>;
  
  /** Maintenance window */
  maintenanceWindow?: pulumi.Input<string>;
  
  /** Enable deletion protection (default: true for production) */
  deletionProtection?: pulumi.Input<boolean>;
  
  /** Skip final snapshot when destroying (default: false) */
  skipFinalSnapshot?: pulumi.Input<boolean>;
  
  /** Final snapshot identifier */
  finalSnapshotIdentifier?: pulumi.Input<string>;
  
  /** Enable automated backups (default: true) */
  automatedBackupsReplication?: pulumi.Input<boolean>;
  
  /** Storage encrypted (default: true) */
  storageEncrypted?: pulumi.Input<boolean>;
  
  /** KMS key ARN for storage encryption */
  kmsKeyArn?: pulumi.Input<string>;
  
  /** Enable performance insights (default: false) */
  performanceInsightsEnabled?: pulumi.Input<boolean>;
  
  /** Performance Insights KMS key */
  performanceInsightsKmsKeyId?: pulumi.Input<string>;
  
  /** Port (default: 5432 for postgres, 3306 for mysql) */
  port?: pulumi.Input<number>;
  
  /** Database parameter group name */
  parameterGroupName?: pulumi.Input<string>;
  
  /** Option group name */
  optionGroupName?: pulumi.Input<string>;
  
  /** License model */
  licenseModel?: pulumi.Input<string>;
}
