import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Allowed reaction types
const VALID_REACTION_TYPES = ['unsettling', 'unsolved', 'nosleep'] as const;
type ReactionType = (typeof VALID_REACTION_TYPES)[number];

// In-memory fallback store for local development without active Cloudflare D1 binding
const mockReactionStore: Record<string, Record<ReactionType, number>> = {};

function getD1Database() {
  try {
    if (env && env.DB) {
      return env.DB;
    }
  } catch (e) {
    // env.DB not available in non-worker environment
  }
  return null;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug') || url.searchParams.get('story_slug');
    const isTop = url.searchParams.get('top') === 'true';

    const db = getD1Database();

    if (isTop) {
      // Query top reacted stories
      if (db) {
        const { results } = await db.prepare(`
          SELECT story_slug, reaction_type, count
          FROM story_reactions
        `).all();

        const storyMap: Record<string, Record<ReactionType, number>> = {};
        let totalSystemReactions = 0;

        for (const row of results as any[]) {
          const s = row.story_slug;
          const r = row.reaction_type as ReactionType;
          const c = Number(row.count) || 0;
          if (!storyMap[s]) {
            storyMap[s] = { unsettling: 0, unsolved: 0, nosleep: 0 };
          }
          if (VALID_REACTION_TYPES.includes(r)) {
            storyMap[s][r] = c;
          }
          totalSystemReactions += c;
        }

        const topStories = Object.entries(storyMap).map(([story_slug, counts]) => ({
          story_slug,
          counts,
          total_count: counts.unsettling + counts.unsolved + counts.nosleep
        })).sort((a, b) => b.total_count - a.total_count);

        return new Response(JSON.stringify({
          success: true,
          topStories,
          totalSystemReactions
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Fallback mock top stories
        const storyMap = mockReactionStore;
        let totalSystemReactions = 0;
        const topStories = Object.entries(storyMap).map(([story_slug, counts]) => {
          const sum = (counts.unsettling || 0) + (counts.unsolved || 0) + (counts.nosleep || 0);
          totalSystemReactions += sum;
          return { story_slug, counts, total_count: sum };
        }).sort((a, b) => b.total_count - a.total_count);

        return new Response(JSON.stringify({
          success: true,
          topStories,
          totalSystemReactions
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Single story query
    if (!slug) {
      return new Response(JSON.stringify({ success: false, error: 'Missing story slug parameter.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const counts: Record<ReactionType, number> = { unsettling: 0, unsolved: 0, nosleep: 0 };

    if (db) {
      const { results } = await db.prepare(`
        SELECT reaction_type, count
        FROM story_reactions
        WHERE story_slug = ?
      `).bind(slug).all();

      for (const row of results as any[]) {
        const r = row.reaction_type as ReactionType;
        if (VALID_REACTION_TYPES.includes(r)) {
          counts[r] = Number(row.count) || 0;
        }
      }
    } else {
      if (mockReactionStore[slug]) {
        counts.unsettling = mockReactionStore[slug].unsettling || 0;
        counts.unsolved = mockReactionStore[slug].unsolved || 0;
        counts.nosleep = mockReactionStore[slug].nosleep || 0;
      }
    }

    const total = counts.unsettling + counts.unsolved + counts.nosleep;

    return new Response(JSON.stringify({
      success: true,
      slug,
      counts,
      total
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Reaction GET Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    let story_slug: string = '';
    let reaction_type: string = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      story_slug = (body.story_slug || body.slug || '').toString().trim();
      reaction_type = (body.reaction_type || body.type || '').toString().trim();
    } else {
      const formData = await request.formData();
      story_slug = (formData.get('story_slug') || formData.get('slug') || '').toString().trim();
      reaction_type = (formData.get('reaction_type') || formData.get('type') || '').toString().trim();
    }

    if (!story_slug) {
      return new Response(JSON.stringify({ success: false, error: 'Story slug is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!VALID_REACTION_TYPES.includes(reaction_type as ReactionType)) {
      return new Response(JSON.stringify({ success: false, error: `Invalid reaction type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validReaction = reaction_type as ReactionType;
    const db = getD1Database();

    if (db) {
      await db.prepare(`
        INSERT INTO story_reactions (story_slug, reaction_type, count)
        VALUES (?, ?, 1)
        ON CONFLICT(story_slug, reaction_type)
        DO UPDATE SET count = count + 1
      `).bind(story_slug, validReaction).run();
    } else {
      if (!mockReactionStore[story_slug]) {
        mockReactionStore[story_slug] = { unsettling: 0, unsolved: 0, nosleep: 0 };
      }
      mockReactionStore[story_slug][validReaction] = (mockReactionStore[story_slug][validReaction] || 0) + 1;
    }

    // Fetch updated counts
    const updatedCounts: Record<ReactionType, number> = { unsettling: 0, unsolved: 0, nosleep: 0 };

    if (db) {
      const { results } = await db.prepare(`
        SELECT reaction_type, count
        FROM story_reactions
        WHERE story_slug = ?
      `).bind(story_slug).all();

      for (const row of results as any[]) {
        const r = row.reaction_type as ReactionType;
        if (VALID_REACTION_TYPES.includes(r)) {
          updatedCounts[r] = Number(row.count) || 0;
        }
      }
    } else {
      updatedCounts.unsettling = mockReactionStore[story_slug].unsettling || 0;
      updatedCounts.unsolved = mockReactionStore[story_slug].unsolved || 0;
      updatedCounts.nosleep = mockReactionStore[story_slug].nosleep || 0;
    }

    const total = updatedCounts.unsettling + updatedCounts.unsolved + updatedCounts.nosleep;

    return new Response(JSON.stringify({
      success: true,
      message: 'Reaction recorded successfully.',
      slug: story_slug,
      reaction_type: validReaction,
      counts: updatedCounts,
      total
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Reaction POST Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
