/**
 * Error Handler Middleware
 *
 * Catches all errors and returns a consistent JSON response format:
 * { error: { code: "ERROR_CODE", message: "Human-readable message" } }
 *
 * Handles:
 * - HTTPException (thrown by auth, module guard, route handlers)
 * - Zod validation errors (thrown by @hono/zod-validator)
 * - Unexpected errors (500 Internal Server Error)
 */
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

export const errorHandler = () => {
  return createMiddleware(async (c, next) => {
    try {
      await next();
    } catch (error) {
      // HTTPException (from auth, guards, handlers)
      if (error instanceof HTTPException) {
        const status = error.status;
        const response: ErrorResponse = {
          error: {
            code: getErrorCode(status),
            message: error.message,
          },
        };
        return c.json(response, status);
      }

      // Zod validation error
      if (error instanceof ZodError) {
        const response: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        };
        return c.json(response, 400);
      }

      // Unexpected error
      console.error('Unhandled error:', error);
      const response: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      return c.json(response, 500);
    }
  });
};
