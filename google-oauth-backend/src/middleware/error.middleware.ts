import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ErrorMessages } from '../constants';

export const errorMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof AppError) {
        return res.status(error.status).json({
            error: error.message,
            details: error.details,
        });
    }

    const status = error.response?.status || 500;
    const details = error.response?.data || { message: error.message };

    const errorMap: { [key: string]: string } = {
        'invalid_grant_401': ErrorMessages.TOKEN_EXCHANGE_FAILED,
        'invalid_grant_400': ErrorMessages.REFRESH_FAILED,
        'invalid_token_401': ErrorMessages.TOKEN_VALIDATION_FAILED,
        '400': ErrorMessages.BAD_REQUEST,
        '401': ErrorMessages.UNAUTHORIZED,
    };

    let errorMessage = ErrorMessages.UNEXPECTED_ERROR;

    const specificErrorKey = `${details.error}_${status}`;
    const generalStatusKey = status.toString();

    if (errorMap[specificErrorKey]) {
        errorMessage = errorMap[specificErrorKey];
    } else if (errorMap[generalStatusKey]) {
        errorMessage = errorMap[generalStatusKey];
    }


    res.status(status).json({
        error: errorMessage,
        details: details,
    });
};
