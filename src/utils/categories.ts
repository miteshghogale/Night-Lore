export interface CategoryInfo {
  name: string;
  slug: string;
  primaryKeyword: string;
  supportingKeywords: string[];
  title: string;
  description: string;
  introCopy: string;
  iconSvg: string;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  'Real Paranormal Cases': {
    name: 'Real Paranormal Cases',
    slug: 'real-paranormal-cases',
    primaryKeyword: 'real paranormal cases',
    supportingKeywords: ['documented hauntings', 'paranormal case files', 'researched ghost stories', 'real life haunting stories'],
    title: 'Real Paranormal Cases — Night Lore',
    description: 'Explore documented real paranormal cases with police dockets, forensic ballistics, court transcripts, and skeptical counter-analysis.',
    introCopy: 'Deep investigative dossiers on documented hauntings, official police reports, court transcripts, and rigorous paranormal case files.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`
  },
  'Country Stories': {
    name: 'Country Stories',
    slug: 'country-stories',
    primaryKeyword: 'country hauntings documented',
    supportingKeywords: ['rural ghost stories', 'true regional folklore', 'appalachian hauntings', 'frontier ghost stories'],
    title: 'Country Stories — Night Lore',
    description: 'Researched rural ghost stories and country hauntings from historic frontier homesteads, regional folklore, and eyewitness land logs.',
    introCopy: 'Deep historical investigations into country hauntings, rural homestead ghost stories, and regional frontier folklore.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`
  },
  'Haunted Places': {
    name: 'Haunted Places',
    slug: 'haunted-places',
    primaryKeyword: 'real haunted places',
    supportingKeywords: ['haunted locations true stories', 'most haunted places documented', 'historic ghost sites', 'haunted houses real stories'],
    title: 'Haunted Places — Night Lore',
    description: 'Historical archives and architectural case files of real haunted places, documented locations, and famous supernatural structures.',
    introCopy: 'Architectural surveys and historical case files investigating real haunted places, structural anomalies, and documented supernatural locations.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`
  },
  'Unsolved Mysteries': {
    name: 'Unsolved Mysteries',
    slug: 'unsolved-mysteries',
    primaryKeyword: 'real unsolved mysteries',
    supportingKeywords: ['true unexplained disappearances', 'unsolved cases documented', 'paranormal anomalies', 'true unexplained phenomena'],
    title: 'Unsolved Mysteries — Night Lore',
    description: 'Researched dossiers on real unsolved mysteries, unexplained disappearances, historical anomalies, and physical telemetry.',
    introCopy: 'Evidence-backed dossiers examining real unsolved mysteries, unexplained physical anomalies, high strangeness, and cold case files.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
  },
  'Urban Legends': {
    name: 'Urban Legends',
    slug: 'urban-legends',
    primaryKeyword: 'real urban legends',
    supportingKeywords: ['true urban legend origins', 'urban legends based on true events', 'folklore history', 'true horror stories real'],
    title: 'Urban Legends — Night Lore',
    description: 'Uncovering the true historical origins behind real urban legends, modern folklore, and true events that spawned terrifying myths.',
    introCopy: 'Tracing real urban legends to their true historical origins, factual news accounts, and documented community folklore.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
  },
  'First-Person Accounts': {
    name: 'First-Person Accounts',
    slug: 'first-person-accounts',
    primaryKeyword: 'eyewitness ghost encounters',
    supportingKeywords: ['real supernatural encounters', 'true reader paranormal stories', 'witness testimony', 'first person witness statements'],
    title: 'First-Person Accounts — Night Lore',
    description: 'Vetted eyewitness ghost encounters and real supernatural testimonies submitted by readers and verified against geographical logs.',
    introCopy: 'Direct witness testimonies and real supernatural encounters submitted by readers and archived with contextual verification.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`
  },
  'Movie Inspiration': {
    name: 'Movie Inspiration',
    slug: 'movie-inspiration',
    primaryKeyword: 'true stories behind horror movies',
    supportingKeywords: ['real events that inspired horror films', 'horror movie true history', 'cinematic hauntings real case'],
    title: 'Movie Inspiration — Night Lore',
    description: 'Discover the real events and true stories behind iconic horror movies, separated from cinematic dramatization.',
    introCopy: 'Archival dossiers dissecting the true events, historical court cases, and real hauntings that inspired famous horror movies.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>`
  },
  'Psychology of Fear': {
    name: 'Psychology of Fear',
    slug: 'psychology-of-fear',
    primaryKeyword: 'psychology of ghost encounters',
    supportingKeywords: ['scientific analysis of hauntings', 'sleep paralysis and ghosts', 'neurological fear responses', 'sensory illusions'],
    title: 'Psychology of Fear — Night Lore',
    description: 'Scientific and psychological analysis of ghost encounters, sleep paralysis demons, cognitive biases, and sensory illusions.',
    introCopy: 'Scientific exploration into the psychology of ghost encounters, neurological hallucinations, and environmental fear mechanics.',
    iconSvg: `<svg class="w-6 h-6 text-[var(--glow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>`
  }
};

export const ALL_CATEGORY_NAMES = Object.keys(CATEGORIES);

export function slugToCategory(slug: string): string | undefined {
  return ALL_CATEGORY_NAMES.find(name => CATEGORIES[name].slug === slug);
}

export function categoryToSlug(category: string): string {
  if (CATEGORIES[category]) {
    return CATEGORIES[category].slug;
  }
  return category
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
