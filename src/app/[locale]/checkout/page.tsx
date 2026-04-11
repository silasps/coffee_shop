import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { PublicHeader } from "@/components/public-header";
import { isValidLocale } from "@/lib/coffee/i18n";
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

  return (
    <main className="pb-12">
      <PublicHeader locale={locale as Locale} />
      <section className="site-shell mt-6">
        <CheckoutForm locale={locale as Locale} />
      </section>
    </main>
  );
}
