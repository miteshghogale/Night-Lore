import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const stories = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/stories' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    category: z.enum([
      'Real Paranormal Cases',
      'Country Stories',
      'Haunted Places',
      'Unsolved Mysteries',
      'Urban Legends',
      'First-Person Accounts',
      'Movie Inspiration',
      'Psychology of Fear'
    ]),
    status: z.enum(['unresolved', 'witnessed', 'disputed', 'debunked', 'ongoing']),
    location: z.string(),
    eventDate: z.string(),
    pubDate: z.coerce.date(),
    audioUrl: z.string().optional(),
    audioDuration: z.string().optional(),
    sources: z.array(
      z.object({
        label: z.string(),
        url: z.string()
      })
    ),
    tags: z.array(z.string()),
    draft: z.boolean().default(false)
  })
});

export const collections = { stories };
