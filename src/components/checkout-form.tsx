"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatMoney, getDictionary } from "@/lib/coffee/i18n";
import { buildStorePath, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import type { Locale } from "@/lib/coffee/types";

type CheckoutFormProps = {
  locale: Locale;
  storeSlug?: string;
};

type SubmissionState = {
  isPending: boolean;
  error: string | null;
};

export function CheckoutForm({
  locale,
  storeSlug = DEFAULT_STORE_SLUG,
}: CheckoutFormProps) {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [state, setState] = useState<SubmissionState>({
    isPending: false,
    error: null,
  });
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const channel = "TABLE" as const;
  const counterPayment =
    paymentMethod === "PAY_AT_COUNTER" ||
    paymentMethod === "CASH_AT_COUNTER" ||
    paymentMethod === "CARD_AT_COUNTER";

  if (items.length === 0) {
    return (
      <div className="card-panel p-8 text-center">
        <p className="text-lg text-[var(--muted)]">{dictionary.cartEmpty}</p>
        <Link href={buildStorePath(storeSlug, locale)} className="btn-primary mt-5">
          {dictionary.backToMenu}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form
        className="card-panel p-6 md:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            setState({ isPending: true, error: null });

            try {
              const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  customerName: formData.get("customerName"),
                  channel,
                  paymentMethod,
                  locale,
                  storeSlug,
                  items,
                }),
              });

              const result = (await response.json()) as {
                orderId?: string;
                error?: string;
              };

              if (!response.ok || !result.orderId) {
                throw new Error(result.error ?? "Não foi possível criar o pedido.");
              }

              clear();
              router.push(buildStorePath(storeSlug, locale, `/pedido/${result.orderId}`));
            } catch (error) {
              setState({
                isPending: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Não foi possível finalizar o pedido.",
              });
              return;
            }

            setState({ isPending: false, error: null });
          });
        }}
      >
        <div className="space-y-2">
          <p className="pill">{dictionary.checkoutTitle}</p>
          <h1 className="display-title text-5xl font-semibold text-[var(--espresso)]">
            {dictionary.checkout}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {dictionary.checkoutDescription}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
              {dictionary.customerName}
            </span>
            <input
              required
              name="customerName"
              className="field"
              placeholder={dictionary.callNameHint}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
              {dictionary.paymentMethod}
            </span>
            <select
              className="select"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              {Object.entries(dictionary.paymentMethods).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {counterPayment ? (
          <div className="mt-5 rounded-[22px] border border-[rgba(227,106,47,0.2)] bg-[rgba(255,243,234,0.9)] p-4 text-sm leading-6 text-[var(--brand-strong)]">
            {dictionary.counterPaymentNote}
          </div>
        ) : null}

        {state.error ? (
          <div className="mt-5 rounded-[22px] border border-[rgba(149,89,92,0.2)] bg-[rgba(149,89,92,0.08)] p-4 text-sm text-[var(--tone-berry)]">
            {state.error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={state.isPending}
          className="btn-primary mt-6 w-full"
        >
          {state.isPending ? dictionary.placingOrder : dictionary.placeOrder}
        </button>
      </form>

      <aside className="space-y-5">
        <div className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            {dictionary.cartTitle}
          </p>
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <div
                key={item.slug}
                className="flex items-start justify-between gap-4 rounded-[20px] border border-[var(--line)] bg-white/70 p-4"
              >
                <div>
                  <p className="font-semibold text-[var(--espresso)]">{item.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {item.quantity} x {formatMoney(item.price, locale)}
                  </p>
                  {item.notes?.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--brand-strong)]">
                      {dictionary.itemNotes}: {item.notes.trim()}
                    </p>
                  ) : null}
                </div>
                <p className="font-semibold text-[var(--espresso)]">
                  {formatMoney(item.price * item.quantity, locale)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              {dictionary.subtotal}
            </p>
            <p className="text-2xl font-semibold text-[var(--espresso)]">
              {formatMoney(subtotal, locale)}
            </p>
          </div>
        </div>

        <div className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            {dictionary.operationFlowTitle}
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            {dictionary.operationFlowItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
