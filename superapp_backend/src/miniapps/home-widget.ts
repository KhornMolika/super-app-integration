import { BadRequestException } from '@nestjs/common';
import { IntegrationMethod } from './dto/create-miniapp.dto';

/**
 * Per-integration-method Home widget a mini app declares: the card the super
 * app renders in Home's Widget Slot. Exactly one field is meaningful, chosen
 * by the app's integration method (see HOME_WIDGET_FIELD).
 */
export interface HomeWidget {
  widgetClass?: string;
  viewId?: string;
  url?: string;
  /** Backend-managed (set when a package scan confirms the class). Never client-supplied. */
  verifiedClass?: string;
}

export type HomeWidgetField = 'widgetClass' | 'viewId' | 'url';

export const HOME_WIDGET_FIELD: Record<IntegrationMethod, HomeWidgetField> = {
  [IntegrationMethod.FLUTTER_PACKAGE]: 'widgetClass',
  [IntegrationMethod.NATIVE_SDK]: 'viewId',
  [IntegrationMethod.WEBVIEW]: 'url',
  [IntegrationMethod.DEEP_LINK]: 'url',
};

const FIELD_LABEL: Record<HomeWidgetField, string> = {
  widgetClass: 'Widget class',
  viewId: 'Widget view ID',
  url: 'Widget URL',
};

const WIDGET_CLASS_RE = /^[A-Z][A-Za-z0-9_]*$/;
const VIEW_ID_RE = /^[a-z][a-z0-9_]*$/;

function bad(message: string): never {
  throw new BadRequestException(`Home widget: ${message}`);
}

function allowedDomainList(
  integrationConfig?: Record<string, any> | null,
): string[] {
  const raw: unknown = integrationConfig?.allowedDomains;
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  return list
    .filter((d): d is string => typeof d === 'string')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

function hostAllowed(url: string, domains: string[]): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Validates and canonicalises a client-supplied homeWidget for the given
 * integration method. undefined = leave unchanged, null = clear. Otherwise
 * returns only the method's field (trimmed), dropping every other key
 * (including the backend-managed `verifiedClass`) or throws 400.
 */
export function normalizeHomeWidget(
  input: unknown,
  method: string | undefined,
  integrationConfig?: Record<string, any> | null,
): HomeWidget | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;

  const field = HOME_WIDGET_FIELD[method as IntegrationMethod];
  if (!field) bad('choose an integration method first.');
  if (typeof input !== 'object' || Array.isArray(input)) {
    bad('must be an object.');
  }

  const raw = (input as Record<string, unknown>)[field];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    bad(`"${FIELD_LABEL[field]}" is required for ${method} apps.`);
  }

  switch (field) {
    case 'widgetClass':
      if (!WIDGET_CLASS_RE.test(value)) {
        bad('Widget class must be a Dart class name (e.g. HrHomeWidget).');
      }
      break;
    case 'viewId':
      if (!VIEW_ID_RE.test(value)) {
        bad(
          'Widget view ID must use lowercase letters, digits and underscores (e.g. spa_booking_widget).',
        );
      }
      break;
    case 'url': {
      if (!value.startsWith('https://')) {
        bad('Widget URL must start with https://.');
      }
      if (method === IntegrationMethod.WEBVIEW) {
        const domains = allowedDomainList(integrationConfig);
        if (domains.length > 0 && !hostAllowed(value, domains)) {
          bad("Widget URL host must be one of the app's allowed domains.");
        }
      }
      break;
    }
  }
  return { [field]: value };
}

export function homeWidgetLabel(w: HomeWidget | null | undefined): string {
  return w?.widgetClass ?? w?.viewId ?? w?.url ?? 'none';
}

/** Compares only the client-visible fields; null, undefined and {} are equal. */
export function sameHomeWidget(
  a: HomeWidget | null | undefined,
  b: HomeWidget | null | undefined,
): boolean {
  return (
    (a?.widgetClass ?? null) === (b?.widgetClass ?? null) &&
    (a?.viewId ?? null) === (b?.viewId ?? null) &&
    (a?.url ?? null) === (b?.url ?? null)
  );
}
