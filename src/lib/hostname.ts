/**
 * Hostname-based routing configuration
 * 
 * barberflow.store → public pages (landing, booking, payment)
 * app.barberflow.store → dashboard (login, register, dashboard, etc.)
 * 
 * On the dashboard domain, routes drop the /app prefix:
 *   /app/login → /login
 *   /app/dashboard → /dashboard
 * 
 * In development/preview, all routes use the /app prefix.
 */

const DASHBOARD_HOSTS = ['app.barberflow.store', 'app.modogestor.com.br'];
const PUBLIC_HOSTS = ['barberflow.store', 'modogestor.com.br'];

export function isDashboardDomain(): boolean {
  const host = window.location.hostname;
  return DASHBOARD_HOSTS.includes(host);
}

export function isPublicDomain(): boolean {
  const host = window.location.hostname;
  return PUBLIC_HOSTS.includes(host) || PUBLIC_HOSTS.some(h => host === `www.${h}`);
}

export function isPreviewOrLocal(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host.includes('lovable.app') || host.includes('lovableproject.com') || host.includes('127.0.0.1');
}

/**
 * Resolves a dashboard path based on the current hostname.
 * On app.barberflow.store: /app/dashboard → /dashboard
 * On preview/local: /app/dashboard → /app/dashboard (unchanged)
 */
export function dashPath(path: string): string {
  if (isDashboardDomain()) {
    return path.replace(/^\/app/, '');
  }
  return path;
}

/** Returns the full URL for the dashboard domain */
export function getDashboardUrl(path = ''): string {
  if (isPreviewOrLocal()) return path || '/app/login';
  const cleanPath = path.replace(/^\/app/, '') || '/login';
  return `https://${DASHBOARD_HOSTS[0]}${cleanPath}`;
}

/** Returns the full URL for the public domain */
export function getPublicUrl(path = ''): string {
  if (isPreviewOrLocal()) return path || '/';
  return `https://${PUBLIC_HOSTS[0]}${path}`;
}