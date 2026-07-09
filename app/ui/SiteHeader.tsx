"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./SiteChrome.module.css";

function joinClasses(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function LogoMark() {
  return (
    <svg className={styles.logoMark} viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="scSiteCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="60%" stopColor="#581c87" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
        <linearGradient id="scSiteCheckGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="50%" stopColor="#b8975a" />
          <stop offset="100%" stopColor="#f3e8ff" />
        </linearGradient>
        <linearGradient id="scSiteTopSliceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
      </defs>
      <path d="M40 15 C 54 11, 80 13, 92 16 C 94 17, 95 19, 94 21 C 92 24, 70 24, 44 21 C 41 21, 40 18, 40 15 Z" fill="url(#scSiteTopSliceGrad)" />
      <path d="M16 20 C 16 16, 20 15, 25 16 L88 28 C 92 28, 94 31, 94 35 L88 65 C 88 68, 85 70, 81 70 L22 79 C 18 79, 16 76, 16 71 Z" fill="url(#scSiteCardGrad)" />
      <rect x="22" y="28" width="16" height="12" rx="3.5" fill="#f3edf5" opacity="0.95" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" stroke="#fdfbf7" strokeWidth="6" strokeLinejoin="miter" fill="none" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" fill="url(#scSiteCheckGrad)" />
    </svg>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links: Array<{ label: string; href: Route }> = [
    { label: "recommend", href: "/recommend" },
    { label: "calculator", href: "/calculator" as Route },
    { label: "cards", href: "/cards" },
    { label: "compare", href: "/compare" }
  ];

  return (
    <nav className={joinClasses(styles.topnav, "site-header")}>
      <div className={styles.topnavInner}>
        <Link href="/" className={styles.brand} aria-label="SimplifyCards home">
          <LogoMark />
          <span>
            <b className={styles.brandStrong}>Simplify</b>Cards
          </span>
        </Link>
        <div className={styles.navlinks}>
          {links.map((link) => {
            const active = isActiveHeaderLink(pathname, link.href);
            return (
              <Link href={link.href} key={link.href} className={joinClasses(styles.navLink, active && styles.navLinkActive)}>
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className={styles.mobileMenu}>
          <button type="button" className={styles.mobileButton} onClick={() => setOpen((value) => !value)} aria-label="Open navigation menu">
            <span />
            <span />
            <span />
          </button>
          {open ? (
            <div className={styles.mobilePopover}>
              {links.map((link) => {
                const active = isActiveHeaderLink(pathname, link.href);
                return (
                  <Link
                    href={link.href}
                    key={link.href}
                    className={joinClasses(styles.mobileLink, active && styles.mobileLinkActive)}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export function SiteHeaderSpacer() {
  return <div className={joinClasses(styles.spacer, "site-header-spacer")} aria-hidden="true" />;
}

function isActiveHeaderLink(pathname: string, href: Route) {
  if (href === "/cards") {
    return pathname === "/cards" || pathname.startsWith("/cards/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
