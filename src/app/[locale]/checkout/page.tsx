import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { StorefrontShell } from "@/components/storefront-shell";
import { isValidLocale } from "@/lib/coffee/i18n";
import { DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import { getStorefront } from "@/lib/coffee/service";
import type { Locale } from "@/lib/coffee/types";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const store = await getStorefront(DEFAULT_STORE_SLUG);

  if (!store) {
    notFound();
  }

  return (
    <StorefrontShell locale={typedLocale} store={store}>
      <section className="site-shell mt-6">
        <CheckoutForm locale={typedLocale} />
      </section>
    </StorefrontShell>
  );
}
