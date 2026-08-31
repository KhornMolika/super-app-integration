import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

# Add the import
if "import LifecycleFlow" not in content:
    content = content.replace(
        "import { ThemeToggle } from '@/components/ui/ThemeToggle';",
        "import { ThemeToggle } from '@/components/ui/ThemeToggle';\nimport LifecycleFlow from '@/components/ui/LifecycleFlow';"
    )

old_block_regex = r'<div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-sm overflow-x-auto">.*?<div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-base">'

new_block = """{/* Modern React Flow Lifecycle */}
          <div className="mb-10 mt-6">
            <LifecycleFlow />
          </div>

          {/* Modern Lifecycle Phases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
            {[
              {
                title: "Phase 1: Preparation",
                icon: <FolderIcon />,
                colorClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-500/30",
                states: ["DRAFT", "SUBMITTED"],
                desc: "Initial payload creation and submission by the MA Manager."
              },
              {
                title: "Phase 2: Automated Analysis",
                icon: <ShieldIcon />,
                colorClass: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-200 dark:border-rose-500/30",
                states: ["BACKEND_VALIDATION", "METHOD_VALIDATION", "CAPABILITY_CHECK", "SECURITY_CHECK"],
                desc: "System performs .well-known verification, SBOM generation, and capability DAG sorting."
              },
              {
                title: "Phase 3: Review & Build",
                icon: <WrenchIcon />,
                colorClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-200 dark:border-blue-500/30",
                states: ["PENDING_REVIEW", "BUILDING"],
                desc: "SA Admin manual audit (if required) followed by CI/CD artifact generation."
              },
              {
                title: "Phase 4: Release",
                icon: <CheckCircleIcon />,
                colorClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-500/30",
                states: ["TESTING", "ACTIVE"],
                desc: "Dual manual testing via TestFlight/APK, culminating in global activation."
              }
            ].map((phase, idx) => (
              <div key={idx} className={`rounded-xl border p-5 ${phase.colorClass} relative overflow-hidden group transition-all hover:shadow-md`}>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-extrabold text-lg flex items-center gap-2">
                    {phase.icon} {phase.title}
                  </h5>
                  <span className="text-3xl opacity-10 font-black">{idx + 1}</span>
                </div>
                <p className="text-sm opacity-90 mb-4 font-medium leading-relaxed">
                  {phase.desc}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {phase.states.map(state => (
                    <span key={state} className="px-2 py-1 rounded bg-white/60 dark:bg-black/20 text-[10px] font-mono font-bold tracking-wider backdrop-blur-sm border border-black/5 dark:border-white/10">
                      {state}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-base">"""

content = re.sub(old_block_regex, new_block, content, flags=re.DOTALL)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
