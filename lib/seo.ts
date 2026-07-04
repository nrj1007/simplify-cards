import type { Metadata } from "next";

export const SITE_NAME = "Simplify Cards";
export const SITE_URL = "https://www.simplifycards.in";
export const SITE_DESCRIPTION =
  "Find the right Indian credit card. Ask, compare by use case, and review verified rewards, fees, lounges, exclusions, and redemption options.";

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  imageUrl?: string;
};

function absoluteUrl(path: string) {
  if (!path) return SITE_URL;
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildCanonicalUrl(path: string) {
  if (path === "/") return `${SITE_URL}/`;
  return absoluteUrl(path);
}

export function buildOpenGraphImages(imageUrl?: string) {
  return imageUrl ? [{ url: absoluteUrl(imageUrl) }] : undefined;
}

export function buildPageMetadata({
  title,
  description,
  path,
  type = "website",
  imageUrl
}: BuildMetadataInput): Metadata {
  const url = buildCanonicalUrl(path);
  const images = buildOpenGraphImages(imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    robots: {
      index: true,
      follow: true
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
      type,
      images
    },
    twitter: {
      card: images?.length ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((image) => image.url)
    }
  };
}
