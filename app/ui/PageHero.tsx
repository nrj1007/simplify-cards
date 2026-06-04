import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Optional content rendered under the lead (search box, chips, actions). */
  children?: ReactNode;
};

// Shared full-bleed hero for inner pages, matching the landing/ask design language.
export default function PageHero({ eyebrow, title, lead, children }: Props) {
  return (
    <section className="page-hero">
      <div className="container page-hero-inner">
        <div className="page-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {lead ? <p className="page-hero-lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
