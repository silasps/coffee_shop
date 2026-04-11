import { notFound } from "next/navigation";
import { CartProvider } from "@/components/cart-provider";
import { isValidLocale } from "@/lib/coffee/i18n";

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

  return <CartProvider>{children}</CartProvider>;
}
