import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { K8sComponentArgs } from '../utils/types/k8s';

export class K8sComponent extends pulumi.ComponentResource {
  public readonly cluster: aws.eks.Cluster;
  public readonly nodeGroup: aws.eks.NodeGroup;

  constructor(
    name: string,
    args: K8sComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:eks:K8sComponent', name, {}, opts);

    const clusterName = pulumi.output(args.clusterName);
    const subnetIds = pulumi.output(args.subnetIds);
    const nodeGroupDesiredSize = pulumi.output(args.nodeGroupDesiredSize ?? 2);
    const nodeGroupMinSize = pulumi.output(args.nodeGroupMinSize ?? 2);
    const nodeGroupMaxSize = pulumi.output(args.nodeGroupMaxSize ?? 5);

    // 1. EKS Cluster
    this.cluster = new aws.eks.Cluster(
      `${name}-cluster`,
      {
        name: clusterName,
        version: args.clusterVersion ?? '1.31',
        roleArn: args.clusterRoleArn,
        vpcConfig: {
          subnetIds,
          securityGroupIds: args.securityGroupIds,
          endpointPublicAccess: true,
          endpointPrivateAccess: true,
        },
        enabledClusterLogTypes: ['api', 'audit', 'authenticator'],
        tags: {
          Name: clusterName,
          'karpenter.sh/discovery': clusterName,
          Environment: args.Environment ?? 'dev',
        },
      },
      { parent: this },
    );

    // 2. Managed node group (bootstrap - runs Karpenter controller, minimum 2 nodes)
    this.nodeGroup = new aws.eks.NodeGroup(
      `${name}-node-group`,
      {
        clusterName: this.cluster.name,
        nodeRoleArn: args.nodeRoleArn,
        subnetIds,
        scalingConfig: {
          desiredSize: nodeGroupDesiredSize,
          minSize: nodeGroupMinSize,
          maxSize: nodeGroupMaxSize,
        },
        instanceTypes: ['m5.large'],
        amiType: 'AL2023_x86_64_STANDARD',
        labels: {
          'karpenter.sh/nodepool': 'bootstrap',
        },
        tags: {
          Name: pulumi.interpolate`${clusterName}-ng`,
          'karpenter.sh/discovery': clusterName,
          Environment: args.Environment ?? 'dev',
        },
      },
      { parent: this, dependsOn: [this.cluster] },
    );

    this.registerOutputs({
      clusterName: this.cluster.name,
      clusterArn: this.cluster.arn,
      clusterId: this.cluster.id,
      clusterStatus: this.cluster.status,
      clusterVersion: this.cluster.version,
      clusterEndpoint: this.cluster.endpoint,
    });
  }
}
