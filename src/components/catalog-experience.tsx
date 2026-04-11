"use client";

import { useRouter } from "next/navigation";
import { useEffect, useDeferredValue, useRef, startTransition, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { CartDrawer } from "@/components/cart-drawer";
import { ProductArt } from "@/components/product-art";
import {
  areaHeroBackgrounds,
  formatMoney,
  getAreaDescription,
  getAreaName,
  getDictionary,
} from "@/lib/coffee/i18n";
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
  initialArea?: MenuAreaSlug;
};

const preferredOrder: MenuAreaSlug[] = ["hot-drinks", "cold-drinks", "foods"];
const FALLBACK_HEADER_HEIGHT = 152;
const FALLBACK_TOOLBAR_HEIGHT = 58;
const FALLBACK_HERO_HEIGHT = 116;

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
  initialArea = "hot-drinks",
}: CatalogExperienceProps) {
  const dictionary = getDictionary(locale);
  const copy = microcopy[locale];
  const [selectedArea, setSelectedArea] = useState<MenuAreaSlug>(initialArea);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [headerHeight, setHeaderHeight] = useState(FALLBACK_HEADER_HEIGHT);
  const [toolbarHeight, setToolbarHeight] = useState(FALLBACK_TOOLBAR_HEIGHT);
  const [heroHeight, setHeroHeight] = useState(FALLBACK_HERO_HEIGHT);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
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
  const activeFoodCategory = selectedFoodCategory ?? foodsArea?.categories[0]?.slug ?? null;

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
    : getAreaName(currentArea, locale);
  const headerDescription = isSearchMode
    ? copy.searchResultsDescription
    : getAreaDescription(currentArea, locale);
  const toolbarTop = headerHeight + 8;
  const stickyTop = toolbarTop + toolbarHeight + 16;
  const contentSpacerHeight = toolbarHeight + 12;
  const categoryScrollOffset = stickyTop + heroHeight + 20;

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-public-header='true']");

    const measure = () => {
      if (header) {
        setHeaderHeight(Math.round(header.getBoundingClientRect().height));
      }

      if (toolbarRef.current) {
        setToolbarHeight(Math.round(toolbarRef.current.getBoundingClientRect().height));
      }

      if (heroRef.current) {
        setHeroHeight(Math.round(heroRef.current.getBoundingClientRect().height));
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

    if (heroRef.current) {
      resizeObserver.observe(heroRef.current);
    }

    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section className="site-shell mt-4 pb-10">
      <div
        ref={toolbarRef}
        className="fixed left-1/2 z-40 w-[min(1280px,calc(100vw-32px))] -translate-x-1/2 bg-transparent px-1 py-1"
        style={{ top: `${toolbarTop}px` }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
          <label className="block min-w-0">
            <span className="sr-only">{copy.searchLabel}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={dictionary.searchPlaceholder}
              className="field text-sm"
            />
          </label>

          <CartDrawer locale={locale} tone="light" compact />
        </div>
      </div>

      <div style={{ height: `${contentSpacerHeight}px` }} />

      <div className="grid grid-cols-[94px_minmax(0,1fr)] gap-3 sm:grid-cols-[102px_minmax(0,1fr)] sm:gap-4 lg:grid-cols-[120px_minmax(0,1fr)] lg:gap-5">
        <aside className="sticky self-start" style={{ top: `${stickyTop}px` }}>
          <nav
            className="no-scrollbar flex flex-col gap-5 overflow-y-auto pr-1"
            style={{ maxHeight: `calc(100vh - ${stickyTop + 16}px)` }}
          >
            <SidebarGroup title={sidebarHeadings[locale].drinks}>
              {drinksAreas.map((areaData) => (
                <SidebarTile
                  key={areaData.area}
                  label={getAreaName(areaData.area, locale)}
                  active={currentArea === areaData.area}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedArea(areaData.area);
                    });
                  }}
                />
              ))}
            </SidebarGroup>

            {foodsArea ? (
              <SidebarGroup title={sidebarHeadings[locale].foods}>
                {foodSidebarItems.map((item) => (
                  <div key={item.slug}>
                    <SidebarTile
                      label={item.label}
                      active={
                        currentArea === "foods" &&
                        activeFoodCategory === item.slug
                      }
                      onClick={() => {
                        startTransition(() => {
                          setSelectedArea("foods");
                          setSelectedFoodCategory(item.slug);
                        });

                        window.requestAnimationFrame(() => {
                          window.requestAnimationFrame(() => {
                            document
                              .getElementById(item.slug)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          });
                        });
                      }}
                    />
                  </div>
                ))}
              </SidebarGroup>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          <div
            ref={heroRef}
            className="sticky z-20 overflow-hidden rounded-[28px] border border-[var(--line)] bg-[#fff7f0] shadow-[0_18px_40px_rgba(61,34,23,0.08)]"
            style={{
              top: `${stickyTop}px`,
              ...(isSearchMode ? {} : { backgroundImage: areaHeroBackgrounds[currentArea] }),
            }}
          >
            <div className="px-4 py-3 sm:px-5 sm:py-4">
              <h1 className="display-title text-2xl font-semibold leading-none text-[var(--espresso)] sm:text-3xl">
                {headerTitle}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {headerDescription}
              </p>
            </div>
          </div>

          {contentAreas.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-[var(--line)] bg-white/70 px-5 py-8 text-center">
              <p className="text-base font-semibold text-[var(--espresso)]">
                {copy.noResultsTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {copy.noResultsText}
              </p>
            </div>
          ) : isSearchMode ? (
            contentAreas.map((areaData) => (
              <div key={areaData.area} className="space-y-4">
                <div className="px-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                    {copy.areaLabel}
                  </p>
                  <h2 className="display-title mt-2 text-2xl font-semibold text-[var(--espresso)] sm:text-3xl">
                    {getAreaName(areaData.area, locale)}
                  </h2>
                </div>

                {areaData.categories.map((category) => (
                  <CategorySection
                    key={category.slug}
                    locale={locale}
                    category={category}
                    availableLabel={copy.availableLabel}
                    scrollOffset={categoryScrollOffset}
                  />
                ))}
              </div>
            ))
          ) : (
            contentAreas[0].categories.map((category) => (
              <CategorySection
                key={category.slug}
                locale={locale}
                category={category}
                availableLabel={copy.availableLabel}
                scrollOffset={categoryScrollOffset}
              />
            ))
          )}
        </div>
      </div>
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
      <p className="border-b border-[rgba(72,46,34,0.16)] pb-1 text-center text-[13px] font-semibold text-[var(--espresso)]">
        {title}
      </p>
      <div className="flex flex-col items-center gap-2">{children}</div>
    </div>
  );
}

function SidebarTile({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-[82px] w-[82px] items-center justify-center rounded-[22px] border px-2 text-center transition hover:-translate-y-[1px] sm:h-[88px] sm:w-[88px] lg:h-[92px] lg:w-[92px] ${
        active
          ? "border-[#f4cf3d] bg-[#5a3425] shadow-[0_0_0_2px_rgba(244,207,61,0.28)]"
          : "border-[rgba(90,52,37,0.2)] bg-[#5a3425] shadow-[0_10px_20px_rgba(61,34,23,0.12)]"
      }`}
    >
      <span className="display-title text-[11px] leading-[1.15] text-white sm:text-[12px]">
        {label}
      </span>
    </button>
  );
}

function CategorySection({
  locale,
  category,
  availableLabel,
  scrollOffset,
}: {
  locale: Locale;
  category: PublicCategory;
  availableLabel: string;
  scrollOffset: number;
}) {
  const dictionary = getDictionary(locale);

  return (
    <section
      id={category.slug}
      className="overflow-hidden rounded-[30px] border border-[var(--line)] bg-[rgba(255,252,248,0.92)] shadow-[0_16px_32px_rgba(61,34,23,0.06)]"
      style={{ scrollMarginTop: `${scrollOffset}px` }}
    >
      <div className="border-b border-[rgba(72,46,34,0.08)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              {dictionary.categoriesLabel}
            </p>
            <h2 className="display-title mt-2 text-2xl font-semibold text-[var(--espresso)] sm:text-3xl">
              {category.name}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {category.description}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {category.products.map((product) => (
          <ProductRow
            key={product.slug}
            locale={locale}
            product={product}
            availableLabel={availableLabel}
          />
        ))}
      </div>
    </section>
  );
}

function ProductRow({
  locale,
  product,
  availableLabel,
}: {
  locale: Locale;
  product: PublicProduct;
  availableLabel: string;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${dictionary.detailLabel}: ${product.name}`}
      onClick={() => router.push(`/${locale}/produto/${product.slug}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/${locale}/produto/${product.slug}`);
        }
      }}
      className="cursor-pointer rounded-[26px] border border-[rgba(72,46,34,0.1)] bg-white p-3 shadow-[0_12px_28px_rgba(61,34,23,0.05)] transition hover:-translate-y-[1px] sm:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <ProductArt title={product.name} tone={product.artTone} size="compact" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-5 text-[var(--espresso)] sm:text-lg">
              {product.name}
            </h3>
            {product.highlight ? (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                {product.highlight}
              </p>
            ) : null}
          </div>

          <p className="mt-2 text-[13px] leading-5 text-[var(--muted)]">
            {product.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[22px] font-semibold leading-none text-[var(--espresso)]">
            {formatMoney(product.price, locale)}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {product.prepMinutes ? `${product.prepMinutes} min` : availableLabel}
          </p>
        </div>
      </div>

      <div
        className="mt-4"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <AddToCartButton
          locale={locale}
          slug={product.slug}
          name={product.originalName}
          price={product.price}
          area={product.area}
          disabled={!product.isAvailable}
          variant="compact"
        />
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
  }));
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
