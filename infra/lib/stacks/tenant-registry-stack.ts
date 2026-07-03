import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Tenant Registry Stack — DynamoDB table storing tenant configuration.
 *
 * Each item contains: tenant_id, db_name, domain, branding, modules, locale, currency.
 * Zero cost at rest (on-demand billing, free tier covers reads/writes at low scale).
 */
export class TenantRegistryStack extends cdk.Stack {
  public readonly tenantTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.tenantTable = new dynamodb.Table(this, 'TenantRegistryTable', {
      tableName: 'society-erp-tenants',
      partitionKey: {
        name: 'tenant_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Zero cost at rest
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Dev only — RETAIN in prod
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // Outputs
    new cdk.CfnOutput(this, 'TenantTableName', {
      value: this.tenantTable.tableName,
      description: 'DynamoDB tenant registry table name',
    });
    new cdk.CfnOutput(this, 'TenantTableArn', {
      value: this.tenantTable.tableArn,
    });
  }
}
