import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false; // Server-rendered Cloudflare Pages Function API route

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const title = formData.get('title')?.toString().trim();
    const category = formData.get('category')?.toString().trim();
    const location = formData.get('location')?.toString().trim();
    const eventDate = formData.get('event_date')?.toString().trim();
    const storyText = formData.get('story_text')?.toString().trim();
    const authorName = formData.get('author_name')?.toString().trim() || 'Anonymous';
    const isAnonymous = formData.get('is_anonymous') === 'on' || formData.get('is_anonymous') === 'true';
    const email = formData.get('email')?.toString().trim();
    const honeypot = formData.get('website_url')?.toString().trim();
    const consent = formData.get('consent');

    // Anti-spam Honeypot Check
    if (honeypot && honeypot.length > 0) {
      // Quietly succeed to fool spam bots
      return new Response(JSON.stringify({ success: true, message: 'Submission received for review.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validation
    if (!title || !category || !location || !storyText || !email) {
      return new Response(JSON.stringify({ success: false, error: 'Please fill in all required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (storyText.length < 150) {
      return new Response(JSON.stringify({ success: false, error: 'Story text must be at least 150 characters in length.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!consent) {
      return new Response(JSON.stringify({ success: false, error: 'You must agree to the editorial policy terms.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate Submission ID
    const submissionId = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    // Cloudflare D1 Execution
    // Retrieve D1 DB binding directly from cloudflare:workers env per Astro v6+ adapter docs
    const db = (env as any)?.DB;

    if (db) {
      await db.prepare(`
        INSERT INTO submissions (id, title, category, location, event_date, story_text, author_name, is_anonymous, email, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).bind(
        submissionId,
        title,
        category,
        location,
        eventDate || 'Unknown',
        storyText,
        authorName,
        isAnonymous ? 1 : 0,
        email,
        createdAt
      ).run();
    } else {
      // Fallback mock logging when running in environments without D1 binding
      console.log('[D1 FALLBACK MOCK] Submission received:', {
        id: submissionId,
        title,
        category,
        location,
        eventDate,
        authorName,
        isAnonymous,
        email,
        storyLength: storyText.length,
        status: 'pending',
        createdAt
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Your encounter has been submitted for editorial moderation.',
      id: submissionId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    const errorDetails = err?.message || err?.toString() || 'Unknown server error during submission processing.';
    console.error('Submission API Error:', err);
    return new Response(JSON.stringify({ success: false, error: errorDetails }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
