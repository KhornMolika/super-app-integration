export interface BridgeResponse {
  error?: string;
  image?: string;
  success?: boolean;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface BridgeMessage {
  action: "getLocation" | "openCamera" | "authenticate" | "closeTerms" | string;
  callbackId?: string;
  payload?: Record<string, unknown>;
}

export interface NativeBridgeChannel {
  postMessage: (message: string) => void;
}

declare global {
  interface Window {
    SuperAppJSBridge?: NativeBridgeChannel;
    SuperAppNativeBridge?: NativeBridgeChannel;
    DSPNativeBridge?: NativeBridgeChannel;
    DPSNativeBridge?: NativeBridgeChannel;
    superappCallback?: (callbackId: string, data: unknown) => void;
    dspCallback?: (callbackId: string, data: unknown) => void;
    DPSCallback?: (callbackId: string, data: unknown) => void;
  }
}

/**
 * Utility helper to get the active SuperApp bridge channel.
 */
export function getSuperAppBridge(): NativeBridgeChannel | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.SuperAppJSBridge ||
    window.SuperAppNativeBridge ||
    window.DSPNativeBridge ||
    window.DPSNativeBridge
  );
}
