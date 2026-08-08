export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Parses ## Frequently Asked Questions section from raw markdown content
 * into an array of question-answer pairs for JSON-LD FAQPage schema generation.
 */
export function parseFaqsFromMarkdown(markdown?: string): FaqItem[] {
  if (!markdown) return [];

  const faqSectionMatch = markdown.match(/##\s+Frequently Asked Questions\s+([\s\S]*?)(?=\n##\s+|$)/i);
  if (!faqSectionMatch) return [];

  let faqContent = faqSectionMatch[1];
  // Strip trailing horizontal rule separators (---) before the next section
  faqContent = faqContent.replace(/\n---\s*$/, '').trim();

  const items: FaqItem[] = [];

  // Split by H3 headers (### Question)
  const blocks = faqContent.split(/(?=\n###\s+|^###\s+)/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('###')) continue;

    const lines = trimmed.split('\n');
    const questionLine = lines[0].replace(/^###\s+/, '').trim();
    const answerRaw = lines.slice(1).join('\n').replace(/\n---\s*$/, '').trim();

    // Strip markdown formatting for clean plain-text JSON-LD output
    const cleanAnswer = answerRaw
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // *text* or **text** -> text
      .replace(/\s+/g, ' ')
      .trim();

    if (questionLine && cleanAnswer) {
      items.push({
        question: questionLine,
        answer: cleanAnswer
      });
    }
  }

  return items;
}
