import type { APIRoute } from 'astro';

export const prerender = false;

const PREVIEW_SECRET = import.meta.env.PREVIEW_SECRET || 'preview-secret-key';

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const slug = url.searchParams.get('slug');
  const status = url.searchParams.get('status');

  // Validate secret
  if (secret !== PREVIEW_SECRET) {
    return new Response('Invalid preview secret', { status: 401 });
  }

  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 });
  }

  // Set preview cookie to enable draft mode
  cookies.set('strapi-preview', status || 'draft', {
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60, // 1 hour
  });

  // Redirect to the content page with preview param
  const previewUrl = `${slug}?preview=true`;

  return redirect(previewUrl, 307);
};
