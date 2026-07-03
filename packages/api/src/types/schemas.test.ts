import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  createWorkerSchema,
  createTimeEntrySchema,
  createAbsenceSchema,
  createMaterialSchema,
  createMaterialAllocationSchema,
  createVehicleSchema,
  createInsurancePeriodSchema,
  createUserSchema,
} from './schemas';

describe('createUserSchema', () => {
  it('accepts valid user', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      name: 'John Doe',
      role: 'manager',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      email: 'not-an-email',
      name: 'John',
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      name: 'John',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });
});

describe('createProjectSchema', () => {
  it('accepts valid project', () => {
    const result = createProjectSchema.safeParse({
      name: 'Project Alpha',
      budget: 50000,
      description: 'A test project',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative budget', () => {
    const result = createProjectSchema.safeParse({
      name: 'Project',
      budget: -100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('budget');
    }
  });

  it('rejects empty name', () => {
    const result = createProjectSchema.safeParse({
      name: '',
      budget: 1000,
    });
    expect(result.success).toBe(false);
  });
});

describe('createWorkerSchema', () => {
  it('accepts valid worker', () => {
    const result = createWorkerSchema.safeParse({
      name: 'Worker One',
      costRate: 25.5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative cost rate', () => {
    const result = createWorkerSchema.safeParse({
      name: 'Worker',
      costRate: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe('createTimeEntrySchema', () => {
  it('accepts valid time entry', () => {
    const result = createTimeEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      entryDate: '2026-07-01',
      hours: 8,
    });
    expect(result.success).toBe(true);
  });

  it('rejects hours > 24', () => {
    const result = createTimeEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      entryDate: '2026-07-01',
      hours: 25,
    });
    expect(result.success).toBe(false);
  });

  it('rejects hours <= 0', () => {
    const result = createTimeEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      entryDate: '2026-07-01',
      hours: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createTimeEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      entryDate: '01/07/2026',
      hours: 8,
    });
    expect(result.success).toBe(false);
  });
});

describe('createAbsenceSchema', () => {
  it('accepts valid absence', () => {
    const result = createAbsenceSchema.safeParse({
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      absenceType: 'vacation',
    });
    expect(result.success).toBe(true);
  });

  it('rejects end date before start date', () => {
    const result = createAbsenceSchema.safeParse({
      startDate: '2026-07-05',
      endDate: '2026-07-01',
      absenceType: 'vacation',
    });
    expect(result.success).toBe(false);
  });

  it('accepts same start and end date', () => {
    const result = createAbsenceSchema.safeParse({
      startDate: '2026-07-01',
      endDate: '2026-07-01',
      absenceType: 'sick',
    });
    expect(result.success).toBe(true);
  });
});

describe('createMaterialSchema', () => {
  it('accepts valid material', () => {
    const result = createMaterialSchema.safeParse({
      name: 'Aluminium Sheet',
      quantity: 100,
      unit: 'kg',
      purchaseCost: 5000,
      supplier: 'Metal Corp',
    });
    expect(result.success).toBe(true);
  });

  it('rejects quantity <= 0', () => {
    const result = createMaterialSchema.safeParse({
      name: 'Material',
      quantity: 0,
      purchaseCost: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative purchase cost', () => {
    const result = createMaterialSchema.safeParse({
      name: 'Material',
      quantity: 10,
      purchaseCost: -50,
    });
    expect(result.success).toBe(false);
  });
});

describe('createMaterialAllocationSchema', () => {
  it('accepts valid allocation', () => {
    const result = createMaterialAllocationSchema.safeParse({
      materialId: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '550e8400-e29b-41d4-a716-446655440001',
      allocatedQuantity: 50,
      allocatedCost: 2500,
    });
    expect(result.success).toBe(true);
  });

  it('rejects quantity <= 0', () => {
    const result = createMaterialAllocationSchema.safeParse({
      materialId: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '550e8400-e29b-41d4-a716-446655440001',
      allocatedQuantity: 0,
      allocatedCost: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('createVehicleSchema', () => {
  it('accepts valid vehicle', () => {
    const result = createVehicleSchema.safeParse({
      identifier: '123-TUN-456',
      description: 'White Peugeot Partner',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty identifier', () => {
    const result = createVehicleSchema.safeParse({
      identifier: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('createInsurancePeriodSchema', () => {
  it('accepts valid insurance period', () => {
    const result = createInsurancePeriodSchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      insurer: 'STAR Assurances',
      policyNumber: 'POL-2026-001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects end date before start date', () => {
    const result = createInsurancePeriodSchema.safeParse({
      startDate: '2027-01-01',
      endDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });
});
