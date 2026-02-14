/**
 * Google Analytics tracking utilities
 * 
 * Usage:
 * - trackEvent('button_click', { button_name: 'get_started' })
 * - trackPageView('/pricing')
 * - trackConversion('signup')
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
    console.log('[Analytics] Event tracked:', eventName, parameters);
  }
}

/**
 * Track a page view
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
    console.log('[Analytics] Page view tracked:', path);
  }
}

/**
 * Track a conversion event
 */
export function trackConversion(conversionType: 'signup' | 'login' | 'subscription' | 'lead_discovery') {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      conversion_type: conversionType,
    });
    console.log('[Analytics] Conversion tracked:', conversionType);
  }
}

/**
 * Track button clicks
 */
export function trackButtonClick(buttonName: string, location?: string) {
  trackEvent('button_click', {
    button_name: buttonName,
    location: location || window.location.pathname,
  });
}

/**
 * Track link clicks
 */
export function trackLinkClick(linkText: string, linkUrl: string) {
  trackEvent('link_click', {
    link_text: linkText,
    link_url: linkUrl,
  });
}
