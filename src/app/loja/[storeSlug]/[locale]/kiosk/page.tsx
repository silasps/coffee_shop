import { notFound } from "next/navigation";
import { CatalogExperienceStream } from "@/components/catalog-experience-stream";
import { StorefrontShell } from "@/components/storefront-shell";
import { isValidLocale } from "@/lib/coffee/i18n";
import { getCatalog, getStorefront } from "@/lib/coffee/service";
import type { Locale } from "@/lib/coffee/types";

export const revalidate = 300;

export default async function StoreKioskPage({
  params,
}: {
  params: Promise<{ storeSlug: string; locale: string }>;
}) {
  const { storeSlug, locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
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
      />
    </StorefrontShell>
  );
}
