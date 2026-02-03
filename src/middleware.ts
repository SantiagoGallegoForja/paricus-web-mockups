import { defineMiddleware } from 'astro:middleware';

// Países hispanohablantes (códigos ISO 3166-1 alpha-2)
const SPANISH_SPEAKING_COUNTRIES = [
  'ES', // España
  'MX', // México
  'AR', // Argentina
  'CO', // Colombia
  'PE', // Perú
  'VE', // Venezuela
  'CL', // Chile
  'EC', // Ecuador
  'GT', // Guatemala
  'CU', // Cuba
  'BO', // Bolivia
  'DO', // República Dominicana
  'HN', // Honduras
  'PY', // Paraguay
  'SV', // El Salvador
  'NI', // Nicaragua
  'CR', // Costa Rica
  'PA', // Panamá
  'UY', // Uruguay
  'PR', // Puerto Rico
  'GQ', // Guinea Ecuatorial
];

// Nombre de la cookie para recordar preferencia de idioma
const LANG_COOKIE_NAME = 'preferred_lang';

// Páginas que se benefician de ISR (contenido del CMS)
const ISR_PAGES = [
  '/',
  '/es',
  '/about',
  '/es/about',
  '/industries',
  '/es/industries',
  '/case-studies',
  '/es/case-studies',
  '/contact',
  '/es/contact',
  '/blog',
  '/es/blog',
];

// TTL en segundos
const ISR_TTL = 60; // 1 minuto - contenido actualizado cada 1 min
const STALE_TTL = 300; // 5 minutos de stale-while-revalidate

/**
 * Detecta el idioma preferido del usuario basándose en:
 * 1. Header x-vercel-ip-country (geolocalización por IP en Vercel)
 * 2. Header Accept-Language del navegador como fallback
 */
function detectPreferredLanguage(request: Request): 'en' | 'es' {
  // 1. Intentar geolocalización por IP (Vercel)
  const country = request.headers.get('x-vercel-ip-country');
  if (country && SPANISH_SPEAKING_COUNTRIES.includes(country.toUpperCase())) {
    return 'es';
  }

  // 2. Fallback: Accept-Language del navegador
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parsear el header Accept-Language (ej: "es-ES,es;q=0.9,en;q=0.8")
    const languages = acceptLanguage.split(',').map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(), // "es-ES" -> "es"
        quality: qValue ? parseFloat(qValue) : 1.0
      };
    });

    // Ordenar por calidad (mayor primero)
    languages.sort((a, b) => b.quality - a.quality);

    // Buscar español en las preferencias
    const preferredLang = languages.find(l => l.code === 'es' || l.code === 'en');
    if (preferredLang?.code === 'es') {
      return 'es';
    }
  }

  // Default: inglés
  return 'en';
}

/**
 * Obtiene el valor de una cookie del request
 */
function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const pathname = url.pathname;

  // --- AUTO-DETECCIÓN DE IDIOMA ---
  // Solo aplicar en la página raíz "/" cuando no hay preferencia guardada
  if (pathname === '/') {
    const savedLang = getCookie(request, LANG_COOKIE_NAME);

    // Si no hay preferencia guardada, detectar idioma
    if (!savedLang) {
      const detectedLang = detectPreferredLanguage(request);

      // Si se detectó español, redirigir a /es/
      if (detectedLang === 'es') {
        const redirectUrl = new URL('/es/', url.origin);
        // Preservar query params (ej: UTM)
        redirectUrl.search = url.search;

        // Crear respuesta de redirección con cookie
        const response = new Response(null, {
          status: 302,
          headers: {
            'Location': redirectUrl.toString(),
            'Set-Cookie': `${LANG_COOKIE_NAME}=es; Path=/; Max-Age=31536000; SameSite=Lax`,
          },
        });
        return response;
      }

      // Si es inglés, continuar pero guardar preferencia
      const response = await next();
      response.headers.append('Set-Cookie', `${LANG_COOKIE_NAME}=en; Path=/; Max-Age=31536000; SameSite=Lax`);
      return response;
    }
  }

  // --- PROCESAMIENTO NORMAL ---
  const response = await next();

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
