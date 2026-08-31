import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

old_tabs_regex = r'\{\/\* Interactive Method Tabs \*\/\}\s*<div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 pt-2">.*?\{tab\.label\}\s*<\/button>\s*\)\)\}\s*<\/div>'

new_tabs = """{/* Interactive Method Tabs */}
          <div className="flex flex-wrap gap-2.5 mb-2 mt-4">
            {[
              { id: 'webview', label: <span className="flex items-center gap-2"><GlobeIcon /> WebView</span>, name: 'WebView' },
              { id: 'artifact', label: <span className="flex items-center gap-2"><PackageIcon /> Flutter Package Artifact</span>, name: 'Package Artifact' },
              { id: 'source', label: <span className="flex items-center gap-2"><FolderIcon /> Flutter Source Code</span>, name: 'Source Code' },
              { id: 'native', label: <span className="flex items-center gap-2"><WrenchIcon /> Native SDK</span>, name: 'Native SDK' },
              { id: 'deeplink', label: <span className="flex items-center gap-2"><LinkIcon /> Deep Link</span>, name: 'Deep Link' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMethodTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl text-sm transition-all duration-300 ease-out flex items-center gap-2 ${
                  activeMethodTab === tab.id
                    ? 'font-bold bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-md ring-2 ring-brand-500/50 dark:ring-brand-400/50 scale-105 z-10'
                    : 'font-medium bg-slate-100/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>"""

content = re.sub(old_tabs_regex, new_tabs, content, flags=re.DOTALL)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
