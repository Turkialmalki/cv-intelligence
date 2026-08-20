import type { Metadata, Viewport } from "next";

import { LocaleProvider } from "@/lib/i18n/context";
import { getAppUrl } from "@/lib/appUrl";

import "./globals.css";

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
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
