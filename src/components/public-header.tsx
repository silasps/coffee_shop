/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { resolveStorefrontCopy } from "@/lib/coffee/content-i18n";
import { buildStoreBasePath } from "@/lib/coffee/paths";
import type { Locale, StorefrontConfig } from "@/lib/coffee/types";

type PublicHeaderProps = {
  locale: Locale;
  store: StorefrontConfig;
};

const headerCopy = {
  pt: {
    slogan: "De Tamandaré para o mundo.",
    homeLabel: "Voltar ao início",
  },
  en: {
    slogan: "From Tamandare to the world.",
    homeLabel: "Back to home",
  },
  es: {
    slogan: "De Tamandare al mundo.",
    homeLabel: "Volver al inicio",
  },
} as const;

export function PublicHeader({ locale, store }: PublicHeaderProps) {
  const copy = headerCopy[locale];
  const logoUrl = store.logoUrl || "/brand/logo-dark.png";
  const storefrontCopy = resolveStorefrontCopy(locale, store);
  const slogan = storefrontCopy.slogan || copy.slogan;
  const homeHref = buildStoreBasePath(store.slug, locale);

  return (
    <header
      data-public-header="true"
      className="sticky top-0 z-50 bg-[var(--bg)] pb-1 pt-2"
    >
      <div className="site-shell">
        <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#221511] px-3 py-3 shadow-[0_14px_36px_rgba(34,21,17,0.34)] sm:px-5 sm:py-3.5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[116px_minmax(0,1fr)] sm:gap-8">
            <Link
              href={homeHref}
              aria-label={copy.homeLabel}
              className="flex items-center justify-center sm:justify-start"
            >
              <div className="h-[88px] w-[88px] overflow-hidden rounded-[24px] border border-white/12 sm:h-[108px] sm:w-[108px] sm:rounded-[28px]">
                <img
                  src={logoUrl}
                  alt={`Logo ${store.name}`}
                  className="h-full w-full object-cover"
                />
              </div>
            </Link>

            <div className="grid min-w-0 gap-2.5 pr-1 sm:pr-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-[11px]">
                {store.name}
              </p>
              <p className="display-title text-[clamp(15px,4vw,30px)] font-semibold leading-[1.04] text-white">
                {slogan}
              </p>

              <div className="flex min-h-[30px] items-center">
                <LocaleSwitcher locale={locale} tone="dark" variant="bare-flags" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
