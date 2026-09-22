import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An unexpected internal error occurred';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || exception.message;
        error = obj.error || exception.name;
        code = obj.code || code;
      }
    } else if (exception instanceof Error) {
      const err = exception as any;
      // Handle third-party upstream connection errors (Jenkins, Nexus, MinIO, GitLab)
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Service Unavailable';
        message = `Upstream service connection refused (${err.address || 'remote'}:${err.port || ''}). Verify supporting services are running.`;
        code = 'SERVICE_CONNECTION_REFUSED';
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        status = HttpStatus.GATEWAY_TIMEOUT;
        error = 'Gateway Timeout';
        message = 'Upstream gateway request timed out.';
        code = 'GATEWAY_TIMEOUT';
      } else if (err.code === 'ENOTFOUND') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Service Unavailable';
        message = `Upstream host '${err.hostname || 'destination'}' could not be resolved.`;
        code = 'HOST_NOT_FOUND';
      } else {
        message = exception.message || message;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} ${error}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - ${status} ${error}: ${message}`);
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      code,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
