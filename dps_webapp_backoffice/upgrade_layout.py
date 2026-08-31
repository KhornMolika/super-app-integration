import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

# Replace WebView Layout
webview_regex = r"\{/\* Method 1: WebView \*\/\}.*?\{/\* Method 2: Flutter Package Artifact \*\/\}"
new_webview = """{/* Method 1: WebView */}
          {activeMethodTab === 'webview' && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><GlobeIcon /></div>
                  WebView Integration Method
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Embeds external web applications into an isolated, secure Super App WebView container. This container interfaces with native device features exclusively via a standardized, secure JavaScript Bridge, completely sandboxng the web context from the native app memory.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><TargetIcon /> Purpose & When to Use</h5>
                  <p className="leading-relaxed">
                    Designed for seamlessly rendering responsive web applications inside the Super App without requiring Dart or Flutter development. This is the optimal path for integrating existing web platforms, high-frequency campaign pages, micro-frontends, or when rapid remote updates without requiring an app store release are strictly required.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ClipboardIcon /> Requirements & Architecture</h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-slate-900 dark:text-slate-100">Target Web URL:</strong> Must be strictly HTTPS. HTTP is globally blocked at the network layer.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Domain Ownership (.well-known):</strong> The target domain must host a verification file to prove control over the WebView origin, preventing unauthorized framing of third-party sites.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Allowed Domain List:</strong> A strict whitelist of domains the WebView is permitted to navigate to or fetch resources from.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Bridge API Version:</strong> Specifies the JavaScript bridge contract version to ensure backward compatibility.</li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ShieldIcon /> Automated Security Validation</h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li><strong className="text-slate-900 dark:text-slate-100">SSRF & DNS Rebinding Protection:</strong> Blocks resolution to private/internal IPs (RFC 1918, 127.0.0.1) to prevent the WebView from accessing internal APIs.</li>
                      <li><strong className="text-slate-900 dark:text-slate-100">Open Redirect Detection:</strong> Verifies that domain navigation strictly stays within the approved allowlist.</li>
                      <li><strong className="text-slate-900 dark:text-slate-100">DAST Scanning:</strong> Automated OWASP ZAP scans are triggered against the URL to detect XSS and ensure strict Content-Security-Policy (CSP) headers are present.</li>
                    </ul>
                  </div>
                </section>

              </div>
            </div>
          )}

          {/* Method 2: Flutter Package Artifact */}"""

content = re.sub(webview_regex, new_webview, content, flags=re.DOTALL)


# Replace Artifact Layout
artifact_regex = r"\{/\* Method 2: Flutter Package Artifact \*\/\}.*?\{/\* Method 3: Flutter Package Source Code \*\/\}"
new_artifact = """{/* Method 2: Flutter Package Artifact */}
          {activeMethodTab === 'artifact' && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"><PackageIcon /></div>
                  Flutter Package Artifact
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Integrates a pre-compiled Flutter module (`.tar.gz` or `.zip`) directly into the Super App workspace. This method utilizes a zero-trust upload architecture via MinIO pre-signed URLs to entirely bypass the Node.js backend.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><TargetIcon /> Purpose & When to Use</h5>
                  <p className="leading-relaxed">
                    Ideal for teams that require complete obfuscation of their intellectual property (source code) from the Super App platform, or teams that have proprietary internal CI/CD pipelines and only wish to deliver the final compiled artifact.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ClipboardIcon /> Requirements & Architecture</h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-slate-900 dark:text-slate-100">Zero-Trust Upload:</strong> The browser requests a JWT-authorized Pre-Signed MinIO URL (strict 50MB limit, 5-minute expiry). The artifact is uploaded directly to an isolated Quarantine bucket, protecting the backend from memory exhaustion and parsing exploits.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">pubspec.yaml:</strong> Must accurately declare all dependencies. Overriding global Super App dependencies is forbidden.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Trusted Promotion:</strong> Once validated, the artifact is moved from the MinIO Quarantine bucket to the secure Sonatype Nexus Registry for consumption by the Super App build pipeline.</li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ShieldIcon /> Automated Security Validation</h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li><strong className="text-slate-900 dark:text-slate-100">SBOM Generation:</strong> The system automatically unpacks the artifact in a sandbox and generates a Software Bill of Materials (SBOM) to track transitive vulnerabilities.</li>
                      <li><strong className="text-slate-900 dark:text-slate-100">Malware & Dependency SCA:</strong> Scanned using Trivy to block artifacts containing known CVEs in their declared dependencies.</li>
                    </ul>
                  </div>
                </section>

              </div>
            </div>
          )}

          {/* Method 3: Flutter Package Source Code */}"""

content = re.sub(artifact_regex, new_artifact, content, flags=re.DOTALL)


# Replace Source Code Layout
source_regex = r"\{/\* Method 3: Flutter Package Source Code \*\/\}.*?\{/\* Method 4: Native SDK \*\/\}"
new_source = """{/* Method 3: Flutter Package Source Code */}
          {activeMethodTab === 'source' && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500"><FolderIcon /></div>
                  Flutter Package Source Code
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Directly links a Git repository containing the Mini App source code to the Super App CI/CD pipeline, enabling automated compilation, static analysis, and version locking.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><TargetIcon /> Purpose & When to Use</h5>
                  <p className="leading-relaxed">
                    The highly recommended approach for deep integrations. It allows the Super App platform to fully optimize the Dart compilation (Tree-shaking) alongside the host app, resulting in the smallest possible binary footprint and highest runtime performance.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ClipboardIcon /> Requirements & Architecture</h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-slate-900 dark:text-slate-100">Git Provider Auth:</strong> Uses GitHub Apps or GitLab OAuth for secure, granular Read-Only access. Personal Access Tokens (PATs) are strictly forbidden due to security policies.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Git SHA Locking:</strong> When integration is requested via a Branch or Tag, the Super App backend automatically resolves and locks the integration to the exact Commit SHA. This ensures subsequent commits cannot bypass the review pipeline.</li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ShieldIcon /> Automated Security Validation</h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li><strong className="text-slate-900 dark:text-slate-100">SAST & Secrets Detection:</strong> Semgrep and Gitleaks automatically scan the source code for hardcoded API keys, passwords, and prohibited Dart code patterns (e.g., `void main()`, `exit()`).</li>
                      <li><strong className="text-slate-900 dark:text-slate-100">Deterministic Build:</strong> The CI engine checks out the locked SHA, executes the Flutter analyzer, and verifies that the code compiles cleanly against the Super App SDK interface.</li>
                    </ul>
                  </div>
                </section>

              </div>
            </div>
          )}

          {/* Method 4: Native SDK */}"""

content = re.sub(source_regex, new_source, content, flags=re.DOTALL)


# Replace Native SDK Layout
native_regex = r"\{/\* Method 4: Native SDK \*\/\}.*?\{/\* Method 5: Deep Link \*\/\}"
new_native = """{/* Method 4: Native SDK */}
          {activeMethodTab === 'native' && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400"><WrenchIcon /></div>
                  Native SDK (AAR / XCFramework)
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Embeds platform-specific binaries (.aar for Android, .xcframework for iOS) directly into the Super App shell, requiring custom MethodChannels and platform-side integration.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><TargetIcon /> Purpose & When to Use</h5>
                  <p className="leading-relaxed">
                    Reserved exclusively for legacy integrations or specialized hardware interfaces (e.g., custom biometric scanners, legacy banking encryption libraries) that cannot be ported to Dart. Requires heavy manual review and platform engineering effort.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ClipboardIcon /> Requirements & Architecture</h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-slate-900 dark:text-slate-100">Binary Architecture:</strong> iOS frameworks must contain arm64 slices (Bitcode disabled). Android AARs must support arm64-v8a.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Wrapper Provisioning:</strong> A Dart wrapper bridging the native `MethodChannels` must be provided and heavily audited to prevent memory leaks and threading blocks.</li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ShieldIcon /> Automated Security Validation</h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li><strong className="text-slate-900 dark:text-slate-100">Manual Audit Requirement:</strong> Unlike Flutter packages, Native SDKs cannot be fully analyzed via SAST. They require a mandatory manual architectural review by the SA Admin team.</li>
                      <li><strong className="text-slate-900 dark:text-slate-100">Binary Scanning:</strong> Uploaded binaries are scanned for known malware signatures and disallowed dynamic library bindings.</li>
                    </ul>
                  </div>
                </section>

              </div>
            </div>
          )}

          {/* Method 5: Deep Link */}"""

content = re.sub(native_regex, new_native, content, flags=re.DOTALL)

# Replace Deep Link Layout
deeplink_regex = r"\{/\* Method 5: Deep Link \*\/\}.*?(?=\{/\* CORE CONCEPTS \*\/\})"
new_deeplink = """{/* Method 5: Deep Link */}
          {activeMethodTab === 'deeplink' && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4 mb-16">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"><LinkIcon /></div>
                  Deep Link Integration
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  A lightweight integration that acts as a router, redirecting the user out of the Super App context into a standalone native application installed on their device.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><TargetIcon /> Purpose & When to Use</h5>
                  <p className="leading-relaxed">
                    Utilized when the Partner Application is too massive to embed, or requires strict OS-level separation. This method effectively treats the Super App as a discovery portal rather than a host runtime.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ClipboardIcon /> Requirements & Architecture</h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-slate-900 dark:text-slate-100">URI Scheme & App Links:</strong> Must register a unique `uriScheme` and the associated Android App Links / iOS Universal Links domain for seamless routing.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Fallback Routing:</strong> A `fallbackUrl` (typically an App Store / Play Store link) is mandatory in case the user does not have the standalone app installed.</li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ShieldIcon /> Automated Security Validation</h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li><strong className="text-slate-900 dark:text-slate-100">Domain Verification:</strong> Similar to WebViews, the registered App Links domain must pass an ownership verification check to prevent deep-link hijacking.</li>
                      <li><strong className="text-slate-900 dark:text-slate-100">Scheme Conflict Detection:</strong> The backend verifies that the requested URI scheme is globally unique across the Super App ecosystem to prevent intent hijacking.</li>
                    </ul>
                  </div>
                </section>

              </div>
            </div>
          )}
"""

content = re.sub(deeplink_regex, new_deeplink, content, flags=re.DOTALL)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
