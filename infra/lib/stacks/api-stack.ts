import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as path from 'path';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  tenantTable: dynamodb.Table;
  userPool: cognito.UserPool;
  dbInstance: rds.DatabaseInstance;
  dbSecret: cdk.aws_secretsmanager.ISecret;
}

/**
 * API Stack — Single Lambda (Hono router) + API Gateway HTTP API.
 *
 * All API routes are handled by one Lambda function.
 * API Gateway proxies all requests via /{proxy+} catch-all.
 */
export class ApiStack extends cdk.Stack {
  public readonly apiFunction: lambda.Function;
  public readonly httpApi: apigw.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Lambda function — Hono router
    this.apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: 'society-erp-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/api/dist')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
        TENANT_TABLE_NAME: props.tenantTable.tableName,
        DB_SECRET_ARN: props.dbSecret.secretArn,
        DB_HOST: props.dbInstance.instanceEndpoint.hostname,
        DB_PORT: props.dbInstance.instanceEndpoint.port.toString(),
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_REGION: this.region,
      },
    });

    // Grant Lambda access to DynamoDB tenant registry
    props.tenantTable.grantReadData(this.apiFunction);

    // Grant Lambda access to DB credentials in Secrets Manager
    props.dbSecret.grantRead(this.apiFunction);

    // HTTP API (API Gateway v2 — cheaper than REST API)
    this.httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: 'society-erp-api',
      corsPreflight: {
        allowOrigins: ['*'], // TODO: Restrict to tenant domains in prod
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PATCH,
          apigw.CorsHttpMethod.DELETE,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Authorization', 'Content-Type'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Proxy all requests to Lambda
    const lambdaIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'LambdaIntegration',
      this.apiFunction,
    );

    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // Also handle root path
    this.httpApi.addRoutes({
      path: '/',
      methods: [apigw.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });
    new cdk.CfnOutput(this, 'ApiFunctionArn', {
      value: this.apiFunction.functionArn,
    });
  }
}
