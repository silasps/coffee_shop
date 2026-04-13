import { Suspense } from "react";
import { CatalogExperience } from "@/components/catalog-experience";
import { CatalogExperienceSkeleton } from "@/components/catalog-loading";
import { DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import type { Locale, MenuAreaSlug, PublicAreaData } from "@/lib/coffee/types";

type CatalogExperienceStreamProps = {
  locale: Locale;
  catalogPromise: Promise<PublicAreaData[]>;
  storeSlug?: string;
  initialArea?: MenuAreaSlug;
};

export function CatalogExperienceStream({
  locale,
  catalogPromise,
  storeSlug = DEFAULT_STORE_SLUG,
  initialArea = "hot-drinks",
}: CatalogExperienceStreamProps) {
  return (
    <Suspense fallback={<CatalogExperienceSkeleton />}>
      <CatalogExperienceContent
        locale={locale}
        catalogPromise={catalogPromise}
        storeSlug={storeSlug}
        initialArea={initialArea}
      />
    </Suspense>
  );
}

async function CatalogExperienceContent({
  locale,
  catalogPromise,
  storeSlug,
  initialArea,
}: CatalogExperienceStreamProps) {
  const catalog = await catalogPromise;

  return (
    <CatalogExperience
      locale={locale}
      catalog={catalog}
      storeSlug={storeSlug}
      initialArea={initialArea}
    />
  );
}
