import { notFound } from "next/navigation";
import { CatalogExperienceStream } from "@/components/catalog-experience-stream";
import { StorefrontShell } from "@/components/storefront-shell";
import { isValidLocale } from "@/lib/coffee/i18n";
import { getCatalog, getStorefront } from "@/lib/coffee/service";
import { menuAreas, type Locale, type MenuAreaSlug } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

export default async function StoreAreaPage({
  params,
}: {
  params: Promise<{ storeSlug: string; locale: string; area: string }>;
}) {
  const { storeSlug, locale, area } = await params;

  if (!isValidLocale(locale) || !menuAreas.includes(area as MenuAreaSlug)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const typedArea = area as MenuAreaSlug;
  const catalogPromise = getCatalog(typedLocale, storeSlug);
  const store = await getStorefront(storeSlug);

  if (!store) {
    notFound();
  }

  return (
    <StorefrontShell locale={typedLocale} store={store} padBottom={false}>
      <CatalogExperienceStream
        locale={typedLocale}
        storeSlug={storeSlug}
        catalogPromise={catalogPromise}
        initialArea={typedArea}
      />
    </StorefrontShell>
  );
}
