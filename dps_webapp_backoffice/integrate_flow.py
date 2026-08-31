import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

# Import the new component
if "import LifecycleFlow" not in content:
    content = content.replace(
        "import { ThemeToggle } from '@/components/ui/ThemeToggle';",
        "import { ThemeToggle } from '@/components/ui/ThemeToggle';\nimport LifecycleFlow from '@/components/ui/LifecycleFlow';"
    )

# Inject into the lifecycle section
lifecycle_regex = r'\{/\* Modern Lifecycle Phases \*\/\}'

replacement = """{/* Modern Lifecycle Phases */}
          <div className="mb-10">
            <LifecycleFlow />
          </div>
          """

content = re.sub(lifecycle_regex, replacement, content)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)

