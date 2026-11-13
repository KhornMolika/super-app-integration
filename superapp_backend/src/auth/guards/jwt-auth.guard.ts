import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  includesSuperAdmin,
  isPlatformOwnerOrg,
} from '../../access-control/helpers/platform-admin.helper';
import {
  AuthService,
  BACK_OFFICE_TYP,
  END_USER_AUDIENCE,
  END_USER_TYP,
  hasBackofficeAccess,
  platformRoles,
} from '../auth.service';

/** Back-office guard: allowlist (typ=back_office) plus end-user denylist, verified by signature. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const where = `${request.method} ${request.path ?? request.url}`;
    const token = this.extractToken(request);
    if (!token) {
      this.logger.warn(
        `Refused ${where}: no bearer token (Authorization header ${
          request.headers.authorization ? 'present but not "Bearer <token>"' : 'missing'
        })`,
      );
      throw new UnauthorizedException();
    }
    let payload: any;
    try {
      payload = this.authService.verifyToken(token, { typ: BACK_OFFICE_TYP });
    } catch (err) {
      this.logger.warn(`Refused ${where}: ${describeTokenProblem(token, err)}`);
      throw err;
    }
    const aud = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
    if (payload?.typ === END_USER_TYP || aud.includes(END_USER_AUDIENCE)) {
      this.logger.warn(`Refused ${where}: mobile user token used on a back-office route (user ${payload?.sub})`);
      throw new UnauthorizedException();
    }
    // Also tokens issued before the Backoffice was limited to these roles (e.g. STAFF)
    if (!hasBackofficeAccess(platformRoles({ roles: payload?.roles }))) {
      this.logger.warn(`Refused ${where}: roles ${JSON.stringify(payload?.roles ?? [])} have no Backoffice access (user ${payload?.sub})`);
      throw new UnauthorizedException();
    }
    // SUPER_ADMIN is valid only inside the platform owner organization (FTC).
    // Also refuses tokens issued before that rule, or before the user moved org.
    if (
      includesSuperAdmin(payload?.roles) &&
      !isPlatformOwnerOrg(payload?.organizationCode)
    ) {
      this.logger.warn(
        `Refused ${where}: SUPER_ADMIN token outside the platform owner organization (user ${payload?.sub}, org ${payload?.organizationCode ?? 'none'})`,
      );
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

/**
 * Why a token was refused, for the log only. Reads the unverified claims to
 * say "expired" or "wrong type"; never logs the token itself.
 */
export function describeTokenProblem(token: string, err: unknown): string {
  let claims: Record<string, unknown> | null = null;
  try {
    const part = token.split('.')[1];
    claims = part ? JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) : null;
  } catch {
    claims = null;
  }
  if (!claims) return 'token is not a readable JWT';
  const exp = typeof claims.exp === 'number' ? claims.exp : undefined;
  if (exp !== undefined && exp * 1000 <= Date.now()) {
    return `token expired ${Math.round((Date.now() - exp * 1000) / 1000)}s ago (user ${String(claims.sub)})`;
  }
  if (claims.typ !== BACK_OFFICE_TYP) {
    return `token type is ${JSON.stringify(claims.typ)}, expected ${BACK_OFFICE_TYP} (user ${String(claims.sub)})`;
  }
  const detail = err instanceof Error && err.message ? err.message : 'verification failed';
  return `token failed verification (${detail}; wrong signing key or issuer?) (user ${String(claims.sub)})`;
}
