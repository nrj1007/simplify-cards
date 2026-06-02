import type { Metadata, Route } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "myCards",
  description: "Find the right Indian credit card. Ask, compare by use case, grounded in verified card data."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="navbar">
            <div className="container nav-inner">
              <Link className="brand" href="/" aria-label="myCards home">
                <span className="brand-icon" aria-hidden="true">
                  <CreditCard size={20} />
                </span>
                <span>myCards</span>
              </Link>
              <nav className="nav-links" aria-label="Primary navigation">
                <Link href="/ask">Ask</Link>
                <Link href="/recommend">Recommend</Link>
                <Link href={"/calculator" as Route}>Calculator</Link>
                <Link href="/#examples">Questions</Link>
                <Link href="/#cards">Cards</Link>
                <Link href="/compare">Compare</Link>
              </nav>
              <Link className="nav-cta" href="/ask">
                Ask myCards
              </Link>
            </div>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <div className="container footer-grid">
              <div>
                <Link className="brand" href="/" aria-label="myCards home">
                  <span className="brand-icon" aria-hidden="true">
                    <CreditCard size={20} />
                  </span>
                  <span>myCards</span>
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
      </body>
    </html>
  );
}
