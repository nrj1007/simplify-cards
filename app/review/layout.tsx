import type { Metadata } from "next";

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
      {children}
      {/* TODO: Implement actual user authentication / Basic Auth middleware in the future.
          Currently, noindex/nofollow prevents search crawling, but pages are still publicly accessible if the URL is known. */}
    </>
  );
}
