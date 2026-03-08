// ============================================================
// TRACKING MODULE — UTM + Meta Pixel + CAPI + GA4
// ============================================================

import { hasMarketingConsent } from '@/utils/consent';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const META_PIXEL_ID = '1215198763828492';
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your GA4 ID

// ==================== VISITOR ID ====================

function getOrCreateVisitorId(): string {
  const KEY = 'modogestor_visitor_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 'vis_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ==================== UTM CAPTURE ====================

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
}

function captureUTMs(): UTMParams {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    fbclid: params.get('fbclid'),
    gclid: params.get('gclid'),
  };
}

function persistUTMs(utms: UTMParams) {
  if (utms.utm_source || utms.fbclid || utms.gclid) {
    sessionStorage.setItem('modogestor_utms', JSON.stringify(utms));
  }
}

function getPersistedUTMs(): UTMParams | null {
  const raw = sessionStorage.getItem('modogestor_utms');
  return raw ? JSON.parse(raw) : null;
}

function getCurrentUTMs(): UTMParams {
  const fromUrl = captureUTMs();
  if (fromUrl.utm_source || fromUrl.fbclid || fromUrl.gclid) {
    persistUTMs(fromUrl);
    return fromUrl;
  }
  return getPersistedUTMs() || fromUrl;
}

// ==================== COOKIE HELPERS ====================

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function getFbp(): string | null {
  return getCookie('_fbp');
}

export function getFbc(): string | null {
  const cookieFbc = getCookie('_fbc');
  if (cookieFbc) return cookieFbc;

  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    document.cookie = `_fbc=${fbc};max-age=${90 * 24 * 60 * 60};path=/;SameSite=Lax`;
    return fbc;
  }
  return null;
}

// ==================== EVENT ID ====================

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ==================== RECORD VISITOR SESSION ====================

async function recordSession() {
  if (typeof window === 'undefined' || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  const visitorId = getOrCreateVisitorId();
  const utms = getCurrentUTMs();

  const isFirstVisit = !sessionStorage.getItem('modogestor_session_recorded');
  const hasUTMs = utms.utm_source || utms.fbclid || utms.gclid;

  if (!isFirstVisit && !hasUTMs) return;

  sessionStorage.setItem('modogestor_session_recorded', 'true');

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_visitor_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        p_visitor_id: visitorId,
        p_utm_source: utms.utm_source,
        p_utm_medium: utms.utm_medium,
        p_utm_campaign: utms.utm_campaign,
        p_utm_content: utms.utm_content,
        p_utm_term: utms.utm_term,
        p_fbclid: utms.fbclid,
        p_gclid: utms.gclid,
        p_fbp: getFbp(),
        p_fbc: getFbc(),
        p_landing_page: window.location.pathname + window.location.search,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent,
      }),
    });
  } catch (e) {
    console.warn('[TRACKING] Session record failed:', e);
  }
}

// ==================== META PIXEL ====================

function firePixel(eventName: string, eventId: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function' && hasMarketingConsent()) {
    window.fbq('track', eventName, params || {}, { eventID: eventId });
  }
}

// ==================== META CAPI ====================

async function fireCAPI(params: {
  event_name: string;
  event_id: string;
  user_data?: Record<string, any>;
  custom_data?: Record<string, any>;
}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    const utms = getCurrentUTMs();
    await fetch(`${SUPABASE_URL}/functions/v1/meta-capi-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        event_name: params.event_name,
        event_id: params.event_id,
        event_source_url: window.location.href,
        user_agent: navigator.userAgent,
        fbp: getFbp(),
        fbc: getFbc(),
        user_data: params.user_data || {},
        custom_data: {
          ...params.custom_data,
          ...(utms.utm_source && { utm_source: utms.utm_source }),
          ...(utms.utm_campaign && { utm_campaign: utms.utm_campaign }),
        },
      }),
    });
  } catch (e) {
    console.warn('[TRACKING] CAPI failed:', e);
  }
}

// ==================== GA4 ====================

function fireGA4(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

// ==================== UNIFIED TRACK ====================

function trackEvent(
  eventName: string,
  ga4EventName: string,
  userData?: Record<string, any>,
  customData?: Record<string, any>
) {
  const eventId = generateEventId();

  // Meta Pixel (browser, consent-aware)
  firePixel(eventName, eventId, customData);

  // Meta CAPI (server, always fires)
  fireCAPI({ event_name: eventName, event_id: eventId, user_data: userData, custom_data: customData });

  // GA4
  fireGA4(ga4EventName, {
    ...customData,
    event_id: eventId,
    ...getCurrentUTMs(),
  });
}

// ==================== PUBLIC API ====================

/** Initialize tracking on app load — call ONCE */
export function initTracking() {
  if (typeof window === 'undefined') return;

  // Capture fbclid → _fbc cookie
  getFbc();

  // Record visitor session
  recordSession();
}

/** Page view — call on EVERY route change */
export function trackPageView(pagePath?: string) {
  const eventId = generateEventId();

  // Meta Pixel
  if (typeof window !== 'undefined' && typeof window.fbq === 'function' && hasMarketingConsent()) {
    window.fbq('track', 'PageView', {}, { eventID: eventId });
  }

  // GA4
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('config', GA4_MEASUREMENT_ID, {
      page_path: pagePath || window.location.pathname,
    });
  }
}

/** View pricing/plans page */
export function trackViewContent(contentName: string, value?: number) {
  trackEvent('ViewContent', 'view_item', undefined, {
    content_name: contentName,
    content_category: 'plans',
    currency: 'BRL',
    ...(value && { value }),
  });
}

/** Signup completed */
export function trackCompleteRegistration(userData: {
  email: string;
  phone?: string;
  first_name?: string;
  external_id: string;
}) {
  trackEvent('CompleteRegistration', 'sign_up', userData, {
    content_name: 'signup',
    currency: 'BRL',
    value: 0,
    method: 'email',
  });
}

/** Plan selected (InitiateCheckout) */
export function trackInitiateCheckout(planName: string, value: number, userData?: Record<string, any>) {
  trackEvent('InitiateCheckout', 'begin_checkout', userData, {
    content_name: planName,
    content_category: 'subscription',
    currency: 'BRL',
    value,
    items: [{ item_name: planName, price: value, quantity: 1 }],
  });
}

/** Trial started */
export function trackStartTrial(planName: string, value: number, userData?: Record<string, any>) {
  trackEvent('StartTrial', 'start_trial', userData, {
    content_name: planName,
    currency: 'BRL',
    value,
    predicted_ltv: value * 12,
  });
}

/** First real payment */
export function trackPurchase(planName: string, value: number, orderId: string, userData?: Record<string, any>) {
  trackEvent('Purchase', 'purchase', userData, {
    content_name: planName,
    content_category: 'subscription',
    currency: 'BRL',
    value,
    transaction_id: orderId,
    items: [{ item_name: planName, price: value, quantity: 1 }],
  });
}

/** Questionnaire / lead form completed */
export function trackLead(userData?: Record<string, any>) {
  trackEvent('Lead', 'generate_lead', userData, {
    content_name: 'onboarding_questionnaire',
    currency: 'BRL',
    value: 0,
  });
}

/** Get visitor ID for linking at signup */
export function getVisitorId(): string {
  return getOrCreateVisitorId();
}

/** Get current tracking data for passing to signup metadata */
export function getTrackingData(): {
  visitor_id: string;
  fbp: string | null;
  fbc: string | null;
  utms: UTMParams;
} {
  return {
    visitor_id: getOrCreateVisitorId(),
    fbp: getFbp(),
    fbc: getFbc(),
    utms: getCurrentUTMs(),
  };
}
