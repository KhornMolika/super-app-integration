"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';

interface Section {
  id: string;
  number: string;
  title: string;
  category: 'GENERAL' | 'CONTRACT' | 'METHODS' | 'CAPABILITIES' | 'SECURITY' | 'LIFECYCLE' | 'SUPPORT';
  summary: string;
  badge?: string;
  content: React.ReactNode;
}

export default function GuidelinesPage() {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'dart' | 'yaml' | 'manifest' | 'plist' | 'semgrep'>('dart');
  const [activeMethodTab, setActiveMethodTab] = useState<'webview' | 'artifact' | 'source' | 'native' | 'deeplink'>('webview');
  
  // Interactive checklist state
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    item1: true,
    item2: true,
    item3: false,
    item4: false,
    item5: false,
    item6: false,
  });

  const toggleChecklist = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const completedChecks = Object.values(checkedItems).filter(Boolean).length;
  const totalChecks = Object.keys(checkedItems).length;
  const checklistProgress = Math.round((completedChecks / totalChecks) * 100);

  const sections: Section[] = [
    {
      id: 'overview',
      number: '01',
      title: 'Overview & Ecosystem Roles',
      category: 'GENERAL',
      summary: 'Roles, architectural boundaries, and governance across the Mini App onboarding lifecycle.',
      badge: 'Core Governance',
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            The Super App Mini App ecosystem provides a high-performance, sandboxed runtime enabling autonomous delivery of vertical services. The platform strictly isolates third-party business logic while enabling standardized access to device features and Super App APIs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-blue-500/20">
                👤
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">MA Manager</h4>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 mt-1 mb-2">
                External / Mini App Team
              </span>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>• Registers Mini App metadata & icon</li>
                <li>• Configures integration method & source</li>
                <li>• Reviews detected permission claims</li>
                <li>• Resolves validation & security findings</li>
                <li>• Performs acceptance testing on test builds</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 border border-purple-100 dark:border-slate-700 shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-purple-500/20">
                🛡️
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">SA Admin</h4>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 mt-1 mb-2">
                Super App Platform Owner
              </span>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>• Reviews integration architecture & contracts</li>
                <li>• Approves/rejects new capability requests</li>
                <li>• Audits automated security scans (Gitleaks, Semgrep)</li>
                <li>• Authorizes CI integration builds</li>
                <li>• Grants final release approval & activates version</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 border border-emerald-100 dark:border-slate-700 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-600 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-emerald-500/20">
                ⚙️
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">System / CI</h4>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 mt-1 mb-2">
                Automated Engine
              </span>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>• Method-specific pre-storage isolation</li>
                <li>• Automated vulnerability & secrets scanning</li>
                <li>• Deterministic Configuration Plan generator</li>
                <li>• Automated Super App compilation & packaging</li>
                <li>• MinIO quarantine & test distribution storage</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'general-requirements',
      number: '02',
      title: 'General Integration Requirements & Metadata',
      category: 'GENERAL',
      summary: 'Global conventions, naming syntax, SemVer rules, and environment segregation.',
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <span className="text-brand-500">🏷️</span> Mini App Identity
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Every Mini App must register an immutable unique identifier using reverse-domain notation.</p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs">
                com.company.module_name
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Allowed: lowercase letters, digits, dots, and underscores.</p>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <span className="text-brand-500">🔢</span> Versioning Standard
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Strict adherence to Semantic Versioning (SemVer 2.0.0) is mandated for all releases.</p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs">
                MAJOR.MINOR.PATCH (e.g. 2.4.1)
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Duplicate version numbers on the same environment are rejected.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 space-y-2">
            <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">Target Environment Segregation</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <span className="font-bold text-blue-600 dark:text-blue-400">DEVELOPMENT</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">For ongoing feature work and local developer test harnesses.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <span className="font-bold text-amber-600 dark:text-amber-400">STAGING</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pre-production verification against actual Super App test builds.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">PRODUCTION</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Publicly active release serving live end-users inside the Super App.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sdk-contract',
      number: '03',
      title: 'Mini App SDK / API Contract & Runtime Constraints',
      category: 'CONTRACT',
      summary: 'Required bridge APIs, lifecycle bindings, authentication tokens, and strict runtime prohibitions.',
      badge: 'Critical Rule',
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Mini Apps operate within a controlled sandbox. All platform interactions (authentication, device camera, navigation, network tokens) must pass through the official <code>SuperAppSDK</code>. Direct native access via custom MethodChannels or background process hijacking is forbidden.
          </p>

          {/* Interactive Code Preview Tabs */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-900 text-slate-100 shadow-md">
            <div className="flex border-b border-slate-800 bg-slate-950/80 px-3 pt-2 gap-2 text-xs">
              <button
                onClick={() => setActiveCodeTab('dart')}
                className={`px-3 py-2 rounded-t-lg font-mono font-medium transition-all ${
                  activeCodeTab === 'dart' ? 'bg-slate-900 text-accent-400 border-t-2 border-accent-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                entrypoint.dart
              </button>
              <button
                onClick={() => setActiveCodeTab('yaml')}
                className={`px-3 py-2 rounded-t-lg font-mono font-medium transition-all ${
                  activeCodeTab === 'yaml' ? 'bg-slate-900 text-accent-400 border-t-2 border-accent-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                pubspec.yaml
              </button>
              <button
                onClick={() => setActiveCodeTab('semgrep')}
                className={`px-3 py-2 rounded-t-lg font-mono font-medium transition-all ${
                  activeCodeTab === 'semgrep' ? 'bg-slate-900 text-accent-400 border-t-2 border-accent-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                security-rule.yaml
              </button>
            </div>

            <div className="p-4 font-mono text-xs overflow-x-auto relative group">
              <button
                onClick={() => {
                  const code = activeCodeTab === 'dart' 
                    ? `import 'package:flutter/material.dart';\nimport 'package:super_app_sdk/super_app_sdk.dart';\n\nclass MiniAppEntryPoint extends MiniAppWidget {\n  @override\n  Widget build(BuildContext context, MiniAppContext appCtx) {\n    // Retrieve authenticated user and scoped token\n    final user = appCtx.auth.currentUser;\n    final token = appCtx.auth.accessToken;\n\n    return Scaffold(\n      appBar: SuperAppBar(title: 'Food Delivery', appCtx: appCtx),\n      body: MiniAppHomeView(user: user, apiToken: token),\n    );\n  }\n}`
                    : activeCodeTab === 'yaml'
                    ? `name: food_delivery_miniapp\ndescription: A Food Delivery Mini App module\nversion: 1.0.0\n\nenvironment:\n  sdk: '>=3.2.0 <4.0.0'\n  flutter: '>=3.16.0'\n\ndependencies:\n  flutter:\n    sdk: flutter\n  super_app_sdk: ^1.2.0\n  http: ^1.1.0`
                    : `rules:\n  - id: forbid-main-entrypoint\n    patterns:\n      - pattern: void main() { ... }\n    message: "Mini Apps must not define void main() or invoke runApp()."\n    severity: ERROR\n    languages: [dart]`;
                  handleCopy(code, 'code-block');
                }}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-all border border-slate-700"
              >
                {copiedIndex === 'code-block' ? '✓ Copied' : 'Copy'}
              </button>

              {activeCodeTab === 'dart' && (
                <pre>{`import 'package:flutter/material.dart';
import 'package:super_app_sdk/super_app_sdk.dart';

// Official Mini App entrypoint contract
class MiniAppEntryPoint extends MiniAppWidget {
  @override
  Widget build(BuildContext context, MiniAppContext appCtx) {
    // Retrieve authenticated user and scoped token
    final user = appCtx.auth.currentUser;
    final token = appCtx.auth.accessToken;

    return Scaffold(
      appBar: SuperAppBar(title: 'Food Delivery', appCtx: appCtx),
      body: MiniAppHomeView(user: user, apiToken: token),
    );
  }
}`}</pre>
              )}

              {activeCodeTab === 'yaml' && (
                <pre>{`name: food_delivery_miniapp
description: A Food Delivery Mini App module
version: 1.0.0

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: '>=3.16.0'

dependencies:
  flutter:
    sdk: flutter
  super_app_sdk: ^1.2.0
  http: ^1.1.0`}</pre>
              )}

              {activeCodeTab === 'semgrep' && (
                <pre>{`rules:
  - id: forbid-main-entrypoint
    patterns:
      - pattern: void main() { ... }
    message: "Mini Apps must not define void main() or invoke runApp()."
    severity: ERROR
    languages: [dart]
  - id: forbid-exit-calls
    pattern: exit($CODE)
    message: "Mini Apps cannot terminate the host Super App process."
    severity: ERROR
    languages: [dart]`}</pre>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200">
              <strong className="block font-bold mb-1 text-rose-700 dark:text-rose-400">🚫 Strictly Prohibited</strong>
              <ul className="space-y-1 list-disc pl-4 text-[12px]">
                <li>No <code>void main()</code> or <code>runApp()</code> entrypoints</li>
                <li>No direct <code>exit(0)</code> or <code>SystemNavigator.pop()</code></li>
                <li>No custom unvetted <code>MethodChannel</code> calls</li>
                <li>No direct modification of Super App theme globals</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
              <strong className="block font-bold mb-1 text-emerald-700 dark:text-emerald-400">✅ Required Conventions</strong>
              <ul className="space-y-1 list-disc pl-4 text-[12px]">
                <li>Extend <code>MiniAppWidget</code> as the root view</li>
                <li>Consume <code>MiniAppContext</code> for auth and tokens</li>
                <li>Use <code>SuperAppSDK.navigation</code> for host routing</li>
                <li>Declare all required device features via Capabilities</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'methods',
      number: '04',
      title: 'Supported Integration Methods — Detailed Breakdown',
      category: 'METHODS',
      summary: 'Exhaustive requirements, validation rules, security checks, and specifications for all 5 integration channels.',
      badge: 'Comprehensive Matrix',
      content: (
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p>
            The Super App platform supports 5 distinct integration methods. The critical architectural distinction lies in <strong>what the Super App receives</strong> and <strong>who performs the compilation/build</strong>:
          </p>

          {/* Architectural Comparison Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Super App Receives</th>
                  <th className="p-3.5">Who Builds / Hosts?</th>
                  <th className="p-3.5">Source Confidentiality</th>
                  <th className="p-3.5">Runtime Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800/40">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🌐</span> WebView
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">HTTPS URL</td>
                  <td className="p-3.5 text-blue-600 dark:text-blue-400 font-semibold">Vendor hosts / builds</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-medium">Complete (Remote)</td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400">Standard Web</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📦</span> Flutter Artifact
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">Flutter package archive (.zip / .tar.gz)</td>
                  <td className="p-3.5 text-purple-600 dark:text-purple-400 font-semibold">Super App builds</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-medium">Complete (No Git access)</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">Native 60fps</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📁</span> Flutter Source Code
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">Git Repo (Commit SHA / Tag)</td>
                  <td className="p-3.5 text-purple-600 dark:text-purple-400 font-semibold">Super App builds</td>
                  <td className="p-3.5 text-amber-600 dark:text-amber-400 font-medium">Shared Repository</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">Native 60fps</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🔧</span> Native SDK
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">.aar / .xcframework binaries</td>
                  <td className="p-3.5 text-purple-600 dark:text-purple-400 font-semibold">Super App links</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-medium">Complete (Compiled)</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">Native OS</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🔗</span> Deep Link
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">URI Scheme / App Link Config</td>
                  <td className="p-3.5 text-blue-600 dark:text-blue-400 font-semibold">Target Application</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-medium">Complete (External)</td>
                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">Native OS</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Interactive Method Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 pt-2">
            {[
              { id: 'webview', label: '🌐 WebView', name: 'WebView' },
              { id: 'artifact', label: '📦 Flutter Package Artifact', name: 'Package Artifact' },
              { id: 'source', label: '📁 Flutter Source Code', name: 'Source Code' },
              { id: 'native', label: '🔧 Native SDK', name: 'Native SDK' },
              { id: 'deeplink', label: '🔗 Deep Link', name: 'Deep Link' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMethodTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeMethodTab === tab.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Method 1: WebView */}
          {activeMethodTab === 'webview' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border border-blue-200 dark:border-slate-700">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🌐</span> 1. WebView Integration Method
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Embeds external web applications into an isolated, secure Super App WebView container connected via a standardized JavaScript Bridge.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🎯 Purpose & When to Use It
                  </span>
                  <p><strong>Purpose:</strong> Seamlessly render responsive web apps inside the mobile Super App without requiring Dart/Flutter development.</p>
                  <p><strong>When to use:</strong> Existing web platforms, high-frequency campaign pages, micro-frontends, or when rapid remote updates without app releases are required.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    📋 Required Information & Files
                  </span>
                  <p><strong>Required Information:</strong> Target Web URL (HTTPS only), Allowed Domain List, Target Environment, Bridge API version, and Redirect callback URLs.</p>
                  <p><strong>Required Files:</strong> None required (hosted remotely). Optional static asset bundle for offline cache.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    ⚙️ Automated Validation Process
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    <li><strong>URL Reachability & Latency:</strong> Checks HTTP 200 response time.</li>
                    <li><strong>HTTPS & TLS:</strong> Enforces TLS 1.2+ with valid SSL certificates.</li>
                    <li><strong>SSRF Protection:</strong> Blocks resolution to private/internal IPs (RFC 1918, 127.0.0.1).</li>
                    <li><strong>Open Redirect Protection:</strong> Verifies domain navigation stay within allowlist.</li>
                    <li><strong>Bridge API Contract:</strong> Validates <code>window.SuperAppBridge</code> interface handlers.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🛡️ Security & Limitations
                  </span>
                  <p><strong>Security Requirements:</strong> Automated OWASP ZAP DAST scan for XSS, strict Content-Security-Policy (CSP) headers, HSTS, and sanitized message passing.</p>
                  <p><strong>Limitations:</strong> Dependent on network connection, higher latency than native Flutter code, restricted direct hardware access without Super App Bridge.</p>
                </div>
              </div>

              {/* WebView Example Payload */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">// Example WebView Registration Payload</div>
                <pre>{`{
  "integrationMethod": "WEBVIEW",
  "name": "Food Delivery Web",
  "version": "1.0.0",
  "webViewConfig": {
    "url": "https://food.partner.com/app",
    "allowedDomains": ["food.partner.com", "api.partner.com", "cdn.partner.com"],
    "redirectUrls": ["https://food.partner.com/auth/callback"],
    "bridgeVersion": "1.2.0",
    "enablePullToRefresh": true
  }
}`}</pre>
              </div>
            </div>
          )}

          {/* Method 2: Flutter Package Artifact */}
          {activeMethodTab === 'artifact' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800/80 border border-purple-200 dark:border-slate-700">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📦</span> 2. Flutter Package Artifact Integration Method
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Uploads a bundled Flutter package archive to the platform, allowing the Super App to consume the package and build it as part of its own Flutter application without requiring access to the Mini App team's proprietary Git repository.
                </p>
              </div>

              {/* Architectural Concept Box */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 text-xs text-purple-900 dark:text-purple-200">
                <div className="font-bold mb-1 flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                  <span>💡</span> Core Architectural Principle: Vendor supplies package; Super App owns the build
                </div>
                <p className="leading-relaxed">
                  <strong>Flutter Package Artifact</strong> = The versioned deliverable package containing Dart/Flutter source. &nbsp;|&nbsp; 
                  <strong>Flutter Package Archive</strong> = The compressed <code>.tar.gz</code> or <code>.zip</code> file used to transport the artifact to MinIO quarantine.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🎯 Purpose & When to Use It
                  </span>
                  <p>
                    <strong>Purpose:</strong> Deliver reusable Flutter functionality as a versioned package artifact while keeping the vendor's source repository private.
                  </p>
                  <p>
                    <strong>When to use:</strong> External third-party commercial vendors, outsourced development teams, or organizations with strict source-code IP governance.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    📋 Required Information & Files
                  </span>
                  <p>
                    <strong>Required Information:</strong> Package Name, SemVer Version, SHA-256 Checksum, Flutter/Dart Version, Target Environment, and package dependencies.
                  </p>
                  <p>
                    <strong>Required Files:</strong> Compressed <code>.zip</code> or <code>.tar.gz</code> archive containing a valid <code>pubspec.yaml</code>, <code>lib/</code> package source, and required assets. <strong>Maximum size: 50 MB.</strong>
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    ⚙️ Automated Validation Process
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    <li>
                      <strong>Pre-Storage Gateway:</strong> Zip-bomb ratio check, path-traversal (<code>../</code>) rejection, and archive/file-signature validation.
                    </li>
                    <li>
                      <strong>MinIO Quarantine:</strong> Uploaded archive is isolated in an untrusted quarantine bucket before approval.
                    </li>
                    <li>
                      <strong>Integrity Check:</strong> Calculates SHA-256 and compares it with the checksum provided by the vendor.
                    </li>
                    <li>
                      <strong>Package Structure:</strong> Validates <code>pubspec.yaml</code>, package structure, assets, dependencies, and package metadata.
                    </li>
                    <li>
                      <strong>Dependency Validation:</strong> Resolves and validates declared Flutter/Dart dependencies against approved package/version policies.
                    </li>
                    <li>
                      <strong>Build Compatibility:</strong> Verifies that the package can be resolved and built using the Super App's supported Flutter/Dart environment.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🛡️ Security & Limitations
                  </span>
                  <p>
                    <strong>Security Requirements:</strong> ClamAV malware scan, Gitleaks secrets audit, Trivy dependency vulnerability scan, and Semgrep static analysis.
                  </p>
                  <p>
                    <strong>Limitations:</strong> Each update requires a new versioned artifact to be packaged and uploaded; because the Super App builds the package itself, incompatible dependencies or Flutter/Dart versions may cause build failures. Runtime crash debugging may require platform-specific symbol or mapping files.
                  </p>
                </div>
              </div>

              {/* Artifact Example Payload */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">
                  // Example Flutter Package Artifact Registration Payload
                </div>
                <pre>{`{
  "integrationMethod": "FLUTTER_PACKAGE_ARTIFACT",
  "name": "e_wallet_module",
  "version": "2.1.0",
  "artifact": {
    "filename": "e_wallet_module-2.1.0.tar.gz",
    "sizeBytes": 14582910,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "runtime": {
    "flutterVersion": "3.35.0",
    "dartVersion": "3.9.0",
    "environment": "production"
  }
}`}</pre>
              </div>
            </div>
          )}

          {/* Method 3: Flutter Package Source Code */}
          {activeMethodTab === 'source' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/80 border border-emerald-200 dark:border-slate-700">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📁</span> 3. Flutter Package Source Code Integration Method
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Connect direct GitHub or GitLab repositories locked to an immutable Commit SHA or Tag for automated CI builds.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🎯 Purpose & When to Use It
                  </span>
                  <p><strong>Purpose:</strong> Seamless, automated continuous integration directly from source code repositories into Super App builds.</p>
                  <p><strong>When to use:</strong> In-house engineering teams, core partner teams, and applications with continuous CI/CD pipelines.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    📋 Required Information & Files
                  </span>
                  <p><strong>Required Information:</strong> Git Provider (GitHub/GitLab), Repository URL, Visibility (Public/Private), Reference Type (Commit SHA / Tag / Branch), Target Package Subpath.</p>
                  <p><strong>Required Files:</strong> Full repository with <code>pubspec.yaml</code>, <code>lib/</code>, unit tests, and authorized GitHub App / OAuth connection.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    ⚙️ Automated Validation Process
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    <li><strong>Git Authentication:</strong> Verification of read-only access via GitHub App / GitLab OAuth.</li>
                    <li><strong>Commit Locking:</strong> Resolves branch/tag to immutable 40-character Commit SHA.</li>
                    <li><strong>Flutter Analyze:</strong> Runs automated static analysis and linting checks.</li>
                    <li><strong>Automated Headless Build:</strong> Tests compilation for Android and iOS engines.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🛡️ Security & Limitations
                  </span>
                  <p><strong>Security Requirements:</strong> Gitleaks full repository commit history scan, Semgrep custom AST rules, Trivy dependency vulnerability scanning.</p>
                  <p><strong>Limitations:</strong> Requires granting repository read permissions; Git network latency during CI checkouts.</p>
                </div>
              </div>

              {/* Source Code Example Payload */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">// Example Flutter Package Source Code Configuration</div>
                <pre>{`{
  "integrationMethod": "FLUTTER_PACKAGE_SOURCE_CODE",
  "name": "ecommerce_store",
  "version": "1.4.0",
  "gitConfig": {
    "provider": "GITHUB",
    "repositoryUrl": "https://github.com/fintech-corp/ecommerce-miniapp",
    "visibility": "PRIVATE",
    "referenceType": "COMMIT_SHA",
    "commitSha": "7f8b9a2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a",
    "packagePath": "."
  }
}`}</pre>
              </div>
            </div>
          )}

          {/* Method 4: Native SDK */}
          {activeMethodTab === 'native' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80 border border-amber-200 dark:border-slate-700">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔧</span> 4. Native SDK Integration Method
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Integrate pre-compiled platform-native binaries (Android <code>.aar</code> and iOS <code>.xcframework</code>) for legacy or high-performance C++/Rust native code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🎯 Purpose & When to Use It
                  </span>
                  <p><strong>Purpose:</strong> Embed low-level compiled libraries and proprietary platform SDKs directly into the native Super App binary.</p>
                  <p><strong>When to use:</strong> Video processing, biometric recognition engines, embedded C++ game libraries, or legacy native Kotlin/Swift SDKs.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    📋 Required Information & Files
                  </span>
                  <p><strong>Required Information:</strong> SDK Name, Version, Supported Architectures (arm64, x86_64), Minimum OS requirements (Android SDK 24+, iOS 14.0+).</p>
                  <p><strong>Required Files:</strong> Android <code>.aar</code> file, iOS <code>.xcframework</code> directory bundle, and native C/header specifications.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    ⚙️ Automated Validation Process
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    <li><strong>ABI Compatibility:</strong> Inspects binaries for <code>arm64-v8a</code>, <code>armeabi-v7a</code>, and simulator symbols.</li>
                    <li><strong>Manifest Merger:</strong> Analyzes AndroidManifest.xml inside AAR for unauthorized permissions.</li>
                    <li><strong>Bitcode & Architecture:</strong> Verifies Apple universal slice integrity.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🛡️ Security & Limitations
                  </span>
                  <p><strong>Security Requirements:</strong> Binary decompilation scan, malware signature analysis, symbol obfuscation verification.</p>
                  <p><strong>Limitations:</strong> Requires separate builds for Android and iOS; increases Super App binary size; requires SA Admin approval for native linkages.</p>
                </div>
              </div>

              {/* Native SDK Example Payload */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">// Example Native SDK Registration Descriptor</div>
                <pre>{`{
  "integrationMethod": "NATIVE_SDK",
  "name": "biometric_core_sdk",
  "version": "3.0.1",
  "nativeConfig": {
    "androidAar": "biometric-core-v3.0.1.aar",
    "iosFramework": "BiometricCore.xcframework",
    "minAndroidSdk": 24,
    "minIosVersion": "14.0",
    "supportedArchitectures": ["arm64-v8a", "arm64"]
  }
}`}</pre>
              </div>
            </div>
          )}

          {/* Method 5: Deep Link */}
          {activeMethodTab === 'deeplink' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/80 border border-cyan-200 dark:border-slate-700">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔗</span> 5. Deep Link Integration Method
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  App-to-App routing and intent switching between the Super App and external native standalone applications installed on the device.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🎯 Purpose & When to Use It
                  </span>
                  <p><strong>Purpose:</strong> Direct users seamlessly from the Super App into external partner native apps with contextual session tokens.</p>
                  <p><strong>When to use:</strong> Strategic partners with massive standalone apps (e.g. specialized banking apps, ride-hailing navigation apps).</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    📋 Required Information & Files
                  </span>
                  <p><strong>Required Information:</strong> Custom URI Scheme, Android App Links domain, iOS Universal Links domain, Fallback Web URL, App Store/Play Store IDs.</p>
                  <p><strong>Required Files:</strong> Verified <code>assetlinks.json</code> and <code>apple-app-site-association</code> domain verification configuration.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    ⚙️ Automated Validation Process
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    <li><strong>Scheme Conflict Check:</strong> Verifies custom URI scheme does not conflict with existing apps.</li>
                    <li><strong>Domain Association Validation:</strong> Validates domain ownership via HTTPS certificate lookup.</li>
                    <li><strong>Fallback Validation:</strong> Ensures Web/Store fallback URL is reachable.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block text-brand-600 dark:text-brand-400">
                    🛡️ Security & Limitations
                  </span>
                  <p><strong>Security Requirements:</strong> Ephemeral token encryption, parameter sanitization to prevent scheme hijacking.</p>
                  <p><strong>Limitations:</strong> Requires user to have the standalone native app installed on their phone; otherwise falls back to browser.</p>
                </div>
              </div>

              {/* Deep Link Example Payload */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">// Example Deep Link Registration Payload</div>
                <pre>{`{
  "integrationMethod": "DEEP_LINK",
  "name": "Partner Bank Link",
  "version": "1.0.0",
  "deepLinkConfig": {
    "uriScheme": "partnerbank://",
    "androidAppLinksDomain": "bank.partner.com",
    "iosUniversalLinksDomain": "bank.partner.com",
    "fallbackUrl": "https://bank.partner.com/download",
    "playStoreId": "com.partner.bank",
    "appStoreId": "id123456789"
  }
}`}</pre>
              </div>
            </div>
          )}

        </div>
      ),
    },
    {
      id: 'capabilities',
      number: '05',
      title: 'Permissions & Capability Catalog',
      category: 'CAPABILITIES',
      summary: 'High-level Capability abstraction vs. platform OS permissions, catalog resolution, and approval rules.',
      badge: 'Catalog Architecture',
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            To maintain zero security drift, Mini Apps request abstract <strong>Capabilities</strong> (e.g. <code>CAMERA</code>, <code>LOCATION</code>) rather than direct Android/iOS manifest permissions. The Super App rule engine safely translates approved capabilities into platform artifacts during build generation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Supported Super App Capabilities</h5>
              <div className="space-y-2.5">
                {[
                  { code: 'CAMERA', name: 'Camera Access', cat: 'Hardware', desc: 'android.permission.CAMERA / NSCameraUsageDescription', approval: true },
                  { code: 'LOCATION', name: 'Geolocation', cat: 'Sensors', desc: 'ACCESS_FINE_LOCATION / NSLocationWhenInUseUsageDescription', approval: true },
                  { code: 'MICROPHONE', name: 'Audio Record', cat: 'Hardware', desc: 'RECORD_AUDIO / NSMicrophoneUsageDescription', approval: true },
                  { code: 'CLIPBOARD', name: 'Clipboard API', cat: 'System', desc: 'SuperAppSDK Clipboard Bridge', approval: false },
                  { code: 'NOTIFICATION', name: 'Push Alerts', cat: 'System', desc: 'POST_NOTIFICATIONS / APNS Token Scopes', approval: true },
                ].map((cap) => (
                  <div key={cap.code} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400">{cap.code}</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 ml-2">{cap.name}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{cap.desc}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cap.approval 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' 
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    }`}>
                      {cap.approval ? 'SA Approval' : 'Auto'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Unsupported Capability Flow</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  If your Mini App requires a capability not currently in the catalog (e.g. <code>BLUETOOTH</code>, <code>NFC</code>), the validation engine generates a formal <strong>Capability Request</strong>.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                    <span>System triggers <code>CAPABILITY_REQUESTED</code> state.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                    <span>SA Admin evaluates architectural impact and security posture.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                    <span>If approved, platform team implements & adds capability to Catalog.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0">4</span>
                    <span>Mini App integration automatically resumes validation.</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-lg text-xs text-brand-900 dark:text-brand-300 mt-4">
                <strong>Dependency Resolver:</strong> Complex capabilities (e.g. <code>VIDEO_CALL</code>) automatically resolve underlying required child capabilities (<code>CAMERA</code> + <code>MICROPHONE</code>).
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'security-checkpoints',
      number: '06',
      title: 'Security Checkpoints & Automated Scanners',
      category: 'SECURITY',
      summary: 'Gitleaks secrets detection, Semgrep SAST rules, Trivy SCA, OWASP ZAP DAST, and ClamAV quarantine.',
      badge: 'Zero Trust Gate',
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Security validation is fully automated and non-negotiable. Submissions failing Critical or High severity gates are immediately blocked with actionable line-by-line remediation logs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-amber-100 text-amber-800 text-xs">🔑</span> Gitleaks (Secrets Detection)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">Hard Block</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scans every commit, archive, and file for private keys, AWS/GCP credentials, JWT secrets, and bearer tokens. Any detected credential immediately fails the build.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-blue-100 text-blue-800 text-xs">🔍</span> Semgrep (SAST Engine)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">Hard Block</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Executes static security rules enforcing Super App sandbox boundaries, detecting SQL injections, unvalidated redirects, and unauthorized system calls.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-purple-100 text-purple-800 text-xs">📦</span> Trivy (Dependency SCA)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">CVE Audit</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audits direct and transitive dependencies in <code>pubspec.lock</code>, Android Gradle files, and iOS Podfiles against official CVE vulnerability databases.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-emerald-100 text-emerald-800 text-xs">🌐</span> OWASP ZAP (DAST for WebView)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">Dynamic Gate</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Runs headless baseline dynamic scans against WebView URLs testing for missing Content-Security-Policy (CSP), open redirects, XSS, and SSRF vulnerabilities.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
            <h5 className="font-bold text-slate-900 dark:text-white mb-2">Severity Response Policy Matrix</h5>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <span className="font-bold text-rose-700 dark:text-rose-400">CRITICAL</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Immediate hard failure. State moves to <code>SECURITY_FAILED</code>.</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                <span className="font-bold text-amber-700 dark:text-amber-400">HIGH</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Build blocked. Requires code remediation and resubmission.</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900">
                <span className="font-bold text-yellow-700 dark:text-yellow-400">MEDIUM</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Warning logged. Requires explicit SA Admin sign-off.</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                <span className="font-bold text-blue-700 dark:text-blue-400">LOW / INFO</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Informational note included in audit log.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'validation-lifecycle',
      number: '07',
      title: 'State Progression & Validation Lifecycle',
      category: 'LIFECYCLE',
      summary: 'State machine flow from DRAFT submission to CI build, dual manual testing, and final ACTIVATION.',
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Mini App integrations transition through a strictly governed finite state machine ensuring complete traceability and audit compliance:
          </p>

          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-bold">DRAFT</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800 font-bold">SUBMITTED</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-400 border border-purple-800 font-bold">BACKEND_VALIDATION</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-400 border border-purple-800 font-bold">METHOD_VALIDATION</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">CAPABILITY_CHECK</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">SECURITY_CHECK</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-bold">PENDING_REVIEW</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">BUILDING</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-teal-950 text-teal-400 border border-teal-800 font-bold">TESTING</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">ACTIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <strong className="block font-bold text-slate-900 dark:text-white mb-1.5">Dual Testing Protocol</strong>
              <p className="text-slate-600 dark:text-slate-400">
                Once the CI pipeline builds the test Android APK and iOS test package and stores them in MinIO:
              </p>
              <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-500 dark:text-slate-400">
                <li><strong>MA Manager:</strong> Validates user journeys, API calls, and business logic.</li>
                <li><strong>SA Admin:</strong> Validates Super App frame navigation, back stack, and permissions.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <strong className="block font-bold text-slate-900 dark:text-white mb-1.5">Issue & Fix Remediation Loop</strong>
              <p className="text-slate-600 dark:text-slate-400">
                If validation, security, or testing detects an issue:
              </p>
              <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-500 dark:text-slate-400">
                <li>Integration state resets to <code>DRAFT</code> with attached error logs.</li>
                <li>MA Manager pushes fix commit or updated artifact.</li>
                <li>Resubmission triggers automatic re-scan of affected stages.</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      number: '08',
      title: 'Troubleshooting & Common Failure Remedies',
      category: 'SUPPORT',
      summary: 'Actionable solutions for frequent validation errors, dependency conflicts, and bridge misconfigurations.',
      content: (
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          {[
            {
              issue: 'BUILD_FAILED: Multiple conflicting versions of Flutter SDK',
              cause: 'Mini App pubspec.yaml specifies an incompatible SDK range.',
              fix: 'Align environment constraint to match Super App runtime (e.g. sdk: ">=3.2.0 <4.0.0").'
            },
            {
              issue: 'SECURITY_FAILED: Gitleaks detected sensitive key in assets',
              cause: 'Hardcoded staging/dev API secret or private key committed in source repository.',
              fix: 'Remove token from Git history, rotate the compromised credential, and retrieve keys dynamically via SuperAppSDK auth context.'
            },
            {
              issue: 'CAPABILITY_UNSUPPORTED: Camera requested but not configured',
              cause: 'Mini App attempts to invoke device camera without registering the CAMERA capability.',
              fix: 'Add CAMERA in Mini App configuration claim during submission to trigger automatic permission generation.'
            },
            {
              issue: 'WEBVIEW_SSRF_DETECTED: Destination points to RFC 1918 private IP',
              cause: 'Target URL resolves to private internal subnets (e.g. 192.168.x.x or 10.x.x.x).',
              fix: 'Provide a publicly reachable HTTPS domain with valid TLS certificates.'
            }
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mb-1">{item.issue}</div>
              <p className="text-slate-600 dark:text-slate-400 mb-1"><span className="font-semibold text-slate-800 dark:text-slate-200">Root Cause:</span> {item.cause}</p>
              <p className="text-emerald-700 dark:text-emerald-400"><span className="font-semibold text-emerald-800 dark:text-emerald-300">Remedy:</span> {item.fix}</p>
            </div>
          ))}
        </div>
      ),
    }
  ];

  const categories = [
    { key: 'ALL', label: 'All Sections' },
    { key: 'GENERAL', label: 'General & Roles' },
    { key: 'CONTRACT', label: 'SDK Contract' },
    { key: 'METHODS', label: 'Methods' },
    { key: 'CAPABILITIES', label: 'Capabilities' },
    { key: 'SECURITY', label: 'Security Scans' },
    { key: 'LIFECYCLE', label: 'Lifecycle' },
    { key: 'SUPPORT', label: 'Troubleshooting' }
  ];

  const filteredSections = sections.filter(sec => {
    const matchesCategory = activeCategory === 'ALL' || sec.category === activeCategory;
    const matchesSearch = sec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sec.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-950 text-white p-8 md:p-10 mb-8 border border-brand-700/50 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-400/20 text-accent-300 border border-accent-400/30 text-xs font-semibold uppercase tracking-wider mb-4">
            <span>✨</span> Mini App Integration Standard v2.5
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Mini App Integration Guidelines
          </h1>
          <p className="mt-3 text-base text-brand-200 leading-relaxed">
            The definitive architectural guide, security checkpoints, SDK contracts, and capability rules required to integrate mini apps into the Super App ecosystem safely.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-brand-700/60 text-xs">
            <div>
              <span className="text-brand-300 block">Supported SDK</span>
              <span className="font-bold text-white text-sm">v1.2.0 - v2.0.0</span>
            </div>
            <div>
              <span className="text-brand-300 block">Integration Methods</span>
              <span className="font-bold text-white text-sm">5 Channels</span>
            </div>
            <div>
              <span className="text-brand-300 block">Automated Security</span>
              <span className="font-bold text-emerald-400 text-sm">4 Scan Gates</span>
            </div>
            <div>
              <span className="text-brand-300 block">Standard Protocol</span>
              <span className="font-bold text-white text-sm">Zero-Trust Sandbox</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sticky Rail / Table of Contents & Developer Checklist */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Developer Interactive Checklist */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>📋</span> Pre-Submission Checklist
                </h3>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  {completedChecks}/{totalChecks} ({checklistProgress}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-300 rounded-full" 
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                {[
                  { key: 'item1', label: 'Semantic Versioning in pubspec.yaml' },
                  { key: 'item2', label: 'No main() or runApp() entrypoints' },
                  { key: 'item3', label: 'All API credentials cleared from source' },
                  { key: 'item4', label: 'Required device capabilities declared' },
                  { key: 'item5', label: 'SuperAppSDK version compatible' },
                  { key: 'item6', label: 'Tested on physical Android & iOS devices' },
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={checkedItems[item.key]}
                      onChange={() => toggleChecklist(item.key)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className={`transition-colors ${checkedItems[item.key] ? 'line-through text-slate-400 dark:text-slate-500' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Card>

          {/* Table of Contents Sticky Nav */}
          <div className="sticky top-6">
            <Card>
              <div className="p-5">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-4">
                  Quick Navigation
                </h3>
                <nav className="space-y-1">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400 transition-all"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] text-slate-400">{sec.number}</span>
                        <span className="truncate">{sec.title.split(' ')[1] || sec.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">→</span>
                    </a>
                  ))}
                </nav>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Controls Bar: Search and Category Filter */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search across 8 guidelines, SDK rules, and security scans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeCategory === cat.key
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guideline Sections */}
          <div className="space-y-6">
            {filteredSections.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-3xl block mb-2">🔍</span>
                No guidelines match your search query. Try searching for "Semgrep", "Camera", "pubspec", or "WebView".
              </div>
            ) : (
              filteredSections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-6">
                  <Card>
                    <div className="p-6 md:p-7">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-700/60 gap-2">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-brand-200 dark:border-brand-800">
                            {section.number}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {section.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {section.badge && (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950/50 dark:text-accent-300 border border-accent-200 dark:border-accent-800">
                              {section.badge}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {section.category}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5">
                        {section.summary}
                      </p>

                      <div className="pt-2">
                        {section.content}
                      </div>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
