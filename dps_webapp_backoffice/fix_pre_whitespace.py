import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

# Replace the pre tag to explicitly enforce whitespace preservation
old_pre = r'<pre className="font-mono text-\[#d4d4d4\]" dangerouslySetInnerHTML=\{\{ __html: highlight\(activeFile\.code, activeFile\.language\) \}\} \/>'
new_pre = r'<pre className="font-mono text-[#d4d4d4] whitespace-pre"><code dangerouslySetInnerHTML={{ __html: highlight(activeFile.code, activeFile.language) }} /></pre>'

content = re.sub(old_pre, new_pre, content)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
