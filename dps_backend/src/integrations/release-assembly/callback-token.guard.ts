import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Protects Jenkins callback endpoints with a shared secret sent in the
 * `x-callback-token` header. Fail-open when RELEASE_CALLBACK_TOKEN is unset
 * (local dev); logs once (error level in production).
 */
@Injectable()
export class CallbackTokenGuard implements CanActivate {
  private readonly logger = new Logger(CallbackTokenGuard.name);
  private warned = false;

  constructor(private readonly config: ConfigService) {}

  /** A half-configured pair (backend token set, Jenkins credential missing/stale) fails here; say so. */
  private logRejected(reason: string): void {
    this.logger.warn(
      `Rejected release-assembly callback: ${reason}. ` +
        `RELEASE_CALLBACK_TOKEN is set on the backend, so Jenkins must send the same value ` +
        `(Jenkins Secret-text credential id 'release-callback-token'). ` +
        `See dps_backend/scripts/setup-jenkins-callback-token.sh.`,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('RELEASE_CALLBACK_TOKEN');
    if (!expected) {
      if (!this.warned) {
        this.warned = true;
        const msg =
          'RELEASE_CALLBACK_TOKEN is not set: release-assembly callbacks are UNAUTHENTICATED';
        if (process.env.NODE_ENV === 'production') this.logger.error(msg);
        else this.logger.warn(msg);
      }
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const raw = req.headers?.['x-callback-token'];
    const provided = Array.isArray(raw) ? raw[0] : raw;
    if (typeof provided !== 'string' || !provided) {
      this.logRejected('missing x-callback-token header');
      throw new UnauthorizedException('Invalid callback token');
    }
    const hash = (v: string) =>
      crypto.createHash('sha256').update(v).digest();
    if (!crypto.timingSafeEqual(hash(provided), hash(expected))) {
      this.logRejected('x-callback-token does not match RELEASE_CALLBACK_TOKEN');
      throw new UnauthorizedException('Invalid callback token');
    }
    return true;
  }
}
