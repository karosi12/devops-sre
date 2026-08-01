import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as fs from 'fs';

export interface SftpUser {
  username: string;
  sshKeyPath: string;
}

export interface SftpComponentArgs {
  bucketName: string;
  users: SftpUser[];
  subnetIds: pulumi.Input<string[]>;
  securityGroupIds: pulumi.Input<string[]>;
  tags?: Record<string, string>;
}

export class SftpComponent extends pulumi.ComponentResource {
  public readonly endpoint: pulumi.Output<string>;

  constructor(
    name: string,
    args: SftpComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('infra:aws:SftpComponent', name, {}, opts);

    // S3 Bucket
    const bucket = new aws.s3.Bucket(args.bucketName, {
      tags: args.tags,
    });

    // Logging Role
    const loggingRole = new aws.iam.Role(`${name}-logging-role`, {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: 'transfer.amazonaws.com',
      }),
    });

    new aws.iam.RolePolicy(`${name}-logging-policy`, {
      role: loggingRole.id,
      policy: aws.iam
        .getPolicyDocument({
          statements: [
            {
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: ['*'],
            },
          ],
        })
        .then((p) => p.json),
    });

    // Transfer Server (VPC)
    const server = new aws.transfer.Server(`${name}-server`, {
      identityProviderType: 'SERVICE_MANAGED',
      protocols: ['SFTP', 'FTP', 'FTPS'],
      endpointType: 'VPC',
      endpointDetails: {
        subnetIds: args.subnetIds,
        securityGroupIds: args.securityGroupIds,
      },
      loggingRole: loggingRole.arn,
      tags: args.tags,
    });

    // Users
    args.users.forEach((user) => {
      const sshKey = fs.readFileSync(user.sshKeyPath, 'utf-8');

      const role = new aws.iam.Role(`${name}-${user.username}-role`, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: 'transfer.amazonaws.com',
        }),
      });

      new aws.iam.RolePolicy(`${name}-${user.username}-policy`, {
        role: role.id,
        policy: pulumi.interpolate`{
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": ["s3:ListBucket"],
              "Resource": "${bucket.arn}"
            },
            {
              "Effect": "Allow",
              "Action": ["s3:GetObject","s3:PutObject"],
              "Resource": "${bucket.arn}/${user.username}/*"
            }
          ]
        }`,
      });

      new aws.transfer.User(`${name}-${user.username}`, {
        serverId: server.id,
        userName: user.username,
        role: role.arn,
        homeDirectory: pulumi.interpolate`/${args.bucketName}/${user.username}`,
        // sshPublicKeys: [sshKey],
        // sshPublicKeyBody: sshKey,
        homeDirectoryMappings: [
          {
            entry: '/',
            target: pulumi.interpolate`/${args.bucketName}/${user.username}`,
          },
        ],
      });

      new aws.transfer.SshKey(`${name}-${user.username}-sshkey`, {
        serverId: server.id,
        userName: user.username,
        body: sshKey,
      });
    });

    this.endpoint = server.endpoint;

    this.registerOutputs({
      endpoint: this.endpoint,
    });
  }
}
