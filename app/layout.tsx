import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card AI India",
  description: "Find the right Indian credit card. Ask in plain English, compare by use case, grounded in verified card data."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                <CreditCard size={20} />
              </span>
              <span>Card AI India</span>
            </Link>
            <nav className="nav" aria-label="Primary navigation">
              <Link href="/ask">Ask</Link>
              <Link href="/finder">Finder</Link>
              <Link href="/compare">Compare</Link>
              <Link href="/recommend">Recommend</Link>
            </nav>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <p>Not financial advice. Card details are manually verified and may not reflect the latest issuer changes. Verify terms directly with the issuer before applying.</p>
            <p>Apply links may be affiliate links. We may earn a commission if you apply and are approved.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
