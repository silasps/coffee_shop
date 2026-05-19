import { notFound } from "next/navigation";
import { AdminProductsPanel } from "@/components/admin-products-panel";
import { getCatalog, getOperationsDashboard, getStorefront } from "@/lib/coffee/service";
import type { MenuAreaSlug, PublicAreaData } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

const preferredAreas: MenuAreaSlug[] = ["hot-drinks", "cold-drinks", "foods"];

function isAreaData(v: PublicAreaData | undefined): v is PublicAreaData {
  return Boolean(v);
}

function normalizeFoodsArea(areaData: PublicAreaData): PublicAreaData {
  if (areaData.area !== "foods") return areaData;

  const bakedSavories = areaData.categories.find((c) => c.slug === "baked-savories");
  const cheeseBread = areaData.categories.find((c) => c.slug === "cheese-bread");

  if (!bakedSavories || !cheeseBread) return areaData;

  return {
    ...areaData,
    categories: areaData.categories
      .filter((c) => c.slug !== "cheese-bread")
      .map((c) =>
        c.slug === "baked-savories"
          ? { ...c, products: [...c.products, ...cheeseBread.products] }
          : c,
      ),
  };
}

export default async function CardapioPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ area?: string; category?: string }>;
}) {
  const { storeSlug } = await params;
  const query = await searchParams;

  const [store, dashboard, catalog] = await Promise.all([
    getStorefront(storeSlug),
    getOperationsDashboard(storeSlug),
    getCatalog("pt", storeSlug),
  ]);

  if (!store) notFound();

  const orderedCatalog = preferredAreas
    .map((area) => catalog.find((entry) => entry.area === area))
    .filter(isAreaData)
    .map(normalizeFoodsArea);

  const foodsArea = orderedCatalog.find((entry) => entry.area === "foods") ?? null;
  const availableAreas = orderedCatalog.map((entry) => entry.area);

  const requestedArea: MenuAreaSlug = availableAreas.includes(query.area as MenuAreaSlug)
    ? (query.area as MenuAreaSlug)
    : query.category && foodsArea?.categories.some((c) => c.slug === query.category)
      ? "foods"
      : orderedCatalog[0]?.area ?? "hot-drinks";

  const foodSidebarItems = (foodsArea?.categories ?? []).map((c) => ({
    slug: c.slug,
    label: c.name,
    imageUrl: c.sidebarImageUrl ?? c.products.find((p) => p.imageUrl)?.imageUrl ?? null,
    productCount: c.products.length,
  }));

  const selectedFoodCategorySlug =
    requestedArea === "foods"
      ? (foodSidebarItems.find((item) => item.slug === query.category)?.slug ??
        foodSidebarItems[0]?.slug ??
        null)
      : null;

  return (
    <AdminProductsPanel
      storeSlug={storeSlug}
      catalog={orderedCatalog}
      categories={dashboard.categories}
      sections={dashboard.sections}
      products={dashboard.products}
      initialArea={requestedArea}
      initialFoodCategorySlug={selectedFoodCategorySlug}
    />
  );
}
