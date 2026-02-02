import { defineMiddleware } from 'astro:middleware';

// Páginas que se benefician de ISR (contenido del CMS)
const ISR_PAGES = [
  '/',
  '/es',
  '/about',
  '/es/about',
  '/industries',
  '/es/industries',
  '/contact',
  '/es/contact',
  '/blog',
  '/es/blog',
];

// TTL en segundos
const ISR_TTL = 60; // 1 minuto - contenido actualizado cada 1 min
const STALE_TTL = 300; // 5 minutos de stale-while-revalidate

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const pathname = context.url.pathname;

  // Si es una página ISR, agregar headers de cache
  if (ISR_PAGES.some(page => pathname === page || pathname.startsWith('/blog/') || pathname.startsWith('/es/blog/'))) {
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${ISR_TTL}, stale-while-revalidate=${STALE_TTL}`
    );
  }

  // Assets estáticos: cache inmutable por 1 año
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/assets/')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  }

  return response;
});
