import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

interface SchedulerStackProps extends cdk.StackProps {
  tenantTable: dynamodb.Table;
  dbInstance: rds.DatabaseInstance;
  dbSecret: cdk.aws_secretsmanager.ISecret;
}

/**
 * Scheduler Stack — EventBridge daily cron + insurance renewal Lambda.
 *
 * Runs daily at 08:00 CET, iterates all tenants, checks expiring insurance,
 * sends email alerts via SES.
 */
export class SchedulerStack extends cdk.Stack {
  public readonly renewalFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: SchedulerStackProps) {
    super(scope, id, props);

    // Insurance renewal Lambda
    this.renewalFunction = new lambda.Function(this, 'InsuranceRenewalFunction', {
      functionName: 'society-erp-insurance-renewal',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'insurance-renewal.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/scheduled/dist')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      environment: {
        NODE_ENV: 'production',
        TENANT_TABLE_NAME: props.tenantTable.tableName,
        DB_SECRET_ARN: props.dbSecret.secretArn,
        DB_HOST: props.dbInstance.instanceEndpoint.hostname,
        DB_PORT: props.dbInstance.instanceEndpoint.port.toString(),
      },
    });

    // Grant access to tenant registry
    props.tenantTable.grantReadData(this.renewalFunction);

    // Grant access to DB credentials
    props.dbSecret.grantRead(this.renewalFunction);

    // Grant SES send email permission
    this.renewalFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'], // TODO: Restrict to verified identity ARN in prod
      }),
    );

    // EventBridge rule — daily at 08:00 CET (07:00 UTC)
    const dailyRule = new events.Rule(this, 'DailyInsuranceCheck', {
      ruleName: 'society-erp-daily-insurance-check',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '7', // 07:00 UTC = 08:00 CET
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    dailyRule.addTarget(new targets.LambdaFunction(this.renewalFunction));

    // Outputs
    new cdk.CfnOutput(this, 'RenewalFunctionArn', {
      value: this.renewalFunction.functionArn,
    });
  }
}
