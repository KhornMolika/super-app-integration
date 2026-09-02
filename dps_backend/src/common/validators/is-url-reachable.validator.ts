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
    if (url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org') || url.endsWith('.git')) {
      return true;
    }

    // In local development / testing, allow localhost and test URLs
    const envVal = (process.env.ENVIRONMENT || process.env.NODE_ENV || '').toUpperCase();
    const isDev = envVal === 'DEV' || envVal === 'DEVELOPMENT' || process.env.NODE_ENV !== 'PROD';
    if (isDev && (url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('http://localhost') || url.startsWith('https://example.com') || url.startsWith('http://example.com'))) {
      return true;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal as any,
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
          signal: controller.signal as any,
        });

        clearTimeout(timeoutId);

        return response.ok || (response.status >= 300 && response.status < 400);
      } catch (fallbackError) {
        return false;
      }
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a reachable and accessible URL. The server did not respond or returned an error.`;
  }
}

export function IsUrlReachable(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUrlReachableConstraint,
    });
  };
}
