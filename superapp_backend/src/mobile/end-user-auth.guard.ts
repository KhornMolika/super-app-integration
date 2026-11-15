import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import {
  AuthService,
  END_USER_AUDIENCE,
  END_USER_TYP,
} from '../auth/auth.service';
import {
  Identity,
  IdentityStatus,
} from '../identities/entities/identity.entity';

export interface AuthenticatedEndUser {
  id: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      endUser?: AuthenticatedEndUser;
    }
  }
}

/** What a phone session that must change its password may still call. */
export function allowedBeforePasswordChange(request: {
  method?: string;
  path?: string;
  url?: string;
}): boolean {
  const path = String(request.path ?? request.url ?? '')
    .split('?')[0]
    .replace(/^\/api(?=\/)/, '');
  const method = String(request.method || '').toUpperCase();
  return (
    (method === 'GET' && path === '/mobile/me') ||
    (method === 'POST' && path === '/mobile/me/password')
  );
}

/**
 * Guards /mobile/* resources. Bearer header ONLY (never query params), real
 * signature verification, aud=super-app-mobile and typ=end_user, and the user
 * must still be ACTIVE so a disabled account loses access immediately, and the
 * token must have been issued after the user's last global sign-out.
 */
@Injectable()
export class EndUserAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Identity) private readonly users: Repository<Identity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException();
    }
    const payload = this.authService.verifyToken(token, {
      audience: END_USER_AUDIENCE,
      typ: END_USER_TYP,
    });
    if (typeof payload?.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException();
    }
    let user: Identity | null = null;
    try {
      user = await this.users.findOne({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          status: true,
          sessionsRevokedAt: true,
          mustChangePassword: true,
        },
      });
    } catch {
      // Malformed sub etc. -> treat as unauthenticated.
      throw new UnauthorizedException();
    }
    if (!user || user.status !== IdentityStatus.ACTIVE) {
      throw new UnauthorizedException();
    }
    // Password change / deletion sign the user out everywhere:
    // access tokens issued before that instant stop working immediately.
    if (user.sessionsRevokedAt) {
      const revokedAtSec = Math.floor(
        new Date(user.sessionsRevokedAt).getTime() / 1000,
      );
      if (typeof payload.iat !== 'number' || payload.iat < revokedAtSec) {
        throw new UnauthorizedException();
      }
    }
    // A password someone else chose: only changing it works until replaced
    if (user.mustChangePassword && !allowedBeforePasswordChange(request)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Choose your own password before continuing.',
      });
    }
    request.endUser = { id: user.id, email: user.email };
    return true;
  }
}

/**
 * Optional guard: If no Authorization header is present, allows request as guest.
 * If Authorization is present, validates it strictly.
 */
@Injectable()
export class OptionalEndUserAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Identity) private readonly users: Repository<Identity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      // Guest access allowed
      return true;
    }
    const [scheme, token] = authHeader.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException();
    }
    const payload = this.authService.verifyToken(token, {
      audience: END_USER_AUDIENCE,
      typ: END_USER_TYP,
    });
    if (typeof payload?.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException();
    }
    let user: Identity | null = null;
    try {
      user = await this.users.findOne({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          status: true,
          mustChangePassword: true,
        },
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (!user || user.status !== IdentityStatus.ACTIVE) {
      throw new UnauthorizedException();
    }
    // A password someone else chose: only changing it works until replaced
    if (user.mustChangePassword && !allowedBeforePasswordChange(request)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Choose your own password before continuing.',
      });
    }
    request.endUser = { id: user.id, email: user.email };
    return true;
  }
}
