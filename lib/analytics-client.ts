"use client";

import type { AnalyticsDeviceType, AnalyticsEventPayload } from "./analytics";

const SESSION_STORAGE_KEY = "card-ai-india.analytics.session_id";

function randomSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "anonymous";
  }

  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const sessionId = randomSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export function getDeviceType(): AnalyticsDeviceType {
  if (typeof window === "undefined") return "desktop";

  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function buildClientAnalyticsPayload(payload: AnalyticsEventPayload): AnalyticsEventPayload {
  return {
    ...payload,
    session_id: payload.session_id ?? getOrCreateSessionId(),
    device_type: payload.device_type ?? getDeviceType(),
    referrer: payload.referrer ?? (typeof document === "undefined" ? "" : document.referrer || "")
  };
}

export function trackEvent(payload: AnalyticsEventPayload) {
  if (typeof window === "undefined") return;

  try {
    const requestPayload = buildClientAnalyticsPayload(payload);
    const body = JSON.stringify(requestPayload);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const accepted = navigator.sendBeacon("/api/analytics", blob);
      if (accepted) return;
    }

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => {});
  } catch {
    // Best-effort analytics only.
  }
}
