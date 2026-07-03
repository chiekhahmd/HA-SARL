import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  date,
  timestamp,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { jsonb } from 'drizzle-orm/pg-core';

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  cognitoSub: varchar('cognito_sub', { length: 128 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // admin | manager | worker
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  budget: numeric('budget', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// WORKERS
// ============================================================================

export const workers = pgTable('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  costRate: numeric('cost_rate', { precision: 10, scale: 2 }).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// COST RATE HISTORY
// ============================================================================

export const costRateHistory = pgTable(
  'cost_rate_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    costRate: numeric('cost_rate', { precision: 10, scale: 2 }).notNull(),
    effectiveFrom: date('effective_from').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueWorkerEffectiveFrom: unique('uq_worker_effective_from').on(
      table.workerId,
      table.effectiveFrom,
    ),
  }),
);

// ============================================================================
// TIME ENTRIES
// ============================================================================

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  workerId: uuid('worker_id')
    .notNull()
    .references(() => workers.id),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  entryDate: date('entry_date').notNull(),
  hours: numeric('hours', { precision: 4, scale: 2 }).notNull(),
  laborCost: numeric('labor_cost', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// ABSENCES
// ============================================================================

export const absences = pgTable(
  'absences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workers.id),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    absenceType: varchar('absence_type', { length: 50 }).notNull(),
    notes: text('notes'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workerDatesIdx: index('idx_absences_worker_dates').on(
      table.workerId,
      table.startDate,
      table.endDate,
    ),
    datesCheck: check('chk_absence_dates', sql`${table.endDate} >= ${table.startDate}`),
  }),
);

// ============================================================================
// MATERIALS
// ============================================================================

export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 50 }),
  purchaseCost: numeric('purchase_cost', { precision: 12, scale: 2 }).notNull(),
  purchaseDate: date('purchase_date'),
  supplier: varchar('supplier', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// MATERIAL ALLOCATIONS
// ============================================================================

export const materialAllocations = pgTable('material_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id')
    .notNull()
    .references(() => materials.id),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  allocatedQuantity: numeric('allocated_quantity', { precision: 10, scale: 2 }).notNull(),
  allocatedCost: numeric('allocated_cost', { precision: 12, scale: 2 }).notNull(),
  metadata: jsonb('metadata').default({}),
  allocatedAt: timestamp('allocated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// VEHICLES
// ============================================================================

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: varchar('identifier', { length: 100 }).unique().notNull(),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// INSURANCE PERIODS
// ============================================================================

export const insurancePeriods = pgTable(
  'insurance_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    insurer: varchar('insurer', { length: 255 }),
    policyNumber: varchar('policy_number', { length: 100 }),
    alertSent: boolean('alert_sent').notNull().default(false),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleEndIdx: index('idx_insurance_vehicle_end').on(table.vehicleId, table.endDate),
    datesCheck: check('chk_insurance_dates', sql`${table.endDate} >= ${table.startDate}`),
  }),
);
