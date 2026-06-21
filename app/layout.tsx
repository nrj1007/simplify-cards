import type { Metadata, Route } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { NavigationProgressProvider } from "./ui/NavigationProgress";
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
            <header className="navbar">
              <div className="container nav-inner">
                <Link className="brand" href="/" aria-label="SimplifyCards home">
                  <span className="brand-icon" aria-hidden="true">
                    <CreditCard size={20} />
                  </span>
                  <span>SimplifyCards</span>
                </Link>
                <nav className="nav-links" aria-label="Primary navigation">
                  <Link href="/ask">Ask</Link>
                  <Link href="/recommend">Recommend</Link>
                  <Link href={"/calculator" as Route}>Calculator</Link>
                  <Link href="/#cards">Cards</Link>
                  <Link href="/compare">Compare</Link>
                </nav>
                <Link className="nav-cta" href="/ask">
                  Ask SimplifyCards
                </Link>
              </div>
            </header>
            <main className="main">{children}</main>
            <footer className="footer">
              <div className="container footer-grid">
                <div>
                  <Link className="brand" href="/" aria-label="SimplifyCards home">
                    <span className="brand-icon" aria-hidden="true">
                      <CreditCard size={20} />
                    </span>
                    <span>SimplifyCards</span>
                  </Link>
                </div>
                <div>
                  <p>
                    <strong>Not financial advice.</strong> Card details are manually verified and may not reflect the latest issuer
                    changes. Verify terms directly with the issuer before applying.
                  </p>
                  <p>Apply links may be affiliate links. We may earn a commission if you apply and are approved.</p>
                </div>
              </div>
            </footer>
          </div>
        </NavigationProgressProvider>
      </body>
    </html>
  );
}
