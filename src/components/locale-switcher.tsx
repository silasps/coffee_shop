"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocaleNavigation } from "@/lib/coffee/i18n";
import { replaceLocaleInPathname } from "@/lib/coffee/paths";
import type { Locale } from "@/lib/coffee/types";

type LocaleSwitcherProps = {
  locale: Locale;
  tone?: "light" | "dark";
  variant?: "default" | "flags" | "bare-flags";
};

const localeFlags: Record<Locale, string> = {
  pt: "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
};

export function LocaleSwitcher({
  locale,
  tone = "light",
  variant = "default",
}: LocaleSwitcherProps) {
  const pathname = usePathname();

  return (
    <div
      className={
        variant === "flags" || variant === "bare-flags"
          ? variant === "bare-flags"
            ? "flex items-center gap-3 sm:gap-4"
            : "flex items-center gap-2"
          : `flex flex-wrap items-center gap-2 rounded-full p-1 ${
              tone === "dark"
                ? "border border-white/10 bg-white/8"
                : "border border-[var(--line)] bg-white/75"
            }`
      }
    >
      {getLocaleNavigation(locale).map((item) => {
        const href = replaceLocaleInPathname(pathname, item.locale as Locale);

        return (
          <Link
            key={item.locale}
            href={href}
            aria-label={item.label}
            title={item.label}
            className={
              variant === "bare-flags"
                ? `flex items-center justify-center text-[22px] leading-none transition-transform duration-150 sm:text-[24px] ${
                    item.isActive
                      ? "scale-110 opacity-100"
                      : "opacity-78 hover:scale-105 hover:opacity-100"
                  }`
                : variant === "flags"
                ? `flex h-9 w-9 items-center justify-center rounded-full text-base transition ${
                    item.isActive
                      ? tone === "dark"
                        ? "bg-[#f4cf3d] shadow-[0_10px_20px_rgba(244,207,61,0.22)]"
                        : "bg-[var(--espresso)]"
                      : tone === "dark"
                        ? "bg-white/8 hover:bg-white/12"
                        : "bg-white/75 hover:bg-white"
                  }`
                : `rounded-full px-3 py-2 text-sm font-semibold transition ${
                    tone === "dark"
                      ? item.isActive
                        ? "bg-[#f4cf3d] text-[var(--espresso)]"
                        : "text-white/72 hover:bg-white/8"
                      : item.isActive
                        ? "bg-[var(--espresso)] text-white"
                        : "text-[var(--muted)] hover:bg-white"
                  }`
            }
          >
            {variant === "flags" || variant === "bare-flags"
              ? localeFlags[item.locale as Locale]
              : item.label}
          </Link>
        );
      })}
    </div>
  );
}
