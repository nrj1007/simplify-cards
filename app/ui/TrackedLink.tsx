"use client";

import Link from "next/link";
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

export function TrackedLink({ analyticsEvent, onClick, children, ...props }: TrackedLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    trackEvent(analyticsEvent);
    onClick?.(event);
  };

  return (
    <Link {...(props as ComponentProps<typeof Link>)} onClick={handleClick}>
      {children}
    </Link>
  );
}

export function TrackedExternalLink({ analyticsEvent, onClick, children, ...props }: TrackedExternalLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    trackEvent(analyticsEvent);
    onClick?.(event);
  };

  return (
    <a {...props} onClick={handleClick}>
      {children}
    </a>
  );
}
