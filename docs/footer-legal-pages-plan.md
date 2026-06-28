# Add About, Contact, Privacy Policy & Terms pages + footer links

## Context
The site (SimplifyCards) currently has a single combined `/about` page (titled "About / Contact")
and no Privacy Policy or Terms page. The user wants four footer-linked informational pages:
**About**, **Contact us**, **Privacy policy**, and **Terms and conditions** — the standard legal/
trust pages most sites (and ad/affiliate networks) expect.

Decisions confirmed with the user:
- **Separate About and Contact pages** — split the existing combined page; `/about` becomes
  story/principles only, a new `/contact` page holds the contact section.
- **Contact shows both an email and in-product feedback** — public email: **contact@simplifycards.in**.
- **Privacy & Terms = standard India-appropriate boilerplate** drafted by me, tailored to this site
  (no user accounts/login, affiliate links, "not financial advice", minimal data collected — only
  anonymous question/feedback logs). User will review before relying on it legally.
- Operator referred to as **"SimplifyCards"** throughout.

All four pages reuse the existing design-system classes (`.page-shell` → `PageHero` →
`.page-content` → `.container` → `.about-grid`/`.panel.about-card`), matching the current `/about`
page. No new CSS framework or components needed; only a tiny scoped CSS block for legal long-form.

## Files to change / add

### 1. New pages (server components, mirror `app/about/page.tsx` structure)
Each uses `buildPageMetadata({ title, description, path })` from `lib/seo.ts` and the
`PageHero` + `.page-shell`/`.page-content`/`.container` pattern. Inline `href`s to the new routes
work without `as Route`; keep `as Route` only for query-string hrefs (as the existing about page does).

- **`app/contact/page.tsx`** — new `/contact`. Move the existing "Contact" content out of about:
  - Hero (eyebrow "Contact", title, lead).
  - Panel: **Email us** — `mailto:contact@simplifycards.in` link, what to write about.
  - Panel: **Report corrections in-product** — reuse `CONTACT_REASONS` list + the existing
    "Report a correction" (`/ask?query=…` cast `as Route`) and "Find a card to review" buttons.
  - Keep the "What we verify" / disclosure side panel for consistency (optional).

- **`app/privacy/page.tsx`** — new `/privacy`. Stacked `.panel.about-card` sections inside
  `.container` (single column, wrapped in a `legal-page` class). Boilerplate sections:
  *Last updated* date, Introduction, Information we collect (anonymous question/feedback logs, basic
  server/analytics logs; **no account, no card numbers, no financial data collected**), How we use
  it, Cookies/analytics, Affiliate links & third-party sites, Data sharing (none sold), Data
  retention, Your rights, Children, Changes, Contact (contact@simplifycards.in).

- **`app/terms/page.tsx`** — new `/terms`. Same `legal-page` layout. Boilerplate sections:
  *Last updated* date, Acceptance, "Informational only — **not financial advice**", Accuracy /
  verify-with-issuer disclaimer, Affiliate disclosure, Acceptable use, Intellectual property,
  Third-party links, Disclaimer of warranties, Limitation of liability, Changes, Governing law
  (India), Contact.

- **`app/about/page.tsx`** — edit existing: remove the "Contact" article (lines ~66–89) and its now-unused
  `CONTACT_REASONS` const + the `Route` import if no longer needed; update hero eyebrow/title from
  "About / Contact" to "About" and `buildPageMetadata` title to "About" (path stays `/about`).
  Add a small "Questions or corrections? Visit Contact" link pointing to `/contact`.

### 2. Footer — `app/layout.tsx` (lines 96–120)
Replace the single "About / Contact" link in the Product group and add a new **Company** link group
(4th column) so legal links are grouped sensibly:
- Product group: change `/about` link label to "About", add `<Link href="/contact">Contact us</Link>`.
- New `<section className="footer-link-group" aria-labelledby="footer-company">` with heading
  "Company" containing: About, Contact us, Privacy Policy, Terms & Conditions.
  (Simpler alternative if a 4th column crowds the grid: add Privacy + Terms beneath the existing
  Product links — confirm visually after build.) Inline hrefs `/about`, `/contact`, `/privacy`,
  `/terms` need no `as Route` cast once the routes exist.

### 3. SEO — `app/sitemap.ts` (line 7)
Add the three new routes to `STATIC_ROUTES`:
`["/", "/ask", "/recommend", "/finder", "/calculator", "/compare", "/about", "/contact", "/privacy", "/terms"]`.

### 4. CSS — `app/globals.css`
Add a small scoped block near the About/Contact section (~line 569) for legal long-form readability:
`.legal-page .about-main { gap: 18px; }`, `.legal-page h3 { color: var(--navy); font-size: 17px; margin: 16px 0 6px; }`,
`.legal-updated { color: var(--muted); font-size: 13px; }`. Reuse `.about-list`, `.panel`,
`.about-card` for everything else — no new tokens.

## Reuse notes
- `buildPageMetadata` — `lib/seo.ts` (already used by every page).
- `PageHero` — `app/ui/PageHero.tsx`.
- Existing classes `.page-shell .page-hero .page-content .container .about-grid .about-main
  .about-side .panel .about-card .about-list .about-pill-list .contact-actions .about-hero-actions`
  — all defined in `app/globals.css` (lines ~505–575); no restyling needed beyond the legal block.
- Reuse the existing `CONTACT_REASONS` array and the `/ask?query=…` correction-report CTA verbatim
  when moving them into `/contact`.

## Verification
1. `npm run dev` (per memory: on this box use `next dev --webpack` if Turbopack fails; clear
   `.next/dev/cache` if webpack cache is corrupt).
2. Visit `/about`, `/contact`, `/privacy`, `/terms` — confirm hero + panels render, no overlap, the
   `mailto:` link and in-product CTAs work, and `/about` no longer shows the contact block.
3. Check the footer on any page: new links present, grouped, and navigate correctly (no 404, no
   typedRoutes TS error).
4. `npm run build` — confirms typedRoutes picks up the new routes and the whole app compiles.
   Then `npm run lint`.
5. Confirm `/sitemap.xml` (dev) lists the three new URLs.
6. Commit and push to `main` per the repo commit workflow.
