import { notFound } from "next/navigation";
import { CatalogExperienceStream } from "@/components/catalog-experience-stream";
import { StorefrontShell } from "@/components/storefront-shell";
import { DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import { isValidLocale } from "@/lib/coffee/i18n";
import { getCatalog, getStorefront } from "@/lib/coffee/service";
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
  const catalogPromise = getCatalog(typedLocale, DEFAULT_STORE_SLUG);
  const store = await getStorefront(DEFAULT_STORE_SLUG);

  if (!store) {
    notFound();
  }

  return (
    <StorefrontShell locale={typedLocale} store={store} padBottom={false}>
      <CatalogExperienceStream locale={typedLocale} catalogPromise={catalogPromise} />
    </StorefrontShell>
  );
}
