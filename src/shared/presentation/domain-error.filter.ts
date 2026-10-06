import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain/domain-error';
import { httpStatusFor } from './error-status.map';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = httpStatusFor(error.code);
    response.status(statusCode).json({ statusCode, errorCode: error.code, message: error.message });
  }
}
