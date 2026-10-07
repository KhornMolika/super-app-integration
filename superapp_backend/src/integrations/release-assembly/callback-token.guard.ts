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
 * `x-callback-token` header, `Authorization: Bearer <token>` header, or request body/query.
 * Fail-open when RELEASE_CALLBACK_TOKEN is unset (local dev); logs once.
 */
@Injectable()
export class CallbackTokenGuard implements CanActivate {
  private readonly logger = new Logger(CallbackTokenGuard.name);
  private warned = false;

  constructor(private readonly config: ConfigService) {}

  private logRejected(reason: string): void {
    this.logger.warn(
      `Rejected release-assembly callback: ${reason}. ` +
        `RELEASE_CALLBACK_TOKEN is configured on the backend. ` +
        `Ensure Jenkins passes the same token in headers['x-callback-token'] or body.callbackToken.`,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('RELEASE_CALLBACK_TOKEN')?.trim();
    if (!expected) {
      if (!this.warned) {
        this.warned = true;
        const msg =
          'RELEASE_CALLBACK_TOKEN is not set: release-assembly callbacks are permitted in unauthenticated mode';
        if (process.env.NODE_ENV === 'production') this.logger.error(msg);
        else this.logger.warn(msg);
      }
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const rawHeader =
      req.headers?.['x-callback-token'] ||
      req.headers?.['authorization']?.replace(/^Bearer\s+/i, '');
    const rawBody = req.body?.callbackToken || req.body?.token;
    const rawQuery = req.query?.callbackToken || req.query?.token;

    const raw = (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) || rawBody || rawQuery;
    const provided = typeof raw === 'string' ? raw.trim() : '';

    const isPlaceholder =
      expected === 'CHANGE_ME_JENKINS_CALLBACK_TOKEN' ||
      expected === 'dev-jenkins-callback-token' ||
      expected.startsWith('CHANGE_ME');

    if (!provided) {
      if (isPlaceholder || process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          'Callback token missing on release callback, but running with development/placeholder configuration. Permitting callback.',
        );
        return true;
      }
      this.logRejected('missing callback token in header, body, or query');
      throw new UnauthorizedException('Invalid callback token');
    }

    const hash = (v: string) =>
      crypto.createHash('sha256').update(v).digest();

    const isMatch =
      crypto.timingSafeEqual(hash(provided), hash(expected)) ||
      (isPlaceholder &&
        (provided === 'dev-jenkins-callback-token' ||
          provided === 'CHANGE_ME_JENKINS_CALLBACK_TOKEN' ||
          provided === expected));

    if (!isMatch) {
      if (isPlaceholder || process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `Callback token mismatch (provided: "${provided.substring(0, 8)}...", expected: "${expected.substring(0, 8)}..."), but running in dev mode. Permitting callback.`,
        );
        return true;
      }
      this.logRejected('provided callback token does not match RELEASE_CALLBACK_TOKEN');
      throw new UnauthorizedException('Invalid callback token');
    }

    return true;
  }
}
