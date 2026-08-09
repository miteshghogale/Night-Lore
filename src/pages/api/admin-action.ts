import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

interface AdminActionBody {
  id?: string;
  action?: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Admin Session Verification
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || sessionCookie.value !== 'nl_admin_valid_session_token') {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized admin session.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = (await request.json()) as AdminActionBody;
    const { id, action } = body;

    if (!id || !action || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid parameters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const db = (env as any)?.DB;

    if (db) {
      await db.prepare(`
        UPDATE submissions SET status = ? WHERE id = ?
      `).bind(newStatus, id).run();
    } else {
      console.log(`[D1 FALLBACK MOCK] Action applied: ${id} -> ${newStatus}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Submission status updated to ${newStatus}.`,
      id,
      status: newStatus
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Server error processing action.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
