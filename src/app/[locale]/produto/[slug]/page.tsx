import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductArt } from "@/components/product-art";
import { StorefrontShell } from "@/components/storefront-shell";
import { formatMoney, getDictionary, isValidLocale } from "@/lib/coffee/i18n";
import { buildStorePath, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import { getProductBySlug, getStorefront } from "@/lib/coffee/service";
import type { Locale } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const dictionary = getDictionary(typedLocale);
  const [store, product] = await Promise.all([
    getStorefront(DEFAULT_STORE_SLUG),
    getProductBySlug(typedLocale, slug, DEFAULT_STORE_SLUG),
  ]);

  if (!store || !product) {
    notFound();
  }

  return (
    <StorefrontShell locale={typedLocale} store={store}>
      <section className="site-shell mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card-panel p-6">
          <ProductArt
            title={product.name}
            tone={product.artTone}
            area={product.area}
            imageUrl={product.imageUrl}
          />
        </div>

        <div className="glass-panel rounded-[34px] p-7 md:p-10">
          <p className="pill">{dictionary.detailLabel}</p>
          <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)] md:text-7xl">
            {product.name}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
            {product.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-[var(--line)] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Preço
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--espresso)]">
                {formatMoney(product.price, typedLocale)}
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Disponibilidade
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--espresso)]">
                {product.isAvailable ? "Liberado para pedido" : dictionary.unavailable}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AddToCartButton
              locale={typedLocale}
              slug={product.slug}
              name={product.originalName}
              price={product.price}
              area={product.area}
              disabled={!product.isAvailable}
            />
            <Link
              href={buildStorePath(DEFAULT_STORE_SLUG, typedLocale, `/menu/${product.area}`)}
              className="btn-secondary text-center"
            >
              {dictionary.backToMenu}
            </Link>
          </div>

          {product.highlight ? (
            <div className="mt-6 rounded-[22px] border border-[rgba(227,106,47,0.18)] bg-[rgba(255,243,234,0.9)] p-4 text-sm text-[var(--brand-strong)]">
              {product.highlight}
            </div>
          ) : null}
        </div>
      </section>
    </StorefrontShell>
  );
}
