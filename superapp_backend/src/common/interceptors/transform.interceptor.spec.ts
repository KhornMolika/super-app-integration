import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor (Unified Enterprise Envelope)', () => {
  let interceptor: TransformInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TransformInterceptor(reflector);
  });

  function createMockContext(
    opts: {
      url?: string;
      statusCode?: number;
      headersSent?: boolean;
      isHttp?: boolean;
      isBypassed?: boolean;
    } = {},
  ): ExecutionContext {
    const {
      url = '/api/users',
      statusCode = 200,
      headersSent = false,
      isHttp = true,
      isBypassed = false,
    } = opts;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isBypassed);

    const req = { originalUrl: url, url };
    const res = { statusCode, headersSent };

    return {
      getType: () => (isHttp ? 'http' : 'rpc'),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  function createCallHandler(returnValue: any): CallHandler {
    return {
      handle: () => of(returnValue),
    };
  }

  it('should wrap paginated results into the Unified Enterprise Envelope', (done) => {
    const context = createMockContext({ url: '/users?page=1&limit=2' });
    const paginatedInput = {
      success: true,
      data: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      meta: {
        page: 1,
        limit: 2,
        totalItems: 4,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };

    interceptor
      .intercept(context, createCallHandler(paginatedInput))
      .subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.statusCode).toBe(200);
          expect(result.message).toBe('Success');
          expect(result.path).toBe('/users?page=1&limit=2');
          expect(typeof result.timestamp).toBe('string');
          expect(result.data).toEqual(paginatedInput.data);
          expect(result.meta).toEqual(paginatedInput.meta);
          done();
        },
        error: done,
      });
  });

  it('should wrap a plain entity or object into the Unified Enterprise Envelope', (done) => {
    const context = createMockContext({ url: '/users/user-123' });
    const user = { id: 'user-123', name: 'Alice', email: 'alice@example.com' };

    interceptor.intercept(context, createCallHandler(user)).subscribe({
      next: (result) => {
        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.message).toBe('Success');
        expect(result.path).toBe('/users/user-123');
        expect(typeof result.timestamp).toBe('string');
        expect(result.data).toEqual(user);
        done();
      },
      error: done,
    });
  });

  it('should handle null / undefined returns gracefully', (done) => {
    const context = createMockContext({ url: '/users/empty', statusCode: 204 });

    interceptor.intercept(context, createCallHandler(null)).subscribe({
      next: (result) => {
        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(204);
        expect(result.data).toBeNull();
        expect(result.path).toBe('/users/empty');
        done();
      },
      error: done,
    });
  });

  it('should preserve authentication token fields at the root for backwards compatibility', (done) => {
    const context = createMockContext({ url: '/auth/login' });
    const authPayload = {
      success: true,
      message: 'Logged in successfully',
      access_token: 'fake-jwt-token',
      refresh_token: 'fake-refresh-token',
      expires_in: 900,
      user: { id: 'u1', email: 'admin@example.com' },
    };

    interceptor.intercept(context, createCallHandler(authPayload)).subscribe({
      next: (result) => {
        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.message).toBe('Logged in successfully');
        expect(result.access_token).toBe('fake-jwt-token');
        expect(result.refresh_token).toBe('fake-refresh-token');
        expect(result.path).toBe('/auth/login');
        expect(typeof result.timestamp).toBe('string');
        done();
      },
      error: done,
    });
  });

  it('should bypass transformation when @BypassTransform is present', (done) => {
    const context = createMockContext({ isBypassed: true });
    const rawData = 'raw-csv-or-binary-content';

    interceptor.intercept(context, createCallHandler(rawData)).subscribe({
      next: (result) => {
        expect(result).toBe('raw-csv-or-binary-content');
        done();
      },
      error: done,
    });
  });
});
