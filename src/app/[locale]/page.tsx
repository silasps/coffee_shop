import { isValidLocale } from "@/lib/coffee/i18n";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  // Redireciona a home diretamente para o modo tótem
  redirect(`/${locale}/kiosk`);
}
