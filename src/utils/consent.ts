const CONSENT_KEY = 'modogestor_consent_marketing';
const PIXEL_ID = '1215198763828492';

export function hasMarketingConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'granted';
}

export function getConsentStatus(): 'granted' | 'denied' | null {
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === 'granted' || value === 'denied') return value;
  return null;
}

export function grantMarketingConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'granted');
  initializePixel();
}

export function revokeMarketingConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'denied');
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('consent', 'revoke');
  }
}

export function initializePixel(): void {
  if (typeof window === 'undefined') return;
  const fbq = (window as any).fbq;
  if (!fbq) return;
  fbq('consent', 'grant');
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
}

export function checkConsentOnLoad(): void {
  if (hasMarketingConsent()) {
    initializePixel();
  }
}
