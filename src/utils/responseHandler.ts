import { ResponseObject } from './types';
import { Response } from "express";

// Centralized error handler
export const handleError = (
    res: Response, 
    statusCode: number, 
    error: unknown
): Response => {
    const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
            ? error 
            : 'An unexpected error occurred';

    const response: ResponseObject = {
        error: true,
        message: errorMessage,
    };

    return res.status(statusCode).json(response);
}

// Success response handler
export const successResponse = (
    res: Response, 
    statusCode: number, 
    data: object, 
    message: string,
    pagination?: object,
    result?: object
): Response => {
    const response: ResponseObject = {
        error: false,
        message,
        data,
        pagination,
        result
    };

    return res.status(statusCode).json(response);
}