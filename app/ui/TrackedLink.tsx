"use client";

import Link from "next/link";
import type { Route } from "next";
import type { AnchorHTMLAttributes, ComponentProps, MouseEventHandler, ReactNode } from "react";
import type { AnalyticsEventPayload } from "@/lib/analytics";

type TrackedLinkProps = Omit<ComponentProps<typeof Link>, "href"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    analyticsEvent: AnalyticsEventPayload;
    children: ReactNode;
    href: string | ComponentProps<typeof Link>["href"];
  };

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  analyticsEvent: AnalyticsEventPayload;
  children: ReactNode;
  href: string;
};

function trackedHref(analyticsEvent: AnalyticsEventPayload, href: string, kind: "internal" | "external") {
  const params = new URLSearchParams({
    event_name: analyticsEvent.event_name,
    page: analyticsEvent.page,
    source: analyticsEvent.source,
    kind
  });

  if (analyticsEvent.card_id) params.set("card_id", analyticsEvent.card_id);
  if (kind === "internal") params.set("href", href);

  return `/api/track-click?${params.toString()}` as Route;
}

export function TrackedLink({ analyticsEvent, href, onClick, children, ...props }: TrackedLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);
  };
  const hrefString = typeof href === "string" ? href : href.toString();

  return (
    <Link {...(props as ComponentProps<typeof Link>)} href={trackedHref(analyticsEvent, hrefString, "internal")} onClick={handleClick}>
      {children}
    </Link>
  );
}

export function TrackedExternalLink({ analyticsEvent, href, onClick, children, ...props }: TrackedExternalLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);
  };

  return (
    <a {...props} href={trackedHref(analyticsEvent, href, "external")} onClick={handleClick}>
      {children}
    </a>
  );
}
