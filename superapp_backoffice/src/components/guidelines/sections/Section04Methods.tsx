"use client";

import React from "react";
import {
  GlobeIcon,
  PackageIcon,
  WrenchIcon,
  LinkIcon,
  TagIcon,
  HashIcon,
  FolderIcon,
  CheckCircleIcon,
  KeyIcon,
} from "@/components/ui/Icons";
import { IntegrationMethodTab } from "@/types";

interface Section04MethodsProps {
  activeMethodTab: IntegrationMethodTab;
  setActiveMethodTab: (tab: IntegrationMethodTab) => void;
}

export function Section04Methods({
  activeMethodTab,
  setActiveMethodTab,
}: Section04MethodsProps) {
  return (
    <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
      <p className="leading-relaxed">
        The SuperApp platform supports 4 official integration methods tailored to your architecture, tech stack, and distribution model:
      </p>

      {/* Interactive Method Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] gap-1">
        {[
          { id: "webview", label: "WebView MiniApp", icon: <GlobeIcon /> },
          { id: "flutter", label: "Flutter Package (Git / ZIP)", icon: <PackageIcon /> },
          { id: "native", label: "Native SDK (Kotlin / Swift)", icon: <WrenchIcon /> },
          { id: "deeplink", label: "Deep Link Protocol", icon: <LinkIcon /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMethodTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
              activeMethodTab === tab.id
                ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/30"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Method 1: WebView */}
      {activeMethodTab === "webview" && (
        <div className="space-y-6 pt-2">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <GlobeIcon /> WebView MiniApp Integration
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Embeds external web applications into an isolated, secure SuperApp WebView container. The web application interacts with native features via the standardized JavaScript Bridge (<code>@fsasuperapp/sdk</code>).
            </p>
          </div>

          {/* Dedicated Domain Verification Callout */}
          <section id="domain-verification" className="scroll-mt-28 space-y-4">
            <div className="p-6 rounded-2xl border-2 border-brand-500/40 dark:border-brand-500/30 bg-gradient-to-br from-brand-50/70 via-slate-50 to-white dark:from-brand-950/30 dark:via-slate-900/60 dark:to-slate-900/40 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <GlobeIcon />
                  </div>
                  <div>
                    <h5 className="text-xl font-bold text-slate-900 dark:text-white">
                      Mandatory Domain Ownership Verification
                    </h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                      MiniApps serving web content must cryptographically prove domain ownership before staging submission.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
                  Automated Pre-flight Gate
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2.5">
                  <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <TagIcon className="w-4 h-4 text-brand-500" />
                    Method A: DNS TXT Record (Recommended)
                  </strong>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Add a TXT record to your root or subdomain DNS zone. Verification is cached and automatically checked during pre-flight.
                  </p>
                  <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                    <p className="text-slate-400"># Host / Name:</p>
                    <p className="text-brand-300">_superapp-challenge.yourdomain.com</p>
                    <p className="text-slate-400 mt-2"># Value / Content:</p>
                    <p className="text-brand-300">superapp-site-verification=&lt;token&gt;</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2.5">
                  <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <HashIcon className="w-4 h-4 text-brand-500" />
                    Method B: HTML Meta Tag
                  </strong>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Place a verification meta tag in the <code>&lt;head&gt;</code> section of your production URL homepage.
                  </p>
                  <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                    <p className="text-slate-400">&lt;!-- Inside &lt;head&gt; of index.html --&gt;</p>
                    <p className="text-brand-300">&lt;meta name=&quot;superapp-site-verification&quot; content=&quot;&lt;token&gt;&quot; /&gt;</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Method 2: Flutter Package (Source Code Git & Package Artifact ZIP) */}
      {activeMethodTab === "flutter" && (
        <div className="space-y-6 pt-2">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <PackageIcon /> Flutter Package Integration (Git &amp; ZIP Archive)
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Deliver your MiniApp as a modular Flutter Dart package. The SuperApp platform supports two distribution formats: <strong>Source Code (Git Repository)</strong> or pre-packaged <strong>Package Artifact (.zip Archive)</strong>.
            </p>
          </div>

          {/* Delivery Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                  <FolderIcon />
                </span>
                <div>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white block">Option A: Source Code (Git)</strong>
                  <span className="text-slate-500">Continuous Integration via automated Git clone</span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Provide your Git repository URL and branch. The platform CI/CD engine automatically clones, runs SAST / Semgrep scans, and compiles the bundle into the host SuperApp.
              </p>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-600 dark:text-slate-400">
                <li>Supports SSH Deploy Keys (ED25519) or Read-Only Personal Access Tokens</li>
                <li>Automatic subpath monorepo resolution (<code>gitPath</code>)</li>
                <li>Automated dependency vulnerability audits on commit</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  <PackageIcon />
                </span>
                <div>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white block">Option B: Package Artifact (.zip)</strong>
                  <span className="text-slate-500">Pre-packaged standalone Dart package archive</span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload a sanitized <code>.zip</code> package containing your Flutter module source code and <code>pubspec.yaml</code> directly in the registration portal.
              </p>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-600 dark:text-slate-400">
                <li>Maximum archive size: 50 MB</li>
                <li>Pre-upload sanitization strips unnecessary binaries, <code>.git</code>, and build folders</li>
                <li>SHA-256 integrity checksum calculated and signed on upload</li>
              </ul>
            </div>
          </div>

          {/* Pubspec Standards & Code Contracts */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4">
            <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
              <span>Flutter Package Structure &amp; Pubspec Contract</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-800 dark:text-slate-200 block">1. Canonical Package Name</strong>
                <span className="text-slate-500">Must be lowercase with underscores (e.g. <code className="text-brand-600 dark:text-brand-400 font-mono">my_transit_miniapp</code>).</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-800 dark:text-slate-200 block">2. Root Export File</strong>
                <span className="text-slate-500">Must export primary screens / widgets in <code className="text-brand-600 dark:text-brand-400 font-mono">lib/&lt;package_name&gt;.dart</code>.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-800 dark:text-slate-200 block">3. Isolated State</strong>
                <span className="text-slate-500">Do not execute <code className="text-rose-500 font-mono">exit(0)</code> or override container-level GetX controllers.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Method 3: Native SDK (Kotlin / Swift) */}
      {activeMethodTab === "native" && (
        <div className="space-y-6 pt-2">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <WrenchIcon /> Native SDK Integration (Kotlin / Swift)
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Deliver native compiled binaries for high-performance graphics, hardware device drivers, or legacy codebases. Third-party developers author modules in <strong>Kotlin / Java (Android)</strong> and <strong>Swift / Objective-C (iOS)</strong> and upload compiled binaries.
            </p>
          </div>

          {/* Native Binaries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  AAR
                </span>
                <div>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white block">Android: AAR Library (<code>.aar</code>)</strong>
                  <span className="text-slate-500">Compiled Kotlin / Java Android Archive</span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload your compiled <code>.aar</code> binary. In the registration form, specify the Android Package Name (e.g. <code>com.merchant.miniapp</code>) and Plugin Entry Class (e.g. <code>MiniAppPlugin</code>).
              </p>
              <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                <p className="text-slate-400">// Kotlin Implementation</p>
                <p className="text-brand-300">class MiniAppPlugin : SuperAppPlugin &#123;</p>
                <p className="text-slate-300 pl-4">override fun onAttachedToHost(ctx: Context, appCtx: MiniAppContext) &#123; ... &#125;</p>
                <p className="text-brand-300">&#125;</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                  ZIP
                </span>
                <div>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white block">iOS: Framework (<code>.xcframework</code> / <code>.zip</code>)</strong>
                  <span className="text-slate-500">Compiled Swift / Objective-C Binary Framework</span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload a <code>.zip</code> archive containing your compiled <code>.xcframework</code> or <code>.framework</code>. Specify the iOS Module Name (e.g. <code>MerchantMiniApp</code>) and Entry Type (e.g. <code>MiniAppPlugin</code>).
              </p>
              <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                <p className="text-slate-400">// Swift Implementation</p>
                <p className="text-brand-300">@objc public class MiniAppPlugin: NSObject, SuperAppModuleProtocol &#123;</p>
                <p className="text-slate-300 pl-4">public func initialize(with context: MiniAppContext) &#123; ... &#125;</p>
                <p className="text-brand-300">&#125;</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Method 4: Deep Link */}
      {activeMethodTab === "deeplink" && (
        <div className="space-y-6 pt-2">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <h5 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LinkIcon /> Deep Link Integration Protocol
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Treats the SuperApp as an ecosystem discovery launchpad, seamlessly redirecting the user to your standalone mobile application installed on the device via registered Custom URL Schemes or Universal / App Links.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4">
            <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-brand-500" />
              <span>Required Configuration Parameters</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-800 dark:text-slate-200 block">1. URL Scheme</strong>
                <span className="text-slate-500">Registered custom URI (e.g. <code className="text-brand-600 dark:text-brand-400 font-mono">merchantapp://checkout</code>).</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-800 dark:text-slate-200 block">2. Android Package Name</strong>
                <span className="text-slate-500">Google Play Store package identifier for store fallback redirect.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-800 dark:text-slate-200 block">3. iOS App Store URL</strong>
                <span className="text-slate-500">Apple App Store URL for automatic app installation fallback.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
