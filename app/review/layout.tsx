import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav aria-label="Review sections" className="review-section-nav">
        <div className="container">
          <Link href={"/review/questions" as Route}>Questions</Link>
          <Link href={"/review/feedback" as Route}>Feedback</Link>
          <Link href={"/review/subscriptions" as Route}>Subscriptions</Link>
          <Link href={"/review/analytics" as Route}>Analytics</Link>
          <Link href={"/review/community" as Route}>Community</Link>
          <Link href={"/review/inbox" as Route}>Inbox</Link>
        </div>
      </nav>
      {children}
    </>
  );
}
