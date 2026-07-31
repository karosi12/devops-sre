import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { VpcArgs, NetworkArgs } from '../utils/types/network';

/**
 * Minimal VPC Component - Creates only the VPC resource
 * Use this when you need just a VPC without any networking infrastructure
 */
export class VpcComponent extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;

  constructor(
    name: string,
    args: VpcArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:vpc:VpcComponent', name, {}, opts);

    this.vpc = new aws.ec2.Vpc(
      name,
      {
        cidrBlock: args.cidrBlock,
        enableDnsSupport: args.enableDnsSupport ?? true,
        enableDnsHostnames: args.enableDnsHostnames ?? true,
        tags: {
          Name: name,
          Environment: args.Environment || 'dev',
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      vpcId: this.vpc.id,
    });
  }
}

/**
 * Full Network Component - Creates VPC with optional networking resources
 * Uses lazy/factoring pattern to only create resources when enabled
 * 
 * Cost Optimization:
 * - NAT Gateway (~$32/month) is only created if enablePrivateSubnets=true
 * - Security groups are only created if not provided externally
 * - Private subnets only created when explicitly enabled
 */
export class NetworkComponent extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;
  public readonly internetGateway?: aws.ec2.InternetGateway;
  public readonly natGateway?: aws.ec2.NatGateway;
  public readonly natGatewayEip?: aws.ec2.Eip;
  public readonly publicSubnets: aws.ec2.Subnet[] = [];
  public readonly privateSubnets: aws.ec2.Subnet[] = [];
  public readonly publicRouteTable?: aws.ec2.RouteTable;
  public readonly privateRouteTable?: aws.ec2.RouteTable;
  public readonly publicSecurityGroup?: aws.ec2.SecurityGroup;
  public readonly privateSecurityGroup?: aws.ec2.SecurityGroup;

  constructor(
    name: string,
    args: NetworkArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('aws:network:NetworkComponent', name, {}, opts);

    const availabilityZones = aws.getAvailabilityZones({ state: 'available' });
    
    // 1. Create VPC (always required)
    this.vpc = new aws.ec2.Vpc(
      `${name}-vpc`,
      {
        cidrBlock: args.cidrBlock,
        enableDnsSupport: args.enableDnsSupport ?? true,
        enableDnsHostnames: args.enableDnsHostnames ?? true,
        tags: {
          Name: `${name}-vpc`,
          Environment: args.Environment || 'dev',
        },
      },
      { parent: this },
    );

    // 2. Create Internet Gateway (required for public subnets)
    if (args.enablePublicSubnets !== false) {
      this.internetGateway = new aws.ec2.InternetGateway(
        `${name}-igw`,
        {
          vpcId: this.vpc.id,
          tags: { Name: `${name}-igw`, Environment: args.Environment || 'dev' },
        },
        { parent: this },
      );
    }

    // 3. Create Public Subnets (enabled by default)
    if (args.enablePublicSubnets !== false) {
      const publicSubnetConfigs = args.publicSubnetConfigs || [
        { cidrBlock: '10.0.1.0/24', azIndex: 0 },
        { cidrBlock: '10.0.2.0/24', azIndex: 1 },
      ];

      for (let i = 0; i < publicSubnetConfigs.length; i++) {
        const config = publicSubnetConfigs[i];
        const subnet = new aws.ec2.Subnet(
          `${name}-public-subnet-${i + 1}`,
          {
            vpcId: this.vpc.id,
            cidrBlock: config.cidrBlock,
            availabilityZone: availabilityZones.then((zones) => zones.names[config.azIndex]),
            mapPublicIpOnLaunch: true,
            tags: { 
              Name: `${name}-public-subnet-${i + 1}`, 
              Environment: args.Environment || 'dev',
              Type: 'public'
            },
          },
          { parent: this },
        );
        this.publicSubnets.push(subnet);
      }

      // Public Route Table with IGW route
      this.publicRouteTable = new aws.ec2.RouteTable(
        `${name}-public-rt`,
        {
          vpcId: this.vpc.id,
          routes: this.internetGateway ? [
            {
              cidrBlock: '0.0.0.0/0',
              gatewayId: this.internetGateway.id,
            },
          ] : [],
          tags: { Name: `${name}-public-rt`, Environment: args.Environment || 'dev' },
        },
        { parent: this },
      );

      // Associate public subnets with public route table
      this.publicSubnets.forEach((subnet, index) => {
        new aws.ec2.RouteTableAssociation(
          `${name}-public-rt-assoc-${index + 1}`,
          {
            subnetId: subnet.id,
            routeTableId: this.publicRouteTable!.id,
          },
          { parent: this },
        );
      });
    }

    // 4. Create NAT Gateway and Private Subnets (LAZY - only if enabled)
    if (args.enablePrivateSubnets) {
      // NAT Gateway requires an EIP
      this.natGatewayEip = new aws.ec2.Eip(
        `${name}-nat-eip`,
        {
          domain: 'vpc',
          tags: { Name: `${name}-nat-eip`, Environment: args.Environment || 'dev' },
        },
        { parent: this },
      );

      // NAT Gateway is placed in the first public subnet
      if (this.publicSubnets.length > 0) {
        this.natGateway = new aws.ec2.NatGateway(
          `${name}-nat-gateway`,
          {
            subnetId: this.publicSubnets[0].id,
            allocationId: this.natGatewayEip.id,
            tags: { Name: `${name}-nat-gateway`, Environment: args.Environment || 'dev' },
          },
          { parent: this },
        );
      }

      // Create Private Subnets
      const privateSubnetConfigs = args.privateSubnetConfigs || [
        { cidrBlock: '10.0.3.0/24', azIndex: 2 },
      ];

      for (let i = 0; i < privateSubnetConfigs.length; i++) {
        const config = privateSubnetConfigs[i];
        const subnet = new aws.ec2.Subnet(
          `${name}-private-subnet-${i + 1}`,
          {
            vpcId: this.vpc.id,
            cidrBlock: config.cidrBlock,
            availabilityZone: availabilityZones.then((zones) => zones.names[config.azIndex % zones.names.length]),
            mapPublicIpOnLaunch: false,
            tags: { 
              Name: `${name}-private-subnet-${i + 1}`, 
              Environment: args.Environment || 'dev',
              Type: 'private'
            },
          },
          { parent: this },
        );
        this.privateSubnets.push(subnet);
      }

      // Private Route Table with NAT Gateway route
      this.privateRouteTable = new aws.ec2.RouteTable(
        `${name}-private-rt`,
        {
          vpcId: this.vpc.id,
          routes: this.natGateway ? [
            {
              cidrBlock: '0.0.0.0/0',
              natGatewayId: this.natGateway.id,
            },
          ] : [],
          tags: { Name: `${name}-private-rt`, Environment: args.Environment || 'dev' },
        },
        { parent: this },
      );

      // Associate private subnets with private route table
      this.privateSubnets.forEach((subnet, index) => {
        new aws.ec2.RouteTableAssociation(
          `${name}-private-rt-assoc-${index + 1}`,
          {
            subnetId: subnet.id,
            routeTableId: this.privateRouteTable!.id,
          },
          { parent: this },
        );
      });
    }

    // 5. Create Security Groups (LAZY - only if not provided externally)
    if (args.createSecurityGroups !== false) {
      const myIpAddress = args.myIpAddress || '0.0.0.0/0';

      this.publicSecurityGroup = new aws.ec2.SecurityGroup(
        `${name}-web-sg`,
        {
          vpcId: this.vpc.id,
          description: 'Allow SSH and HTTP/HTTPS from internet',
          name: `${name}-web-sg`,
          ingress: [
            {
              protocol: 'tcp',
              fromPort: 22,
              toPort: 22,
              cidrBlocks: [myIpAddress],
              description: 'SSH from specific IP',
            },
            { 
              protocol: 'tcp', 
              fromPort: 80, 
              toPort: 80, 
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTP from internet'
            },
            { 
              protocol: 'tcp', 
              fromPort: 443, 
              toPort: 443, 
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTPS from internet'
            },
          ],
          egress: [
            { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
          ],
          tags: { Name: `${name}-web-sg`, Environment: args.Environment || 'dev' },
        },
        { parent: this },
      );

      // Private SG only created if private subnets exist
      // Uses VPC CIDR as source for simplicity (can be refined with specific subnet CIDRs)
      if (this.privateSubnets.length > 0) {
        this.privateSecurityGroup = new aws.ec2.SecurityGroup(
          `${name}-private-sg`,
          {
            vpcId: this.vpc.id,
            description: 'Private security group - allows ingress from VPC CIDR only',
            name: `${name}-private-sg`,
            ingress: [
              { 
                protocol: 'tcp', 
                fromPort: 80, 
                toPort: 80, 
                cidrBlocks: [args.cidrBlock],
                description: 'HTTP from within VPC'
              },
              { 
                protocol: 'tcp', 
                fromPort: 443, 
                toPort: 443, 
                cidrBlocks: [args.cidrBlock],
                description: 'HTTPS from within VPC'
              },
              {
                protocol: 'tcp',
                fromPort: 22,
                toPort: 22,
                cidrBlocks: [args.cidrBlock],
                description: 'SSH from within VPC (bastion access)',
              },
            ],
            egress: [
              { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
            ],
            tags: { Name: `${name}-private-sg`, Environment: args.Environment || 'dev' },
          },
          { parent: this },
        );
      }
    }

    this.registerOutputs({
      vpcId: this.vpc.id,
      vpcCidr: this.vpc.cidrBlock,
      publicSubnetIds: this.publicSubnets.map(s => s.id),
      privateSubnetIds: this.privateSubnets.map(s => s.id),
      publicSecurityGroupId: this.publicSecurityGroup?.id,
      privateSecurityGroupId: this.privateSecurityGroup?.id,
      natGatewayId: this.natGateway?.id,
      internetGatewayId: this.internetGateway?.id,
    });
  }
}
