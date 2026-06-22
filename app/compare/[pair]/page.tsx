import type { Metadata } from "next";
import SeoComparisonPage from "@/app/ui/SeoComparisonPage";
import { buildSeoComparisonMetadata, SEO_COMPARISON_SLUGS } from "@/lib/seo-comparisons";

type Props = {
  params: Promise<{ pair: string }>;
};

// Only the configured pairs are valid; any other slug returns a static 404 instead of
// server-rendering the page just to call notFound().
export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_COMPARISON_SLUGS.map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  return buildSeoComparisonMetadata(pair);
}

export default async function Page({ params }: Props) {
  const { pair } = await params;
  return <SeoComparisonPage slug={pair} />;
}
