import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  rdsSecurityGroup: ec2.SecurityGroup;
}

/**
 * Database Stack — RDS PostgreSQL (shared instance, one DB per tenant)
 *
 * Dev: db.t3.micro (free tier), publicly accessible, no Multi-AZ.
 * Prod (future): Aurora Serverless v2, private subnets, Multi-AZ.
 */
export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecret: cdk.aws_secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // RDS PostgreSQL instance
    this.dbInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [props.rdsSecurityGroup],

      // Database config
      databaseName: 'hasarl_db', // First tenant DB (additional DBs created via migration scripts)
      credentials: rds.Credentials.fromGeneratedSecret('society_erp_admin', {
        secretName: 'society-erp/rds-master-credentials',
      }),

      // Storage
      allocatedStorage: 20, // GB (free tier allows up to 20GB)
      maxAllocatedStorage: 50, // Auto-scale storage if needed
      storageType: rds.StorageType.GP2,

      // Accessibility
      publiclyAccessible: true, // Dev only — disable in prod
      multiAz: false, // Dev only — enable in prod

      // Backup & maintenance
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Dev only — enable in prod
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Dev only — RETAIN in prod

      // Parameters
      parameterGroup: new rds.ParameterGroup(this, 'PostgresParams', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
        parameters: {
          'rds.force_ssl': '0', // Dev only — set to 1 in prod
        },
      }),
    });

    this.dbSecret = this.dbInstance.secret!;

    // Outputs
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbInstance.instanceEndpoint.hostname,
      description: 'RDS instance endpoint',
    });
    new cdk.CfnOutput(this, 'DbPort', {
      value: this.dbInstance.instanceEndpoint.port.toString(),
    });
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'Secrets Manager ARN for DB credentials',
    });
  }
}
