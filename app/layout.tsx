import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { NavigationProgressProvider } from "./ui/NavigationProgress";
import { SiteFooter, SiteHeader } from "./ui/SiteChrome";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NavigationProgressProvider>
          <div className="app-shell">
            <SiteHeader />
            <div className="sc-nav-spacer site-header-spacer" aria-hidden="true" />
            <main className="main">{children}</main>
            <SiteFooter />
          </div>
        </NavigationProgressProvider>
        <Analytics />
      </body>
    </html>
  );
}
