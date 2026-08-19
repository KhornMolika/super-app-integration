const fs = require('fs');

function processFile(path) {
  let s = fs.readFileSync(path, 'utf8');
  
  // Find where stagingUrl is defined and remove its block
  const lines = s.split('\n');
  let newLines = [];
  let skip = 0;
  
  for(let i = 0; i < lines.length; i++) {
    if (skip > 0) {
      skip--;
      continue;
    }
    
    if (lines[i].includes('<Label>Staging URL</Label>')) {
      // The div starts 1 line before this label usually
      if (newLines.length > 0 && newLines[newLines.length - 1].trim().startsWith('<div')) {
        newLines.pop();
      }
      // Skip the next lines until closing div
      let nested = 1;
      let j = i + 1;
      while(j < lines.length && nested > 0) {
        if (lines[j].includes('<div')) nested++;
        if (lines[j].includes('</div')) nested--;
        j++;
      }
      skip = j - i - 1;
      continue;
    }
    
    newLines.push(lines[i]);
  }
  
  s = newLines.join('\n');
  s = s.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6/g, '<div className="grid grid-cols-1 gap-6 p-6');
  s = s.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-4">/g, '<div className="grid grid-cols-1 gap-4">');
  
  fs.writeFileSync(path, s);
}

processFile('src/app/miniapps/register/page.tsx');
processFile('src/app/miniapps/[id]/page.tsx');
console.log('Removed Staging URL from UI');
