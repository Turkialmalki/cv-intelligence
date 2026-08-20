import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

import { LocaleProvider } from "@/lib/i18n/context";
import { getAppUrl } from "@/lib/appUrl";

import "./globals.css";

/**
 * Fonts are self-hosted at build time by next/font rather than linked from
 * Google's CDN: it removes a render-blocking third-party request, avoids the
 * layout shift a late-arriving webfont causes, and keeps visitors' IPs from
 * being sent to a font host.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "CV Intelligence — Know what is holding your CV back",
    template: "%s · CV Intelligence",
  },
  description:
    "Upload your CV and get an explainable ATS readiness score out of 100, with the exact issues holding it back and how to fix them.",
  openGraph: {
    type: "website",
    title: "Know what is holding your CV back.",
    description:
      "See your CV the way screening software and recruiters see it — with the exact issues, and exactly how to fix them.",
    siteName: "CV Intelligence",
  },
  twitter: {
    card: "summary_large_image",
    title: "Know what is holding your CV back.",
    description:
      "An explainable ATS readiness score, in about a minute. No account needed.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom must stay available; disabling it is an accessibility failure.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // lang/dir are set here for the first paint and then kept in sync with
    // the chosen locale by LocaleProvider.
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${plexArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Applies the stored language before first paint.

          The locale lives in localStorage, so the server cannot know it and
          every page would otherwise render left-to-right and then flip once
          React hydrates. For an Arabic reader that flash is the first thing
          they see. This runs synchronously in <head>, ahead of any paint.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('cv-intelligence.locale');if(!l&&navigator.language&&navigator.language.toLowerCase().indexOf('ar')===0){l='ar';}if(l==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl';}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
