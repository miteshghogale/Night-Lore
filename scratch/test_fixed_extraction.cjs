const fs = require('fs');
const path = require('path');

function prepareNarrativeScript(rawMd) {
  // 1. Remove YAML frontmatter (between first and second ---)
  const parts = rawMd.split(/^---$/m);
  const bodyContent = parts.slice(2).join('---');

  // 2. Remove Fact-Checking and Grounding Checklist section at the end
  const mainArticle = bodyContent.split(/---|\n## Fact-Checking/)[0].trim();

  // 3. Clean markdown formatting for TTS reading
  let cleaned = mainArticle
    // Remove status blockquote at top if present (e.g. > **STATUS: WITNESSED** ...)
    .replace(/^>\s*\*\*STATUS:[\s\S]*?\n\n/i, '')
    // REMOVE SECTION HEADERS ENTIRELY (lines starting with #, ##, ###)
    .replace(/^#+\s+.*$/gm, '')
    // Remove bold and italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove blockquote angle brackets
    .replace(/^>\s*/gm, '')
    // Collapse 3+ newlines down to double-newline paragraph breaks (natural pause)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

const mdPath = path.resolve(__dirname, '../src/content/stories/petrov-nuclear-false-alarm.md');
const rawMd = fs.readFileSync(mdPath, 'utf8');
const correctedText = prepareNarrativeScript(rawMd);

console.log("=== CORRECTED EXTRACTED SCRIPT FOR PETROV ===");
console.log("Total Character Count:", correctedText.length);
console.log("=============================================\n");
console.log(correctedText);
