import { useEffect } from 'react';

/**
 * Dynamically updates the page favicon, apple-touch-icon,
 * PWA manifest, page title, and theme-color based on tenant data.
 * When the component unmounts, the originals are restored.
 */
export function useTenantBranding(tenant: { name?: string; logo_url?: string; cover_url?: string } | null) {
  useEffect(() => {
    if (!tenant) return;

    // --- Favicon ---
    const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const appleTouchLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const titleEl = document.querySelector('title');
    const appleWebAppTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');

    const originalFavicon = faviconLink?.href || '';
    const originalAppleTouch = appleTouchLink?.href || '';
    const originalTitle = titleEl?.textContent || '';
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
    const manifestData = {
      name: tenant.name || 'Agendamento',
      short_name: tenant.name || 'Agendamento',
      description: `Agende online com ${tenant.name || 'nosso estabelecimento'}`,
      start_url: window.location.pathname + window.location.search,
      scope: window.location.pathname,
      display: 'standalone' as const,
      background_color: '#0f0f11',
      theme_color: '#FFC300',
      orientation: 'portrait-primary' as const,
      icons: tenant.logo_url
        ? [
            { src: tenant.logo_url, sizes: '192x192', type: 'image/png' },
            { src: tenant.logo_url, sizes: '512x512', type: 'image/png' },
            { src: tenant.logo_url, sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
          ]
        : [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
    };

    const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);

    // Remove existing manifest links and add the dynamic one
    const existingManifests = document.querySelectorAll('link[rel="manifest"]');
    existingManifests.forEach((el) => el.remove());

    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = manifestUrl;
    document.head.appendChild(manifestLink);

    return () => {
      // Restore originals
      if (faviconLink && originalFavicon) faviconLink.href = originalFavicon;
      if (appleTouchLink && originalAppleTouch) appleTouchLink.href = originalAppleTouch;
      if (titleEl && originalTitle) document.title = originalTitle;
      if (appleWebAppTitle && originalAppleTitle) appleWebAppTitle.content = originalAppleTitle;
      
      // Clean up dynamic manifest
      manifestLink.remove();
      URL.revokeObjectURL(manifestUrl);
    };
  }, [tenant?.name, tenant?.logo_url]);
}
