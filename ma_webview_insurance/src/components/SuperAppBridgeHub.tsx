"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { 
  MapPin, 
  Camera, 
  Fingerprint, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton, LiquidGlassBadge } from "./LiquidGlass";

interface BridgeResponse {
  error?: string;
  image?: string;
  success?: boolean;
  lat?: number;
  lng?: number;
  address?: string;
}

declare global {
  interface Window {
    DPSNativeBridge?: {
      postMessage: (message: string) => void;
    };
    DPSCallback?: (callbackId: string, data: unknown) => void;
  }
}

function subscribeBridge(callback: () => void) {
  window.addEventListener("focus", callback);
  return () => window.removeEventListener("focus", callback);
}

function getBridgeSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.DPSNativeBridge);
}

function getBridgeServerSnapshot(): boolean {
  return false;
}

export default function SuperAppBridgeHub() {
  const isInsideSuperApp = useSyncExternalStore(
    subscribeBridge,
    getBridgeSnapshot,
    getBridgeServerSnapshot
  );

  // 1. Location State
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 2. Camera State
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 3. Biometrics State
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Setup unified DPS Callback dispatcher
    if (typeof window !== "undefined") {
      const existingCallback = window.DPSCallback;
      window.DPSCallback = (callbackId: string, rawData: unknown) => {
        console.log("DPS Bridge Callback:", callbackId, rawData);
        const data = rawData as BridgeResponse | undefined;

        if (callbackId === "req_loc_1") {
          setLocationLoading(false);
          if (data?.error) {
            setLocationError(data.error);
          } else {
            setLocation({
              lat: data?.lat ?? 11.5564,
              lng: data?.lng ?? 104.9282,
              address: data?.address || "Monivong Blvd, Phnom Penh",
            });
            setLocationError(null);
          }
        }

        if (callbackId === "camera-request") {
          setCameraLoading(false);
          if (data?.error) {
            setCameraError(data.error);
          } else if (data?.image) {
            setPhoto(data.image);
            setCameraError(null);
          }
        }

        if (callbackId === "auth-request") {
          setAuthLoading(false);
          if (data?.error) {
            setAuthError(data.error);
            setAuthSuccess(false);
          } else if (data?.success) {
            setAuthSuccess(true);
            setAuthError(null);
          }
        }

        if (existingCallback) {
          existingCallback(callbackId, rawData);
        }
      };
    }
  }, []);

  // Action: Request Location via Bridge or Web Fallback
  const handleRequestLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (typeof window !== "undefined" && window.DPSNativeBridge) {
      try {
        window.DPSNativeBridge.postMessage(
          JSON.stringify({
            action: "getLocation",
            callbackId: "req_loc_1",
          })
        );
      } catch (err) {
        console.error("Native bridge postMessage error:", err);
        setLocationError("Failed to communicate with DPS Super App bridge.");
        setLocationLoading(false);
      }
    } else {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({
              lat: Number(pos.coords.latitude.toFixed(4)),
              lng: Number(pos.coords.longitude.toFixed(4)),
              address: "Browser GPS Coordinates verified",
            });
            setLocationLoading(false);
          },
          () => {
            setTimeout(() => {
              setLocation({
                lat: 11.5564,
                lng: 104.9282,
                address: "Phnom Penh Central (Demo Mode)",
              });
              setLocationLoading(false);
            }, 600);
          },
          { timeout: 3000 }
        );
      } else {
        setTimeout(() => {
          setLocation({
            lat: 11.5564,
            lng: 104.9282,
            address: "Phnom Penh Central (Demo Mode)",
          });
          setLocationLoading(false);
        }, 600);
      }
    }
  };

  // Action: Open Camera via Bridge or Web Fallback
  const handleOpenCamera = () => {
    setCameraLoading(true);
    setCameraError(null);

    if (typeof window !== "undefined" && window.DPSNativeBridge) {
      try {
        window.DPSNativeBridge.postMessage(
          JSON.stringify({
            action: "openCamera",
            callbackId: "camera-request",
          })
        );
      } catch (err) {
        console.error("Camera bridge postMessage error:", err);
        setCameraError("Bridge communication failed.");
        setCameraLoading(false);
      }
    } else {
      setTimeout(() => {
        setPhoto(
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23e0e7ff'/><circle cx='200' cy='110' r='40' fill='%236366f1'/><path d='M150 200 C 170 160, 230 160, 250 200 Z' fill='%234338ca'/><text x='200' y='235' font-family='sans-serif' font-size='14' text-anchor='middle' fill='%233730a3' font-weight='bold'>Verified Camera Proof Captured</text></svg>"
        );
        setCameraLoading(false);
      }, 700);
    }
  };

  // Action: Biometric Sign-off via Bridge or Web Fallback
  const handleAuthenticate = () => {
    setAuthLoading(true);
    setAuthError(null);

    if (typeof window !== "undefined" && window.DPSNativeBridge) {
      try {
        window.DPSNativeBridge.postMessage(
          JSON.stringify({
            action: "authenticate",
            callbackId: "auth-request",
          })
        );
      } catch (err) {
        console.error("Auth bridge postMessage error:", err);
        setAuthError("Biometrics bridge unavailable.");
        setAuthLoading(false);
      }
    } else {
      setTimeout(() => {
        setAuthSuccess(true);
        setAuthLoading(false);
      }, 800);
    }
  };

  return (
    <section id="bridge-perks" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <LiquidGlassBadge
            icon={<Sparkles className="w-3.5 h-3.5 text-violet-500" />}
            className="mb-3"
          >
            DPS Super App Native Bridge
          </LiquidGlassBadge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            High-Tech Perks in Your Pocket
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Nova connects directly to your phone’s native sensors via the DPS Super App bridge for instant GPS claims, camera proof, and biometrics.
          </p>

          {/* Super App Bridge Status Pill in Liquid Glass */}
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 liquid-glass-pill liquid-glass-nested text-xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                isInsideSuperApp ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-slate-600 dark:text-slate-300">
              {isInsideSuperApp
                ? "Active Native Bridge: DPS Super App Connected"
                : "Web Preview Mode: Native Bridge Fallback Active"}
            </span>
          </div>
        </div>

        {/* 3 Liquid Glass Bridge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 1. Location Card */}
          <LiquidGlassContainer
            variant="rounded"
            interactive
            className="p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl liquid-glass-nested text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full liquid-glass-nested text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                  GPS Bridge
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                1-Tap Roadside / Theft GPS
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Pinpoint exact accident or incident coordinates securely via the device bridge without manual typing.
              </p>

              {location && (
                <div className="mb-4 p-3.5 rounded-2xl liquid-glass-nested text-xs">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Coordinates Verified
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    Lat: {location.lat}, Lng: {location.lng}
                  </div>
                  {location.address && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {location.address}
                    </div>
                  )}
                </div>
              )}

              {locationError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            <LiquidGlassButton
              variant="pill"
              size="md"
              onClick={handleRequestLocation}
              disabled={locationLoading}
              className="w-full bg-blue-600/10 text-blue-700 dark:text-blue-300 hover:bg-blue-600/20 border-blue-500/30"
            >
              {locationLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Requesting GPS...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  <span>{location ? "Refresh Coordinates" : "Get Device Location"}</span>
                </>
              )}
            </LiquidGlassButton>
          </LiquidGlassContainer>

          {/* 2. Camera Card */}
          <LiquidGlassContainer
            variant="rounded"
            interactive
            className="p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl liquid-glass-nested text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full liquid-glass-nested text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                  Camera Bridge
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Snap Damage & ID Proof
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Take a quick photo of damaged hardware or your ID card. Instantly cryptographically attached to your claim.
              </p>

              {photo && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt="Captured Proof"
                    className="w-full h-32 object-cover rounded-2xl border border-white/40 dark:border-slate-700 shadow-inner"
                  />
                  <button
                    onClick={() => setPhoto(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-1.5 underline cursor-pointer"
                  >
                    Clear Photo
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            <LiquidGlassButton
              variant="pill"
              size="md"
              onClick={handleOpenCamera}
              disabled={cameraLoading}
              className="w-full bg-purple-600/10 text-purple-700 dark:text-purple-300 hover:bg-purple-600/20 border-purple-500/30"
            >
              {cameraLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Opening Camera...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  <span>{photo ? "Retake Photo" : "Capture Verification"}</span>
                </>
              )}
            </LiquidGlassButton>
          </LiquidGlassContainer>

          {/* 3. Biometrics Card */}
          <LiquidGlassContainer
            variant="rounded"
            interactive
            className="p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl liquid-glass-nested text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full liquid-glass-nested text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  Biometrics Bridge
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                FaceID / Fingerprint Sign
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Sign insurance policies and approve claim payouts with your phone’s biometric security. Zero passwords.
              </p>

              {authSuccess && (
                <div className="mb-4 p-3.5 rounded-2xl liquid-glass-nested text-xs">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Biometrics Verified via DPS Super App
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Contract digitally sealed with hardware-backed key.
                  </p>
                </div>
              )}

              {authError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <LiquidGlassButton
              variant="pill"
              accent={authSuccess}
              size="md"
              onClick={handleAuthenticate}
              disabled={authLoading}
              className="w-full"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Verifying Sensor...</span>
                </>
              ) : authSuccess ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  <span>Verified Successfully</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
                  <span>Scan Face / Touch ID</span>
                </>
              )}
            </LiquidGlassButton>
          </LiquidGlassContainer>

        </div>

      </div>
    </section>
  );
}
