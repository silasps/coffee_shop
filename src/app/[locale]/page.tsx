import { isValidLocale } from "@/lib/coffee/i18n";
import { buildStorePath, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
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

  redirect(buildStorePath(DEFAULT_STORE_SLUG, locale as "pt" | "en" | "es"));
}
