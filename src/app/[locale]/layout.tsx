import { notFound } from "next/navigation";
import { CartProvider } from "@/components/cart-provider";
import { isValidLocale } from "@/lib/coffee/i18n";
import { DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return <CartProvider storeSlug={DEFAULT_STORE_SLUG}>{children}</CartProvider>;
}
