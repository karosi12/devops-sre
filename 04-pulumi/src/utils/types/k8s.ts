import * as pulumi from '@pulumi/pulumi';

export interface K8sComponentArgs {
  clusterName: pulumi.Input<string>;
  clusterRoleArn: pulumi.Input<string>;
  nodeRoleArn: pulumi.Input<string>;
  subnetIds: pulumi.Input<pulumi.Input<string>[]>;
  securityGroupIds?: pulumi.Input<pulumi.Input<string>[]>;
  Environment?: pulumi.Input<string>;
  clusterVersion?: pulumi.Input<string>;
  /** Enable Karpenter autoscaler with NodePool + EC2NodeClass */
  enableKarpenter?: pulumi.Input<boolean>;
  /** Karpenter controller IAM role ARN (for IRSA) */
  karpenterRoleArn?: pulumi.Input<string>;
  /** Karpenter node role name (for EC2NodeClass) */
  karpenterNodeRoleName?: pulumi.Input<string>;
  /** Managed node group desired capacity (bootstrap nodes for Karpenter) */
  nodeGroupDesiredSize?: pulumi.Input<number>;
  /** Managed node group min size */
  nodeGroupMinSize?: pulumi.Input<number>;
  /** Managed node group max size */
  nodeGroupMaxSize?: pulumi.Input<number>;
  /** Karpenter NodePool CPU limit */
  karpenterCpuLimit?: pulumi.Input<number>;
  /** Karpenter Helm chart version */
  karpenterVersion?: pulumi.Input<string>;
}
