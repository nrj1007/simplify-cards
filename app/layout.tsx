import type { Metadata, Route } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { comparisonTitle, INDEXABLE_SEO_COMPARISONS } from "@/lib/seo-comparisons";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { NavigationProgressProvider } from "./ui/NavigationProgress";
import "./globals.css";

const POPULAR_GUIDES: Array<{ label: string; href: Route }> = [
  { label: "Best credit cards", href: "/best-credit-cards-india" as Route },
  { label: "Best cashback cards", href: "/best-cashback-credit-cards-india" as Route },
  { label: "Best travel cards", href: "/best-travel-credit-cards-india" as Route },
  { label: "Best lounge cards", href: "/best-lounge-access-credit-cards-india" as Route },
  { label: "Best lifetime-free cards", href: "/best-lifetime-free-credit-cards-india" as Route },
  { label: "Best fuel cards", href: "/best-fuel-credit-cards-india" as Route },
  { label: "Best RuPay cards", href: "/best-rupay-credit-cards-india" as Route },
  { label: "Best premium cards", href: "/best-premium-credit-cards-india" as Route },
  { label: "Online shopping cards", href: "/best-credit-cards-for-online-shopping" as Route },
  { label: "Beginner credit cards", href: "/best-credit-cards-for-beginners-india" as Route }
];

const POPULAR_COMPARISONS: Array<{ label: string; href: Route }> = INDEXABLE_SEO_COMPARISONS.slice(0, 5).map((comparison) => ({
  label: comparisonTitle(comparison),
  href: `/compare/${comparison.slug}` as Route
}));

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
                <div className="footer-brand-block">
                  <Link className="brand" href="/" aria-label="SimplifyCards home">
                    <span className="brand-icon" aria-hidden="true">
                      <CreditCard size={20} />
                    </span>
                    <span>SimplifyCards</span>
                  </Link>
                  <p className="footer-summary">
                    <strong>Not financial advice.</strong> Card details are manually verified and may not reflect the latest issuer
                    changes. Verify terms directly with the issuer before applying.
                  </p>
                  <p className="footer-summary">Apply links may be affiliate links. We may earn a commission if you apply and are approved.</p>
                </div>
                <nav className="footer-links" aria-label="Footer navigation">
                  <section className="footer-link-group" aria-labelledby="footer-product">
                    <h2 id="footer-product">Product</h2>
                    <Link href={"/about" as Route}>About / Contact</Link>
                    <Link href="/ask">Ask</Link>
                    <Link href="/recommend">Recommend</Link>
                    <Link href="/compare">Compare</Link>
                  </section>
                  <section className="footer-link-group" aria-labelledby="footer-guides">
                    <h2 id="footer-guides">Popular guides</h2>
                    {POPULAR_GUIDES.slice(0, 6).map((guide) => (
                      <Link key={guide.href} href={guide.href}>
                        {guide.label}
                      </Link>
                    ))}
                  </section>
                  <section className="footer-link-group" aria-labelledby="footer-comparisons">
                    <h2 id="footer-comparisons">Popular comparisons</h2>
                    {POPULAR_COMPARISONS.slice(0, 4).map((comparison) => (
                      <Link key={comparison.href} href={comparison.href}>
                        {comparison.label}
                      </Link>
                    ))}
                  </section>
                </nav>
              </div>
            </footer>
          </div>
        </NavigationProgressProvider>
      </body>
    </html>
  );
}
