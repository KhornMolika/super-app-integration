import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

# Replace the overflow-x-auto class with hidden scrollbar classes
content = content.replace(
    '<div className="flex items-center overflow-x-auto">',
    '<div className="flex items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">'
)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
