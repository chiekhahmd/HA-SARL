#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const env: cdk.Environment = {
  region: 'eu-west-3',
  // account will be resolved from CLI profile
};

// TODO: Stacks will be added in Task 2
// new NetworkStack(app, 'SocietyErp-Network', { env });
// new DatabaseStack(app, 'SocietyErp-Database', { env });
// new AuthStack(app, 'SocietyErp-Auth', { env });
// new TenantRegistryStack(app, 'SocietyErp-TenantRegistry', { env });
// new ApiStack(app, 'SocietyErp-Api', { env });
// new SchedulerStack(app, 'SocietyErp-Scheduler', { env });
// new FrontendStack(app, 'SocietyErp-Frontend', { env });

app.synth();
