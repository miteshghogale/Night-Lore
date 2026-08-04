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
  
  // Find all double quotes and single quotes used as spoken quotes
  const lines = body.split('\n');
  lines.forEach((line, idx) => {
    // Match "..." or '...'
    const matches = line.match(/"([^"]+)"|'([^']+)'/g);
    if (matches) {
      matches.forEach(m => {
        console.log(`L${idx+1}: ${m}`);
      });
    }
  });
});
