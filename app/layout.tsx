import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card AI India",
  description: "A lean Indian credit-card finder and AI assistant MVP."
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
              <Link href="/finder">Finder</Link>
              <Link href="/compare">Compare</Link>
              <a href="/review/questions">Review</a>
              <a href="/review/inbox">Inbox</a>
              <a href="/review/community">Signals</a>
              <Link href="/cards/sbi-cashback">Sample Card</Link>
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
