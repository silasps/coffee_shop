import { notFound } from "next/navigation";
import { CatalogExperience } from "@/components/catalog-experience";
import { PublicHeader } from "@/components/public-header";
import { isValidLocale } from "@/lib/coffee/i18n";
import { getCatalog } from "@/lib/coffee/service";
import type { Locale } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

export default async function KioskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const catalog = await getCatalog(typedLocale);

  return (
    <main className="pb-12">
      <PublicHeader locale={typedLocale} />
      <CatalogExperience locale={typedLocale} catalog={catalog} />
    </main>
  );
}
