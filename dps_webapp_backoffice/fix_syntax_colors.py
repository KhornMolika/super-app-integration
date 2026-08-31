import re

with open('src/app/guidelines/page.tsx', 'r') as f:
    content = f.read()

highlight_regex = r'const highlight = \(text: string, lang: string\) => \{.*?\n  \};\n'

new_highlight = """const highlight = (text: string, lang: string) => {
    let highlighted = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    if (lang === 'json') {
      // Bracket pair colorization
      highlighted = highlighted
        .replace(/\\{/g, '<span class="text-[#ffd700]">{</span>')
        .replace(/\\}/g, '<span class="text-[#ffd700]">}</span>')
        .replace(/\\[/g, '<span class="text-[#da70d6]">[</span>')
        .replace(/\\]/g, '<span class="text-[#da70d6]">]</span>');
        
      highlighted = highlighted
        // Keys: Light Blue
        .replace(/(&quot;|")([^"\\\\]*)(&quot;|")\\s*:/g, '<span class="text-[#9cdcfe]">"$2"</span>:')
        // String Values: Orange
        .replace(/:\\s*(&quot;|")([^"\\\\]*)(&quot;|")/g, ': <span class="text-[#ce9178]">"$2"</span>')
        // Numbers: Light Green
        .replace(/:\\s*([0-9\\.]+)/g, ': <span class="text-[#b5cea8]">$1</span>')
        // Booleans/Null: Blue
        .replace(/:\\s*(true|false|null)\\b/g, ': <span class="text-[#569cd6]">$1</span>');
    } else if (lang === 'yaml') {
      highlighted = highlighted.replace(/(#.*)/g, '<span class="text-[#6A9955]">$1</span>');
      highlighted = highlighted
        .replace(/^(\\s*)([a-zA-Z0-9_-]+):/gm, '$1<span class="text-[#9cdcfe]">$2</span>:')
        .replace(/:\\s*(&quot;|".*?"|'.*?')/g, ': <span class="text-[#ce9178]">$1</span>')
        .replace(/:\\s*([0-9]+)$/gm, ': <span class="text-[#b5cea8]">$1</span>')
        .replace(/(\\s+-\\s+)(pattern|id|message|severity|languages):/g, '$1<span class="text-[#9cdcfe]">$2</span>:');
      highlighted = highlighted.replace(/^(\\s*-\\s+)(.*?)$/gm, (match, p1, p2) => {
          if(p2.includes('<span')) return match;
          return p1 + '<span class="text-[#ce9178]">' + p2 + '</span>';
      });
    } else if (lang === 'dart') {
      highlighted = highlighted
        .replace(/('.*?')/g, '<span class="text-[#ce9178]">$1</span>')
        .replace(/\\b(import|class|extends|final|return|void|Widget|BuildContext|Scaffold)\\b/g, '<span class="text-[#569cd6]">$1</span>')
        .replace(/\\b([A-Z][a-zA-Z0-9_]*)\\b/g, '<span class="text-[#4ec9b0]">$1</span>')
        .replace(/(@override)/g, '<span class="text-[#c586c0]">$1</span>')
        .replace(/(\\s*\\/\\/.*)/g, '<span class="text-[#6A9955]">$1</span>');
    }
    return highlighted;
  };
"""

content = re.sub(highlight_regex, new_highlight, content, flags=re.DOTALL)

with open('src/app/guidelines/page.tsx', 'w') as f:
    f.write(content)
