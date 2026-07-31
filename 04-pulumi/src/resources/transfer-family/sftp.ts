import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
const config = new pulumi.Config();

import * as network from '../network/vpc';
import { SftpComponent } from '../../components/12-transfer-family';
const subnetCidrBlock1 = config.get('subnetCidrBlock1') || '10.0.1.0/24';
const Environment = config.require('environment');
const title = `${config.require('projectName')}-sftp`;
const { subnetPublicId, subnetPrivateId, vpcId } = network;

const sftpSg = new aws.ec2.SecurityGroup(`${title}-private-sg`, {
  vpcId,
  description: 'Security group for FTP and SFTP access',
  name: `${title}-transfer-sg`,
  ingress: [
    // SFTP (SSH)
    {
      protocol: 'tcp',
      fromPort: 22,
      toPort: 22,
      cidrBlocks: [subnetCidrBlock1], // change to trusted IPs in prod
      description: 'SFTP access',
    },

    // FTP control channel
    {
      protocol: 'tcp',
      fromPort: 21,
      toPort: 21,
      cidrBlocks: [subnetCidrBlock1],
      description: 'FTP control channel',
    },

    // FTP active mode data channel
    {
      protocol: 'tcp',
      fromPort: 20,
      toPort: 20,
      cidrBlocks: [subnetCidrBlock1],
      description: 'FTP active mode data channel',
    },

    // FTP passive mode ports (restricted range)
    {
      protocol: 'tcp',
      fromPort: 8192,
      toPort: 8200,
      cidrBlocks: [subnetCidrBlock1],
      description: 'FTP passive mode ports',
    },
    {
      protocol: 'tcp',
      fromPort: 990,
      toPort: 990,
      cidrBlocks: [subnetCidrBlock1],
      description: 'FTPS control channel',
    },
  ],
  egress: [
    { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
  ],
  tags: { Name: `${title}-transfer-sg`, Environment },
});

const sftp = new SftpComponent(title, {
  bucketName: `${config.require('projectName')}-sftp-bucket`,
  subnetIds: pulumi
    .output([subnetPublicId, subnetPrivateId])
    .apply((ids) => ids),
  securityGroupIds: pulumi.output([sftpSg.id]),
  users: [
    { username: 'alice', sshKeyPath: './keys/alice.pub' },
    { username: 'bob', sshKeyPath: './keys/bob.pub' },
  ],
  tags: {
    Name: config.require('projectName'),
    Environment: config.require('environment'),
  },
});

export const endpoint = sftp.endpoint;
