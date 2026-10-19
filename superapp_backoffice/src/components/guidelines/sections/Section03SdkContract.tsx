"use client";

import React from "react";
import { BanIcon, CheckCircleIcon } from "@/components/ui/Icons";
import { VSCodeEditor } from "../VSCodeEditor";

export function Section03SdkContract() {
  return (
    <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
      <p className="leading-relaxed">
        MiniApps operate within a strictly sandboxed runtime. All platform interactions (authentication tokens, payments, biometrics, hardware camera, and navigation) must pass through the standardized SuperApp Host SDK / Bridge interfaces.
      </p>

      {/* Integration vs Capability Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-semibold">
              <th className="py-3 px-4">Integration Method</th>
              <th className="py-3 px-4">Delivery Format</th>
              <th className="py-3 px-4">Language / Tech Stack</th>
              <th className="py-3 px-4">How Capabilities Are Accessed</th>
              <th className="py-3 px-4">Host Context &amp; Auth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">WebView MiniApp</td>
              <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">Hosted HTTPS URL (Domain Verified)</td>
              <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">JavaScript / TypeScript (React, Vue, etc.)</td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                <code>@fsasuperapp/sdk</code> or <code>window.FSASuperApp</code> asynchronous JS-to-Native bridge
              </td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                <code>FSASuperApp.getAuthToken()</code> and <code>FSASuperApp.close()</code>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">Flutter Package</td>
              <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">
                <span className="block">• <strong>Source Code</strong> (Git Repo)</span>
                <span className="block">• <strong>Package Artifact</strong> (.zip)</span>
              </td>
              <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">Dart / Flutter Module (Flutter 3.x)</td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                <code>package:super_app_sdk</code> injected through <code>MiniAppContext</code>
              </td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                <code>appCtx.auth.currentUser</code> and <code>appCtx.navigation.exit()</code>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">Native SDK</td>
              <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">
                <span className="block">• <strong>Android Binary</strong> (<code>.aar</code>)</span>
                <span className="block">• <strong>iOS Binary</strong> (<code>.xcframework</code> / <code>.zip</code>)</span>
              </td>
              <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">
                Kotlin / Java (Android)<br />
                Swift / Objective-C (iOS)
              </td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                Implement <code>SuperAppPlugin</code> / <code>SuperAppModuleProtocol</code> host delegates
              </td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                <code>HostBridge.currentUser</code> and <code>HostBridge.terminateSession()</code>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">Deep Link</td>
              <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">URI Scheme / Universal App Links</td>
              <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">External Native / Hybrid App</td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">Decoupled standalone app invoked via host router</td>
              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                URL query parameters (<code>auth_token</code>) and redirect URI
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <VSCodeEditor
        files={[
          {
            filename: "entrypoint.dart",
            language: "dart",
            code: `import 'package:flutter/material.dart';
import 'package:super_app_sdk/super_app_sdk.dart';

// Official Flutter MiniApp entrypoint
class MiniAppEntryPoint extends MiniAppWidget {
  @override
  Widget build(BuildContext context, MiniAppContext appCtx) {
    final user = appCtx.auth.currentUser;
    final token = appCtx.auth.accessToken;

    return Scaffold(
      appBar: SuperAppBar(title: 'Food Delivery', appCtx: appCtx),
      body: MiniAppHomeView(user: user, apiToken: token),
    );
  }
}`,
          },
          {
            filename: "MiniAppPlugin.kt",
            language: "kotlin",
            code: `package com.merchant.miniapp

import com.superapp.host.sdk.SuperAppPlugin
import com.superapp.host.sdk.MiniAppContext
import android.content.Context

class MiniAppPlugin : SuperAppPlugin {
    override fun onAttachedToHost(context: Context, appCtx: MiniAppContext) {
        val userSession = appCtx.auth.currentUser
        // Initialize native service bindings
    }

    override fun onDetachedFromHost() {
        // Clean up resources
    }
}`,
          },
          {
            filename: "MiniAppPlugin.swift",
            language: "swift",
            code: `import Foundation
import SuperAppHostSDK

@objc public class MiniAppPlugin: NSObject, SuperAppModuleProtocol {
    public func initialize(with context: MiniAppContext) {
        let currentSession = context.auth.currentUser
        // Configure Swift host delegate
    }

    public func terminate() {
        // Clean up memory and observers
    }
}`,
          },
          {
            filename: "web-bridge.ts",
            language: "typescript",
            code: `import FSASuperApp from '@fsasuperapp/sdk';

// Consume Host authentication and profile
export async function initMiniApp() {
  const auth = await FSASuperApp.getAuthToken();
  const user = await FSASuperApp.getUserProfile();
  console.log('Logged in user:', user.displayName, 'Token:', auth.accessToken);
}

// Exit MiniApp safely
export function exitApp() {
  FSASuperApp.close();
}`,
          },
          {
            filename: "pubspec.yaml",
            language: "yaml",
            code: `name: food_delivery_miniapp
description: A Food Delivery MiniApp module
version: 1.0.0

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: '>=3.16.0'

dependencies:
  flutter:
    sdk: flutter
  super_app_sdk: ^1.2.0
  http: ^1.1.0`,
          },
          {
            filename: "security-rule.yaml",
            language: "yaml",
            code: `rules:
  - id: forbid-main-entrypoint
    patterns:
      - pattern: void main() { ... }
    message: "MiniApps must not define void main() or invoke runApp()."
    severity: ERROR
    languages: [dart]
  - id: forbid-exit-calls
    pattern: exit($CODE)
    message: "MiniApps cannot terminate the host SuperApp process."
    severity: ERROR
    languages: [dart]`,
          },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300 space-y-2">
          <strong className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 text-base">
            <BanIcon /> Strictly Prohibited
          </strong>
          <ul className="space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300">
            <li>No <code>void main()</code> or <code>runApp()</code> root entrypoints</li>
            <li>No direct <code>exit(0)</code> or <code>SystemNavigator.pop()</code> process kill calls</li>
            <li>No unvetted, arbitrary <code>MethodChannel</code> or raw JNI calls</li>
            <li>No direct modification of SuperApp global theme singletons</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 space-y-2">
          <strong className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-base">
            <CheckCircleIcon /> Required Conventions
          </strong>
          <ul className="space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300">
            <li>Extend <code>MiniAppWidget</code> or implement <code>SuperAppPlugin</code> as root</li>
            <li>Consume <code>MiniAppContext</code> or <code>FSASuperApp</code> for auth &amp; tokens</li>
            <li>Use <code>SuperAppSDK.navigation</code> for host view routing</li>
            <li>Declare all sensitive device features upfront in Capabilities Catalog</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
