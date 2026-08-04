const fs = require('fs');
const path = require('path');

const storiesDir = path.join(__dirname, '..', 'src', 'content', 'stories');
const files = fs.readdirSync(storiesDir).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const filePath = path.join(storiesDir, file);
  const text = fs.readFileSync(filePath, 'utf8');
  const body = text.replace(/^---[\s\S]*?---/, '').trim();
  
  console.log(`\n========================================`);
  console.log(`FILE: ${file}`);
  console.log(`========================================`);
  
  const lines = body.split('\n');
  lines.forEach((line, idx) => {
    // Match double quotes and single quotes
    const doubleQuotes = line.match(/"([^"]+)"/g);
    if (doubleQuotes) {
      doubleQuotes.forEach(m => {
        console.log(`L${idx+1} [DOUBLE]: ${m}`);
      });
    }
    const singleQuotes = line.match(/'([^']+)'/g);
    if (singleQuotes) {
      singleQuotes.forEach(m => {
        console.log(`L${idx+1} [SINGLE]: ${m}`);
      });
    }
  });
});
