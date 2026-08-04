import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const password = formData.get('password')?.toString().trim();

    const rawSecret = (env as any)?.ADMIN_PASSWORD;

    // Temporary Debug Logging (Lengths & Undefined Check ONLY - No Values Logged)
    console.log('[ADMIN LOGIN DEBUG] Is env.ADMIN_PASSWORD undefined?:', rawSecret === undefined);
    console.log('[ADMIN LOGIN DEBUG] Submitted length:', password?.length ?? 0, 'Expected length:', rawSecret?.length ?? 0);

    const adminPassword = rawSecret || 'nightlore_admin_secret_2026';

    if (!password || password !== adminPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid admin credentials.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set Secure HttpOnly cookie
    cookies.set('admin_session', 'nl_admin_valid_session_token', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400 // 24 hours
    });

    return new Response(JSON.stringify({ success: true, message: 'Authentication successful.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Login failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
