import type { AnalyticsMetadata } from "./analytics";

const botUserAgentPattern =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|preview|monitor|headless|lighthouse|pagespeed/i;

function headerValue(headers: Headers, name: string) {
  const value = headers.get(name)?.trim();
  return value || undefined;
}

function referrerHost(referrer: string | undefined) {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).host;
  } catch {
    return undefined;
  }
}

function userAgentFamily(userAgent: string | undefined) {
  if (!userAgent) return "unknown";
  if (/googlebot/i.test(userAgent)) return "googlebot";
  if (/bingbot/i.test(userAgent)) return "bingbot";
  if (/duckduckbot/i.test(userAgent)) return "duckduckbot";
  if (/facebookexternalhit|facebot/i.test(userAgent)) return "facebook";
  if (/whatsapp/i.test(userAgent)) return "whatsapp";
  if (/telegrambot/i.test(userAgent)) return "telegram";
  if (/headlesschrome|playwright|puppeteer/i.test(userAgent)) return "headless";
  if (/chrome|crios/i.test(userAgent)) return "chrome";
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return "safari";
  if (/firefox|fxios/i.test(userAgent)) return "firefox";
  if (/edg/i.test(userAgent)) return "edge";
  return "other";
}

export function buildRequestAnalyticsMetadata(request: Request): AnalyticsMetadata {
  const userAgent = headerValue(request.headers, "user-agent");
  const referrer = headerValue(request.headers, "referer");
  const country = headerValue(request.headers, "x-vercel-ip-country");
  const region = headerValue(request.headers, "x-vercel-ip-country-region");
  const city = headerValue(request.headers, "x-vercel-ip-city");
  const asn = headerValue(request.headers, "x-vercel-ip-as-number");

  return {
    request_user_agent_family: userAgentFamily(userAgent),
    request_user_agent_is_bot: Boolean(userAgent && botUserAgentPattern.test(userAgent)),
    ...(country ? { request_country: country } : {}),
    ...(region ? { request_region: region } : {}),
    ...(city ? { request_city: city } : {}),
    ...(asn ? { request_asn: asn } : {}),
    ...(referrer ? { request_referrer_host: referrerHost(referrer) ?? referrer } : {})
  };
}
