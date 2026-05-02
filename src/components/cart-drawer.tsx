"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart-provider";
import { formatMoney, getDictionary } from "@/lib/coffee/i18n";
import { buildStorePath, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import type { Locale } from "@/lib/coffee/types";

type CartDrawerProps = {
  locale: Locale;
  storeSlug?: string;
  tone?: "light" | "dark";
  compact?: boolean;
  docked?: boolean;
};

const confirmLabels: Record<Locale, string> = {
  pt: "Finalizar pedido",
  en: "Complete order",
  es: "Finalizar pedido",
};

const modalTitles: Record<Locale, string> = {
  pt: "Pedido",
  en: "Order",
  es: "Pedido",
};

const addMoreLabels: Record<Locale, string> = {
  pt: "Adicionar mais itens",
  en: "Add more items",
  es: "Agregar más productos",
};

const removeLabels: Record<Locale, string> = {
  pt: "Remover",
  en: "Remove",
  es: "Eliminar",
};

const itemLabels: Record<Locale, string> = {
  pt: "itens",
  en: "items",
  es: "productos",
};

const cancelLabels: Record<Locale, string> = {
  pt: "Cancelar",
  en: "Cancel",
  es: "Cancelar",
};

export function CartDrawer({
  locale,
  storeSlug = DEFAULT_STORE_SLUG,
  tone = "light",
  compact = false,
  docked = false,
}: CartDrawerProps) {
  const [open, setOpen] = useState(false);
  const { items, itemCount, subtotal, removeItem, updateQuantity, setItemNotes, clear } = useCart();
  const dictionary = getDictionary(locale);
  const hasItems = itemCount > 0;
  const confirmLabel = confirmLabels[locale];
  const modalTitle = modalTitles[locale];
  const addMoreLabel = addMoreLabels[locale];
  const removeLabel = removeLabels[locale];
  const cancelLabel = cancelLabels[locale];
  const itemLabel = itemLabels[locale];
  const checkoutHref = buildStorePath(storeSlug, locale, "/checkout");

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {docked ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgba(255,255,255,0.3)] bg-[rgba(255,249,244,0.9)] shadow-[0_-18px_44px_rgba(61,34,23,0.16)] backdrop-blur-xl">
          <div className="mx-auto w-[min(1280px,calc(100vw-24px))] py-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[18px] bg-[var(--brand)] px-4 py-3 text-left text-white shadow-[0_12px_26px_rgba(227,106,47,0.24)]"
            >
              <span className="inline-flex min-w-0 items-center gap-3 font-semibold">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 8h12l-1 12H7L6 8Z" />
                    <path d="M9 8a3 3 0 0 1 6 0" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-tight">{dictionary.cartTitle}</span>
                  <span className="block text-[11px] font-medium leading-tight text-white/78">
                    {itemCount} {itemLabel}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right text-sm font-semibold sm:text-base">
                {dictionary.subtotal}: {formatMoney(subtotal, locale)}
              </span>
            </button>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={clear}
                className="min-h-11 rounded-[12px] bg-[var(--brand)] px-4 py-2 text-sm font-semibold uppercase text-white shadow-[0_8px_18px_rgba(227,106,47,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasItems}
              >
                {cancelLabel}
              </button>
              <Link
                href={checkoutHref}
                aria-disabled={!hasItems}
                tabIndex={hasItems ? undefined : -1}
                className={`flex min-h-11 items-center justify-center rounded-[12px] px-4 py-2 text-center text-sm font-semibold uppercase text-white shadow-[0_8px_18px_rgba(149,89,92,0.2)] ${
                  hasItems
                    ? "bg-[var(--tone-berry)]"
                    : "pointer-events-none bg-[rgba(149,89,92,0.42)]"
                }`}
              >
                {confirmLabel}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center font-semibold transition shadow-sm ${
            compact
              ? "min-w-[168px] gap-2 rounded-full px-3 py-2"
              : "gap-3 rounded-full px-4 py-3 text-sm"
          } ${
            tone === "dark"
              ? "border border-white/10 bg-white/8 text-white"
              : hasItems
                ? "border border-[rgba(66,145,92,0.28)] bg-[rgba(226,247,232,0.96)] text-[#245334] shadow-[0_14px_30px_rgba(66,145,92,0.18)]"
                : "border border-[rgba(255,255,255,0.72)] bg-[rgba(255,255,255,0.66)] text-[var(--espresso)] shadow-[0_10px_24px_rgba(61,34,23,0.08)]"
          }`}
        >
          {compact ? (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="20" r="1.25" />
                <circle cx="18" cy="20" r="1.25" />
                <path d="M2.5 4h2.5l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.1" />
              </svg>
              <span className="min-w-0 text-left">
                <span className="block text-[12px] leading-none">{dictionary.cartTitle}</span>
                <span
                  className={`mt-1 block text-[11px] leading-none ${
                    hasItems ? "text-[#2f6b43]" : "text-[var(--muted)]"
                  }`}
                >
                  {itemCount} {itemLabel} • {formatMoney(subtotal, locale)}
                </span>
              </span>
            </>
          ) : (
            <>
              <span>{dictionary.cartTitle}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${
                  tone === "dark"
                    ? "bg-[#f4cf3d] text-[var(--espresso)]"
                    : hasItems
                      ? "bg-[#3c8d57] text-white"
                    : "bg-[var(--espresso)] text-white"
                }`}
              >
                {itemCount}
              </span>
            </>
          )}
        </button>
      )}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] grid place-items-center bg-[rgba(25,15,9,0.42)] p-4 backdrop-blur-md"
              onClick={() => setOpen(false)}
            >
              <div
                className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/20 bg-[#fff9f4] p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                      {dictionary.cartTitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
                    >
                      {addMoreLabel}
                    </button>
                  </div>
                  <h2 className="display-title mt-3 text-3xl font-semibold text-[var(--espresso)]">
                    {modalTitle}
                  </h2>
                </div>

                <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-[var(--line)] px-5 py-8 text-center text-sm text-[var(--muted)]">
                      {dictionary.cartEmpty}
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.slug}
                        className="rounded-[22px] border border-[var(--line)] bg-white/78 p-4"
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[var(--espresso)]">
                              {item.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[var(--brand-strong)]">
                              {formatMoney(item.price, locale)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-lg"
                            >
                              -
                            </button>
                            <div className="min-w-8 text-center text-sm font-semibold text-[var(--espresso)]">
                              {item.quantity}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-lg"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.slug)}
                            aria-label={`${removeLabel} ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--brand-strong)]"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4.5 w-4.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>

                        <label className="mt-3 block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                            {dictionary.itemNotes}
                          </span>
                          <textarea
                            value={item.notes ?? ""}
                            onChange={(event) => setItemNotes(item.slug, event.target.value)}
                            placeholder={dictionary.itemNotesPlaceholder}
                            className="textarea min-h-20 bg-white text-sm"
                            rows={2}
                          />
                        </label>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 rounded-[24px] bg-[var(--espresso)] p-5 text-white">
                  <div className="flex items-end justify-between gap-3">
                    <span className="text-base font-semibold text-white/82">
                      {dictionary.subtotal}
                    </span>
                    <span className="text-3xl font-semibold leading-none text-[#f4cf3d]">
                      {formatMoney(subtotal, locale)}
                    </span>
                  </div>
                  <div className="mt-5">
                    <Link
                      href={checkoutHref}
                      className="flex w-full items-center justify-center rounded-full bg-[#f4cf3d] px-4 py-3 text-center text-base font-semibold text-[var(--espresso)] shadow-[inset_0_-2px_0_rgba(40,21,14,0.14)]"
                      onClick={() => setOpen(false)}
                    >
                      {confirmLabel}
                    </Link>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
