import { useEffect, useRef } from 'react';

/**
 * Dynamically updates the page favicon, apple-touch-icon,
 * PWA manifest, page title, and meta tags based on tenant data.
 * 
 * Strategy:
 * 1. On mount: immediately remove the static Vite PWA manifest
 *    (which has start_url: "/" and name: "modoGESTOR") so the browser
 *    never reads it on public booking pages.
 * 2. When tenant data arrives: inject dynamic manifest + update meta tags.
 * 3. On unmount: restore everything.
 */
export function useTenantBranding(tenant: { name?: string; logo_url?: string; cover_url?: string } | null) {
  const removedManifestsRef = useRef<HTMLLinkElement[]>([]);
  const dynamicManifestRef = useRef<HTMLLinkElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Step 1: Immediately remove static manifest on mount (before tenant loads)
  // This prevents the browser/iOS from reading start_url: "/" from the static manifest
  useEffect(() => {
    const staticManifests = document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]');
    staticManifests.forEach((el) => {
      removedManifestsRef.current.push(el);
      el.remove();
    });

    return () => {
      // Restore static manifests when leaving the public page
      removedManifestsRef.current.forEach((el) => {
        document.head.appendChild(el);
      });
      removedManifestsRef.current = [];

      // Clean up dynamic manifest
      if (dynamicManifestRef.current) {
        dynamicManifestRef.current.remove();
        dynamicManifestRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Step 2: When tenant data arrives, update everything
  useEffect(() => {
    if (!tenant) return;

    // --- Favicon & Apple Touch Icon ---
    const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const appleTouchLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const appleWebAppTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');

    const originalFavicon = faviconLink?.href || '';
    const originalAppleTouch = appleTouchLink?.href || '';
    const originalTitle = document.title;
    const originalAppleTitle = appleWebAppTitle?.content || '';

    if (tenant.logo_url) {
      if (faviconLink) faviconLink.href = tenant.logo_url;
      if (appleTouchLink) appleTouchLink.href = tenant.logo_url;
    }

    if (tenant.name) {
      document.title = `${tenant.name} — Agendamento Online`;
      if (appleWebAppTitle) {
        appleWebAppTitle.content = tenant.name;
      }
    }

    // --- Dynamic PWA Manifest ---
    // Clean up previous dynamic manifest if any
    if (dynamicManifestRef.current) {
      dynamicManifestRef.current.remove();
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    const currentPath = window.location.pathname;
    const manifestData = {
      name: tenant.name || 'Agendamento',
      short_name: (tenant.name || 'Agendamento').substring(0, 12),
      description: `Agende online com ${tenant.name || 'nosso estabelecimento'}`,
      start_url: currentPath,
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
    const manifestUrl = URL.createObjectURL(blob);
    blobUrlRef.current = manifestUrl;

    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = manifestUrl;
    document.head.appendChild(manifestLink);
    dynamicManifestRef.current = manifestLink;

    return () => {
      // Restore originals
      if (faviconLink && originalFavicon) faviconLink.href = originalFavicon;
      if (appleTouchLink && originalAppleTouch) appleTouchLink.href = originalAppleTouch;
      document.title = originalTitle;
      if (appleWebAppTitle && originalAppleTitle) appleWebAppTitle.content = originalAppleTitle;
    };
  }, [tenant?.name, tenant?.logo_url]);
}
