"use client";

import { useState } from "react";
import { useAddProduct } from "@/components/cart-provider";
import { getDictionary } from "@/lib/coffee/i18n";
import type { Locale, MenuAreaSlug } from "@/lib/coffee/types";

type AddToCartButtonProps = {
  locale: Locale;
  slug: string;
  name: string;
  price: number | null;
  area: MenuAreaSlug;
  disabled?: boolean;
  variant?: "default" | "compact";
};

export function AddToCartButton({
  locale,
  slug,
  name,
  price,
  area,
  disabled = false,
  variant = "default",
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const addProduct = useAddProduct();
  const dictionary = getDictionary(locale);

  const isDisabled = disabled || price === null;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={
        variant === "compact"
          ? `w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              isDisabled
                ? "cursor-not-allowed border border-dashed border-[var(--line)] bg-transparent text-[var(--muted)]"
                : "bg-[#f4cf3d] text-[var(--espresso)] shadow-[inset_0_-2px_0_rgba(40,21,14,0.12)] hover:-translate-y-[1px]"
            }`
          : `w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
              isDisabled
                ? "cursor-not-allowed border border-dashed border-[var(--line)] bg-transparent text-[var(--muted)]"
                : "bg-[var(--espresso)] text-white hover:-translate-y-[1px]"
            }`
      }
      onClick={() => {
        if (!price) {
          return;
        }

        addProduct({ slug, name, price, area });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? dictionary.addedToCart : dictionary.addToCart}
    </button>
  );
}
