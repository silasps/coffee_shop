import { notFound } from "next/navigation";
import { CartProvider } from "@/components/cart-provider";
import { isValidLocale } from "@/lib/coffee/i18n";

export default async function StoreLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<unknown>;
}) {
  const { storeSlug, locale } = (await params) as {
    storeSlug: string;
    locale: string;
  };

  if (!isValidLocale(locale)) {
    notFound();
  }

  return <CartProvider storeSlug={storeSlug}>{children}</CartProvider>;
}
