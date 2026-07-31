import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
const config = new pulumi.Config();
import * as network from '../network/vpc';
import { Ec2Component } from '../../components/00-ec2-component';

const title = `${config.require('projectName')}-${config.require('environment')}`;
const Environment = config.require('environment');

const { subnetPublicId, publicSecurityGroupId, availabilityZone } = network;
const keyName = pulumi
  .output(
    aws.ec2.getKeyPair({
      keyName: 'webapp',
    }),
  )
  .apply((k) => {
    if (!k || !k.keyName) {
      pulumi.log.warn(
        'Key pair "webapp" not found. EC2 instance will be created without a key pair.',
      );
    }
    return k.keyName;
  });
const { instance } = new Ec2Component(title, {
  Environment,
  instanceType: config.require('instanceType'),
  subnetId: subnetPublicId,
  securityGroupId: publicSecurityGroupId,
  availabilityZone: availabilityZone,
  keyName: keyName.apply((kn) => kn || ''),
});

export const instanceId = instance.id;
export const instancePublicIp = instance.publicIp;
export const instancePublicDns = instance.publicDns;
