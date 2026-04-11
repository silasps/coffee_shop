import { notFound } from "next/navigation";
import { CatalogExperience } from "@/components/catalog-experience";
import { PublicHeader } from "@/components/public-header";
import { isValidLocale } from "@/lib/coffee/i18n";
import { getCatalog } from "@/lib/coffee/service";
import { menuAreas, type Locale, type MenuAreaSlug } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}) {
  const { locale, area } = await params;

  if (!isValidLocale(locale) || !menuAreas.includes(area as MenuAreaSlug)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const typedArea = area as MenuAreaSlug;
  const catalog = await getCatalog(typedLocale);

  return (
    <main className="pb-12">
      <PublicHeader locale={typedLocale} />
      <CatalogExperience
        locale={typedLocale}
        catalog={catalog}
        initialArea={typedArea}
      />
    </main>
  );
}
