import { Response } from 'express';
import { ApiResponse } from '@shared/types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>,
): Response => {
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};
