"use client";

import Link from "next/link";
import type { Route } from "next";
import type { AnchorHTMLAttributes, ComponentProps, MouseEventHandler, ReactNode } from "react";
import type { AnalyticsEventPayload } from "@/lib/analytics";
import { trackEvent } from "@/lib/analytics-client";

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

export function TrackedLink({ analyticsEvent, href, onClick, children, ...props }: TrackedLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      trackEvent({
        ...analyticsEvent,
        metadata: {
          ...(analyticsEvent.metadata ?? {}),
          tracking_mode: "client_beacon",
          destination_kind: "internal"
        }
      });
    }
  };
  const linkHref = typeof href === "string" ? (href as Route) : href;

  return (
    <Link {...(props as ComponentProps<typeof Link>)} href={linkHref} onClick={handleClick} prefetch={false}>
      {children}
    </Link>
  );
}

export function TrackedExternalLink({ analyticsEvent, href, onClick, children, ...props }: TrackedExternalLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      trackEvent({
        ...analyticsEvent,
        metadata: {
          ...(analyticsEvent.metadata ?? {}),
          tracking_mode: "client_beacon",
          destination_kind: "external"
        }
      });
    }
  };

  return (
    <a {...props} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
