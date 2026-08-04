import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);

  // Protect /admin routes (except /admin/login)
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    const sessionCookie = context.cookies.get('admin_session');
    if (!sessionCookie || sessionCookie.value !== 'nl_admin_valid_session_token') {
      return context.redirect('/admin/login');
    }
  }

  return next();
});
