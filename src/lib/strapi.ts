// Strapi API connection with cache and i18n support

const STRAPI_URL = 'https://miraculous-action-c5f583a855.strapiapp.com';

// Cache configuration
const CACHE_TTL = 60 * 60 * 1000; // 1 hora (aumentado para complementar ISR)
const isDev = import.meta.env.DEV;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  if (isDev) console.log(`[Strapi Cache] HIT: ${key}`);
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
  if (isDev) console.log(`[Strapi Cache] SET: ${key}`);
}

export function clearCache(): void {
  cache.clear();
  console.log('[Strapi Cache] Cleared');
}

// Types
export interface StrapiImage {
  url: string;
  alternativeText?: string;
  width?: number;
  height?: number;
}

export interface StrapiAuthor {
  id: number;
  name: string;
  email?: string;
  avatar?: StrapiImage;
}

export interface StrapiCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface StrapiArticle {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
  description: string;
  cover?: StrapiImage;
  author?: StrapiAuthor;
  category?: StrapiCategory;
  blocks?: any[];
  publishedAt: string;
  createdAt: string;
  locale?: string;
  localizations?: StrapiArticle[];
}

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Locale mapping
type SupportedLocale = 'en' | 'es';

function getStrapiLocale(lang: string): string {
  const localeMap: Record<string, string> = {
    'en': 'en',
    'es': 'es-CO', // Strapi uses es-CO for Spanish (Colombia)
  };
  return localeMap[lang] || 'en';
}

// Helper to build full image URL
export function getStrapiImageUrl(image?: StrapiImage): string | null {
  if (!image?.url) return null;
  if (image.url.startsWith('http')) return image.url;
  return `${STRAPI_URL}${image.url}`;
}

// Fetch all articles by locale
export async function getArticles(lang: SupportedLocale = 'en'): Promise<StrapiArticle[]> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `articles:${locale}`;

  const cached = getCached<StrapiArticle[]>(cacheKey);
  if (cached) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching articles for locale: ${locale}`);

    // Try with locale filter first (for i18n enabled)
    let url = `${STRAPI_URL}/api/articles?populate=*&sort=publishedAt:desc&locale=${locale}`;

    let response = await fetch(url);

    // If locale filter fails or returns empty, try without locale (backward compatible)
    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Locale filter failed, trying without locale...');
      url = `${STRAPI_URL}/api/articles?populate=*&sort=publishedAt:desc`;
      response = await fetch(url);
    }

    if (!response.ok) {
      console.error('Failed to fetch articles:', response.status);
      return [];
    }

    const json: StrapiResponse<StrapiArticle[]> = await response.json();
    let articles = json.data || [];

    // If i18n is not enabled, return all articles
    // If i18n is enabled but returns empty for locale, the array will be empty

    setCache(cacheKey, articles);
    return articles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

// Fetch single article by slug and locale
export async function getArticleBySlug(slug: string, lang: SupportedLocale = 'en'): Promise<StrapiArticle | null> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `article:${slug}:${locale}`;

  const cached = getCached<StrapiArticle | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching article: ${slug} (${locale})`);

    // Try with locale filter first, include localizations for alternate language links
    let url = `${STRAPI_URL}/api/articles?filters[slug][$eq]=${slug}&populate[cover]=*&populate[author][populate]=avatar&populate[category]=*&populate[blocks]=*&populate[localizations][fields][0]=slug&populate[localizations][fields][1]=locale&locale=${locale}`;

    let response = await fetch(url);
    let json: StrapiResponse<StrapiArticle[]> = await response.json();
    let article = json.data?.[0] || null;

    // If not found with locale, try without locale (backward compatible)
    if (!article) {
      if (isDev) console.log('[Strapi API] Article not found with locale, trying without...');
      url = `${STRAPI_URL}/api/articles?filters[slug][$eq]=${slug}&populate=*`;
      response = await fetch(url);
      json = await response.json();
      article = json.data?.[0] || null;
    }

    setCache(cacheKey, article);
    return article;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

// Helper to get the alternate language article path
export function getAlternateArticlePath(article: StrapiArticle, currentLang: SupportedLocale): string | null {
  if (!article.localizations || article.localizations.length === 0) {
    return null;
  }

  // Map to Strapi locales
  const alternateStrapiLocale = currentLang === 'en' ? 'es-CO' : 'en';
  const alternateArticle = article.localizations.find(
    (loc) => loc.locale === alternateStrapiLocale
  );

  if (!alternateArticle?.slug) {
    return null;
  }

  // Return the full path for the alternate language
  if (currentLang === 'en') {
    return `/es/blog/${alternateArticle.slug}`;
  } else {
    return `/blog/${alternateArticle.slug}`;
  }
}

// Fetch all categories by locale
export async function getCategories(lang: SupportedLocale = 'en'): Promise<StrapiCategory[]> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `categories:${locale}`;

  const cached = getCached<StrapiCategory[]>(cacheKey);
  if (cached) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching categories for locale: ${locale}`);

    let url = `${STRAPI_URL}/api/categories?locale=${locale}`;
    let response = await fetch(url);

    if (!response.ok) {
      url = `${STRAPI_URL}/api/categories`;
      response = await fetch(url);
    }

    if (!response.ok) {
      console.error('Failed to fetch categories:', response.status);
      return [];
    }

    const json: StrapiResponse<StrapiCategory[]> = await response.json();
    const categories = json.data || [];

    setCache(cacheKey, categories);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// Get all article slugs for all locales (for static paths)
export async function getAllArticleSlugs(): Promise<{ slug: string; locale: string }[]> {
  const cacheKey = 'all-article-slugs';

  const cached = getCached<{ slug: string; locale: string }[]>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch articles for all locales
    const [enArticles, esArticles] = await Promise.all([
      getArticles('en'),
      getArticles('es'),
    ]);

    const slugs: { slug: string; locale: string }[] = [];

    enArticles.forEach((article) => {
      slugs.push({ slug: article.slug, locale: 'en' });
    });

    esArticles.forEach((article) => {
      slugs.push({ slug: article.slug, locale: 'es' });
    });

    // Remove duplicates (in case i18n is not enabled)
    const uniqueSlugs = slugs.filter((item, index, self) =>
      index === self.findIndex((t) => t.slug === item.slug && t.locale === item.locale)
    );

    setCache(cacheKey, uniqueSlugs);
    return uniqueSlugs;
  } catch (error) {
    console.error('Error fetching all slugs:', error);
    return [];
  }
}

// Homepage types
export interface HeroStat {
  id: number;
  value: string;
  label: string;
}

export interface HomepageHero {
  badge?: string;
  title?: string;
  titleHighlight?: string;
  titleEnd?: string;
  description?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  stats?: HeroStat[];
}

export interface Homepage {
  hero?: HomepageHero;
}

// Fetch homepage content by locale
export async function getHomepage(lang: SupportedLocale = 'en'): Promise<Homepage | null> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `homepage:${locale}`;

  const cached = getCached<Homepage | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching homepage for locale: ${locale}`);

    // Fetch homepage single type with nested hero component
    let url = `${STRAPI_URL}/api/homepage?populate[hero][populate]=stats&locale=${locale}`;

    let response = await fetch(url);

    if (!response.ok) {
      // Try without locale (backward compatible)
      if (isDev) console.log('[Strapi API] Homepage not found with locale, trying without...');
      url = `${STRAPI_URL}/api/homepage?populate[hero][populate]=stats`;
      response = await fetch(url);
    }

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Homepage not found');
      setCache(cacheKey, null);
      return null;
    }

    const json = await response.json();
    const homepage = json.data || null;

    setCache(cacheKey, homepage);
    return homepage;
  } catch (error) {
    console.error('Error fetching homepage:', error);
    return null;
  }
}

// Format date for display
export function formatDate(dateString: string, lang: string = 'en'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// About Page types
export interface AboutStat {
  id: number;
  icon: string;
  value: string;
  label: string;
}

export interface AboutLeader {
  id: number;
  name: string;
  position: string;
  photo?: StrapiImage;
}

export interface AboutPage {
  heading?: string;
  headingHighlight?: string;
  headingEnd?: string;
  description1?: string;
  description2?: string;
  buttonText?: string;
  stats?: AboutStat[];
  leadershipTitle?: string;
  leaders?: AboutLeader[];
  metaTitle?: string;
  metaDescription?: string;
}

// Fetch about page content by locale
export async function getAboutPage(lang: SupportedLocale = 'en'): Promise<AboutPage | null> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `about-page:${locale}`;

  const cached = getCached<AboutPage | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching about page for locale: ${locale}`);

    // Fetch about-page single type with nested components
    let url = `${STRAPI_URL}/api/about-page?populate[stats]=*&populate[leaders][populate]=photo&locale=${locale}`;

    let response = await fetch(url);

    if (!response.ok) {
      // Try without locale (backward compatible)
      if (isDev) console.log('[Strapi API] About page not found with locale, trying without...');
      url = `${STRAPI_URL}/api/about-page?populate[stats]=*&populate[leaders][populate]=photo`;
      response = await fetch(url);
    }

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] About page not found');
      setCache(cacheKey, null);
      return null;
    }

    const json = await response.json();
    const aboutPage = json.data || null;

    setCache(cacheKey, aboutPage);
    return aboutPage;
  } catch (error) {
    console.error('Error fetching about page:', error);
    return null;
  }
}

// Industries Page types
export interface IndustryCard {
  id: number;
  icon: string;
  title: string;
  description: string;
}

export interface IndustriesPage {
  heading?: string;
  description?: string;
  industries?: IndustryCard[];
  metaTitle?: string;
  metaDescription?: string;
}

// Fetch industries page content by locale
export async function getIndustriesPage(lang: SupportedLocale = 'en'): Promise<IndustriesPage | null> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `industries-page:${locale}`;

  const cached = getCached<IndustriesPage | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching industries page for locale: ${locale}`);

    let url = `${STRAPI_URL}/api/industries-page?populate[industries]=*&locale=${locale}`;

    let response = await fetch(url);

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Industries page not found with locale, trying without...');
      url = `${STRAPI_URL}/api/industries-page?populate[industries]=*`;
      response = await fetch(url);
    }

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Industries page not found');
      setCache(cacheKey, null);
      return null;
    }

    const json = await response.json();
    const industriesPage = json.data || null;

    setCache(cacheKey, industriesPage);
    return industriesPage;
  } catch (error) {
    console.error('Error fetching industries page:', error);
    return null;
  }
}

// Case Study types
export interface ResultMetric {
  id: number;
  icon: string;
  metric: string;
  label: string;
}

export interface CaseStudy {
  id: number;
  title: string;
  slug: string;
  industry: string;
  challenge: string;
  solution: string;
  results: ResultMetric[];
  order?: number;
  featured?: boolean;
}

export interface CaseStudiesPage {
  heading?: string;
  description?: string;
  challengeLabel?: string;
  solutionLabel?: string;
  resultsLabel?: string;
  ctaText?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// Fetch all case studies by locale
export async function getCaseStudies(lang: SupportedLocale = 'en'): Promise<CaseStudy[]> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `case-studies:${locale}`;

  const cached = getCached<CaseStudy[]>(cacheKey);
  if (cached) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching case studies for locale: ${locale}`);

    let url = `${STRAPI_URL}/api/case-studies?populate[results]=*&sort=order:asc&locale=${locale}`;

    let response = await fetch(url);

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Case studies not found with locale, trying without...');
      url = `${STRAPI_URL}/api/case-studies?populate[results]=*&sort=order:asc`;
      response = await fetch(url);
    }

    if (!response.ok) {
      console.error('Failed to fetch case studies:', response.status);
      return [];
    }

    const json: StrapiResponse<CaseStudy[]> = await response.json();
    const caseStudies = json.data || [];

    setCache(cacheKey, caseStudies);
    return caseStudies;
  } catch (error) {
    console.error('Error fetching case studies:', error);
    return [];
  }
}

// Fetch case studies page settings by locale
export async function getCaseStudiesPage(lang: SupportedLocale = 'en'): Promise<CaseStudiesPage | null> {
  const locale = getStrapiLocale(lang);
  const cacheKey = `case-studies-page:${locale}`;

  const cached = getCached<CaseStudiesPage | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    if (isDev) console.log(`[Strapi API] Fetching case studies page for locale: ${locale}`);

    let url = `${STRAPI_URL}/api/case-studies-page?locale=${locale}`;

    let response = await fetch(url);

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Case studies page not found with locale, trying without...');
      url = `${STRAPI_URL}/api/case-studies-page`;
      response = await fetch(url);
    }

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Case studies page not found');
      setCache(cacheKey, null);
      return null;
    }

    const json = await response.json();
    const pageSettings = json.data || null;

    setCache(cacheKey, pageSettings);
    return pageSettings;
  } catch (error) {
    console.error('Error fetching case studies page:', error);
    return null;
  }
}

// Form Config types
export interface FormOption {
  id: number;
  name_en: string;
  name_es: string;
  value: string;
  enabled: boolean;
}

export interface FormConfig {
  industries: FormOption[];
  services: FormOption[];
}

// Fetch form configuration (industries and services dropdowns)
export async function getFormConfig(): Promise<FormConfig> {
  const cacheKey = 'form-config';

  const cached = getCached<FormConfig>(cacheKey);
  if (cached) return cached;

  // Default fallback values
  const defaultConfig: FormConfig = {
    industries: [
      { id: 1, name_en: 'Healthcare', name_es: 'Salud', value: 'healthcare', enabled: true },
      { id: 2, name_en: 'E-Commerce', name_es: 'Comercio Electrónico', value: 'ecommerce', enabled: true },
      { id: 3, name_en: 'Technology', name_es: 'Tecnología', value: 'technology', enabled: true },
      { id: 4, name_en: 'Finance', name_es: 'Finanzas', value: 'finance', enabled: true },
      { id: 5, name_en: 'Travel & Hospitality', name_es: 'Viajes y Hospitalidad', value: 'travel', enabled: true },
    ],
    services: [
      { id: 1, name_en: 'Customer Service', name_es: 'Servicio al Cliente', value: 'customer-service', enabled: true },
      { id: 2, name_en: 'Back Office Support', name_es: 'Soporte Back Office', value: 'back-office', enabled: true },
      { id: 3, name_en: 'Multilingual Support', name_es: 'Soporte Multilingüe', value: 'multilingual', enabled: true },
      { id: 4, name_en: 'Tech Support', name_es: 'Soporte Técnico', value: 'tech-support', enabled: true },
    ],
  };

  try {
    if (isDev) console.log('[Strapi API] Fetching form config');

    const url = `${STRAPI_URL}/api/form-config?populate=*`;
    const response = await fetch(url);

    if (!response.ok) {
      if (isDev) console.log('[Strapi API] Form config not found, using defaults');
      setCache(cacheKey, defaultConfig);
      return defaultConfig;
    }

    const json = await response.json();
    const data = json.data;

    if (!data) {
      setCache(cacheKey, defaultConfig);
      return defaultConfig;
    }

    const formConfig: FormConfig = {
      industries: (data.industries || []).filter((i: FormOption) => i.enabled),
      services: (data.services || []).filter((s: FormOption) => s.enabled),
    };

    // Use defaults if empty
    if (formConfig.industries.length === 0) formConfig.industries = defaultConfig.industries;
    if (formConfig.services.length === 0) formConfig.services = defaultConfig.services;

    setCache(cacheKey, formConfig);
    return formConfig;
  } catch (error) {
    console.error('Error fetching form config:', error);
    return defaultConfig;
  }
}
