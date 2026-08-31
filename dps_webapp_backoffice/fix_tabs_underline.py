import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

tabs_regex = r'\{\/\* Interactive Method Tabs \*\/\}\s*<div className="flex flex-wrap gap-2.5 mb-2 mt-4">.*?<\/button>\s*\)\)\}\s*<\/div>'

new_tabs = """{/* Interactive Method Tabs */}
          <div className="flex overflow-x-auto gap-8 border-b-2 border-slate-200 dark:border-slate-800 mb-8 mt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                className={`pb-4 text-sm transition-all duration-300 ease-out flex items-center gap-2 whitespace-nowrap border-b-2 -mb-[2px] relative ${
                  activeMethodTab === tab.id
                    ? 'font-bold text-brand-600 dark:text-brand-400 border-brand-600 dark:border-brand-400'
                    : 'font-medium text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>"""

content = re.sub(tabs_regex, new_tabs, content, flags=re.DOTALL)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
