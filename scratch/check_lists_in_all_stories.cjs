const fs = require('fs');
const path = require('path');

const STORIES = [
  'sverdlovsk-anthrax-leak',
  'tanganyika-laughter-epidemic',
  'travis-walton-incident',
  'dancing-plague-1518',
  'cash-landrum-incident',
  'therac-25-radiation-accidents',
  'havana-syndrome-anomalous-health-incidents'
];

for (const slug of STORIES) {
  const file = path.resolve(__dirname, '../src/content/stories', `${slug}.md`);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');

  // Strip frontmatter and checklist first
  const parts = content.split(/^---$/m);
  const bodyContent = parts.slice(2).join('---');
  const mainArticle = bodyContent.split(/^---|^\*\*\*|\n##\s*(Fact|Grounding|Checklist|Verification|Sources)/im)[0].trim();

  // Find numbered lists in main article
  const numberedMatches = mainArticle.match(/^\s*\d+\.\s+.*$/gm) || [];
  // Find bulleted lists in main article
  const bulletMatches = mainArticle.match(/^\s*[-*]\s+.*$/gm) || [];

  console.log(`========================================`);
  console.log(`Story: ${slug}`);
  console.log(`Numbered list items found: ${numberedMatches.length}`);
  if (numberedMatches.length > 0) {
    numberedMatches.forEach(m => console.log(`  [NUM] ${m}`));
  }
  console.log(`Bulleted list items found: ${bulletMatches.length}`);
  if (bulletMatches.length > 0) {
    bulletMatches.forEach(m => console.log(`  [BULLET] ${m}`));
  }
}
