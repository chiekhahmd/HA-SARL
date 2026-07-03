/**
 * Zod validation schemas for API request bodies.
 * These are used by @hono/zod-validator middleware.
 */
import { z } from 'zod';

// ============================================================================
// SHARED
// ============================================================================

export const uuidSchema = z.string().uuid();

// ============================================================================
// USERS
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(['admin', 'manager', 'worker']),
});

export const updateUserSchema = z.object({
  role: z.enum(['admin', 'manager', 'worker']).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// PROJECTS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  budget: z.number().min(0, 'Budget must be non-negative'),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  budget: z.number().min(0, 'Budget must be non-negative').optional(),
  description: z.string().optional(),
});

// ============================================================================
// WORKERS
// ============================================================================

export const createWorkerSchema = z.object({
  name: z.string().min(1).max(255),
  costRate: z.number().min(0, 'Cost rate must be non-negative'),
  userId: z.string().uuid().optional(),
});

export const updateWorkerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  costRate: z.number().min(0, 'Cost rate must be non-negative').optional(),
});

// ============================================================================
// TIME ENTRIES
// ============================================================================

export const createTimeEntrySchema = z.object({
  projectId: z.string().uuid(),
  entryDate: z.string().date(), // ISO date string (YYYY-MM-DD)
  hours: z.number().gt(0, 'Hours must be greater than 0').lte(24, 'Hours cannot exceed 24'),
  notes: z.string().optional(),
});

export const updateTimeEntrySchema = z.object({
  projectId: z.string().uuid().optional(),
  entryDate: z.string().date().optional(),
  hours: z.number().gt(0).lte(24).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// ABSENCES
// ============================================================================

export const createAbsenceSchema = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date(),
    absenceType: z.string().min(1).max(50),
    notes: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

// ============================================================================
// MATERIALS
// ============================================================================

export const createMaterialSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().gt(0, 'Quantity must be greater than 0'),
  unit: z.string().max(50).optional(),
  purchaseCost: z.number().min(0, 'Purchase cost must be non-negative'),
  purchaseDate: z.string().date().optional(),
  supplier: z.string().max(255).optional(),
});

export const updateMaterialSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  quantity: z.number().gt(0).optional(),
  unit: z.string().max(50).optional(),
  purchaseCost: z.number().min(0).optional(),
  purchaseDate: z.string().date().optional(),
  supplier: z.string().max(255).optional(),
});

// ============================================================================
// MATERIAL ALLOCATIONS
// ============================================================================

export const createMaterialAllocationSchema = z.object({
  materialId: z.string().uuid(),
  projectId: z.string().uuid(),
  allocatedQuantity: z.number().gt(0, 'Allocated quantity must be greater than 0'),
  allocatedCost: z.number().min(0, 'Allocated cost must be non-negative'),
});

// ============================================================================
// VEHICLES
// ============================================================================

export const createVehicleSchema = z.object({
  identifier: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const updateVehicleSchema = z.object({
  description: z.string().optional(),
});

// ============================================================================
// INSURANCE PERIODS
// ============================================================================

export const createInsurancePeriodSchema = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date(),
    insurer: z.string().max(255).optional(),
    policyNumber: z.string().max(100).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const updateInsurancePeriodSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  insurer: z.string().max(255).optional(),
  policyNumber: z.string().max(100).optional(),
});
