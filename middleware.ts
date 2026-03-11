import { next } from '@vercel/edge';

// Países hispanohablantes (códigos ISO 3166-1 alpha-2)
const SPANISH_SPEAKING_COUNTRIES = [
  'ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU',
  'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ',
];

const LANG_COOKIE_NAME = 'preferred_lang';

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only apply language detection on the root path "/"
  if (pathname !== '/') {
    return next();
  }

  // Check if user already has a language preference cookie
  const cookies = request.headers.get('cookie') || '';
  const langMatch = cookies.match(new RegExp(`(^| )${LANG_COOKIE_NAME}=([^;]+)`));
  const savedLang = langMatch ? langMatch[2] : null;

  // If user has saved preference for Spanish, redirect
  if (savedLang === 'es') {
    const redirectUrl = new URL('/es/', url.origin);
    redirectUrl.search = url.search;
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
        'Set-Cookie': `${LANG_COOKIE_NAME}=es; Path=/; Max-Age=31536000; SameSite=Lax`,
      },
    });
  }

  // If user already chose English, continue
  if (savedLang === 'en') {
    return next();
  }

  // No preference saved — detect language

  // 1. IP geolocation via Vercel header
  const country = request.headers.get('x-vercel-ip-country');
  if (country && SPANISH_SPEAKING_COUNTRIES.includes(country.toUpperCase())) {
    const redirectUrl = new URL('/es/', url.origin);
    redirectUrl.search = url.search;
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
        'Set-Cookie': `${LANG_COOKIE_NAME}=es; Path=/; Max-Age=31536000; SameSite=Lax`,
      },
    });
  }

  // 2. Fallback: Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(),
        quality: qValue ? parseFloat(qValue) : 1.0,
      };
    });
    languages.sort((a, b) => b.quality - a.quality);

    const preferred = languages.find(l => l.code === 'es' || l.code === 'en');
    if (preferred?.code === 'es') {
      const redirectUrl = new URL('/es/', url.origin);
      redirectUrl.search = url.search;
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl.toString(),
          'Set-Cookie': `${LANG_COOKIE_NAME}=es; Path=/; Max-Age=31536000; SameSite=Lax`,
        },
      });
    }
  }

  // Default: English — save preference and continue
  return next({
    headers: {
      'Set-Cookie': `${LANG_COOKIE_NAME}=en; Path=/; Max-Age=31536000; SameSite=Lax`,
    },
  });
}

export const config = {
  matcher: ['/'],
};
