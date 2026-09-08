import { Injectable } from '@nestjs/common';

export interface DetectedPermissionResult {
  type: string;
  purpose: string;
  source: string;
  confidence: 'HIGH' | 'MEDIUM';
}

@Injectable()
export class PermissionDetectorHelper {
  /**
   * Automatically discovers required native permissions from Mini App endpoint,
   * association file (.well-known), script ASTs, and category intelligence.
   */
  async detect(body: {
    productionUrl?: string;
    category?: string;
    name?: string;
    appId?: string;
  }): Promise<{ success: boolean; detected: DetectedPermissionResult[]; count: number }> {
    const detected: DetectedPermissionResult[] = [];
    const addedTypes = new Set<string>();
    const appLabel = body.name?.trim() || '$(PRODUCT_NAME)';

    const formatCompliantPurpose = (type: string, rawPurpose: string): string => {
      const trimmed = (rawPurpose || '').trim();
      if (!trimmed) {
        return `${appLabel} requires access to your ${type.toLowerCase()} to provide core mini application features.`;
      }
      if (
        trimmed.toLowerCase().includes('requires') &&
        (trimmed.toLowerCase().startsWith(appLabel.toLowerCase()) || trimmed.startsWith('$('))
      ) {
        return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
      }
      let cleaned = trimmed;
      if (/^(to|for)\s+/i.test(cleaned)) {
        cleaned = cleaned.replace(/^(to|for)\s+/i, '');
      }
      cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
      if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1);
      }
      return `${appLabel} requires access to your ${type.toLowerCase()} to ${cleaned}.`;
    };

    const addPerm = (
      type: string,
      purpose: string,
      source: string,
      confidence: 'HIGH' | 'MEDIUM' = 'HIGH'
    ) => {
      const normalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      if (!addedTypes.has(normalizedType.toLowerCase())) {
        addedTypes.add(normalizedType.toLowerCase());
        const compliantPurpose = formatCompliantPurpose(normalizedType, purpose);
        detected.push({ type: normalizedType, purpose: compliantPurpose, source, confidence });
      }
    };

    // 1. Check association file if productionUrl is provided
    if (body.productionUrl && body.productionUrl.trim()) {
      try {
        const parsed = new URL(body.productionUrl.trim());
        const assocUrl = `${parsed.origin}/.well-known/superapp-miniapp-association.json`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(assocUrl, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const perms = json.permissions || json.requestedPermissions || json.requiredPermissions;
          if (Array.isArray(perms)) {
            for (const p of perms) {
              const pType = typeof p === 'string' ? p : p.type;
              const pPurpose =
                typeof p === 'object' && p.purpose
                  ? p.purpose
                  : `Required by Mini App association configuration`;
              if (pType) {
                addPerm(pType, pPurpose, 'Association File (.well-known)', 'HIGH');
              }
            }
          }
        }
      } catch {
        // Association file might not be reachable or not contain perms
      }

      // 2. Scan remote HTML & JS scripts for Super App JS Bridge invocations
      try {
        const parsed = new URL(body.productionUrl.trim());
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(parsed.origin, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const html = await res.text();
          let combinedCode = html;

          // Find script tags to scan JavaScript bundles
          const scriptSrcMatches = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi));
          const scriptsToFetch = scriptSrcMatches
            .map((m) => m[1])
            .filter((src) => src && (!src.startsWith('http') || src.startsWith(parsed.origin)))
            .slice(0, 3);

          for (const scriptSrc of scriptsToFetch) {
            try {
              const fullScriptUrl = scriptSrc.startsWith('http')
                ? scriptSrc
                : new URL(scriptSrc, parsed.origin).href;
              const sCtrl = new AbortController();
              const sTid = setTimeout(() => sCtrl.abort(), 2000);
              const sRes = await fetch(fullScriptUrl, { signal: sCtrl.signal });
              clearTimeout(sTid);
              if (sRes.ok) {
                const jsText = await sRes.text();
                combinedCode += ' ' + jsText;
              }
            } catch {
              // Ignore individual bundle failures
            }
          }

          const lower = combinedCode.toLowerCase();

          // Scan Super App Native Bridge (DSPNativeBridge)
          const hasBridge =
            lower.includes('dspnativebridge') ||
            lower.includes('superapp') ||
            lower.includes('nativebridge');

          if (
            lower.includes('opencamera') ||
            lower.includes('capturephoto') ||
            lower.includes('scanqr') ||
            lower.includes('barcode') ||
            lower.includes('getusermedia')
          ) {
            addPerm(
              'Camera',
              'To scan QR codes and capture verification photos',
              hasBridge && (lower.includes('opencamera') || lower.includes('capturephoto'))
                ? 'JS Bridge: DSPNativeBridge (openCamera)'
                : 'Code Scan (Camera API)',
              'HIGH'
            );
          }

          if (
            lower.includes('getlocation') ||
            lower.includes('geolocation') ||
            lower.includes('getcurrentposition') ||
            lower.includes('watchposition')
          ) {
            addPerm(
              'Location',
              'To provide location-based services and map features',
              hasBridge && lower.includes('getlocation')
                ? 'JS Bridge: DSPNativeBridge (getLocation)'
                : 'Code Scan (Geolocation API)',
              'HIGH'
            );
          }

          if (
            lower.includes('authenticate') ||
            lower.includes('publickeycredential') ||
            lower.includes('webauthn') ||
            lower.includes('biometric') ||
            lower.includes('faceid')
          ) {
            addPerm(
              'Biometrics',
              'To authenticate user identity and authorize transactions securely',
              hasBridge && lower.includes('authenticate')
                ? 'JS Bridge: DSPNativeBridge (authenticate)'
                : 'Code Scan (WebAuthn / Biometrics)',
              'HIGH'
            );
          }

          if (
            lower.includes('openmicrophone') ||
            lower.includes('recordaudio') ||
            lower.includes('speechrecognition') ||
            lower.includes('audiocontext')
          ) {
            addPerm(
              'Microphone',
              'To record voice notes and enable speech input',
              hasBridge &&
                (lower.includes('openmicrophone') || lower.includes('recordaudio'))
                ? 'JS Bridge: DSPNativeBridge (openMicrophone)'
                : 'Code Scan (Audio / Microphone)',
              'HIGH'
            );
          }

          if (
            lower.includes('nfcscan') ||
            lower.includes('readnfc') ||
            lower.includes('ndeffilter')
          ) {
            addPerm(
              'NFC',
              'To scan contactless NFC tags and identity chips',
              'JS Bridge: DSPNativeBridge (nfcScan)',
              'HIGH'
            );
          }

          if (lower.includes('openbluetooth') || lower.includes('bluetooth')) {
            addPerm(
              'Bluetooth',
              'To communicate with nearby Bluetooth devices',
              hasBridge && lower.includes('openbluetooth')
                ? 'JS Bridge: DSPNativeBridge (openBluetooth)'
                : 'Code Scan (Bluetooth)',
              'MEDIUM'
            );
          }

          if (lower.includes('getcontacts') || lower.includes('navigator.contacts')) {
            addPerm(
              'Contacts',
              'To select recipients and contacts from the address book',
              'JS Bridge: DSPNativeBridge (getContacts)',
              'MEDIUM'
            );
          }
        }
      } catch {
        // Endpoint scan optional
      }
    }

    // 3. Category Intelligence Fallback / Augmentation
    const cat = (body.category || '').toLowerCase();
    if (cat.includes('bank') || cat.includes('finan')) {
      addPerm('Biometrics', 'To authenticate user identity securely and authorize transactions', 'Banking Profile', 'HIGH');
      addPerm('Camera', 'To scan QR codes for quick transfers and payments', 'Banking Profile', 'HIGH');
    } else if (cat.includes('insur')) {
      addPerm('Camera', 'To photograph accident evidence and upload policy claim documents', 'Insurance Profile', 'HIGH');
    } else if (cat.includes('travel') || cat.includes('transport') || cat.includes('ride')) {
      addPerm('Location', 'To locate pickup points and provide live GPS trip tracking', 'Travel Profile', 'HIGH');
    } else if (cat.includes('food') || cat.includes('shop') || cat.includes('e-commerce') || cat.includes('retail')) {
      addPerm('Location', 'To determine delivery address and locate nearby partner stores', 'Shopping Profile', 'MEDIUM');
    } else if (cat.includes('health') || cat.includes('med')) {
      addPerm('Camera', 'To take pictures of prescriptions and conduct video consultations', 'Healthcare Profile', 'HIGH');
      addPerm('Biometrics', 'To secure electronic medical records and patient data', 'Healthcare Profile', 'HIGH');
    } else if (cat.includes('gov') || cat.includes('public')) {
      addPerm('Biometrics', 'To verify citizen identity against national digital ID', 'Government Profile', 'HIGH');
      addPerm('Camera', 'To capture identity card photos for verification', 'Government Profile', 'HIGH');
    }

    return {
      success: true,
      detected,
      count: detected.length,
    };
  }
}
