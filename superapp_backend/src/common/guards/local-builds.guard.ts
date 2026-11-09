import { CanActivate, ConflictException, Injectable } from '@nestjs/common';
import {
  LOCAL_BUILDS_DISABLED_MESSAGE,
  localBuildsEnabled,
} from '../utils/local-workspace.util';

/**
 * Rejects (409) routes whose only purpose is to modify the local super-app
 * checkout or run a local build, unless LOCAL_BUILDS_ENABLED=true.
 * See common/utils/local-workspace.util.ts for why.
 */
@Injectable()
export class LocalBuildsGuard implements CanActivate {
  canActivate(): boolean {
    if (!localBuildsEnabled()) {
      throw new ConflictException(LOCAL_BUILDS_DISABLED_MESSAGE);
    }
    return true;
  }
}
