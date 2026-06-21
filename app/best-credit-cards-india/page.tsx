import type { Metadata } from "next";
import SeoLandingPage from "@/app/ui/SeoLandingPage";
import { buildSeoLandingMetadata } from "@/lib/seo-landing";

export const metadata: Metadata = buildSeoLandingMetadata("best-credit-cards-india");

export default function Page() {
  return <SeoLandingPage slug="best-credit-cards-india" />;
}
