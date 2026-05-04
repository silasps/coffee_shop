import type { Locale } from "@/lib/coffee/types";

export const DEFAULT_STORE_SLUG = "coffee-shop-main";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function isLocaleSegment(value: string): value is Locale {
  return value === "pt" || value === "en" || value === "es";
}

export function buildStoreBasePath(storeSlug: string, locale: Locale) {
  return `/loja/${storeSlug}/${locale}`;
}

export function buildStoreAdminPath(storeSlug: string) {
  return `/loja/${storeSlug}/admin`;
}

export function buildStorePath(
  storeSlug: string,
  locale: Locale,
  suffix = "",
) {
  const normalizedSuffix = suffix
    ? suffix.startsWith("/")
      ? suffix
      : `/${suffix}`
    : "";

  return `${buildStoreBasePath(storeSlug, locale)}${normalizedSuffix}`;
}

export function buildStorePublicUrl(storeSlug: string, locale: Locale = "pt") {
  return new URL(buildStoreBasePath(storeSlug, locale), siteUrl).toString();
}

export function buildInternalHrefFromPublicUrl(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return publicUrl;
  }
}

export function replaceLocaleInPathname(pathname: string, locale: Locale) {
  const segments = pathname.split("/");
  const localeIndex = segments.findIndex(isLocaleSegment);

  if (localeIndex >= 0) {
    segments[localeIndex] = locale;
    return segments.join("/") || `/${locale}`;
  }

  return `/${locale}`;
}
