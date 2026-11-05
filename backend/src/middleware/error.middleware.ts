import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Wrapper for asynchronous controller functions.
 * Replaces try/catch blocks.
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Express Global Error Handling Middleware.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error:', err);

if (err instanceof ZodError) {
    const errorMessages = err.issues.map((issue) => issue.message).join(', ');
    return res.status(400).json({ message: `Validation error: ${errorMessages}` });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
};