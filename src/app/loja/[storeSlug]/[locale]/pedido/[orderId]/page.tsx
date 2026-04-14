import Link from "next/link";
import { notFound } from "next/navigation";
import { StorefrontShell } from "@/components/storefront-shell";
import {
  formatMoney,
  getDictionary,
  getOrderStatusLabel,
  isValidLocale,
} from "@/lib/coffee/i18n";
import { buildStorePath } from "@/lib/coffee/paths";
import { getOrderById, getStorefront } from "@/lib/coffee/service";
import type { Locale } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

export default async function StoreOrderConfirmationPage({
  params,
}: {
  params: Promise<{ storeSlug: string; locale: string; orderId: string }>;
}) {
  const { storeSlug, locale, orderId } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const dictionary = getDictionary(typedLocale);
  const [store, order] = await Promise.all([
    getStorefront(storeSlug),
    getOrderById(orderId, storeSlug, typedLocale),
  ]);

  if (!store || !order) {
    notFound();
  }

  return (
    <StorefrontShell locale={typedLocale} store={store}>
      <section className="site-shell mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-[34px] p-7 md:p-10">
          <p className="pill">{dictionary.orderSuccess}</p>
          <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)] md:text-7xl">
            {order.displayCode}
          </h1>
          <p className="mt-5 text-base leading-8 text-[var(--muted)]">
            {order.requiresCounterPayment
              ? dictionary.orderCreatedCounter
              : dictionary.orderCreatedDirect}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-[var(--line)] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {dictionary.nameLabel}
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                {order.customerName}
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {dictionary.statusLabel}
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                {getOrderStatusLabel(order.status, typedLocale)}
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {dictionary.totalLabel}
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                {formatMoney(order.total, typedLocale)}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={buildStorePath(storeSlug, typedLocale)} className="btn-primary">
              {dictionary.backToMenu}
            </Link>
            <Link href="/vendedor" className="btn-secondary">
              {dictionary.viewSellerBoard}
            </Link>
          </div>
        </div>

        <aside className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            {dictionary.orderSummaryTitle}
          </p>
          <div className="mt-4 space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="rounded-[20px] border border-[var(--line)] bg-white/70 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--espresso)]">{item.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.quantity} x {formatMoney(item.unitPrice, typedLocale)}
                    </p>
                    {item.notes?.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--brand-strong)]">
                        {dictionary.itemNotes}: {item.notes.trim()}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-semibold text-[var(--espresso)]">
                    {formatMoney(
                      item.unitPrice !== null ? item.unitPrice * item.quantity : null,
                      typedLocale,
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </StorefrontShell>
  );
}
