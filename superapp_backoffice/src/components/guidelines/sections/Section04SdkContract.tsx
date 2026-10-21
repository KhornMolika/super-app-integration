"use client";

import React, { useState } from "react";
import {
  BanIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import {
  Cpu,
  Layers,
  AlertTriangle,
  Globe,
  Package,
  Wrench,
  Link2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Terminal,
  FileCode2,
  Copy,
  Check,
  FolderTree,
  ArrowRight,
  Sparkle,
  Key,
  Download,
  UserCheck,
  BadgeCheck,
  CalendarCheck,
  Bell,
  HardDrive,
} from "lucide-react";
import { VSCodeEditor } from "../VSCodeEditor";
import { IntegrationMethodTab } from "@/types";

interface Section04SdkContractProps {
  activeMethodTab: IntegrationMethodTab;
  setActiveMethodTab: (tab: IntegrationMethodTab) => void;
}

export function Section04SdkContract({
  activeMethodTab,
  setActiveMethodTab,
}: Section04SdkContractProps) {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const rejectionJsonExample = JSON.stringify(
    {
      success: false,
      error: {
        code: "CAPABILITY_UNSUPPORTED",
        capability: "nfc_reader",
        message: "Host shell build v1.0.0 does not support capability: nfc_reader",
        hostVersion: "1.0.0",
        supportedCapabilities: [
          "camera",
          "location",
          "biometrics",
          "secure_storage",
          "notification"
        ],
        remedy: "Verify with FSASuperApp.canIUse('nfc_reader') and provide fallback UI"
      }
    },
    null,
    2
  );

  const methodMetadata = {
    webview: {
      name: "WebView MiniApp",
      tech: "JavaScript / TypeScript (React, Next.js, Vue, Vite, HTML5)",
      pkg: "@fsasuperapp/miniapp-web-sdk",
      pkgBadge: "NPM Scoped Package",
      runtime: "Isolated Mobile WebView (iOS WKWebView / Android Chromium)",
      icon: <Globe className="w-4 h-4 text-brand-500" />,
      color: "brand",
    },
    flutter: {
      name: "Flutter Modular Package",
      tech: "Dart 3.2+ / Flutter 3.16+ Modular Package",
      pkg: "fsa_superapp_miniapp_flutter_sdk",
      pkgBadge: "Hosted Private Pub",
      runtime: "Embedded Flutter Module running in SuperApp Dart Isolate",
      icon: <Package className="w-4 h-4 text-indigo-500" />,
      color: "indigo",
    },
    native: {
      name: "Native Mobile SDK",
      tech: "Kotlin / Java (Android) & Swift / Objective-C (iOS)",
      pkg: "FSASuperAppMiniAppNativeSDK",
      pkgBadge: "AAR / XCFramework",
      runtime: "Host Android Activity / iOS UIViewController with Direct Native Bridge",
      icon: <Wrench className="w-4 h-4 text-emerald-500" />,
      color: "emerald",
    },
    deeplink: {
      name: "Deep Link Protocol",
      tech: "Standalone Partner App (Native / Hybrid / Cross-Platform)",
      pkg: "@fsasuperapp/miniapp-deeplink-sdk",
      pkgBadge: "Universal Link / URI Scheme",
      runtime: "Decoupled Mobile App launched via OS URL Intent Handoff",
      icon: <Link2 className="w-4 h-4 text-amber-500" />,
      color: "amber",
    },
  };

  const currentMeta = methodMetadata[activeMethodTab] || methodMetadata.webview;

  return (
    <div className="space-y-10 text-base text-slate-600 dark:text-slate-300">
      {/* Intro Paragraph */}
      <div className="space-y-3">
        <p className="leading-relaxed">
          MiniApps operate within an isolated, sandboxed runtime environment. All platform interactions—staff identity profiles, authentication bearer tokens, device sensors, and view navigation—must pass through the standardized <strong>FSASuperApp SDK</strong>.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The guide below adapts dynamically to your chosen integration method so you only see the codebase architecture, setup commands, and code samples relevant to your active tech stack.
        </p>
      </div>

      {/* PILLAR 0: Prerequisites, SDK Download & Token Setup (Auto-Filtered by Active Stack) */}
      <div id="contract-prerequisites" className="rounded-2xl border border-brand-200 dark:border-brand-900/60 bg-gradient-to-br from-brand-50/50 via-white to-slate-50/50 dark:from-brand-950/20 dark:via-slate-900 dark:to-slate-950 p-6 space-y-6 shadow-xs scroll-mt-24">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Prerequisites &amp; Setup
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  SDK Download, Developer Tokens &amp; App Setup for {currentMeta.name}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Download the private SDK, authenticate your developer environment, and configure package identifiers without registration bottlenecks.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-brand-100/70 dark:bg-brand-950 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-semibold flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-brand-500" />
            No App Registration Required to Start
          </span>
        </div>

        {/* 4-Step Action Grid (Dynamically Auto-Filtered) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* STEP 1: Developer Access Token (Account Level) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-2">
            <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              Get Developer SDK Token (Account-Level)
            </strong>
            <p className="text-slate-600 dark:text-slate-400">
              You do <strong>not</strong> need to register an app first to begin coding. Access tokens are tied to your Developer Account:
            </p>
            <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
              <p className="text-slate-400"># 1. Log into FSA BackOffice</p>
              <p className="text-brand-300"># 2. Go to: Settings &gt; Profile / Developer Tokens</p>
              <p className="text-emerald-400"># 3. Copy your Personal Access Token: fsa_pat_****************</p>
            </div>
          </div>

          {/* STEP 2: Stack-Specific Download & Installation */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-2">
            <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
              Install {currentMeta.pkg}
            </strong>
            {activeMethodTab === "webview" ? (
              <>
                <p className="text-slate-600 dark:text-slate-400">
                  Configure <code className="font-mono text-brand-600">.npmrc</code> in your project root with your Developer Token, then install:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-brand-300">@fsasuperapp:registry=https://app.fintechcenterfsa.com/api/sdk/</p>
                  <p className="text-sky-300">pnpm add @fsasuperapp/miniapp-web-sdk</p>
                </div>
              </>
            ) : activeMethodTab === "flutter" ? (
              <>
                <p className="text-slate-600 dark:text-slate-400">
                  Authenticate the hosted pub repository via terminal, then declare in <code className="font-mono text-indigo-500">pubspec.yaml</code>:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-brand-300">dart pub token add https://app.fintechcenterfsa.com/pub</p>
                  <p className="text-indigo-300"># In pubspec.yaml: fsa_superapp_miniapp_flutter_sdk: ^1.0.0</p>
                </div>
              </>
            ) : activeMethodTab === "native" ? (
              <>
                <p className="text-slate-600 dark:text-slate-400">
                  Download compiled binaries directly from BackOffice Artifact Hub (`/api/sdk-artifacts`):
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-emerald-300">Android: libs/fsasuperapp-native-sdk.aar</p>
                  <p className="text-indigo-300">iOS: Frameworks/FSASuperAppNativeSDK.xcframework</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-400">
                  Install protocol helper and register custom URI scheme in OS manifests:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-amber-300">pnpm add @fsasuperapp/miniapp-deeplink-sdk</p>
                  <p className="text-slate-400"># URI Scheme: fsahr://attendance/open</p>
                </div>
              </>
            )}
          </div>

          {/* STEP 3: Slug vs. Auto-Detected MiniApp ID (Two-Tier Model) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-2">
            <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">3</span>
              Package Identifier &amp; Portal Slug
            </strong>
            {activeMethodTab === "flutter" ? (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Use standard Dart <code className="font-mono text-indigo-500">snake_case</code> in <code className="font-mono">pubspec.yaml</code> (e.g. <code className="font-mono text-brand-600">fsa_hr_attendance_module</code>). When you register in BackOffice, the SuperApp <strong>auto-detects and links your binary app_id directly from pubspec.yaml</strong>—avoiding naming conflicts.
              </p>
            ) : activeMethodTab === "native" ? (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Use standard reverse-DNS in Android (<code className="font-mono text-emerald-500">com.fsa.enterprise.hr</code>) and iOS bundle ID. In BackOffice, the SuperApp <strong>auto-detects your app_id from your uploaded .aar or framework</strong> in the Integration step.
              </p>
            ) : activeMethodTab === "deeplink" ? (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Register your custom scheme (<code className="font-mono text-amber-500">fsahr</code>) and host path (<code className="font-mono">attendance/open</code>) in the Integration tab. In Basic Info, supply a friendly human slug (<code className="font-mono">staff-portal-attendance</code>).
              </p>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Develop locally using your package name in <code className="font-mono">package.json</code> (<code className="font-mono text-brand-600">fsa-hr-attendance-miniapp</code>). When you register in BackOffice, Tab 1 sets your friendly URL <strong>Slug</strong> (<code className="font-mono">staff-portal-attendance</code>), and Tab 2 links your package.
              </p>
            )}
            <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 font-mono flex items-center justify-between">
              <span>Basic Info: Slug (URL/Catalog)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">&rarr; Integration: Auto-Detected app_id</span>
            </div>
          </div>

          {/* STEP 4: Runtime Employee Token & Scopes */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-2">
            <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">4</span>
              Runtime Employee Session &amp; Scopes
            </strong>
            <p className="text-slate-600 dark:text-slate-400">
              When the employee opens your MiniApp, the SuperApp host shell injects a verified session token for your backend API calls:
            </p>
            <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
              <p className="text-sky-300">const auth = await FSASuperApp.getAuthToken();</p>
              <p className="text-slate-400"># Send: Authorization: Bearer &#36;&#123;auth.accessToken&#125;</p>
              <p className="text-purple-300"># Scopes: staff:profile:read, notification:push, storage:secure</p>
            </div>
          </div>
        </div>
      </div>

      {/* PILLAR 1: Shared Responsibility Model */}
      <div id="contract-shared-model" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950 p-6 space-y-5 shadow-xs scroll-mt-24">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Pillar 1
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Shared Responsibility Model: Zero-Crash Architecture
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Division of responsibilities guaranteeing host shell stability and graceful user degradation.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Zero Host Crash Guarantee
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Host Shell Responsibility */}
          <div className="p-5 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> SuperApp Host Shell Guarantees
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300">
                Host Container
              </span>
            </div>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span><strong>Crash-Proof Bridge:</strong> The host shell intercepts unsupported or unvetted bridge calls safely; the host app will NEVER crash.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span><strong>Introspection API:</strong> Exposes <code className="font-mono text-sky-600 dark:text-sky-400">canIUse(key)</code> across all platforms for pre-flight feature verification.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span><strong>Standard Rejection Envelope:</strong> Returns a uniform <code className="font-mono text-rose-600 dark:text-rose-400">CAPABILITY_UNSUPPORTED</code> payload when a feature is missing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span><strong>Pre-Publish Automated Gate:</strong> Automatically rejects MiniApps requesting required capabilities not supported by the shell build.</span>
              </li>
            </ul>
          </div>

          {/* MiniApp Developer Responsibility */}
          <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <SparklesIcon /> MiniApp Developer Obligations
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
                Partner Codebase
              </span>
            </div>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Feature Gating:</strong> Call <code className="font-mono text-indigo-600 dark:text-indigo-400">canIUse()</code> before rendering native hardware action triggers.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Business Fallback UI:</strong> Render alternative flows (e.g. manual code input if camera is absent; cached records if offline).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Error Trapping:</strong> Wrap bridge operations in <code className="font-mono">try / catch</code> blocks to gracefully handle denials or timeouts.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Scope Transparency:</strong> Accurately register permissions in the portal as <code className="font-mono">Required</code> (blocking) or <code className="font-mono">Optional</code> (progressive enhancement).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* PILLAR 2: canIUse() Introspection Protocol */}
      <div id="contract-can-i-use" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-5 shadow-xs scroll-mt-24">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Pillar 2
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  canIUse() Introspection Protocol &amp; Rejection Contract
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Runtime capability discovery protocol guaranteeing backward compatibility across device versions.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold">
            Pre-flight Gate Pattern
          </span>
        </div>

        {/* 3-Step Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">Step 1: Introspect</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold">Pre-flight</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              MiniApp calls <code className="font-mono font-bold text-slate-800 dark:text-slate-200">await FSASuperApp.canIUse('notification')</code> before triggering push sync alerts.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Step 2: Path Branching</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">True / False</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              If <code className="font-mono text-emerald-600 font-semibold">true</code>, invoke native hardware bridge. If <code className="font-mono text-amber-600 font-semibold">false</code>, render fallback UI immediately.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">Step 3: Safe Rejection</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">Fallback</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              If an unsupported method is called directly, the host intercepts safely and emits the uniform rejection envelope.
            </p>
          </div>
        </div>

        {/* Rejection Schema Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Standardized Host Rejection Contract Payload (CAPABILITY_UNSUPPORTED)
            </span>
            <button
              onClick={() => handleCopy(rejectionJsonExample, "rejection-json")}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono transition"
            >
              {copiedSnippet === "rejection-json" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy JSON
                </>
              )}
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
            <pre>{rejectionJsonExample}</pre>
          </div>
          <p className="text-[11px] text-slate-500">
            All SuperApp host versions guarantee this structured JSON error format. Handling this code ensures your MiniApp will never experience a white screen or crash.
          </p>
        </div>
      </div>

      {/* PILLAR 3: Focused Implementation Guide for Active Method (HR MiniApp Codebase) */}
      <div id="contract-code-examples" className="space-y-6 scroll-mt-24">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Pillar 3
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  How Developers Use the SDK in Codebase: {currentMeta.name}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted codebase folder architecture, installation steps, and live implementation files for <strong>{currentMeta.pkg}</strong>.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
            {currentMeta.pkgBadge}
          </span>
        </div>

        {/* METHOD 1: WEBVIEW MINIAPP SPECIFIC GUIDE */}
        {activeMethodTab === "webview" && (
          <div className="space-y-6">
            {/* Visual Codebase File Structure */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-brand-500" />
                Where SDK Files Live in Your Web Project (React / Vue / Next.js / Vite)
              </h5>
              <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">fsa-hr-attendance/</p>
                <p className="text-brand-300">├── .npmrc                         <span className="text-slate-500">&lt;-- Private scoped registry &amp; developer token</span></p>
                <p className="text-brand-300">├── package.json                   <span className="text-slate-500">&lt;-- "@fsasuperapp/miniapp-web-sdk": "^1.0.0"</span></p>
                <p className="text-slate-400">└── src/</p>
                <p className="text-emerald-300">    ├── main.tsx                   <span className="text-slate-500">&lt;-- Staff ID card &amp; attendance dashboard</span></p>
                <p className="text-emerald-300">    ├── services/superapp.ts       <span className="text-slate-500">&lt;-- auth token, attendance fetch &amp; leave quota</span></p>
                <p className="text-slate-300">    └── components/AttendanceCard.tsx<span className="text-slate-500">&lt;-- Telegram sync &amp; face scanner records</span></p>
              </div>
            </div>

            {/* Step-by-Step Code Walkthrough */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  Setup Scoped NPM Registry &amp; Install
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Place an authenticated <code className="font-mono text-brand-600">.npmrc</code> in your project root, then add the SDK dependency:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-brand-300">pnpm add @fsasuperapp/miniapp-web-sdk</p>
                  <p className="text-slate-400"># or for HTML5 CDN: &lt;script src="...min.js"&gt;&lt;/script&gt;</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  Startup Ready Handshake
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  In your root entry file (<code className="font-mono">main.tsx</code> or <code className="font-mono">App.tsx</code>), complete the handshake before rendering:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-purple-300">import FSASuperApp from '@fsasuperapp/miniapp-web-sdk';</p>
                  <p className="text-slate-200">await FSASuperApp.ready(); // Handshake with host shell</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  Access Auth Token &amp; Staff Profile
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Retrieve verified staff identity and short-lived host bearer token to authorize your HR backend API calls:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-sky-300">const auth = await FSASuperApp.getAuthToken();</p>
                  <p className="text-sky-300">const user = await FSASuperApp.getUserProfile();</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                  Feature Check &amp; Graceful Exit
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Inspect capability before calling native features, and close the MiniApp cleanly on task completion:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-amber-300">if (await FSASuperApp.canIUse('notification')) &#123; ... &#125;</p>
                  <p className="text-rose-300">FSASuperApp.close(); // Return to SuperApp</p>
                </div>
              </div>
            </div>

            {/* Live Web VSCode Editor */}
            <VSCodeEditor
              files={[
                {
                  filename: "src/services/superapp.ts",
                  language: "typescript",
                  code: `import FSASuperApp from '@fsasuperapp/miniapp-web-sdk';

export interface StaffProfile {
  staffId: string;
  displayName: string;
  department: string;
  position: string;
  avatarUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  terminalName: string;
  status: 'ON_TIME' | 'LATE';
}

export interface LeaveQuota {
  annualTotal: number;
  annualUsed: number;
  annualRemaining: number;
  sickRemaining: number;
}

/**
 * 1. Initialize session and acquire authenticated staff identity
 */
export async function initializeStaffMiniApp() {
  await FSASuperApp.ready();
  const auth = await FSASuperApp.getAuthToken();
  const user = await FSASuperApp.getUserProfile();
  console.log('Active staff employee:', user.displayName, 'Staff ID:', user.id);
  return { auth, user };
}

/**
 * 2. Fetch attendance logs synced from office entrance face scanner & Telegram bot
 */
export async function fetchAttendanceHistory(token: string): Promise<AttendanceRecord[]> {
  // In production, call your HR backend with the verified SuperApp Bearer token:
  // const res = await fetch('https://hr.enterprise.internal/api/attendance/history', {
  //   headers: { Authorization: \`Bearer \${token}\` }
  // });
  // return res.json();

  return [
    {
      id: "ATT_1092",
      date: "Today, Oct 21",
      clockIn: "08:14 AM",
      clockOut: "05:32 PM",
      terminalName: "FSA HQ Main Gate Face Terminal #01",
      status: "ON_TIME"
    },
    {
      id: "ATT_1088",
      date: "Yesterday, Oct 20",
      clockIn: "08:26 AM",
      clockOut: "05:40 PM",
      terminalName: "FSA HQ Main Gate Face Terminal #01",
      status: "ON_TIME"
    }
  ];
}

/**
 * 3. Fetch leave quota breakdown (used vs remaining days)
 */
export async function fetchLeaveBalances(token: string): Promise<LeaveQuota> {
  return {
    annualTotal: 18,
    annualUsed: 6,
    annualRemaining: 12,
    sickRemaining: 14
  };
}

/**
 * 4. Safe exit back to SuperApp dashboard (NEVER force window.close() or history.back())
 */
export function exitMiniApp() {
  FSASuperApp.close();
}`,
                },
                {
                  filename: "src/main.tsx",
                  language: "typescript",
                  code: `import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  initializeStaffMiniApp,
  fetchAttendanceHistory,
  fetchLeaveBalances,
  exitMiniApp,
  AttendanceRecord,
  LeaveQuota,
} from './services/superapp';

function StaffPortalApp() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveQuota | null>(null);

  useEffect(() => {
    initializeStaffMiniApp().then(async ({ auth, user }) => {
      setUser(user);
      const [attList, leaveData] = await Promise.all([
        fetchAttendanceHistory(auth.accessToken),
        fetchLeaveBalances(auth.accessToken),
      ]);
      setAttendance(attList);
      setLeaves(leaveData);
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return <div className="loading-state">Connecting to FSA SuperApp Host...</div>;
  }

  return (
    <div className="staff-portal-container">
      {/* Top Header with Safe Area Insets */}
      <header className="staff-header">
        <div className="staff-identity-card">
          <div className="avatar-badge">{user.displayName?.[0] || 'S'}</div>
          <div>
            <h2>{user.displayName || 'Sokha Chea'}</h2>
            <p className="staff-id">Staff ID: EMP-8842 • Financial Supervision Division</p>
          </div>
        </div>
        <button onClick={exitMiniApp} className="exit-btn">✕ Exit</button>
      </header>

      {/* Telegram Face Terminal Sync Alert */}
      <div className="sync-banner">
        <span className="dot online"></span>
        <span>Synced with Office Entrance Face Scanner via Telegram Gateway</span>
      </div>

      {/* Leave Quota Cards */}
      <section className="leave-quota-section">
        <h3>My Leave Balance</h3>
        <div className="quota-grid">
          <div className="quota-card remaining">
            <span className="count">{leaves?.annualRemaining || 12}</span>
            <span className="label">Annual Days Remaining</span>
          </div>
          <div className="quota-card used">
            <span className="count">{leaves?.annualUsed || 6}</span>
            <span className="label">Days Used (of {leaves?.annualTotal || 18})</span>
          </div>
        </div>
      </section>

      {/* Attendance History Log */}
      <section className="attendance-history-section">
        <h3>Attendance History</h3>
        <div className="log-list">
          {attendance.map((rec) => (
            <div key={rec.id} className="log-item">
              <div>
                <strong>{rec.date}</strong>
                <p className="terminal-name">{rec.terminalName}</p>
              </div>
              <div className="times">
                <span>In: {rec.clockIn}</span>
                <span>Out: {rec.clockOut || 'Active'}</span>
                <span className="status-badge on-time">{rec.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<StaffPortalApp />);`,
                },
                {
                  filename: ".npmrc",
                  language: "ini",
                  code: `# Scoped NPM Gateway Configuration (.npmrc)
# Place in root directory of your Web MiniApp project

@fsasuperapp:registry=https://app.fintechcenterfsa.com/api/sdk/
//app.fintechcenterfsa.com/api/sdk/:_authToken="<PASTE_YOUR_DEVELOPER_TOKEN>"

# Install via preferred package manager:
# pnpm add @fsasuperapp/miniapp-web-sdk`,
                },
                {
                  filename: "package.json",
                  language: "json",
                  code: JSON.stringify(
                    {
                      name: "fsa-hr-attendance-miniapp",
                      version: "1.0.0",
                      private: true,
                      scripts: {
                        dev: "vite",
                        build: "vite build",
                      },
                      dependencies: {
                        "@fsasuperapp/miniapp-web-sdk": "^1.0.0",
                        react: "^18.2.0",
                        "react-dom": "^18.2.0",
                      },
                    },
                    null,
                    2
                  ),
                },
                {
                  filename: "rejection-contract.json",
                  language: "json",
                  code: rejectionJsonExample,
                },
              ]}
            />
          </div>
        )}

        {/* METHOD 2: FLUTTER MODULAR PACKAGE SPECIFIC GUIDE */}
        {activeMethodTab === "flutter" && (
          <div className="space-y-6">
            {/* Visual Codebase File Structure */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-500" />
                Where SDK Files Live in Your Flutter Package
              </h5>
              <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">fsa_hr_attendance/</p>
                <p className="text-indigo-300">├── pubspec.yaml                   <span className="text-slate-500">&lt;-- Hosted private pub repository dependency</span></p>
                <p className="text-slate-400">└── lib/</p>
                <p className="text-brand-300">    ├── fsa_hr_attendance.dart     <span className="text-slate-500">&lt;-- Root export file</span></p>
                <p className="text-emerald-300">    └── src/</p>
                <p className="text-emerald-300">        ├── entrypoint.dart        <span className="text-slate-500">&lt;-- Extends MiniAppWidget with MiniAppContext</span></p>
                <p className="text-slate-300">        └── views/attendance_view.dart<span className="text-slate-500">&lt;-- Staff ID card, punch logs &amp; leave balance</span></p>
              </div>
            </div>

            {/* Step-by-Step Code Walkthrough */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  Private Pub Token &amp; pubspec.yaml
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Authenticate your developer environment and declare the hosted private pub dependency:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-brand-300">dart pub token add https://app.fintechcenterfsa.com/pub</p>
                  <p className="text-slate-400"># In pubspec.yaml: fsa_superapp_miniapp_flutter_sdk: ^1.0.0</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  Extend MiniAppWidget (Never runApp)
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  MiniApps are modular child widgets. Never define <code className="font-mono text-rose-500">void main()</code> or invoke <code className="font-mono text-rose-500">runApp()</code>:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-purple-300">class MiniAppEntryPoint extends MiniAppWidget &#123;</p>
                  <p className="text-slate-300 pl-2">Widget build(BuildContext ctx, MiniAppContext appCtx) &#123; ... &#125;</p>
                  <p className="text-purple-300">&#125;</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  Access MiniAppContext for Staff Auth
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  The injected <code className="font-mono">MiniAppContext</code> provides verified staff profile and JWT tokens:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-sky-300">final user = appCtx.auth.currentUser;</p>
                  <p className="text-sky-300">final token = appCtx.auth.jwtToken;</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                  Introspect &amp; Exit Safe
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Check features before calling and exit via <code className="font-mono">appCtx.navigation.exit()</code> (NEVER call <code className="font-mono text-rose-500">exit(0)</code>):
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-amber-300">final canNotify = await appCtx.capabilities.canIUse('notification');</p>
                  <p className="text-rose-300">appCtx.navigation.exit(); // Safe navigation exit</p>
                </div>
              </div>
            </div>

            {/* Live Flutter VSCode Editor */}
            <VSCodeEditor
              files={[
                {
                  filename: "lib/src/entrypoint.dart",
                  language: "dart",
                  code: `import 'package:flutter/material.dart';
import 'package:fsa_superapp_miniapp_flutter_sdk/fsa_superapp_miniapp_flutter_sdk.dart';

// Official Flutter MiniApp root widget conforming to FSASuperApp SDK
class MiniAppEntryPoint extends MiniAppWidget {
  @override
  Widget build(BuildContext context, MiniAppContext appCtx) {
    final user = appCtx.auth.currentUser;

    return Scaffold(
      appBar: FSASuperAppBar(
        title: 'Staff Portal & Attendance',
        appCtx: appCtx,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Staff Digital Identity Badge
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: Colors.blue.shade100,
                      child: Text(
                        user.displayName.isNotEmpty ? user.displayName[0] : 'S',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.blue),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.displayName,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Staff ID: \${user.id} • Financial Supervision',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 2. Telegram Face Recognition Sync Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: BorderSide(color: Colors.green.shade200),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Synced with Office Face Scanner via Telegram Gateway',
                      style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Leave Quota Summary
            const Text('My Leave Quota', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('12', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.blue)),
                        SizedBox(height: 2),
                        Text('Annual Days Remaining', style: TextStyle(fontSize: 11, color: Colors.black54)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('6', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.orange)),
                        SizedBox(height: 2),
                        Text('Days Used (of 18 Total)', style: TextStyle(fontSize: 11, color: Colors.black54)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 4. Safe Exit
            Center(
              child: TextButton.icon(
                icon: const Icon(Icons.arrow_back),
                label: const Text('Return to SuperApp'),
                onPressed: () => appCtx.navigation.exit(), // NEVER exit(0)
              ),
            ),
          ],
        ),
      ),
    );
  }
}`,
                },
                {
                  filename: "pubspec.yaml",
                  language: "yaml",
                  code: `name: fsa_hr_attendance_module
description: Official FSA SuperApp Enterprise HR & Attendance MiniApp module
version: 1.0.0

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: '>=3.16.0'

dependencies:
  flutter:
    sdk: flutter

  # Authenticated Scoped Pub Gateway
  # Run once: dart pub token add https://app.fintechcenterfsa.com/pub
  fsa_superapp_miniapp_flutter_sdk:
    hosted:
      name: fsa_superapp_miniapp_flutter_sdk
      url: https://app.fintechcenterfsa.com/pub
    version: ^1.0.0`,
                },
                {
                  filename: "rejection-contract.json",
                  language: "json",
                  code: rejectionJsonExample,
                },
              ]}
            />
          </div>
        )}

        {/* METHOD 3: NATIVE MOBILE SDK SPECIFIC GUIDE */}
        {activeMethodTab === "native" && (
          <div className="space-y-6">
            {/* Visual Codebase File Structure */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-500" />
                Where SDK Files Live in Your Native Projects (Android &amp; iOS)
              </h5>
              <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">fsa-hr-native-app/</p>
                <p className="text-emerald-300">├── android/app/libs/fsasuperapp-native-sdk.aar  <span className="text-slate-500">&lt;-- Android compiled library</span></p>
                <p className="text-emerald-300">├── android/.../MiniAppPlugin.kt                 <span className="text-slate-500">&lt;-- Implements FSAMiniAppNativePlugin</span></p>
                <p className="text-indigo-300">├── ios/Frameworks/FSASuperAppNativeSDK.xcframework<span className="text-slate-500">&lt;-- iOS binary framework</span></p>
                <p className="text-indigo-300">└── ios/.../MiniAppPlugin.swift                  <span className="text-slate-500">&lt;-- Implements FSASuperAppMiniAppNativeProtocol</span></p>
              </div>
            </div>

            {/* Step-by-Step Code Walkthrough */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  Android: FSAMiniAppNativePlugin
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Implement the plugin interface, attach to the host context, and pre-check capability support:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-emerald-300">class MiniAppPlugin : FSAMiniAppNativePlugin &#123;</p>
                  <p className="text-slate-300 pl-2">override fun initialize(ctx: Context, appCtx: MiniAppNativeContext) &#123; ... &#125;</p>
                  <p className="text-emerald-300">&#125;</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  iOS: FSASuperAppMiniAppNativeProtocol
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Implement the Swift protocol and store the active session context for platform services:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-indigo-300">@objc public class MiniAppPlugin: NSObject, FSASuperAppMiniAppNativeProtocol &#123;</p>
                  <p className="text-slate-300 pl-2">public static func initialize(with context: MiniAppNativeContext) &#123; ... &#125;</p>
                  <p className="text-indigo-300">&#125;</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  Present Staff Portal UI View
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Launch your HR Activity or UIViewController from the presenter view passed by host:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-sky-300">// Android: activity.startActivity(Intent(activity, StaffPortalActivity::class.java))</p>
                  <p className="text-sky-300">// iOS: presenter.present(navController, animated: true)</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                  Return Result &amp; Terminate
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Deliver the task outcome callback to the host shell and dismiss cleanly:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-purple-300">callback(mapOf("status" to "completed", "staffId" to "EMP-8842"))</p>
                  <p className="text-rose-300">appCtx.navigation.terminateSession()</p>
                </div>
              </div>
            </div>

            {/* Live Native VSCode Editor */}
            <VSCodeEditor
              files={[
                {
                  filename: "MiniAppPlugin.kt",
                  language: "kotlin",
                  code: `package com.fsa.enterprise.hr

import android.app.Activity
import android.content.Context
import android.content.Intent
import com.fsasuperapp.miniapp.native_sdk.FSAMiniAppNativePlugin
import com.fsasuperapp.miniapp.native_sdk.MiniAppNativeContext

class MiniAppPlugin : FSAMiniAppNativePlugin {
    private var staffId: String? = null
    private var employeeName: String? = null
    private var jwtToken: String? = null

    override fun initialize(context: Context, appCtx: MiniAppNativeContext) {
        this.staffId = appCtx.auth.userId
        this.employeeName = appCtx.auth.userName
        this.jwtToken = appCtx.auth.jwtToken

        // Introspection: Check capability support before calling platform hardware
        if (appCtx.capabilities.canIUse("notification")) {
            // Notification channel ready for Telegram attendance sync alerts
        }
    }

    override fun present(activity: Activity, callback: (result: Map<String, Any>) -> Unit) {
        // Launch native Android Staff Portal Activity
        val intent = Intent(activity, StaffPortalActivity::class.java).apply {
            putExtra("STAFF_ID", staffId)
            putExtra("EMPLOYEE_NAME", employeeName)
            putExtra("AUTH_TOKEN", jwtToken)
        }
        activity.startActivity(intent)

        // Return execution outcome to SuperApp host shell
        callback(mapOf("status" to "active", "timestamp" to System.currentTimeMillis()))
    }
}`,
                },
                {
                  filename: "MiniAppPlugin.swift",
                  language: "swift",
                  code: `import Foundation
import UIKit
import FSASuperAppMiniAppNativeSDK

@objc public class MiniAppPlugin: NSObject, FSASuperAppMiniAppNativeProtocol {
    private static var currentSession: MiniAppNativeContext?

    public static func initialize(with context: MiniAppNativeContext) {
        self.currentSession = context

        // Introspection: Check capability support before instantiating native hardware
        if context.capabilities.canIUse("notification") {
            // Ready for Telegram attendance push notifications
        }
    }

    public static func present(from presenter: UIViewController, completion: @escaping () -> Void) {
        let staffVC = StaffPortalViewController()
        staffVC.staffId = currentSession?.auth.userId
        staffVC.authToken = currentSession?.auth.jwtToken
        
        let navController = UINavigationController(rootViewController: staffVC)
        navController.modalPresentationStyle = .fullScreen
        presenter.present(navController, animated: true, completion: nil)

        // Notify SuperApp host shell when staff exits portal
        staffVC.onDismiss = {
            completion()
        }
    }
}`,
                },
                {
                  filename: "build.gradle.kts",
                  language: "kotlin",
                  code: `dependencies {
    // Link official FSASuperApp Native SDK archive
    implementation(files("libs/fsasuperapp-native-sdk.aar"))
}`,
                },
                {
                  filename: "rejection-contract.json",
                  language: "json",
                  code: rejectionJsonExample,
                },
              ]}
            />
          </div>
        )}

        {/* METHOD 4: DEEP LINK PROTOCOL SPECIFIC GUIDE */}
        {activeMethodTab === "deeplink" && (
          <div className="space-y-6">
            {/* Visual Codebase File Structure */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-amber-500" />
                Where Deep Link Files Live in Your Standalone Application
              </h5>
              <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">fsa-hr-standalone-app/</p>
                <p className="text-amber-300">├── android/app/src/main/AndroidManifest.xml<span className="text-slate-500">&lt;-- &lt;intent-filter&gt; with fsahr://</span></p>
                <p className="text-amber-300">├── ios/Runner/Info.plist                   <span className="text-slate-500">&lt;-- CFBundleURLSchemes with fsahr</span></p>
                <p className="text-slate-400">└── src/</p>
                <p className="text-emerald-300">    └── services/deepLinkHandler.ts         <span className="text-slate-500">&lt;-- @fsasuperapp/miniapp-deeplink-sdk</span></p>
              </div>
            </div>

            {/* Step-by-Step Code Walkthrough */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  Register URI Scheme in Backoffice Portal
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Register your custom URI scheme and store fallback URLs in the registration form:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-brand-300">Scheme: fsahr://attendance/open</p>
                  <p className="text-slate-400">Android: com.fsa.enterprise.hr | iOS: https://apps.apple.com/...</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  Receive Incoming Launch Intent
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  The SuperApp initiates the handoff with verified user ID, short-lived JWT, and return callback URL:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-purple-300">fsahr://attendance/open?token=...&amp;callbackUrl=...</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  Decode Session via DeepLink Helper
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Use the helper library to parse parameters and validate signature integrity:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-sky-300">const session = FSASuperAppDeepLink.parseIncomingUrl(url);</p>
                  <p className="text-slate-400">console.log(session.userId, session.token);</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                  Redirect User Back to SuperApp
                </strong>
                <p className="text-slate-600 dark:text-slate-400">
                  Construct verified callback URL and return user seamlessly to the SuperApp host:
                </p>
                <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg space-y-1 border border-slate-800">
                  <p className="text-emerald-300">window.location.href = session.buildCallbackUrl(&#123; ... &#125;);</p>
                </div>
              </div>
            </div>

            {/* Live Deep Link VSCode Editor */}
            <VSCodeEditor
              files={[
                {
                  filename: "deepLinkHandler.ts",
                  language: "typescript",
                  code: `import { FSASuperAppDeepLink } from '@fsasuperapp/miniapp-deeplink-sdk';

/**
 * Handle incoming launch intent from SuperApp
 */
export function handleIncomingDeepLink() {
  const currentUrl = window.location.href;

  // 1. Parse and verify SuperApp handoff session
  const session = FSASuperAppDeepLink.parseIncomingUrl(currentUrl);

  console.log('Authenticated Staff ID:', session.userId);
  console.log('SuperApp JWT Token:', session.token);
  console.log('Return Callback URL:', session.callbackUrl);

  return session;
}

/**
 * Return employee to SuperApp upon task completion
 */
export function returnToSuperApp(session: any, recordId: string) {
  // 2. Build verified callback URI with execution outcome
  const redirectUrl = session.buildCallbackUrl({
    status: 'completed',
    recordId: recordId,
    timestamp: Date.now(),
  });

  // Handoff back to SuperApp deep router
  window.location.href = redirectUrl;
}`,
                },
                {
                  filename: "AndroidManifest.xml",
                  language: "xml",
                  code: `<activity android:name=".MainActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="fsahr" android:host="attendance" android:pathPrefix="/open" />
    </intent-filter>
</activity>`,
                },
                {
                  filename: "Info.plist",
                  language: "xml",
                  code: `<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>fsahr</string>
        </array>
    </dict>
</array>`,
                },
                {
                  filename: "rejection-contract.json",
                  language: "json",
                  code: rejectionJsonExample,
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* PILLAR 4: Consolidated Strict Prohibitions & Required Conventions */}
      <div id="contract-prohibitions" className="space-y-4 scroll-mt-24">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Pillar 4
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Strict Prohibitions &amp; Required Conventions for {currentMeta.name}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Runtime constraints and Semgrep SAST validation gates enforced during automated CI/CD scans.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold">
            Enforced in Automated CI/CD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Prohibited Rules */}
          <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-800/60 pb-2.5">
              <strong className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 text-sm">
                <BanIcon /> Strictly Prohibited (Immediate Build Rejection)
              </strong>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                Rule ID
              </span>
            </div>
            <ul className="space-y-2.5 text-slate-700 dark:text-slate-300">
              {activeMethodTab === "flutter" ? (
                <>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No <code>void main()</code> or <code>runApp()</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Flutter MiniApps are child widgets; declaring root <code>runApp()</code> hijacks the SuperApp rendering engine.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No <code>exit(0)</code> or <code>SystemNavigator.pop()</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Forbids killing the host OS process. Violations cause fatal host crashes. Use <code>appCtx.navigation.exit()</code>.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Raw <code>MethodChannel</code> calls:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Direct channel calls bypass the SuperApp permission boundary and rate limiter. Always use <code>appCtx.capabilities</code>.</span>
                    </div>
                  </li>
                </>
              ) : activeMethodTab === "webview" ? (
                <>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Untrusted URL Navigation:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Assigning <code className="font-mono">window.location.href</code> to unverified external origins breaks the WebView security container.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Iframe Escaping or Unauthorized Popups:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Opening unvetted child windows or trying to break iframe sandboxing will be blocked by Content Security Policy (CSP).</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Unvetted Capability Calls without <code>canIUse()</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Calling native hardware without pre-flight checking leads to unhandled rejection on older device builds.</span>
                    </div>
                  </li>
                </>
              ) : activeMethodTab === "native" ? (
                <>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No <code>System.exit()</code> or Process Kill:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Killing the process terminates the entire SuperApp. Return through the provided callback instead.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Modifying Host Activity Task Flags:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Do not launch activities with <code className="font-mono">FLAG_ACTIVITY_NEW_TASK</code> that detach from the SuperApp backstack.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Unvetted Capability Calls without <code>canIUse()</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Calling unverified hardware drivers directly causes native crashes on devices without hardware support.</span>
                    </div>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Arbitrary URI Scheme Redirection:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Return callbacks must strictly target the verified <code className="font-mono">callbackUrl</code> issued by the SuperApp handoff.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Persistent Storing of Handoff Bearer Tokens:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Tokens passed in deep link query parameters are single-session only; never store them unencrypted.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">No Silent Failures:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">If the user cancels the handoff task, return <code className="font-mono">status=cancelled</code> instead of dropping connection.</span>
                    </div>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Required Conventions */}
          <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/60 pb-2.5">
              <strong className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                <CheckCircleIcon /> Required Development Conventions
              </strong>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                Rule ID
              </span>
            </div>
            <ul className="space-y-2.5 text-slate-700 dark:text-slate-300">
              {activeMethodTab === "flutter" ? (
                <>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Extend <code>MiniAppWidget</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Entrypoint class must inherit from <code>MiniAppWidget</code> to receive the injected <code>MiniAppContext</code>.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Use <code>FSASuperAppBar</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Guarantees safe area header insets and capsule button alignment with host design tokens.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Graceful Exit with <code>appCtx.navigation.exit()</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Allows the host container to animate dismissal and cleanly garbage-collect isolate resources.</span>
                    </div>
                  </li>
                </>
              ) : activeMethodTab === "webview" ? (
                <>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Call <code>await FSASuperApp.ready()</code> on Startup:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Awaits the bidirectional bridge handshake before invoking any device or identity methods.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Respect Viewport Safe Area Variables:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Use <code className="font-mono">var(--fsa-safe-top)</code> and <code className="font-mono">var(--fsa-capsule-safe-right)</code> for header controls.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Terminate via <code>FSASuperApp.close()</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Informs the mobile host shell to dismiss the active web view container smoothly.</span>
                    </div>
                  </li>
                </>
              ) : activeMethodTab === "native" ? (
                <>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Conform to Plugin Interface:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Implement <code>FSAMiniAppNativePlugin</code> (Kotlin) or <code>FSASuperAppMiniAppNativeProtocol</code> (Swift).</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Pass Results via Callback:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Always invoke the completion handler when the native presentation layer finishes.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Use <code>terminateSession()</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Dismisses the native Activity or ViewController and notifies the host navigation stack.</span>
                    </div>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Parse via <code>FSASuperAppDeepLink</code>:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Use the official helper SDK to extract and validate HMAC signatures on incoming launch URLs.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Build Verified Return URI:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Construct the redirect string using <code className="font-mono">session.buildCallbackUrl()</code>.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">Register Fallback Store URLs:</strong>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">Supply Google Play and Apple App Store URLs in BackOffice for users who don't have the standalone app installed.</span>
                    </div>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
