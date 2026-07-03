#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { TenantRegistryStack } from '../lib/stacks/tenant-registry-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { SchedulerStack } from '../lib/stacks/scheduler-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: '948360714523',
  region: 'eu-west-3',
};

// Foundation
const network = new NetworkStack(app, 'SocietyErp-Network', { env });

const database = new DatabaseStack(app, 'SocietyErp-Database', {
  env,
  vpc: network.vpc,
  rdsSecurityGroup: network.rdsSecurityGroup,
});

const auth = new AuthStack(app, 'SocietyErp-Auth', { env });

const tenantRegistry = new TenantRegistryStack(app, 'SocietyErp-TenantRegistry', { env });

// Application
const api = new ApiStack(app, 'SocietyErp-Api', {
  env,
  tenantTable: tenantRegistry.tenantTable,
  userPool: auth.userPool,
  dbInstance: database.dbInstance,
  dbSecret: database.dbSecret,
});

new SchedulerStack(app, 'SocietyErp-Scheduler', {
  env,
  tenantTable: tenantRegistry.tenantTable,
  dbInstance: database.dbInstance,
  dbSecret: database.dbSecret,
});

new FrontendStack(app, 'SocietyErp-Frontend', {
  env,
  httpApi: api.httpApi,
});

app.synth();
