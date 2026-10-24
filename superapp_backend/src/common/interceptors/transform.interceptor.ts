import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { BYPASS_TRANSFORM_KEY } from '../decorators/bypass-transform.decorator';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isBypassed) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((response) => {
        // Skip transformation if headers were already sent or if returning raw binary/stream
        if (
          res.headersSent ||
          response instanceof StreamableFile ||
          Buffer.isBuffer(response)
        ) {
          return response;
        }

        const statusCode = res.statusCode || HttpStatus.OK;
        const path = req.originalUrl || req.url || '';
        const timestamp = new Date().toISOString();

        // Handle null / undefined responses (e.g. 204 or empty returns)
        if (response === null || response === undefined) {
          return {
            success: true,
            statusCode,
            message: 'Success',
            data: null,
            path,
            timestamp,
          };
        }

        // Handle Paginated Responses (objects with meta)
        if (
          typeof response === 'object' &&
          response !== null &&
          'meta' in response
        ) {
          return {
            success: response.success ?? true,
            statusCode,
            message: response.message || 'Success',
            ...('data' in response ? {} : response),
            data: 'data' in response ? response.data : response,
            meta: response.meta,
            path,
            timestamp,
          };
        }

        // Handle Authentication / Token Responses (preserve root credentials for backwards compatibility)
        if (
          typeof response === 'object' &&
          response !== null &&
          ('access_token' in response || 'refresh_token' in response)
        ) {
          return {
            success: response.success ?? true,
            statusCode,
            message: response.message || 'Success',
            ...response,
            path,
            timestamp,
          };
        }

        // Handle already-wrapped data payloads with explicit success flag
        if (
          typeof response === 'object' &&
          response !== null &&
          'success' in response &&
          'data' in response
        ) {
          return {
            success: response.success,
            statusCode,
            message: response.message || 'Success',
            data: response.data,
            ...(response.meta ? { meta: response.meta } : {}),
            path,
            timestamp,
          };
        }

        // Standard wrapping for single objects, arrays, and primitive returns
        return {
          success: true,
          statusCode,
          message:
            (typeof response === 'object' &&
              response !== null &&
              response.message) ||
            'Success',
          data: response,
          path,
          timestamp,
        };
      }),
    );
  }
}
