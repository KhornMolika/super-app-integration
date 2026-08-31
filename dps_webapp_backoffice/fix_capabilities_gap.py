import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

old_block_regex = r'<div key=\{cap\.code\} className="p-2\.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 flex items-center justify-between">.*?<div>.*?<span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">\{cap\.code\}</span>.*?<span className="text-xs text-slate-700 dark:text-slate-300 ml-2">\{cap\.name\}</span>.*?<p className="text-sm text-slate-700 dark:text-slate-300 font-mono mt-0\.5">\{cap\.desc\}</p>.*?</div>.*?<span className=\{`text-xs font-bold px-2 py-0\.5 rounded-full \$\{.*?cap\.approval.*?\}.*?`\}>.*?\{cap\.approval \? \'SA Approval\' : \'Auto\'\}.*?</span>.*?</div>'

new_block = """<div key={cap.code} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{cap.code}</span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ml-2">{cap.name}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 break-all leading-relaxed">{cap.desc}</p>
                    </div>
                    <span className={`shrink-0 text-center text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                      cap.approval 
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' 
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    }`}>
                      {cap.approval ? 'SA Approval' : 'Auto'}
                    </span>
                  </div>"""

content = re.sub(old_block_regex, new_block, content, flags=re.DOTALL)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)

