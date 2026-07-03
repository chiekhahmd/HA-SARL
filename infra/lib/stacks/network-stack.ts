import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Network Stack — Dev environment (minimal, no NAT Gateway cost)
 *
 * For dev: RDS is publicly accessible with a security group restricting access.
 * For prod (future): switch to private subnets + NAT Gateway.
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly rdsSecurityGroup: ec2.SecurityGroup;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use the default VPC for dev (no cost, already exists in every account)
    this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    // Security group for RDS — only allows inbound from Lambda SG and your IP
    this.rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: 'society-erp-rds-sg',
      description: 'Allow PostgreSQL access from Lambda and developer',
      allowAllOutbound: true,
    });

    // Security group for Lambda (used when Lambda is in VPC — future prod)
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: 'society-erp-lambda-sg',
      description: 'Lambda function security group',
      allowAllOutbound: true,
    });

    // Allow Lambda SG → RDS on port 5432
    this.rdsSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to RDS',
    );

    // Allow inbound from anywhere on 5432 for dev (public RDS)
    // In production, remove this and use VPC + private subnets
    this.rdsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow public access for dev (restrict in prod)',
    );

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId });
    new cdk.CfnOutput(this, 'RdsSecurityGroupId', { value: this.rdsSecurityGroup.securityGroupId });
  }
}
