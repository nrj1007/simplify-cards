import type { Metadata } from "next";
import UpdatesBrowser from "@/app/ui/UpdatesBrowser";
import { getAllUpdates } from "@/lib/card-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Latest Credit Card Updates",
  description:
    "Recent Indian credit card changes: reward devaluations, new benefits, fee revisions, and lounge policy updates — verified against official sources.",
  path: "/latest"
});

export default function LatestPage() {
  const updates = getAllUpdates(25);

  return (
    <div className="updates-reference-page">
      <UpdatesBrowser updates={updates} />
    </div>
  );
}
