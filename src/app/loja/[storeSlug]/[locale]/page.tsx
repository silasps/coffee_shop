import { notFound, redirect } from "next/navigation";
import { isValidLocale } from "@/lib/coffee/i18n";
import { buildStorePath } from "@/lib/coffee/paths";

export const dynamic = "force-dynamic";

export default async function StoreLocaleHomePage({
  params,
}: {
  params: Promise<{ storeSlug: string; locale: string }>;
}) {
  const { storeSlug, locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  redirect(buildStorePath(storeSlug, locale, "/kiosk"));
}
