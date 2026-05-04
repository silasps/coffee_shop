import { notFound } from "next/navigation";
import { CatalogExperienceStream } from "@/components/catalog-experience-stream";
import { StorefrontShell } from "@/components/storefront-shell";
import { isValidLocale } from "@/lib/coffee/i18n";
import { DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import { getCatalog, getStorefront } from "@/lib/coffee/service";
import { menuAreas, type Locale, type MenuAreaSlug } from "@/lib/coffee/types";

export const revalidate = 300;

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
  const catalogPromise = getCatalog(typedLocale, DEFAULT_STORE_SLUG);
  const store = await getStorefront(DEFAULT_STORE_SLUG);

  if (!store) {
    notFound();
  }

  return (
    <StorefrontShell locale={typedLocale} store={store} padBottom={false}>
      <CatalogExperienceStream
        locale={typedLocale}
        catalogPromise={catalogPromise}
        initialArea={typedArea}
      />
    </StorefrontShell>
  );
}
