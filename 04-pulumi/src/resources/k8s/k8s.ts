import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as network from '../network/vpc';
import { K8sComponent } from '../../components/13-k8s-component';

const config = new pulumi.Config();
const projectName = config.require('projectName');
const environment = config.require('environment');
const title = `${projectName}-${environment}`;
const clusterName = title;
const region = aws.config.region || 'us-east-2';
const accountId = pulumi
  .output(aws.getCallerIdentity())
  .apply((id) => id.accountId);

const { vpcId, subnetPublicId, subnetPrivateId } = network;
const subnetIds = pulumi.output([subnetPublicId, subnetPrivateId]);

// 1. Cluster IAM Role
const clusterRole = new aws.iam.Role(`${title}-eks-cluster-role`, {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'eks.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  }),
  name: `${title}-eks-cluster-role`,
});

new aws.iam.RolePolicyAttachment(`${title}-eks-cluster-policy`, {
  role: clusterRole.name,
  policyArn: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy',
});

// 2. Node IAM Role (KarpenterNodeRole - for both MG and Karpenter-provisioned nodes)
const nodeRole = new aws.iam.Role(`${title}-karpenter-node-role`, {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'ec2.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  }),
  name: pulumi.interpolate`KarpenterNodeRole-${clusterName}`,
});

const nodePolicyArns = [
  'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
  'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
  'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly',
  'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
];

nodePolicyArns.forEach((policyArn, i) => {
  new aws.iam.RolePolicyAttachment(`${title}-node-policy-${i}`, {
    role: nodeRole.name,
    policyArn,
  });
});

// 3. EKS Cluster + Node Group (2 nodes minimum)
const k8sComponent = new K8sComponent(`${title}-eks`, {
  clusterName,
  clusterRoleArn: clusterRole.arn,
  nodeRoleArn: nodeRole.arn,
  subnetIds,
  securityGroupIds: undefined,
  Environment: environment,
  clusterVersion: '1.31',
  nodeGroupDesiredSize: 2,
  nodeGroupMinSize: 2,
  nodeGroupMaxSize: 5,
});

const cluster = k8sComponent.cluster;

// 4. Tag subnets and cluster SG for Karpenter discovery
new aws.ec2.Tag(`${title}-subnet-public-karpenter-tag`, {
  resourceId: subnetPublicId,
  key: 'karpenter.sh/discovery',
  value: clusterName,
});

new aws.ec2.Tag(`${title}-subnet-private-karpenter-tag`, {
  resourceId: subnetPrivateId,
  key: 'karpenter.sh/discovery',
  value: clusterName,
});

new aws.ec2.Tag(`${title}-cluster-sg-karpenter-tag`, {
  resourceId: cluster.vpcConfig.apply((c) => c.clusterSecurityGroupId),
  key: 'karpenter.sh/discovery',
  value: clusterName,
});

// 6. OIDC Provider for IRSA
const oidcIssuer = cluster.identities.apply(
  (ids) => ids[0]?.oidcs?.[0]?.issuer ?? '',
);
const oidcIssuerThumbprint = '9e99a48a9960b14926bb7f3b02e22da2b0ab7280';

const oidcProvider = new aws.iam.OpenIdConnectProvider(
  `${title}-eks-oidc`,
  {
    url: oidcIssuer,
    clientIdLists: ['sts.amazonaws.com'],
    thumbprintLists: [oidcIssuerThumbprint],
  },
  { dependsOn: [cluster] },
);

// 7. Karpenter Controller IAM Role (IRSA)
const oidcProviderArn = oidcProvider.arn;
const karpenterNamespace = 'kube-system';
const karpenterServiceAccount = 'karpenter';

const karpenterRole = new aws.iam.Role(`${title}-karpenter-controller-role`, {
  assumeRolePolicy: pulumi
    .all([oidcProviderArn, oidcIssuer])
    .apply(([providerArn, issuer]) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Federated: providerArn },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                [`${issuer.replace('https://', '')}:sub`]: `system:serviceaccount:${karpenterNamespace}:${karpenterServiceAccount}`,
                [`${issuer.replace('https://', '')}:aud`]: 'sts.amazonaws.com',
              },
            },
          },
        ],
      }),
    ),
  name: pulumi.interpolate`${clusterName}-karpenter`,
});

// Karpenter controller policies (simplified - production should use full CloudFormation policies)
const karpenterNodeLifecyclePolicy = new aws.iam.RolePolicy(
  `${title}-karpenter-node-lifecycle`,
  {
    role: karpenterRole.id,
    policy: accountId.apply((accId) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowScopedEC2Access',
            Effect: 'Allow',
            Resource: '*',
            Action: [
              'ec2:RunInstances',
              'ec2:CreateFleet',
              'ec2:CreateLaunchTemplate',
              'ec2:CreateTags',
              'ec2:TerminateInstances',
              'ec2:DeleteLaunchTemplate',
              'ec2:Describe*',
            ],
          },
          {
            Sid: 'AllowIAMPassRole',
            Effect: 'Allow',
            Resource: `arn:aws:iam::${accId}:role/KarpenterNodeRole-${clusterName}`,
            Action: 'iam:PassRole',
          },
          {
            Sid: 'AllowSSM',
            Effect: 'Allow',
            Resource: `arn:aws:ssm:${region}::parameter/aws/service/*`,
            Action: 'ssm:GetParameter',
          },
          {
            Sid: 'AllowEKSDescribe',
            Effect: 'Allow',
            Resource: '*',
            Action: 'eks:DescribeCluster',
          },
        ],
      }),
    ),
  },
);

// 8. SQS Queue for Karpenter interruptions
const interruptionQueue = new aws.sqs.Queue(`${title}-karpenter-interruption`, {
  name: clusterName,
  messageRetentionSeconds: 300,
  sqsManagedSseEnabled: true,
});

new aws.sqs.QueuePolicy(`${title}-karpenter-queue-policy`, {
  queueUrl: interruptionQueue.id,
  policy: pulumi.interpolate`{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": ["events.amazonaws.com", "sqs.amazonaws.com"]
        },
        "Action": "sqs:SendMessage",
        "Resource": "${interruptionQueue.arn}"
      }
    ]
  }`,
});

// EventBridge rules for Spot/Health interruptions
const eventRulePatterns = [
  {
    source: ['aws.ec2'],
    'detail-type': ['EC2 Spot Instance Interruption Warning'],
  },
  {
    source: ['aws.ec2'],
    'detail-type': ['EC2 Instance Rebalance Recommendation'],
  },
  {
    source: ['aws.ec2'],
    'detail-type': ['EC2 Instance State-change Notification'],
  },
];

eventRulePatterns.forEach((pattern, i) => {
  const rule = new aws.cloudwatch.EventRule(`${title}-karpenter-rule-${i}`, {
    eventPattern: JSON.stringify(pattern),
  });
  new aws.cloudwatch.EventTarget(`${title}-karpenter-target-${i}`, {
    rule: rule.name,
    arn: interruptionQueue.arn,
  });
});

// Karpenter interruption policy - allow SQS access
const karpenterInterruptionPolicy = new aws.iam.RolePolicy(
  `${title}-karpenter-interruption`,
  {
    role: karpenterRole.id,
    policy: interruptionQueue.arn.apply(
      (arn) => `
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Resource": "${arn}",
      "Action": ["sqs:DeleteMessage", "sqs:GetQueueUrl", "sqs:ReceiveMessage"]
    }
  ]
}
`,
    ),
  },
);

// 9. Kubeconfig and K8s Provider
const kubeconfig = pulumi
  .all([cluster.name, cluster.endpoint, cluster.certificateAuthority])
  .apply(([name, endpoint, ca]) =>
    JSON.stringify({
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [
        {
          name,
          cluster: {
            server: endpoint,
            'certificate-authority-data': ca?.data,
          },
        },
      ],
      contexts: [{ name, context: { cluster: name, user: name } }],
      'current-context': name,
      users: [
        {
          name,
          user: {
            exec: {
              apiVersion: 'client.authentication.k8s.io/v1beta1',
              command: 'aws',
              args: ['eks', 'get-token', '--cluster-name', name],
            },
          },
        },
      ],
    }),
  );

const k8sProvider = new k8s.Provider(
  `${title}-k8s`,
  {
    kubeconfig,
  },
  { dependsOn: [k8sComponent.nodeGroup] },
);

// 10. Install Karpenter via Helm
const karpenterRelease = new k8s.helm.v3.Release(
  `${title}-karpenter`,
  {
    chart: 'karpenter',
    version: '1.9.0',
    repositoryOpts: { repo: 'oci://public.ecr.aws/karpenter' },
    namespace: 'kube-system',
    createNamespace: true,
    values: {
      settings: {
        clusterName,
        interruptionQueue: clusterName,
      },
      serviceAccount: {
        create: true,
        annotations: {
          'eks.amazonaws.com/role-arn': karpenterRole.arn,
        },
      },
      controller: {
        resources: {
          requests: { cpu: '1', memory: '1Gi' },
          limits: { cpu: '1', memory: '1Gi' },
        },
      },
    },
  },
  {
    provider: k8sProvider,
    dependsOn: [karpenterNodeLifecyclePolicy, karpenterInterruptionPolicy],
  },
);

// 11. EC2NodeClass
const ec2NodeClass = new k8s.apiextensions.CustomResource(
  `${title}-ec2-node-class`,
  {
    apiVersion: 'karpenter.k8s.aws/v1',
    kind: 'EC2NodeClass',
    metadata: { name: 'default' },
    spec: {
      role: pulumi.interpolate`KarpenterNodeRole-${clusterName}`,
      amiSelectorTerms: [{ alias: 'al2023@latest' }],
      subnetSelectorTerms: [
        { tags: { 'karpenter.sh/discovery': clusterName } },
      ],
      securityGroupSelectorTerms: [
        { tags: { 'karpenter.sh/discovery': clusterName } },
      ],
    },
  },
  { provider: k8sProvider, dependsOn: [karpenterRelease] },
);

// 12. NodePool (Karpenter provisions nodes - limits allow 2+ nodes)
const nodePool = new k8s.apiextensions.CustomResource(
  `${title}-node-pool`,
  {
    apiVersion: 'karpenter.sh/v1',
    kind: 'NodePool',
    metadata: { name: 'default' },
    spec: {
      template: {
        spec: {
          requirements: [
            { key: 'kubernetes.io/arch', operator: 'In', values: ['amd64'] },
            { key: 'kubernetes.io/os', operator: 'In', values: ['linux'] },
            {
              key: 'karpenter.sh/capacity-type',
              operator: 'In',
              values: ['on-demand'],
            },
            {
              key: 'karpenter.k8s.aws/instance-category',
              operator: 'In',
              values: ['c', 'm', 'r'],
            },
            {
              key: 'karpenter.k8s.aws/instance-generation',
              operator: 'Gt',
              values: ['2'],
            },
          ],
          nodeClassRef: {
            group: 'karpenter.k8s.aws',
            kind: 'EC2NodeClass',
            name: 'default',
          },
        },
      },
      limits: { cpu: '1000' },
      disruption: {
        consolidationPolicy: 'WhenEmptyOrUnderutilized',
        consolidateAfter: '1m',
      },
    },
  },
  { provider: k8sProvider, dependsOn: [ec2NodeClass] },
);

/**
 * Exported Values
 */
export const eksClusterName = cluster.name;
export const eksClusterArn = cluster.arn;
export const eksClusterEndpoint = cluster.endpoint;
export const eksClusterVersion = cluster.version;
export const kubeconfigExport = kubeconfig;
