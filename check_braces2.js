const fs = require('fs');
const content = fs.readFileSync('D:\\Brunac\\Documents\\GitHub\\logger\\frontend\\src\\pages\\SettingsPage.tsx', 'utf8');
const lines = content.split('\n');
let braces = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let inString = false;
  let stringChar = '';
  
  for (let j = 0; j < line.length; j++) {
    let c = line[j];
    if (!inString) {
      if (c === '"' || c === "'" || c === '`') {
        inString = true;
        stringChar = c;
      } else if (c === '{') braces++;
      else if (c === '}') braces--;
    } else {
      if (c === stringChar && line[j-1] !== '\\') {
        inString = false;
      }
    }
  }
  
  if (braces !== 0) {
    console.log('Line', i+1, 'braces:', braces, ':', line.trim().substring(0, 80));
  }
}
console.log('Final braces:', braces);