/**
 * SHARED NARRATION TEXT EXTRACTION MODULE
 * 
 * Pipeline-level text extraction logic for Night Lore stories:
 * 1. Strips YAML frontmatter (between first and second ---).
 * 2. Removes fact-checking / grounding checklist / sources section at the end.
 * 3. Removes status callout blockquotes/paragraphs at top.
 * 4. STRIPS ALL SECTION & SUBSECTION HEADERS (#, ##, ###) ENTIRELY,
 *    so header titles are NEVER narrated as spoken sentences.
 * 5. Replaces section transitions with double-newline paragraph breaks (\n\n)
 *    to create natural voice pauses in ElevenLabs narration.
 * 6. Cleans bold/italics and remaining markdown symbols.
 */

function prepareNarrativeScript(rawMd) {
  // 1. Remove YAML frontmatter
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
    // Replace bullet points at line starts with double-newlines so each bullet item forms its own paragraph beat
    .replace(/^\s*[-*]\s+/gm, '\n\n')
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

module.exports = { prepareNarrativeScript };
