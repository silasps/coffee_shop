"use client";

import { useEffect, useDeferredValue, useRef, startTransition, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { CartDrawer } from "@/components/cart-drawer";
import { ProductArt } from "@/components/product-art";
import {
  formatMoney,
  getAreaName,
  getDictionary,
} from "@/lib/coffee/i18n";
import { DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import type {
  Locale,
  MenuAreaSlug,
  PublicAreaData,
  PublicCategory,
  PublicProduct,
} from "@/lib/coffee/types";

type CatalogExperienceProps = {
  locale: Locale;
  catalog: PublicAreaData[];
  storeSlug?: string;
  initialArea?: MenuAreaSlug;
};

const preferredOrder: MenuAreaSlug[] = ["hot-drinks", "cold-drinks", "foods"];
const FALLBACK_HEADER_HEIGHT = 118;
const FALLBACK_TOOLBAR_HEIGHT = 46;

const foodCategoryLabelOverrides = {
  pt: {
    desserts: "Bolos",
  },
  en: {},
  es: {},
} as const;

const sidebarHeadings = {
  pt: {
    drinks: "Bebidas",
    foods: "Comidas",
  },
  en: {
    drinks: "Drinks",
    foods: "Food",
  },
  es: {
    drinks: "Bebidas",
    foods: "Comidas",
  },
} as const;

function isAreaData(areaData: PublicAreaData | undefined): areaData is PublicAreaData {
  return Boolean(areaData);
}

const microcopy = {
  pt: {
    searchLabel: "Buscar em todo o cardápio",
    searchResultsTitle: "Busca no cardápio",
    searchResultsDescription: "Resultados encontrados em todas as seções da casa.",
    areaLabel: "Área",
    availableLabel: "Disponível agora",
    noResultsTitle: "Nada apareceu nesta busca.",
    noResultsText: "Tente outro termo ou toque em outra área no menu lateral.",
  },
  en: {
    searchLabel: "Search the full menu",
    searchResultsTitle: "Menu search",
    searchResultsDescription: "Results found across every menu area.",
    areaLabel: "Area",
    availableLabel: "Available now",
    noResultsTitle: "Nothing matched this search.",
    noResultsText: "Try another term or switch to a different area in the side menu.",
  },
  es: {
    searchLabel: "Buscar en todo el menú",
    searchResultsTitle: "Búsqueda en el menú",
    searchResultsDescription: "Resultados encontrados en todas las áreas del menú.",
    areaLabel: "Área",
    availableLabel: "Disponible ahora",
    noResultsTitle: "Nada apareció en esta búsqueda.",
    noResultsText: "Prueba otro término o cambia de área en el menú lateral.",
  },
} as const;

export function CatalogExperience({
  locale,
  catalog,
  storeSlug = DEFAULT_STORE_SLUG,
  initialArea = "hot-drinks",
}: CatalogExperienceProps) {
  const dictionary = getDictionary(locale);
  const copy = microcopy[locale];
  const [selectedArea, setSelectedArea] = useState<MenuAreaSlug>(initialArea);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [headerHeight, setHeaderHeight] = useState(FALLBACK_HEADER_HEIGHT);
  const [toolbarHeight, setToolbarHeight] = useState(FALLBACK_TOOLBAR_HEIGHT);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  const orderedCatalog = preferredOrder
    .map((area) => catalog.find((entry) => entry.area === area))
    .filter(isAreaData)
    .map(normalizeAreaData);

  const currentArea =
    orderedCatalog.find((entry) => entry.area === selectedArea)?.area ??
    orderedCatalog[0]?.area ??
    "hot-drinks";

  const activeArea =
    orderedCatalog.find((entry) => entry.area === currentArea) ?? orderedCatalog[0] ?? null;

  const drinksAreas = orderedCatalog.filter((entry) => entry.area !== "foods");
  const foodsArea = orderedCatalog.find((entry) => entry.area === "foods") ?? null;
  const foodSidebarItems = foodsArea ? buildFoodSidebarItems(foodsArea, locale) : [];
  const selectedCategory =
    activeArea?.categories.find((category) => category.slug === selectedCategorySlug) ?? null;

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? orderedCatalog
        .map((areaData) => filterAreaByQuery(areaData, normalizedQuery))
        .filter((areaData) => areaData.categories.length > 0)
    : [];

  const isSearchMode = normalizedQuery.length > 0;
  const contentAreas = isSearchMode
    ? searchResults
    : activeArea
      ? [activeArea]
      : [];

  const headerTitle = isSearchMode
    ? copy.searchResultsTitle
    : selectedCategory?.name ?? getAreaName(currentArea, locale);
  const toolbarTop = headerHeight + 6;
  const stickyTop = toolbarTop + toolbarHeight + 12;
  const contentSpacerHeight = toolbarHeight + 8;
  const viewportPanelHeight = `calc(100dvh - ${stickyTop + 14}px)`;

  const resetContentScroll = () => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        contentRef.current?.scrollTo({ top: 0, left: 0 });
      });
    });
  };

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-public-header='true']");

    const measure = () => {
      if (header) {
        setHeaderHeight(Math.round(header.getBoundingClientRect().height));
      }

      if (toolbarRef.current) {
        setToolbarHeight(Math.round(toolbarRef.current.getBoundingClientRect().height));
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    if (header) {
      resizeObserver.observe(header);
    }

    if (toolbarRef.current) {
      resizeObserver.observe(toolbarRef.current);
    }

    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section className="site-shell mt-4 overflow-hidden">
      <div
        ref={toolbarRef}
        className="fixed left-1/2 z-40 w-[min(1280px,calc(100vw-32px))] -translate-x-1/2 bg-transparent px-1 py-1"
        style={{ top: `${toolbarTop}px` }}
      >
        <div className="grid items-center">
          <label className="block min-w-0">
            <span className="sr-only">{copy.searchLabel}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={dictionary.searchPlaceholder}
              className="field h-10 rounded-[14px] border-[rgba(61,34,23,0.1)] bg-[rgba(255,253,249,0.72)] px-4 py-2 text-[13px] shadow-[0_8px_20px_rgba(61,34,23,0.06)] backdrop-blur-md placeholder:text-[rgba(110,91,81,0.72)]"
            />
          </label>
        </div>
      </div>

      <div style={{ height: `${contentSpacerHeight}px` }} />

      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-4 lg:grid-cols-[156px_minmax(0,1fr)] lg:gap-5">
        <aside className="sticky self-start overflow-hidden" style={{ top: `${stickyTop}px` }}>
          <nav
            className="no-scrollbar flex flex-col gap-5 overflow-y-auto rounded-[32px] bg-[rgba(255,253,249,0.92)] px-3 py-5 sm:px-4"
            style={{ maxHeight: viewportPanelHeight }}
          >
            <SidebarGroup title={sidebarHeadings[locale].drinks}>
              {drinksAreas.map((areaData) => {
                const label = getAreaName(areaData.area, locale);

                return (
                  <SidebarTile
                    key={areaData.area}
                    label={label}
                    area={areaData.area}
                    imageUrl={getAreaPreviewImage(areaData)}
                    active={currentArea === areaData.area}
                    onClick={() => {
                      resetContentScroll();
                      startTransition(() => {
                        setSelectedArea(areaData.area);
                        setSelectedCategorySlug(null);
                      });
                    }}
                  />
                );
              })}
            </SidebarGroup>

            {foodsArea ? (
              <SidebarGroup title={sidebarHeadings[locale].foods}>
                {foodSidebarItems.map((item) => (
                  <div key={item.slug}>
                    <SidebarTile
                      label={item.label}
                      area="foods"
                      imageUrl={item.imageUrl}
                      active={currentArea === "foods" && selectedCategorySlug === item.slug}
                      onClick={() => {
                      resetContentScroll();
                      startTransition(() => {
                        setSelectedArea("foods");
                        setSelectedCategorySlug(item.slug);
                      });
                    }}
                  />
                  </div>
                ))}
              </SidebarGroup>
            ) : null}
          </nav>
        </aside>

        <div className="sticky min-w-0 self-start" style={{ top: `${stickyTop}px` }}>
          <div
            className="flex overflow-hidden rounded-[28px] border border-[var(--line)] bg-[rgba(255,250,244,0.78)] shadow-[0_18px_40px_rgba(61,34,23,0.08)]"
            style={{ height: viewportPanelHeight }}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <div
                className="shrink-0 overflow-hidden border-b border-[rgba(72,46,34,0.12)] bg-[rgba(255,247,240,0.94)] backdrop-blur-sm"
              >
                <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center px-4 py-3 sm:px-5 sm:py-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      resetContentScroll();
                      setSelectedCategorySlug(null);
                    }}
                    className={`text-3xl font-semibold leading-none text-[var(--espresso)] ${
                      selectedCategory && !isSearchMode ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                    aria-label="Voltar"
                  >
                    {"<"}
                  </button>
                  <h1 className="display-title text-center text-lg font-semibold leading-none text-[var(--espresso)] sm:text-2xl">
                    {headerTitle}
                  </h1>
                  <span aria-hidden="true" />
                </div>
              </div>

              <div
                ref={contentRef}
                className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
              >
                <div className="space-y-3">
                  {contentAreas.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-[var(--line)] bg-white/70 px-5 py-8 text-center">
                      <p className="text-base font-semibold text-[var(--espresso)]">
                        {copy.noResultsTitle}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {copy.noResultsText}
                      </p>
                    </div>
                  ) : isSearchMode ? (
                    contentAreas.map((areaData) => (
                      <div key={areaData.area} className="space-y-3">
                        <div className="px-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                            {copy.areaLabel}
                          </p>
                          <h2 className="display-title mt-2 text-lg font-semibold text-[var(--espresso)] sm:text-2xl">
                            {getAreaName(areaData.area, locale)}
                          </h2>
                        </div>

                        {areaData.categories.map((category) => (
                          <ProductList
                            key={category.slug}
                            locale={locale}
                            category={category}
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="space-y-3">
                      {selectedCategory ? (
                        <ProductList locale={locale} category={selectedCategory} />
                      ) : contentAreas[0].categories.length === 0 ? (
                        <div className="rounded-[26px] border border-dashed border-[var(--line)] bg-white/70 px-5 py-8 text-center">
                          <p className="text-base font-semibold text-[var(--espresso)]">
                            {copy.noResultsTitle}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            {copy.noResultsText}
                          </p>
                        </div>
                      ) : (
                        <CategoryTileGrid
                          categories={contentAreas[0].categories}
                          onSelect={(categorySlug) => {
                            resetContentScroll();
                            setSelectedCategorySlug(categorySlug);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CartDrawer locale={locale} storeSlug={storeSlug} tone="light" docked />
    </section>
  );
}

function SidebarGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="pb-1 text-left text-base font-medium leading-none text-black sm:text-lg">
        {title}
      </p>
      <div className="flex flex-col items-center gap-3">{children}</div>
    </div>
  );
}

function SidebarTile({
  label,
  area,
  imageUrl,
  active,
  onClick,
}: {
  label: string;
  area?: MenuAreaSlug;
  imageUrl?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex h-[82px] w-[82px] items-end overflow-hidden rounded-[22px] border p-2.5 text-left transition hover:-translate-y-[1px] sm:h-[88px] sm:w-[88px] sm:p-3 lg:h-[92px] lg:w-[92px] ${
        active
          ? "border-[#f4cf3d] shadow-[0_0_0_2px_rgba(244,207,61,0.28),0_16px_28px_rgba(61,34,23,0.18)]"
          : "border-[rgba(90,52,37,0.2)] shadow-[0_10px_20px_rgba(61,34,23,0.12)]"
      }`}
    >
      <SectionCardArt label={label} area={area} imageUrl={imageUrl} />
      <span
        className="display-title relative z-10 block w-full break-words text-[12px] leading-[0.96] text-white sm:text-[13px]"
        style={{ textShadow: "0 3px 14px rgba(0, 0, 0, 0.5)" }}
      >
        {label}
      </span>
    </button>
  );
}

function SectionCardArt({
  label,
  area,
  imageUrl,
}: {
  label: string;
  area?: MenuAreaSlug;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${imageUrl.replace(/"/g, '\\"')}")` }}
      >
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,16,10,0.04),rgba(28,16,10,0.5))]" />
      </span>
    );
  }

  return (
    <span className="absolute inset-0 overflow-hidden">
      <ProductArt title={label} tone="cream" size="column" area={area} imageUrl={null} />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,16,10,0.08),rgba(28,16,10,0.56))]" />
    </span>
  );
}

function CategoryTileGrid({
  categories,
  onSelect,
}: {
  categories: PublicCategory[];
  onSelect: (categorySlug: string) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 p-4 sm:gap-4 sm:p-5 lg:grid-cols-4">
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          onClick={() => onSelect(category.slug)}
          className="relative flex aspect-square min-w-0 items-end justify-center overflow-hidden rounded-[22px] text-center text-sm font-medium leading-tight text-white transition hover:-translate-y-[1px] min-[430px]:text-base sm:min-h-[132px] sm:rounded-[24px]"
        >
          <SectionCardArt
            label={category.name}
            area={category.area}
            imageUrl={getCategoryPreviewImage(category)}
          />
          <span
            className="display-title relative z-10 flex min-h-10 items-center justify-center px-2 py-2 text-xs leading-none min-[430px]:text-sm sm:min-h-12 sm:px-3 sm:py-3 sm:text-base"
            style={{ textShadow: "0 3px 14px rgba(0, 0, 0, 0.5)" }}
          >
            {category.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function ProductList({
  locale,
  category,
}: {
  locale: Locale;
  category: PublicCategory;
}) {
  return (
    <section
      aria-label={category.name}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-1 gap-3 p-3 min-[520px]:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-3">
        {category.products.map((product) => (
          <ProductRow
            key={product.slug}
            locale={locale}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}

function ProductRow({
  locale,
  product,
}: {
  locale: Locale;
  product: PublicProduct;
}) {
  return (
    <article
      aria-label={product.name}
      className="min-w-0 overflow-hidden rounded-[24px] bg-[#d9d9d9] shadow-[0_10px_20px_rgba(61,34,23,0.1)] transition hover:-translate-y-[1px]"
    >
      <div className="flex h-full flex-col">
        <div className="relative">
          <ProductArt
            title={product.name}
            tone={product.artTone}
            size="default"
            area={product.area}
            imageUrl={product.imageUrl}
          />
          {product.highlight ? (
            <span className="absolute right-3 top-3 rounded-full bg-[rgba(255,248,236,0.9)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)] shadow-[0_8px_18px_rgba(61,34,23,0.12)]">
              {product.highlight}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold leading-4 text-black sm:text-xl sm:leading-6">
            {product.name}
          </h3>

          <p className="mt-2 text-base leading-6 text-black">
            {product.description}
          </p>

          <div className="mt-4">
            <p className="text-base font-semibold leading-none text-black sm:text-2xl">
              {formatMoney(product.price, locale)}
            </p>

            <div
              className="mt-4"
            >
                    <AddToCartButton
                      locale={locale}
                      slug={product.slug}
                      name={product.name}
                      price={product.price}
                      area={product.area}
                      disabled={!product.isAvailable}
                variant="compact"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function buildFoodSidebarItems(areaData: PublicAreaData, locale: Locale) {
  const labels = foodCategoryLabelOverrides[locale];

  return areaData.categories.map((category) => ({
    slug: category.slug,
    label:
      category.slug in labels
        ? labels[category.slug as keyof typeof labels]
        : category.name,
    imageUrl: getCategoryPreviewImage(category),
  }));
}

function getAreaPreviewImage(areaData: PublicAreaData) {
  return (
    areaData.categories.find((category) => category.sidebarImageUrl)?.sidebarImageUrl ??
    areaData.categories
      .flatMap((category) => category.products)
      .find((product) => product.imageUrl)?.imageUrl ?? null
  );
}

function getCategoryPreviewImage(category: PublicCategory) {
  return category.sidebarImageUrl ?? category.products.find((product) => product.imageUrl)?.imageUrl ?? null;
}

function normalizeAreaData(areaData: PublicAreaData): PublicAreaData {
  if (areaData.area !== "foods") {
    return areaData;
  }

  const bakedSavories = areaData.categories.find((category) => category.slug === "baked-savories");
  const cheeseBread = areaData.categories.find((category) => category.slug === "cheese-bread");

  if (!bakedSavories || !cheeseBread) {
    return areaData;
  }

  return {
    ...areaData,
    categories: areaData.categories
      .filter((category) => category.slug !== "cheese-bread")
      .map((category) =>
        category.slug === "baked-savories"
          ? {
              ...category,
              products: [...category.products, ...cheeseBread.products],
            }
          : category,
      ),
  };
}

function filterAreaByQuery(areaData: PublicAreaData, query: string): PublicAreaData {
  return {
    ...areaData,
    categories: areaData.categories
      .map((category) => ({
        ...category,
        products: category.products.filter((product) => {
          const haystack =
            `${product.name} ${product.description} ${product.highlight ?? ""}`.toLowerCase();
          return haystack.includes(query);
        }),
      }))
      .filter((category) => category.products.length > 0),
  };
}
