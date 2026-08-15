const fs = require('fs');
const path = require('path');

const fileContent = fs.readFileSync(
  path.resolve(__dirname, '../src/content/stories/petrov-nuclear-false-alarm.md'),
  'utf8'
);

// 1. Remove frontmatter (between first and second ---)
const parts = fileContent.split(/^---$/m);
// parts[0] is empty (before first ---)
// parts[1] is frontmatter
// parts[2] is body + checklist (or subsequent sections)

const bodyAndChecklist = parts.slice(2).join('---');

// 2. Remove fact-verification checklist at the end (from --- or ## Fact-Checking)
let mainBody = bodyAndChecklist.split(/---|\n## Fact-Checking/)[0].trim();

console.log("=== RAW EXTRACTED BODY ===");
console.log(mainBody.substring(0, 300));
console.log("...\n" + mainBody.substring(mainBody.length - 300));
console.log("\nRaw Length:", mainBody.length);

// Clean markdown for TTS narration
function cleanMarkdownForTTS(text) {
  let cleaned = text
    // Remove status blockquote if present at start
    .replace(/^>\s*\*\*STATUS:[\s\S]*?\n\n/i, '')
    // Remove headers markdown (##, ###)
    .replace(/^#+\s+/gm, '')
    // Remove bold/italics (*, **)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove blockquotes (> )
    .replace(/^>\s*/gm, '')
    // Normalize newlines / whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned;
}

const cleanedBody = cleanMarkdownForTTS(mainBody);
console.log("\n=== CLEANED FOR TTS ===");
console.log(cleanedBody.substring(0, 300));
console.log("...\n" + cleanedBody.substring(cleanedBody.length - 300));
console.log("\nCleaned Length:", cleanedBody.length);
