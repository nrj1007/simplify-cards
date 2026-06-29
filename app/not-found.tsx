import Link from "next/link";
import PageHero from "@/app/ui/PageHero";

export const metadata = {
  title: "Page Not Found - SimplifyCards",
  description: "The page you are looking for does not exist on SimplifyCards.",
};

export default function NotFound() {
  return (
    <div className="page-shell not-found-page">
      <PageHero
        eyebrow="404 Error"
        title="We couldn't find that page."
        lead="The page you are looking for might have been moved, deleted, or doesn't exist."
      >
        <div className="about-hero-actions">
          <Link className="btn btn-primary" href="/">
            Go to Home
          </Link>
          <Link className="btn btn-ghost" href="/ask">
            Ask AI
          </Link>
          <Link className="btn btn-ghost" href="/finder">
            Browse Cards
          </Link>
        </div>
      </PageHero>

      <div className="page-content">
        <div className="container message-page-container">
          <div className="panel message-page-panel">
            <h2>Looking for something else?</h2>
            <p className="message-page-text">
              SimplifyCards helps you compare credit cards using verified data. You can find cards suited for your spend profile using our interactive recommendation engine or ask general credit card questions.
            </p>
            <div className="message-page-links">
              <Link href="/recommend" className="text-link">Spend Recommender</Link>
              <span>•</span>
              <Link href="/calculator" className="text-link">Rewards Calculator</Link>
              <span>•</span>
              <Link href="/compare" className="text-link">Compare Cards</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
