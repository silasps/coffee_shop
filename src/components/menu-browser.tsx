"use client";

import { useDeferredValue, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductArt } from "@/components/product-art";
import { formatMoney, getDictionary } from "@/lib/coffee/i18n";
import type { Locale, PublicAreaData } from "@/lib/coffee/types";

type MenuBrowserProps = {
  locale: Locale;
  areaData: PublicAreaData;
};

export function MenuBrowser({ locale, areaData }: MenuBrowserProps) {
  const dictionary = getDictionary(locale);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredCategories = !normalizedQuery
    ? areaData.categories
    : areaData.categories
        .map((category) => ({
          ...category,
          products: category.products.filter((product) => {
            const haystack = `${product.name} ${product.description}`.toLowerCase();
            return haystack.includes(normalizedQuery);
          }),
        }))
        .filter((category) => category.products.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={dictionary.searchPlaceholder}
          className="field max-w-xl"
        />

        <div className="flex flex-wrap gap-2">
          {areaData.categories.map((category) => (
            <a
              key={category.slug}
              href={`#${category.slug}`}
              className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--muted)]"
            >
              {category.name}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {filteredCategories.map((category) => (
          <section key={category.slug} id={category.slug} className="space-y-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                  {dictionary.categoriesLabel}
                </p>
                <h2 className="display-title text-4xl font-semibold text-[var(--espresso)]">
                  {category.name}
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {category.description}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {category.products.map((product) => (
                <article key={product.slug} className="card-panel overflow-hidden p-4">
                  <ProductArt
                    title={product.name}
                    tone={product.artTone}
                    area={product.area}
                    imageUrl={product.imageUrl}
                  />
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-[var(--espresso)]">
                          {product.name}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                          {product.description}
                        </p>
                      </div>
                      {product.highlight ? (
                        <span className="rounded-full bg-[rgba(227,106,47,0.12)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                          {product.highlight}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-semibold text-[var(--espresso)]">
                        {formatMoney(product.price, locale)}
                      </p>
                    </div>

                    <AddToCartButton
                      locale={locale}
                      slug={product.slug}
                      name={product.name}
                      price={product.price}
                      area={product.area}
                      disabled={!product.isAvailable}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
