import {
  CanActivate,
  ExecutionContext,
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
import { EndUser, EndUserStatus } from './entities/end-user.entity';

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

/**
 * Guards /mobile/* resources. Bearer header ONLY (never query params), real
 * signature verification, aud=super-app-mobile and typ=end_user, and the user
 * must still be ACTIVE so a disabled account loses access immediately.
 */
@Injectable()
export class EndUserAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(EndUser) private readonly users: Repository<EndUser>,
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
    let user: EndUser | null = null;
    try {
      user = await this.users.findOne({
        where: { id: payload.sub },
        select: { id: true, email: true, status: true },
      });
    } catch {
      // Malformed sub etc. -> treat as unauthenticated.
      throw new UnauthorizedException();
    }
    if (!user || user.status !== EndUserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }
    request.endUser = { id: user.id, email: user.email };
    return true;
  }
}
