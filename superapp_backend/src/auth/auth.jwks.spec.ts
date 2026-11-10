import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { BYPASS_TRANSFORM_KEY } from '../common/decorators/bypass-transform.decorator';

describe('GET /auth/jwks', () => {
  it('is served in the standard JWKS shape, not inside { success, data }', () => {
    const reflector = new Reflector();
    expect(reflector.get(BYPASS_TRANSFORM_KEY, AuthController.prototype.getJwks)).toBe(true);
  });
});
