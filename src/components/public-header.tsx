import Image from "next/image";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/lib/coffee/types";

type PublicHeaderProps = {
  locale: Locale;
};

const headerCopy = {
  pt: {
    slogan: "De Itamandaré para o mundo.",
    homeLabel: "Voltar ao início",
  },
  en: {
    slogan: "De Itamandaré para o mundo.",
    homeLabel: "Back to home",
  },
  es: {
    slogan: "De Itamandaré para o mundo.",
    homeLabel: "Volver al inicio",
  },
} as const;

export function PublicHeader({ locale }: PublicHeaderProps) {
  const copy = headerCopy[locale];

  return (
    <header
      data-public-header="true"
      className="sticky top-0 z-50 bg-[var(--bg)] pb-2 pt-3"
    >
      <div className="site-shell">
        <div className="overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[#221511] px-4 py-4 shadow-[0_18px_48px_rgba(34,21,17,0.38)] sm:px-6 sm:py-5">
          <div className="space-y-3">
            <div className="flex items-center gap-4 sm:gap-5">
              <Link
                href={`/${locale}`}
                aria-label={copy.homeLabel}
                className="shrink-0"
              >
                <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[22px] border border-white/10 bg-[#fff8f1] shadow-lg sm:h-[88px] sm:w-[88px] sm:rounded-[26px]">
                  <Image
                    src="/brand/logo-dark.png"
                    alt="Logo Cafeteria AT"
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>

              <div className="min-w-0 flex-1">
                <p className="display-title overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(16px,4.8vw,32px)] font-semibold leading-none text-white">
                  {copy.slogan}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <LocaleSwitcher locale={locale} tone="dark" variant="bare-flags" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
