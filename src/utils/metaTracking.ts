import { hasMarketingConsent } from './consent';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function getFbp(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? match[1] : null;
}

export function getFbc(): string | null {
  if (typeof document === 'undefined') return null;
  const cookieMatch = document.cookie.match(/_fbc=([^;]+)/);
  if (cookieMatch) return cookieMatch[1];
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid');
  if (fbclid) {
    return `fb.1.${Date.now()}.${fbclid}`;
  }
  return null;
}

export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function persistFbclid(): void {
  if (typeof window === 'undefined') return;
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid');
  if (fbclid) {
    localStorage.setItem('modogestor_fbclid', fbclid);
    localStorage.setItem('modogestor_fbclid_time', Date.now().toString());
  }
}

export function getPersistedFbc(): string | null {
  const fbclid = localStorage.getItem('modogestor_fbclid');
  const time = localStorage.getItem('modogestor_fbclid_time');
  if (fbclid && time) {
    return `fb.1.${time}.${fbclid}`;
  }
  return getFbc();
}

interface TrackEventOptions {
  pixelOnly?: boolean;
  capiOnly?: boolean;
}

export async function trackEvent(
  eventName: string,
  customData: Record<string, any> = {},
  userData: Record<string, any> = {},
  options: TrackEventOptions = {}
): Promise<string> {
  const eventId = generateEventId();
  const { pixelOnly = false, capiOnly = false } = options;

  // 1. Pixel (browser-side)
  if (!capiOnly && typeof window !== 'undefined' && (window as any).fbq && hasMarketingConsent()) {
    (window as any).fbq('track', eventName, customData, { eventID: eventId });
  }

  // 2. CAPI (server-side via Edge Function)
  if (!pixelOnly && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/meta-capi-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          event_name: eventName,
          event_id: eventId,
          event_source_url: window.location.href,
          user_agent: navigator.userAgent,
          fbp: getFbp(),
          fbc: getPersistedFbc(),
          user_data: userData,
          custom_data: customData,
        }),
      });
    } catch (err) {
      console.warn('[META-CAPI] Event send failed (non-blocking):', err);
    }
  }

  return eventId;
}
