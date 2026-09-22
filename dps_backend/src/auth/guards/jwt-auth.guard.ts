import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AuthService,
  BACK_OFFICE_TYP,
  END_USER_AUDIENCE,
  END_USER_TYP,
} from '../auth.service';

/** Back-office guard: allowlist (typ=back_office) plus end-user denylist, verified by signature. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    const payload = this.authService.verifyToken(token, {
      typ: BACK_OFFICE_TYP,
    });
    const aud = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
    if (payload?.typ === END_USER_TYP || aud.includes(END_USER_AUDIENCE)) {
      throw new UnauthorizedException();
    }
    request['user'] = payload;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type?.toLowerCase() === 'bearer' && token) return token;
    // NOTE: query-param tokens leak into access logs/history/referrers. Only
    // `access_token` is honoured; `token` is NOT, because it collides with the
    // invite-token param used on the miniapps download routes.
    const queryToken = request.query?.access_token;
    if (typeof queryToken === 'string' && queryToken) return queryToken;
    return undefined;
  }
}
