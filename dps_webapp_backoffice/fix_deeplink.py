import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

deeplink_regex = r'\{/\* Method 5: Deep Link \*\/\}.*?\{/\* Deep Link Example Payload \*\/\}'
new_deeplink = """{/* Method 5: Deep Link */}
          {activeMethodTab === 'deeplink' && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4 mb-10">
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
                    <li><strong className="text-slate-900 dark:text-slate-100">URI Scheme & App Links:</strong> Must register a unique <code>uriScheme</code> and the associated Android App Links / iOS Universal Links domain for seamless routing.</li>
                    <li><strong className="text-slate-900 dark:text-slate-100">Fallback Routing:</strong> A <code>fallbackUrl</code> (typically an App Store / Play Store link) is mandatory in case the user does not have the standalone app installed.</li>
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

              {/* Deep Link Example Payload */}"""

content = re.sub(deeplink_regex, new_deeplink, content, flags=re.DOTALL)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
