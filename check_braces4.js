const fs = require('fs');
const content = fs.readFileSync('D:\\Brunac\\Documents\\GitHub\\logger\\frontend\\src\\pages\\SettingsPage.tsx', 'utf8');
const lines = content.split('\n');

let componentStart = -1;
let componentEnd = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.includes('const SettingsPage = ({ user, onUserUpdate, onDeleteAccount }: SettingsPageProps) => {')) {
    console.log('Component starts at line', i+1);
  }
  if (i > 150 && lines[i].trim() === '};') {
    console.log('Possible component end at line', i+1);
  }
}

// Check braces in component body (lines 156-1000)
let braces = 0;
let inString = false;
let stringChar = '';

for (let i = 155; i < 1000; i++) {
  let line = lines[i];
  let inLineString = false;
  let lineStringChar = '';
  
  for (let j = 0; j < line.length; j++) {
    let c = line[j];
    if (!inLineString) {
      if (c === '"' || c === "'" || c === '`') {
        inLineString = true;
        lineStringChar = line[j];
      } else if (c === '{') {
        console.log('Open brace at line', i+1, 'pos', j, ':', lines[i].substring(Math.max(0, j-20), j+20));
      } else if (c === '}') {
        console.log('Close brace at line', i+1, 'pos', j, ':', lines[i].substring(Math.max(0, j-20), j+20));
      }
    } else {
      if (c === lineStringChar && line[j-1] !== '\\') inLineString = false;
    }
  }
}