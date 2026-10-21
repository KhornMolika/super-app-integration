"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldIcon, SearchIcon, SparklesIcon, CheckCircleIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { PlusCircle, RefreshCw } from "lucide-react";
import { permissionsApi, CapabilityItem } from "@/api/permissions.api";
import { renderCapabilityIcon, getCapabilityVisual } from "@/lib/capability-visuals";

import { IntegrationMethodTab } from "@/types";

interface Section05CapabilitiesProps {
  activeMethodTab?: IntegrationMethodTab;
  setActiveMethodTab?: (tab: IntegrationMethodTab) => void;
}

interface CapabilitySyntax {
  code: string;
  lang: string;
  returnType: string;
}

function getCapabilitySyntax(
  capKey: string,
  method: IntegrationMethodTab,
  defaultJs?: string
): CapabilitySyntax {
  switch (method) {
    case "flutter": {
      const map: Record<string, CapabilitySyntax> = {
        camera: { code: "await appCtx.capabilities.scanQRCode()", lang: "Dart", returnType: "Future<String?>" },
        location: { code: "await appCtx.capabilities.getLocation()", lang: "Dart", returnType: "Future<LocationData>" },
        biometrics: { code: "await appCtx.capabilities.authenticateBiometric()", lang: "Dart", returnType: "Future<bool>" },
        storage: { code: "await appCtx.capabilities.getSecureStorage(key)", lang: "Dart", returnType: "Future<String?>" },
        notification: { code: "await appCtx.capabilities.showNotification(title, body)", lang: "Dart", returnType: "Future<void>" },
      };
      return map[capKey] || { code: `await appCtx.capabilities.${capKey}()`, lang: "Dart", returnType: "Future<dynamic>" };
    }
    case "native": {
      const map: Record<string, CapabilitySyntax> = {
        camera: { code: "appCtx.capabilities.scanQRCode { qr -> ... }", lang: "Kotlin / Swift", returnType: "Result<String>" },
        location: { code: "appCtx.capabilities.getLocation { loc -> ... }", lang: "Kotlin / Swift", returnType: "Result<Location>" },
        biometrics: { code: "appCtx.capabilities.authenticateBiometric(prompt, cb)", lang: "Kotlin / Swift", returnType: "Result<Boolean>" },
        storage: { code: "appCtx.capabilities.getSecureStorage(key)", lang: "Kotlin / Swift", returnType: "String?" },
        notification: { code: "appCtx.capabilities.showNotification(notification)", lang: "Kotlin / Swift", returnType: "Unit / Void" },
      };
      return map[capKey] || { code: `appCtx.capabilities.invoke("${capKey}", cb)`, lang: "Kotlin / Swift", returnType: "Result<Any>" };
    }
    case "deeplink": {
      const map: Record<string, CapabilitySyntax> = {
        camera: { code: "fsa://camera/scan?callback_url=fsahr://qr", lang: "URI Protocol", returnType: "URI Redirect" },
        location: { code: "fsa://location/get?callback_url=fsahr://loc", lang: "URI Protocol", returnType: "URI Redirect" },
        biometrics: { code: "fsa://auth/biometric?callback_url=fsahr://bio", lang: "URI Protocol", returnType: "URI Redirect" },
        storage: { code: "fsa://storage/read?key=attendance_cache&callback_url=fsahr://cb", lang: "URI Protocol", returnType: "URI Callback" },
        notification: { code: "fsa://notify?msg=Clock-in+Confirmed", lang: "URI Protocol", returnType: "URI Redirect" },
      };
      return map[capKey] || { code: `fsa://${capKey}?callback_url=fsahr://cb`, lang: "URI Protocol", returnType: "URL Handoff" };
    }
    case "webview":
    default: {
      return {
        code: defaultJs || `await FSASuperApp.${capKey}()`,
        lang: "JS / TS",
        returnType: "Promise<any>",
      };
    }
  }
}

// Safe fallback baseline if backend service is temporarily offline
const FALLBACK_CAPABILITIES: CapabilityItem[] = [
  {
    id: "camera",
    key: "camera",
    name: "Camera & Kiosk Scanner",
    description: "Capture photos, scan office attendance kiosk QR codes, and scan staff identity credentials.",
    category: "HARDWARE",
    requiredPermissions: ["android.permission.CAMERA", "NSCameraUsageDescription"],
    platform: "Cross-Platform",
    implementationType: "OS_SYSTEM_API",
    jsBridgeMethod: "FSASuperApp.scanQRCode()",
    status: "Active",
  },
  {
    id: "location",
    key: "location",
    name: "High-Precision GPS",
    description: "Access GPS coordinates for office building geofencing and branch proximity verification.",
    category: "DEVICE",
    requiredPermissions: ["android.permission.ACCESS_FINE_LOCATION", "NSLocationWhenInUseUsageDescription"],
    platform: "Cross-Platform",
    implementationType: "OS_SYSTEM_API",
    jsBridgeMethod: "FSASuperApp.getLocation()",
    status: "Active",
  },
  {
    id: "biometrics",
    key: "biometrics",
    name: "Biometric & FaceID Signing",
    description: "Hardware FaceID, TouchID, and Android BiometricPrompt for high-security approvals and leave requests.",
    category: "SECURITY",
    requiredPermissions: ["android.permission.USE_BIOMETRIC", "NSFaceIDUsageDescription"],
    platform: "Cross-Platform",
    implementationType: "OS_SYSTEM_API",
    jsBridgeMethod: "FSASuperApp.authenticateBiometric()",
    status: "Active",
  },
  {
    id: "storage",
    key: "storage",
    name: "Encrypted Hardware Vault",
    description: "Hardware-backed encrypted key-value storage (Android KeyStore & iOS Keychain) for offline attendance punch logs and leave quotas.",
    category: "STORAGE",
    requiredPermissions: [],
    platform: "Cross-Platform",
    implementationType: "OS_SYSTEM_API",
    jsBridgeMethod: "FSASuperApp.getSecureStorage()",
    status: "Active",
  },
  {
    id: "notification",
    key: "notification",
    name: "Transactional Push Alerts",
    description: "High-priority push alert dispatch triggered when office face recognition scanner or Telegram bot logs clock-in.",
    category: "DEVICE",
    requiredPermissions: ["android.permission.POST_NOTIFICATIONS"],
    platform: "Cross-Platform",
    implementationType: "OS_SYSTEM_API",
    jsBridgeMethod: "FSASuperApp.showNotification()",
    status: "Active",
  },
];

export function Section05Capabilities({
  activeMethodTab = "webview",
  setActiveMethodTab,
}: Section05CapabilitiesProps) {
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveSource, setIsLiveSource] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchRealCapabilities = async () => {
    try {
      setLoading(true);
      const data = await permissionsApi.getCapabilities();
      if (Array.isArray(data) && data.length > 0) {
        setCapabilities(data);
        setIsLiveSource(true);
      } else {
        setCapabilities(FALLBACK_CAPABILITIES);
        setIsLiveSource(false);
      }
    } catch (err) {
      console.warn("Unable to fetch live capabilities from SuperApp host, using baseline catalog:", err);
      setCapabilities(FALLBACK_CAPABILITIES);
      setIsLiveSource(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealCapabilities();
  }, []);

  // Compute unique categories from real capabilities
  const uniqueCategories = React.useMemo(() => {
    const set = new Set<string>();
    capabilities.forEach((c) => {
      if (c.category) set.add(c.category.toUpperCase());
    });
    return ["ALL", ...Array.from(set)];
  }, [capabilities]);

  // Filter capabilities based on search & category
  const filteredCapabilities = React.useMemo(() => {
    return capabilities.filter((cap) => {
      const matchesCategory =
        categoryFilter === "ALL" || (cap.category && cap.category.toUpperCase() === categoryFilter);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        cap.name?.toLowerCase().includes(q) ||
        cap.key?.toLowerCase().includes(q) ||
        cap.description?.toLowerCase().includes(q) ||
        cap.jsBridgeMethod?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [capabilities, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
      <p className="leading-relaxed">
        The SuperApp acts as the <strong>central authority for all MiniApp capabilities</strong>. To maintain zero security drift and strict platform governance, capabilities follow a zero-trust runtime access model.
      </p>

      {/* Core Gatekeeper Banner */}
      <div id="cap-gatekeeper" className="p-5 rounded-xl border-l-4 border-brand-500 bg-brand-50/70 dark:bg-brand-950/30 text-sm text-brand-900 dark:text-brand-200 space-y-2 scroll-mt-28">
        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs block">
          Core Platform Principle: Capability Gatekeeper
        </span>
        <p className="italic font-medium leading-relaxed">
          &ldquo;The SuperApp is the single central gatekeeper for all MiniApp capabilities. A MiniApp may request any capability, but it can only use capabilities exposed and supported by the SuperApp. Unsupported capabilities must be genuinely inaccessible.&rdquo;
        </p>
      </div>

      {/* Strategy to Maximize App Store & Google Play Approval */}
      <div id="cap-approval" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 scroll-mt-28">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <ShieldIcon />
            <span>Maximizing App Store &amp; Google Play Approval Probability</span>
          </h5>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-800 dark:bg-accent-950 dark:text-accent-300 border border-accent-200 dark:border-accent-800">
            Apple Guideline 4.7 &amp; Google Play Host Policy
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Apple and Google review the host application, metadata, third-party code, capabilities, and runtime behavior. To maximize approval probability and prevent platform rejection, the SuperApp implements seven mandatory architectural pillars:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <strong className="text-slate-900 dark:text-white font-bold block">1. SuperApp as Central Gatekeeper</strong>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If a MiniApp declares 5 capabilities and the SuperApp exposes 3, the remaining 2 are <strong>genuinely unavailable</strong>—not secretly accessible through raw native APIs or hidden bridge hooks.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <strong className="text-slate-900 dark:text-white font-bold block">2. Separate Required vs. Optional Capabilities</strong>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If a MiniApp requires an unsupported capability for its <strong>core function</strong> → <strong>Reject the MiniApp</strong>. If it is <strong>optional</strong> → Integrate it, but disable that specific feature cleanly.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <strong className="text-slate-900 dark:text-white font-bold block">3. Just-in-Time Runtime Requests</strong>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Runtime capability consent requests apply only to supported capabilities. Prompt the user <strong>at runtime when the feature is actually used</strong> (Google Play compliance requirement).
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <strong className="text-slate-900 dark:text-white font-bold block">4. Strict Capability Layer Isolation</strong>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Host app is 100% legally and technically responsible for hosted software under Apple rules and must never expose native platform APIs/technologies without authorization.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <strong className="text-slate-900 dark:text-white font-bold block">5. Pre-Publish Automated Validation</strong>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Validate every MiniApp before publishing (capabilities, privacy/data use, URLs, TLS, prohibited content, and actual behavior) to protect host app integrity.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <strong className="text-slate-900 dark:text-white font-bold block">6. Accurate Data Disclosures</strong>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Clearly disclose what data is collected, why, and with whom it is shared across Info.plist usage descriptions and Google Play Prominent In-App Disclosures.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/50 text-sm space-y-1">
          <strong className="text-brand-950 dark:text-brand-200 font-bold block">7. Apple Guideline 4.7 &amp; Manifest Compliance</strong>
          <p className="text-brand-900 dark:text-brand-300 leading-relaxed">
            Implements structured MiniApp manifest declarations (bundle metadata, version constraints, age rating, and sandboxed bridge scopes) aligned with Apple&apos;s MiniApps Partner Program.
          </p>
        </div>
      </div>

      {/* Practical Example & Decision Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Practical Example */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
            Capability Matching Example
          </h5>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Evaluating declared capabilities against SuperApp platform support:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm font-mono">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-400 font-sans block mb-1 font-semibold uppercase">SuperApp Supports:</span>
              <div className="text-emerald-600 dark:text-emerald-400">• Camera [OK]</div>
              <div className="text-emerald-600 dark:text-emerald-400">• Location [OK]</div>
              <div className="text-emerald-600 dark:text-emerald-400">• Notification [OK]</div>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-400 font-sans block mb-1 font-semibold uppercase">MiniApp Requests (5):</span>
              <div className="text-emerald-600 dark:text-emerald-400">• Camera (Req) [OK]</div>
              <div className="text-emerald-600 dark:text-emerald-400">• Location (Req) [OK]</div>
              <div className="text-emerald-600 dark:text-emerald-400">• Notification (Opt) [OK]</div>
              <div className="text-rose-500 font-semibold">• Contacts (Opt) [BLOCKED]</div>
              <div className="text-rose-500 font-semibold">• Microphone (Req) [UNSUPPORTED]</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Outcome: If Microphone is <strong>Required</strong>, the MiniApp is <strong>REJECTED</strong>. If marked <strong>Optional</strong>, the MiniApp is approved with Camera/Location/Notification active and Contacts/Microphone safely disabled.
          </p>
        </div>

        {/* Decision Flowchart */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
            The Final Decision Rule Flow
          </h5>
          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs leading-relaxed">
            <div className="text-slate-400">MiniApp requests N capabilities</div>
            <div className="text-slate-500 pl-4">↓ Compare with SuperApp catalog (M supported)</div>
            <div className="text-amber-400">Required capability unsupported?</div>
            <div className="text-rose-400 pl-4">├── Yes → REJECT MiniApp</div>
            <div className="text-emerald-400 pl-4">└── No  → Continue (Optional features disabled)</div>
            <div className="text-slate-400 pl-8">↓</div>
            <div className="text-sky-300 pl-8">M supported capabilities exposed</div>
            <div className="text-slate-400 pl-8">↓</div>
            <div className="text-emerald-300 pl-8">Runtime JIT capability consent → Allowed</div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Unsupported capabilities are <strong>technically inaccessible</strong> in the sandbox, ensuring host stability and zero store policy violations.
          </p>
        </div>
      </div>

      {/* ─── LIVE REAL SUPERAPP CAPABILITIES CATALOG ─── */}
      <div id="cap-directory" className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-5 scroll-mt-28">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h5 className="font-bold text-slate-900 dark:text-white text-base">
                Supported SuperApp Capabilities Directory
              </h5>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                isLiveSource
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLiveSource ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                <span>{isLiveSource ? "Live SuperApp Registry" : "Platform Baseline"}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real device bridge features and SDK methods exposed by the SuperApp host container.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRealCapabilities}
              disabled={loading}
              title="Refresh capabilities catalog"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand-500" : ""}`} />
            </button>
            <Link
              href="/capabilities"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Propose Capability</span>
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search capabilities..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs"
            />
            <div className="absolute left-2.5 top-2 text-slate-400 w-3.5 h-3.5 pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </div>

        {/* Capabilities Grid */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600 dark:text-brand-400" />
            <p className="text-xs text-slate-500 font-medium">Fetching real SuperApp capabilities from registry...</p>
          </div>
        ) : filteredCapabilities.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500">No capabilities match your current search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCapabilities.map((cap) => {
              const visual = getCapabilityVisual(cap.key, cap.category);
              const isApproved = cap.status === "Active";
              const syntax = getCapabilitySyntax(cap.key, activeMethodTab, cap.jsBridgeMethod);

              return (
                <div
                  key={cap.key || cap.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${visual.bgColor} ${visual.borderColor}`}>
                          {renderCapabilityIcon(cap.key, cap.category, "w-4 h-4")}
                        </div>
                        <div className="min-w-0">
                          <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {cap.name || cap.key}
                          </h6>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.2 rounded border border-brand-200/60 dark:border-brand-800/60">
                              {cap.key}
                            </span>
                            {cap.category && (
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                {cap.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                          isApproved
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {cap.status || "Active"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>

                  {/* Bridge method signature & permissions */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Invocation ({syntax.lang})
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700/70 font-mono text-[9px] text-slate-600 dark:text-slate-300">
                          {syntax.returnType}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCode(syntax.code, cap.key)}
                        className="text-[10px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 font-mono flex items-center gap-1 transition"
                        title="Copy method invocation"
                      >
                        <span>{copiedKey === cap.key ? "Copied ✓" : "📋 Copy"}</span>
                      </button>
                    </div>
                    <div className="p-2 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-lg overflow-x-auto no-scrollbar border border-slate-800">
                      <code>{syntax.code}</code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3.5 bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/80 dark:border-brand-900/50 rounded-xl text-xs text-brand-900 dark:text-brand-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-brand-500 shrink-0" />
            <span>Need a device feature not listed here? Submit a proposal through the Capabilities Wizard.</span>
          </div>
          <Link
            href="/capabilities?tab=proposals"
            className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Propose Extension</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
