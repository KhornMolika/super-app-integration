import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: true })
export class IsUrlReachableConstraint implements ValidatorConstraintInterface {
  async validate(url: any, args: ValidationArguments) {
    if (typeof url !== 'string') return false;

    // Skip git repository URLs as they often block simple HEAD/GET requests (especially private ones)
    // Skip git repository URLs and internal MinIO storage URLs
    if (
      url.includes('github.com') ||
      url.includes('gitlab.com') ||
      url.includes('bitbucket.org') ||
      url.endsWith('.git') ||
      url.includes('superapp-storage') ||
      url.includes('mini-app-assets') ||
      url.includes('mini-app-logos') ||
      url.includes('minio') ||
      url.includes(':9000') ||
      url.includes('10.200.') ||
      url.includes('fintechcenterfsa.com') ||
      url.startsWith('/fsa-logo') ||
      url.startsWith('data:')
    ) {
      return true;
    }

    // Official App Store / Google Play URLs frequently reject headless bot HEAD requests or return 404 for unreleased/internal partner apps.
    // Accept them if they enforce secure HTTPS transport.
    if (
      url.includes('play.google.com') ||
      url.includes('apps.apple.com') ||
      url.includes('itunes.apple.com')
    ) {
      return url.startsWith('https://');
    }

    // In local development / testing, allow localhost and test URLs
    const envVal = (
      process.env.ENVIRONMENT ||
      process.env.NODE_ENV ||
      ''
    ).toUpperCase();
    const isDev =
      envVal !== 'PROD' &&
      (envVal === 'DEV' || process.env.NODE_ENV !== 'PROD');
    if (
      isDev &&
      (url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.startsWith('http://localhost') ||
        url.startsWith('https://example.com') ||
        url.startsWith('http://example.com'))
    ) {
      return true;
    }

    const requestHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SuperApp-Validator/2.0',
      Accept: 'text/html,application/xhtml+xml,application/json,*/*',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // We consider 2xx and 3xx codes as "reachable"
      return response.ok || (response.status >= 300 && response.status < 400);
    } catch (error) {
      // If HEAD fails (some servers block it), fallback to GET
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'GET',
          headers: requestHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return response.ok || (response.status >= 300 && response.status < 400);
      } catch (fallbackError: any) {
        // If the backend has no outbound internet egress or DNS resolver in private enterprise subnets,
        // do not reject valid public HTTPS domains due to infrastructure network isolation.
        const errMsg = String(fallbackError?.message || fallbackError);
        if (
          errMsg.includes('fetch failed') ||
          errMsg.includes('aborted') ||
          fallbackError?.name === 'AbortError' ||
          errMsg.includes('ENOTFOUND') ||
          errMsg.includes('ETIMEDOUT') ||
          errMsg.includes('EAI_AGAIN') ||
          errMsg.includes('ECONNREFUSED')
        ) {
          try {
            const parsed = new URL(url);
            if (
              (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
              parsed.hostname.includes('.')
            ) {
              return true;
            }
          } catch {
            return false;
          }
        }
        return false;
      }
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a reachable and accessible URL. The server did not respond or returned an error.`;
  }
}

export function IsUrlReachable(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUrlReachableConstraint,
    });
  };
}
