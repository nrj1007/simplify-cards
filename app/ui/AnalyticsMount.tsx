"use client";

import { useEffect, useRef } from "react";
import type { AnalyticsEventPayload } from "@/lib/analytics";
import { trackEvent } from "@/lib/analytics-client";

type Props = {
  event: AnalyticsEventPayload;
};

export default function AnalyticsMount({ event }: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent(event);
  }, [event]);

  return null;
}
