/**
 * Insurance Renewal Checker — Scheduled Lambda (daily at 08:00 CET).
 *
 * Iterates all active tenants, checks for insurance periods expiring
 * within the configured lead time, and sends email alerts via SES.
 */
import type { ScheduledEvent } from 'aws-lambda';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, lte, sql } from 'drizzle-orm';
import postgres from 'postgres';

// Inline schema references (to avoid importing from api package)
import { pgTable, uuid, varchar, date, boolean, timestamp } from 'drizzle-orm/pg-core';

const insurancePeriods = pgTable('insurance_periods', {
  id: uuid('id').primaryKey(),
  vehicleId: uuid('vehicle_id').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  insurer: varchar('insurer', { length: 255 }),
  policyNumber: varchar('policy_number', { length: 100 }),
  alertSent: boolean('alert_sent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey(),
  identifier: varchar('identifier', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
});

const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull(),
});

// AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.COGNITO_REGION || 'eu-west-3' });
const sesClient = new SESClient({ region: process.env.COGNITO_REGION || 'eu-west-3' });
const secretsClient = new SecretsManagerClient({ region: process.env.COGNITO_REGION || 'eu-west-3' });

interface TenantRecord {
  tenant_id: string;
  db_name: string;
  display_name: string;
  config: {
    alert_lead_time_days: number;
  };
  is_active: boolean;
}

export const handler = async (event: ScheduledEvent): Promise<void> => {
  console.log('Insurance renewal check started', { time: event.time });

  // Fetch all active tenants
  const tenants = await getActiveTenants();
  console.log(`Found ${tenants.length} active tenants`);

  // Get DB credentials
  const dbCreds = await getDbCredentials();

  for (const tenant of tenants) {
    try {
      await checkTenantInsurance(tenant, dbCreds);
    } catch (error) {
      console.error(`Failed processing tenant ${tenant.tenant_id}:`, error);
      // Continue with other tenants
    }
  }

  console.log('Insurance renewal check completed');
};

async function getActiveTenants(): Promise<TenantRecord[]> {
  const result = await dynamoClient.send(
    new ScanCommand({ TableName: process.env.TENANT_TABLE_NAME || 'society-erp-tenants' }),
  );

  if (!result.Items) return [];

  return result.Items.map((item) => unmarshall(item) as TenantRecord).filter((t) => t.is_active);
}

async function getDbCredentials() {
  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DB_SECRET_ARN not set');
  }

  const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!result.SecretString) throw new Error('DB secret empty');

  return JSON.parse(result.SecretString);
}

async function checkTenantInsurance(
  tenant: TenantRecord,
  dbCreds: { username: string; password: string; host?: string },
) {
  const connection = postgres({
    host: dbCreds.host || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: dbCreds.username,
    password: dbCreds.password,
    database: tenant.db_name,
    max: 1,
  });

  const db = drizzle(connection);
  const leadTimeDays = tenant.config.alert_lead_time_days || 30;

  try {
    // Find insurance periods expiring within lead time that haven't been alerted
    const expiringPeriods = await db
      .select({
        periodId: insurancePeriods.id,
        vehicleId: insurancePeriods.vehicleId,
        endDate: insurancePeriods.endDate,
        insurer: insurancePeriods.insurer,
        vehicleIdentifier: vehicles.identifier,
        vehicleDescription: vehicles.description,
      })
      .from(insurancePeriods)
      .innerJoin(vehicles, eq(insurancePeriods.vehicleId, vehicles.id))
      .where(
        and(
          eq(insurancePeriods.alertSent, false),
          lte(insurancePeriods.endDate, sql`CURRENT_DATE + ${leadTimeDays}::integer`),
        ),
      );

    if (expiringPeriods.length === 0) {
      console.log(`Tenant ${tenant.tenant_id}: no expiring insurance periods`);
      return;
    }

    // Get manager emails for this tenant
    const managers = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.role, 'manager')));

    const adminEmails = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.role, 'admin')));

    const recipientEmails = [...managers, ...adminEmails].map((u) => u.email);

    if (recipientEmails.length === 0) {
      console.log(`Tenant ${tenant.tenant_id}: no managers/admins to notify`);
      return;
    }

    // Send alert for each expiring period
    for (const period of expiringPeriods) {
      try {
        await sendRenewalEmail(tenant, period, recipientEmails);

        // Mark as sent
        await db
          .update(insurancePeriods)
          .set({ alertSent: true })
          .where(eq(insurancePeriods.id, period.periodId));

        console.log(
          `Tenant ${tenant.tenant_id}: alert sent for vehicle ${period.vehicleIdentifier}`,
        );
      } catch (error) {
        console.error(
          `Failed sending alert for vehicle ${period.vehicleIdentifier}:`,
          error,
        );
        // Leave alertSent = false → will retry tomorrow
      }
    }
  } finally {
    await connection.end();
  }
}

async function sendRenewalEmail(
  tenant: TenantRecord,
  period: { vehicleIdentifier: string; vehicleDescription: string | null; endDate: string; insurer: string | null },
  recipients: string[],
) {
  const subject = `[${tenant.display_name}] Insurance Renewal: ${period.vehicleIdentifier}`;
  const body = `
Vehicle: ${period.vehicleIdentifier}${period.vehicleDescription ? ` (${period.vehicleDescription})` : ''}
Insurance expires: ${period.endDate}
${period.insurer ? `Insurer: ${period.insurer}` : ''}

Please renew the insurance before the expiry date.

— ${tenant.display_name} ERP System
`.trim();

  await sesClient.send(
    new SendEmailCommand({
      Destination: { ToAddresses: recipients },
      Message: {
        Subject: { Data: subject },
        Body: {
          Text: { Data: body },
          Html: {
            Data: `<html><body><pre>${body}</pre></body></html>`,
          },
        },
      },
      Source: process.env.SES_FROM_EMAIL || 'noreply@society-erp.com',
    }),
  );
}
