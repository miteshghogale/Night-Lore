const fs = require('fs');
const path = require('path');

const NINE_STORIES = [
  'rendlesham-forest-incident',
  'sverdlovsk-anthrax-leak',
  'tanganyika-laughter-epidemic',
  'petrov-nuclear-false-alarm',
  'travis-walton-incident',
  'dancing-plague-1518',
  'cash-landrum-incident',
  'therac-25-radiation-accidents',
  'havana-syndrome-anomalous-health-incidents'
];

function prepareNarrativeScript(rawMd) {
  // 1. Remove YAML frontmatter (between first and second ---)
  const parts = rawMd.split(/^---$/m);
  const bodyContent = parts.slice(2).join('---');

  // 2. Remove Fact-Checking / Grounding Checklist / Sources section at the end
  const mainArticle = bodyContent.split(/^---|^\*\*\*|\n##\s*(Fact|Grounding|Checklist|Verification|Sources)/im)[0].trim();

  // 3. Clean markdown formatting for TTS reading
  let cleaned = mainArticle
    // Remove status blockquotes or status paragraphs at top if present
    .replace(/^(>\s*)?\*?\*?(status|STATUS):?[\s\S]*?(?=\n##|\n\n|\n[A-Z])/i, '')
    // REMOVE ALL SECTION/SUBSECTION HEADERS ENTIRELY (lines starting with #, ##, ###)
    .replace(/^#+\s+.*$/gm, '')
    // Remove bold and italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove any remaining blockquote angle brackets
    .replace(/^>\s*/gm, '')
    // Collapse 3+ newlines down to double-newline paragraph breaks (natural pause)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

console.log("=== ENHANCED EXTRACTION TEST FOR ALL 9 STORIES ===");

let allPassed = true;

for (const slug of NINE_STORIES) {
  const file = path.resolve(__dirname, '../src/content/stories', `${slug}.md`);
  if (!fs.existsSync(file)) {
    console.error(`MISSING STORY: ${slug}`);
    allPassed = false;
    continue;
  }
  const raw = fs.readFileSync(file, 'utf8');
  const extracted = prepareNarrativeScript(raw);
  
  const hasHeaders = /^#+\s+/m.test(extracted);
  const hasChecklist = /Fact-Checking|Grounding Checklist|Fact Verification/i.test(extracted);
  const hasFrontmatter = /^title:\s*"/m.test(extracted);
  const hasStatusBlock = /^(STATUS|Status):/im.test(extracted);

  const pass = !hasHeaders && !hasChecklist && !hasFrontmatter && !hasStatusBlock;
  if (!pass) allPassed = false;

  console.log(`\nStory: ${slug}`);
  console.log(`  - Raw MD Bytes: ${raw.length}`);
  console.log(`  - Extracted Text Chars: ${extracted.length}`);
  console.log(`  - Status: ${pass ? 'PASS' : 'FAIL'}`);
  console.log(`  - Has Lingering Headers? ${hasHeaders ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`  - Has Checklist/Sources? ${hasChecklist ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`  - Has Frontmatter? ${hasFrontmatter ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`  - Has Status Blockquote? ${hasStatusBlock ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`  - First 120 chars: "${extracted.substring(0, 120).replace(/\n/g, ' ')}..."`);
  console.log(`  - Last 120 chars: "...${extracted.substring(extracted.length - 120).replace(/\n/g, ' ')}"`);
}

console.log(`\n=============================================`);
console.log(`ALL 9 STORIES VERIFICATION RESULT: ${allPassed ? 'ALL PASSED 100%' : 'SOME FAILED'}`);
console.log(`=============================================`);
