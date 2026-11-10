import { ArgumentsHost, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  let body: any;
  let status = 0;
  const response = {
    status: (s: number) => {
      status = s;
      return response;
    },
    json: (b: any) => {
      body = b;
      return response;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'POST', url: '/api/mobile/auth/login' }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status, body };
}

describe('AllExceptionsFilter error code', () => {
  it('names the code after the HTTP status when the exception gives none', () => {
    expect(run(new UnauthorizedException('Invalid credentials')).body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Invalid credentials',
    });
    expect(run(new NotFoundException()).body.code).toBe('NOT_FOUND');
  });

  it('keeps a code the exception sets itself', () => {
    const r = run(new UnauthorizedException({ message: 'Verify first', code: 'EMAIL_NOT_VERIFIED' }));
    expect(r.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('a plain error is still an internal error', () => {
    const r = run(new Error('boom'));
    expect(r.status).toBe(500);
    expect(r.body.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
