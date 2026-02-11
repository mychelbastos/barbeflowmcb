/**
 * Hostname-based routing configuration
 * 
 * barberflow.store → public pages (landing, booking, payment)
 * app.barberflow.store → dashboard (login, register, /app/*)
 * 
 * In development/preview, all routes are available.
 */

const DASHBOARD_HOST = 'app.barberflow.store';
const PUBLIC_HOST = 'barberflow.store';

export function isDashboardDomain(): boolean {
  const host = window.location.hostname;
  return host === DASHBOARD_HOST;
}

export function isPublicDomain(): boolean {
  const host = window.location.hostname;
  return host === PUBLIC_HOST || host === `www.${PUBLIC_HOST}`;
}

export function isPreviewOrLocal(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host.includes('lovable.app') || host.includes('127.0.0.1');
}

/** Returns the full URL for the dashboard domain */
export function getDashboardUrl(path = ''): string {
  if (isPreviewOrLocal()) return path || '/app/login';
  return `https://${DASHBOARD_HOST}${path}`;
}

/** Returns the full URL for the public domain */
export function getPublicUrl(path = ''): string {
  if (isPreviewOrLocal()) return path || '/';
  return `https://${PUBLIC_HOST}${path}`;
}
