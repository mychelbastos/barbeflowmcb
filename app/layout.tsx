import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FFC300",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.modogestor.com.br"),
  title: {
    default: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
    template: "%s | modoGESTOR",
  },
  description:
    "Plataforma completa de gestão e agendamento online para profissionais de serviços. Clientes agendam sem cadastro, você gerencia tudo em um só lugar.",
  authors: [{ name: "modoGESTOR" }],
  creator: "modoGESTOR",
  publisher: "modoGESTOR",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.modogestor.com.br",
    siteName: "modoGESTOR",
    title: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
    description:
      "Plataforma completa de gestão e agendamento online para profissionais de serviços. Clientes agendam sem cadastro, você gerencia tudo em um só lugar.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@modogestor",
    creator: "@modogestor",
    title: "modoGESTOR - Sistema de Gestão para Profissionais de Serviços",
    description:
      "Plataforma completa de gestão e agendamento online para profissionais de serviços.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "modoGESTOR",
  },
  alternates: {
    canonical: "https://www.modogestor.com.br",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        {/* Meta Pixel Code (consent-controlled) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent','revoke');`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1215198763828492&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </head>
      <body>{children}</body>
    </html>
  );
}
