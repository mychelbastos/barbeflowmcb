import { useEffect, useRef } from 'react';

/**
 * Dynamically sets favicon, apple-touch-icon, page title,
 * apple-mobile-web-app-title, and PWA manifest based on tenant data.
 *
 * Strategy:
 * - The static Vite PWA manifest is disabled (manifest: false in vite.config.ts)
 *   so iOS/Android never reads a stale "modoGESTOR" name or start_url: "/".
 * - This hook is the ONLY source of the manifest on public booking pages.
 * - On iOS, apple-mobile-web-app-title is set dynamically for the app name.
 * - On Chrome/Android, the blob-URL manifest provides name + start_url.
 */
export function useTenantBranding(tenant: { name?: string; logo_url?: string } | null) {
  const dynamicManifestRef = useRef<HTMLLinkElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const originalsRef = useRef<{
    favicon: string;
    appleTouch: string;
    title: string;
    appleTitle: string;
  } | null>(null);

  useEffect(() => {
    if (!tenant) return;

    const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const appleTouchLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const appleWebAppTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');

    // Save originals once
    if (!originalsRef.current) {
      originalsRef.current = {
        favicon: faviconLink?.href || '',
        appleTouch: appleTouchLink?.href || '',
        title: document.title,
        appleTitle: appleWebAppTitle?.content || '',
      };
    }

    // --- Update favicon & icons ---
    if (tenant.logo_url) {
      if (faviconLink) faviconLink.href = tenant.logo_url;
      if (appleTouchLink) appleTouchLink.href = tenant.logo_url;
    }

    // --- Update titles (critical for iOS PWA name) ---
    const appName = tenant.name || 'Agendamento';
    document.title = `${appName} — Agendamento Online`;
    if (appleWebAppTitle) appleWebAppTitle.content = appName;

    // --- Dynamic PWA Manifest ---
    // Clean up previous
    if (dynamicManifestRef.current) dynamicManifestRef.current.remove();
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

    // Also remove any lingering static manifests (safety net)
    document.querySelectorAll('link[rel="manifest"]').forEach((el) => el.remove());

    const manifestData = {
      name: appName,
      short_name: appName.substring(0, 12),
      description: `Agende online com ${appName}`,
      start_url: window.location.pathname,
      scope: '/',
      display: 'standalone',
      background_color: '#0f0f11',
      theme_color: '#FFC300',
      orientation: 'portrait-primary',
      icons: tenant.logo_url
        ? [
            { src: tenant.logo_url, sizes: '192x192', type: 'image/png' },
            { src: tenant.logo_url, sizes: '512x512', type: 'image/png' },
            { src: tenant.logo_url, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ]
        : [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
    };

    const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
    dynamicManifestRef.current = link;

    return () => {
      const orig = originalsRef.current;
      if (orig) {
        if (faviconLink) faviconLink.href = orig.favicon;
        if (appleTouchLink) appleTouchLink.href = orig.appleTouch;
        document.title = orig.title;
        if (appleWebAppTitle) appleWebAppTitle.content = orig.appleTitle;
      }
      if (dynamicManifestRef.current) {
        dynamicManifestRef.current.remove();
        dynamicManifestRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [tenant?.name, tenant?.logo_url]);
}
