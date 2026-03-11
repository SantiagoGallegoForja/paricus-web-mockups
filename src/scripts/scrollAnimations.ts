/**
 * Unified Scroll Animation System
 * Single bidirectional IntersectionObserver for all designs.
 */

let observer: IntersectionObserver | null = null;
let parallaxElements: HTMLElement[] = [];
let rafId: number | null = null;
const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches;

/** Create or recreate the IntersectionObserver */
function createObserver(): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('sa-visible');
          entry.target.classList.remove('sa-hidden');
        } else {
          entry.target.classList.remove('sa-visible');
          entry.target.classList.add('sa-hidden');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
}

/** Apply stagger delays from data-sa-delay */
function applyDelays(el: Element) {
  const delay = (el as HTMLElement).dataset.saDelay;
  if (delay) {
    (el as HTMLElement).style.setProperty('--sa-delay', `${delay}ms`);
  }
}

/** Lightweight parallax on scroll (desktop only) */
function startParallax() {
  if (!isDesktop) return;
  if (rafId !== null) cancelAnimationFrame(rafId);

  function onScroll() {
    const scrollY = window.scrollY;
    for (const el of parallaxElements) {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewCenter = window.innerHeight / 2;
      const offset = ((center - viewCenter) / window.innerHeight) * 30;
      el.style.transform = `translateY(${offset}px)`;
    }
    rafId = requestAnimationFrame(onScroll);
  }

  rafId = requestAnimationFrame(onScroll);
}

function stopParallax() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/** Initialize or re-initialize all scroll animations */
export function reinit() {
  // Disconnect old observer
  if (observer) observer.disconnect();
  stopParallax();

  observer = createObserver();

  // Query all [data-sa] elements
  const elements = document.querySelectorAll<HTMLElement>('[data-sa]');

  elements.forEach((el) => {
    // Add the animation type class
    const type = el.dataset.sa;
    if (type) {
      el.classList.add(`sa-${type}`);
    }

    // Apply stagger delay
    applyDelays(el);

    // Check if element is currently in viewport
    const rect = el.getBoundingClientRect();
    const inViewport =
      rect.top < window.innerHeight + 40 &&
      rect.bottom > -40;

    if (inViewport) {
      // Already visible — animate in immediately
      el.classList.add('sa-visible');
      el.classList.remove('sa-hidden');
    } else {
      // Hidden — will animate when scrolled into view
      el.classList.add('sa-hidden');
      el.classList.remove('sa-visible');
    }

    observer!.observe(el);
  });

  // Parallax elements
  parallaxElements = Array.from(document.querySelectorAll<HTMLElement>('.sa-parallax'));
  if (parallaxElements.length > 0) {
    startParallax();
  }
}

/** Listen for reinit event (dispatched by DesignSwitcher) */
window.addEventListener('sa:reinit', () => reinit());

/** Auto-init on load */
function init() {
  reinit();
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Run on Astro page navigation
document.addEventListener('astro:page-load', init);
