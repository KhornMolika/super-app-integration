export interface BridgeResponse {
  error?: string;
  image?: string;
  success?: boolean;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface BridgeMessage {
  action: "getLocation" | "openCamera" | "authenticate";
  callbackId: string;
  payload?: Record<string, unknown>;
}

declare global {
  interface Window {
    DPSNativeBridge?: {
      postMessage: (message: string) => void;
    };
    DPSCallback?: (callbackId: string, data: unknown) => void;
  }
}
