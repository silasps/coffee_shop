import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { StorefrontShell } from "@/components/storefront-shell";
import { isValidLocale } from "@/lib/coffee/i18n";
import { getStorefront } from "@/lib/coffee/service";
import type { Locale } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

export default async function StoreCheckoutPage({
  params,
}: {
  params: Promise<{ storeSlug: string; locale: string }>;
}) {
  const { storeSlug, locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const store = await getStorefront(storeSlug);

  if (!store) {
    notFound();
  }

  return (
    <StorefrontShell locale={typedLocale} store={store}>
      <section className="site-shell mt-6">
        <CheckoutForm locale={typedLocale} storeSlug={storeSlug} />
      </section>
    </StorefrontShell>
  );
}
