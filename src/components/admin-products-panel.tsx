"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import { ColorField } from "@/components/color-field";
import { ImageUploadField } from "@/components/image-upload-field";
import { ProductArt, SectionArt } from "@/components/product-art";
import {
  createCategoryAction,
  createProductAction,
  deleteProductAction,
  updateCatalogSectionAction,
  updateCategoryVisualAction,
  updateProductAction,
} from "@/app/admin/actions";
import { resolveLocalizedText } from "@/lib/coffee/content-i18n";
import { formatMoney } from "@/lib/coffee/i18n";
import type {
  CatalogDashboardCategory,
  CatalogDashboardProduct,
  CatalogDashboardSection,
  MenuAreaSlug,
  PublicAreaData,
  PublicCategory,
} from "@/lib/coffee/types";

type TranslationLocale = "pt" | "en" | "es";

type LocalizedFieldDefaults = Partial<Record<TranslationLocale, string | null | undefined>>;
type CatalogSectionSlug = "drinks" | "foods";
type ProductFlowView = "root-categories" | "sections" | "categories" | "products";
type AdminProductsModal =
  | { type: "create-category" }
  | { type: "edit-section"; area: MenuAreaSlug }
  | { type: "edit-category"; categorySlug: string }
  | { type: "create-product"; categorySlug: string }
  | { type: "edit-product"; productId: string }
  | null;

const translationLocales = ["pt", "en", "es"] as const;

type AdminProductsPanelProps = {
  storeSlug: string;
  catalog: PublicAreaData[];
  categories: CatalogDashboardCategory[];
  sections: CatalogDashboardSection[];
  products: CatalogDashboardProduct[];
  initialArea: MenuAreaSlug;
  initialFoodCategorySlug: string | null;
};

const areaLabels = {
  foods: "Comidas",
  "hot-drinks": "Bebidas quentes",
  "cold-drinks": "Bebidas geladas",
} as const;

const sidebarGroupLabels = {
  drinks: "Bebidas",
  foods: "Comidas",
} as const;

const foodCategoryLabelOverrides = {
} as const;

function getCategoryTranslationValue(
  category: CatalogDashboardCategory | null | undefined,
  locale: "en" | "es",
  field: "name" | "description",
) {
  if (!category) {
    return "";
  }

  return (
    resolveLocalizedText(
      locale,
      field === "name"
        ? {
            pt: category.namePt,
            en: category.nameEn,
            es: category.nameEs,
          }
        : {
            pt: category.descriptionPt,
            en: category.descriptionEn,
            es: category.descriptionEs,
          },
      {
        kind: field === "name" ? "category-name" : "category-description",
        slug: category.slug,
      },
    ) ?? ""
  );
}

function getSectionTranslationValue(
  section: CatalogDashboardSection | null | undefined,
  locale: "en" | "es",
  field: "name" | "description",
) {
  if (!section) {
    return "";
  }

  return (
    resolveLocalizedText(
      locale,
      field === "name"
        ? {
            pt: section.namePt,
            en: section.nameEn,
            es: section.nameEs,
          }
        : {
            pt: section.descriptionPt,
            en: section.descriptionEn,
            es: section.descriptionEs,
          },
      {
        kind: field === "name" ? "category-name" : "category-description",
        slug: section.area,
      },
    ) ?? ""
  );
}

function getProductTranslationValue(
  product: CatalogDashboardProduct,
  locale: "en" | "es",
  field: "name" | "description" | "highlight",
) {
  return (
    resolveLocalizedText(
      locale,
      field === "name"
        ? {
            pt: product.namePt,
            en: product.nameEn,
            es: product.nameEs,
          }
        : field === "description"
          ? {
              pt: product.descriptionPt,
              en: product.descriptionEn,
              es: product.descriptionEs,
            }
          : {
              pt: product.highlightPt,
              en: product.highlightEn,
              es: product.highlightEs,
            },
      {
        kind:
          field === "name"
            ? "product-name"
            : field === "description"
              ? "product-description"
              : "product-highlight",
        slug: product.slug,
      },
    ) ?? ""
  );
}

function getCategoryPreviewImage(category: PublicCategory) {
  return category.sidebarImageUrl ?? category.products.find((product) => product.imageUrl)?.imageUrl ?? null;
}

function getAreaPreviewImage(areaData: PublicAreaData | null | undefined) {
  return areaData?.categories.map(getCategoryPreviewImage).find(Boolean) ?? null;
}

function getRootPreviewImage(areaData: PublicAreaData[]) {
  return areaData.flatMap((entry) => entry.categories).map(getCategoryPreviewImage).find(Boolean) ?? null;
}

function buildFoodSidebarItems(areaData: PublicAreaData) {
  return areaData.categories.map((category) => ({
    slug: category.slug,
    label:
      category.slug in foodCategoryLabelOverrides
        ? foodCategoryLabelOverrides[category.slug as keyof typeof foodCategoryLabelOverrides]
        : category.name,
    imageUrl: getCategoryPreviewImage(category),
    productCount: category.products.length,
  }));
}

function getDashboardProductsForDisplayCategory(
  displayCategory: PublicCategory,
  productsBySlug: Map<string, CatalogDashboardProduct>,
) {
  return displayCategory.products.map((product, index) => {
    const dashboardProduct = productsBySlug.get(product.slug);

    if (dashboardProduct) {
      return dashboardProduct;
    }

    return {
      id: product.id,
      slug: product.slug,
      namePt: product.originalName,
      nameEn: null,
      nameEs: null,
      descriptionPt: product.description,
      descriptionEn: null,
      descriptionEs: null,
      categorySlug: product.categorySlug,
      categoryNamePt: displayCategory.namePt,
      price: product.price,
      stockQuantity: product.stockQuantity,
      isAvailable: product.isAvailable,
      isFeatured: false,
      imageUrl: product.imageUrl,
      highlightPt: product.highlight,
      highlightEn: null,
      highlightEs: null,
      sortOrder: index + 1,
    } satisfies CatalogDashboardProduct;
  });
}

function getAdminProductTone(area: MenuAreaSlug) {
  if (area === "cold-drinks") {
    return "cream" as const;
  }

  if (area === "hot-drinks") {
    return "mocha" as const;
  }

  return "amber" as const;
}

function getLocalizedFieldName(fieldBase: string, locale: TranslationLocale) {
  return `${fieldBase}${locale.charAt(0).toUpperCase()}${locale.slice(1)}`;
}

function setGlobalActionFeedback(visible: boolean) {
  window.dispatchEvent(
    new CustomEvent(`global-action-feedback:${visible ? "show" : "hide"}`),
  );
}

async function translateText({
  text,
  from,
  to,
}: {
  text: string;
  from: TranslationLocale;
  to: TranslationLocale[];
}) {
  const response = await fetch("/api/admin/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, from, to }),
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { translations?: Partial<Record<TranslationLocale, string>> };
}

async function fillSiblingTranslations(
  control: HTMLInputElement | HTMLTextAreaElement,
  fieldBase: string,
) {
  const form = control.form;
  const from = control.dataset.locale as TranslationLocale | undefined;
  const text = control.value.trim();

  if (!form || !from || !text) {
    return;
  }

  control.dataset.autoTranslated = "false";

  const targets = translationLocales.filter((locale) => locale !== from);
  const fieldsToFill = targets
    .map((locale) => {
      const field = form.elements.namedItem(getLocalizedFieldName(fieldBase, locale));
      return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
        ? { locale, field }
        : null;
    })
    .filter((entry): entry is { locale: TranslationLocale; field: HTMLInputElement | HTMLTextAreaElement } => {
      if (!entry) {
        return false;
      }

      return !entry.field.value.trim() || entry.field.dataset.autoTranslated === "true";
    });

  if (fieldsToFill.length === 0) {
    return;
  }

  setGlobalActionFeedback(true);

  const result = await translateText({
    text,
    from,
    to: fieldsToFill.map((entry) => entry.locale),
  }).finally(() => {
    setGlobalActionFeedback(false);
  });

  if (!result?.translations) {
    return;
  }

  fieldsToFill.forEach(({ locale, field }) => {
    const translated = result.translations?.[locale]?.trim();

    if (translated) {
      field.value = translated;
      field.dataset.autoTranslated = "true";
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}

function LocalizedTextFields({
  fieldBase,
  labels,
  placeholders,
  defaultValues = {},
  textarea = false,
  requiredPt = false,
  minHeightClass = "min-h-24",
}: {
  fieldBase: string;
  labels: Record<TranslationLocale, string>;
  placeholders?: Partial<Record<TranslationLocale, string>>;
  defaultValues?: LocalizedFieldDefaults;
  textarea?: boolean;
  requiredPt?: boolean;
  minHeightClass?: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {translationLocales.map((locale) => {
        const name = getLocalizedFieldName(fieldBase, locale);
        const commonProps = {
          name,
          "data-locale": locale,
          className: textarea ? `textarea ${minHeightClass}` : "field",
          defaultValue: defaultValues[locale] ?? "",
          placeholder: placeholders?.[locale],
          required: requiredPt && locale === "pt",
          onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            event.currentTarget.dataset.autoTranslated = "false";
          },
          onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            void fillSiblingTranslations(event.currentTarget, fieldBase);
          },
        };

        return (
          <label key={locale} className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
              {labels[locale]}
            </span>
            {textarea ? <textarea {...commonProps} /> : <input {...commonProps} />}
          </label>
        );
      })}
    </div>
  );
}

export function AdminProductsPanel({
  storeSlug,
  catalog,
  categories,
  sections,
  products,
  initialArea,
  initialFoodCategorySlug,
}: AdminProductsPanelProps) {
  const foodsArea = catalog.find((entry) => entry.area === "foods") ?? null;
  const drinksAreas = catalog.filter((entry) => entry.area !== "foods");
  const foodSidebarItems = foodsArea ? buildFoodSidebarItems(foodsArea) : [];
  const availableAreas = catalog.map((entry) => entry.area);
  const categoriesBySlug = new Map<string, CatalogDashboardCategory>(
    categories.map((category) => [category.slug, category]),
  );
  const productsBySlug = new Map<string, CatalogDashboardProduct>(
    products.map((product) => [product.slug, product]),
  );
  const sectionsByArea = new Map<MenuAreaSlug, CatalogDashboardSection>(
    sections.map((section) => [section.area, section]),
  );
  const contentRef = useRef<HTMLDivElement | null>(null);
  const initialSelectedArea = availableAreas.includes(initialArea)
    ? initialArea
    : catalog[0]?.area ?? "hot-drinks";
  const [selectedSection, setSelectedSection] = useState<CatalogSectionSlug>(
    initialSelectedArea === "foods" ? "foods" : "drinks",
  );
  const [selectedDrinkArea, setSelectedDrinkArea] = useState<MenuAreaSlug>(
    initialSelectedArea === "foods" ? drinksAreas[0]?.area ?? "hot-drinks" : initialSelectedArea,
  );
  const [flowView, setFlowView] = useState<ProductFlowView>(
    initialSelectedArea === "foods" && initialFoodCategorySlug ? "products" : "root-categories",
  );
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    initialSelectedArea === "foods" ? initialFoodCategorySlug : null,
  );
  const [modal, setModal] = useState<AdminProductsModal>(null);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("section", "products");

    if (selectedSection === "foods") {
      params.set("area", "foods");

      if (selectedCategorySlug) {
        params.set("category", selectedCategorySlug);
      } else {
        params.delete("category");
      }
    } else {
      params.set("area", selectedDrinkArea);
      params.delete("category");
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedCategorySlug, selectedDrinkArea, selectedSection]);

  const displayCategories =
    selectedSection === "foods"
      ? foodsArea?.categories ?? []
      : catalog.find((entry) => entry.area === selectedDrinkArea)?.categories ?? [];
  const selectedCategory =
    selectedCategorySlug && displayCategories.some((category) => category.slug === selectedCategorySlug)
      ? displayCategories.find((category) => category.slug === selectedCategorySlug) ?? null
      : null;
  const selectedCategoryProducts = selectedCategory
    ? getDashboardProductsForDisplayCategory(selectedCategory, productsBySlug)
    : [];
  const activeCatalogLabel = sidebarGroupLabels[selectedSection];
  const activeSubsectionLabel =
    selectedSection === "foods"
      ? sectionsByArea.get("foods")?.namePt ?? "Comidas"
      : sectionsByArea.get(selectedDrinkArea)?.namePt ?? areaLabels[selectedDrinkArea];
  const drinksProductCount = drinksAreas.reduce(
    (total, entry) => total + entry.categories.reduce((areaTotal, category) => areaTotal + category.products.length, 0),
    0,
  );
  const foodsProductCount =
    foodsArea?.categories.reduce((total, category) => total + category.products.length, 0) ?? 0;
  const activeCatalogProductCount =
    flowView === "root-categories"
      ? drinksProductCount + foodsProductCount
      : flowView === "products" && selectedCategory
      ? selectedCategoryProducts.length
      : displayCategories.reduce((total, category) => total + category.products.length, 0);
  const createCategoryArea = selectedSection === "foods" ? "foods" : selectedDrinkArea;
  const modalCategorySlug =
    modal?.type === "edit-category" || modal?.type === "create-product" ? modal.categorySlug : null;
  const modalCategoryRecord = modalCategorySlug ? categoriesBySlug.get(modalCategorySlug) ?? null : null;
  const modalSection = modal?.type === "edit-section" ? sectionsByArea.get(modal.area) ?? null : null;
  const modalPublicCategory = modalCategorySlug
    ? catalog.flatMap((entry) => entry.categories).find((category) => category.slug === modalCategorySlug) ??
      null
    : null;
  const modalProduct =
    modal?.type === "edit-product" ? products.find((product) => product.id === modal.productId) ?? null : null;
  const closeModalOnSubmit = () => {
    setModal(null);
  };

  return (
    <div className="pb-1">
      <section className="card-panel overflow-hidden p-4 sm:p-5">
        <div className="min-h-[62vh] rounded-[28px] border border-[var(--line)] bg-[rgba(255,250,244,0.82)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">
                {flowView === "root-categories"
                  ? "Gestão de produtos"
                  : flowView === "sections"
                    ? "Categorias"
                  : flowView === "categories"
                    ? activeCatalogLabel
                    : selectedCategory?.name ?? activeSubsectionLabel}
              </p>
              <h2 className="text-2xl font-semibold text-[var(--espresso)]">
                {flowView === "root-categories"
                  ? "Categorias"
                  : flowView === "sections"
                    ? "Seções"
                  : flowView === "categories"
                    ? "Subseções"
                    : "Produtos"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {flowView !== "root-categories" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (flowView === "products" && selectedSection === "drinks") {
                      setFlowView("categories");
                    } else if (flowView === "products" && selectedSection === "foods") {
                      setFlowView("sections");
                    } else if (flowView === "categories") {
                      setFlowView("sections");
                    } else {
                      setFlowView("root-categories");
                    }
                  }}
                  className="rounded-full border border-[var(--line)] bg-white/86 px-4 py-2 text-sm font-semibold text-[var(--espresso)]"
                >
                  Voltar
                </button>
              ) : null}
              <span className="rounded-full bg-[rgba(61,34,23,0.08)] px-3 py-2 text-xs font-semibold text-[var(--espresso)]">
                {activeCatalogProductCount} produtos
              </span>
            </div>
          </div>

          {flowView === "root-categories" ? (
            <div ref={contentRef} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedSection("drinks");
                  setSelectedCategorySlug(null);
                  setFlowView("sections");
                }}
                className="group relative min-h-[168px] overflow-hidden rounded-[18px] text-left shadow-[0_16px_34px_rgba(61,34,23,0.1)] transition hover:-translate-y-[1px]"
              >
                <SectionArt label="Bebidas" area="cold-drinks" imageUrl={getRootPreviewImage(drinksAreas)} />
                <span className="relative z-10 flex h-full min-h-[168px] flex-col justify-end p-4 text-white">
                  <span className="text-xl font-semibold leading-tight">Bebidas</span>
                  <span className="mt-1 text-sm font-semibold text-white/82">
                    {drinksAreas.length} seções · {drinksProductCount} produtos
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSection("foods");
                  setSelectedCategorySlug(null);
                  setFlowView("sections");
                }}
                className="group relative min-h-[168px] overflow-hidden rounded-[18px] text-left shadow-[0_16px_34px_rgba(61,34,23,0.1)] transition hover:-translate-y-[1px]"
              >
                <SectionArt label="Comidas" area="foods" imageUrl={getAreaPreviewImage(foodsArea)} />
                <span className="relative z-10 flex h-full min-h-[168px] flex-col justify-end p-4 text-white">
                  <span className="text-xl font-semibold leading-tight">Comidas</span>
                  <span className="mt-1 text-sm font-semibold text-white/82">
                    {foodSidebarItems.length} seções · {foodsProductCount} produtos
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModal({ type: "create-category" })}
                className="flex min-h-[168px] items-center justify-center rounded-[18px] border border-dashed border-[rgba(227,106,47,0.34)] bg-white/86 text-4xl font-semibold leading-none text-[var(--brand-strong)]"
                aria-label="Adicionar categoria"
              >
                +
              </button>
            </div>
          ) : null}

          {flowView === "sections" ? (
            <div ref={contentRef} className="mt-6">
              {selectedSection === "drinks" ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-[rgba(72,46,34,0.16)] pb-2">
                    <h3 className="text-lg font-semibold text-[var(--espresso)]">Bebidas</h3>
                    <button
                    type="button"
                    onClick={() => {
                      setSelectedSection("drinks");
                      setModal({ type: "create-category" });
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[rgba(227,106,47,0.42)] bg-white/88 text-xl font-semibold leading-none text-[var(--brand-strong)]"
                    aria-label="Adicionar seção em Bebidas"
                  >
                    +
                  </button>
                  </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {drinksAreas.map((areaData) => (
                    <button
                      key={areaData.area}
                      type="button"
                      onClick={() => {
                        setSelectedSection("drinks");
                        setSelectedDrinkArea(areaData.area);
                        setSelectedCategorySlug(null);
                        setFlowView("categories");
                      }}
                      className="relative min-h-[132px] overflow-hidden rounded-[18px] text-left transition hover:-translate-y-[1px]"
                    >
                      <SectionArt
                        label={sectionsByArea.get(areaData.area)?.namePt ?? areaLabels[areaData.area]}
                        area={areaData.area}
                        imageUrl={sectionsByArea.get(areaData.area)?.imageUrl ?? getAreaPreviewImage(areaData)}
                      />
                      <span className="relative z-10 flex h-full min-h-[132px] flex-col justify-end p-3 text-white">
                        <span className="text-sm font-semibold leading-tight">
                          {sectionsByArea.get(areaData.area)?.namePt ?? areaLabels[areaData.area]}
                        </span>
                        <span className="mt-1 text-xs font-semibold text-white/78">
                          {areaData.categories.length} subseções
                        </span>
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          setModal({ type: "edit-section", area: areaData.area });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            setModal({ type: "edit-section", area: areaData.area });
                          }
                        }}
                        className="absolute right-2 top-2 z-20 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--espresso)]"
                      >
                        Editar
                      </span>
                    </button>
                  ))}
                </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-[rgba(72,46,34,0.16)] pb-2">
                  <h3 className="text-lg font-semibold text-[var(--espresso)]">Comidas</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSection("foods");
                      setModal({ type: "create-category" });
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[rgba(227,106,47,0.42)] bg-white/88 text-xl font-semibold leading-none text-[var(--brand-strong)]"
                    aria-label="Adicionar seção em Comidas"
                  >
                    +
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {foodSidebarItems.map((item) => (
                    <article key={item.slug} className="relative min-h-[132px] overflow-hidden rounded-[18px]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSection("foods");
                          setSelectedCategorySlug(item.slug);
                          setFlowView("products");
                        }}
                        className="absolute inset-0 text-left"
                      >
                        <SectionArt label={item.label} area="foods" imageUrl={item.imageUrl} />
                        <span className="relative z-10 flex h-full min-h-[132px] flex-col justify-end p-3 text-white">
                          <span className="text-sm font-semibold leading-tight">{item.label}</span>
                          <span className="mt-1 text-xs font-semibold text-white/78">
                            {item.productCount} produtos
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ type: "edit-category", categorySlug: item.slug })}
                        className="absolute right-2 top-2 z-20 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--espresso)]"
                      >
                        Editar
                      </button>
                    </article>
                  ))}
                </div>
                </>
              )}
            </div>
          ) : null}

          {flowView === "categories" ? (
            <div ref={contentRef} className="mt-6">
              <p className="mb-3 text-base font-semibold text-[var(--espresso)]">
                {activeSubsectionLabel}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {displayCategories.map((category) => (
                  <article key={category.slug} className="relative min-h-[132px] overflow-hidden rounded-[18px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategorySlug(category.slug);
                        setFlowView("products");
                      }}
                      className="absolute inset-0 text-left"
                    >
                      <SectionArt
                        label={category.name}
                        area={category.area}
                        imageUrl={getCategoryPreviewImage(category)}
                      />
                      <span className="relative z-10 flex h-full min-h-[132px] flex-col justify-end p-3 text-white">
                        <span className="text-sm font-semibold leading-tight">{category.name}</span>
                        <span className="mt-1 text-xs font-semibold text-white/78">
                          {category.products.length} produtos
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit-category", categorySlug: category.slug })}
                      className="absolute right-2 top-2 z-20 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--espresso)]"
                    >
                      Editar
                    </button>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={() => setModal({ type: "create-category" })}
                  className="min-h-[132px] rounded-[18px] border border-dashed border-[rgba(227,106,47,0.34)] bg-white/86 p-3 text-2xl font-semibold leading-none text-[var(--brand-strong)]"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}

          {flowView === "products" && selectedCategory ? (
            <div ref={contentRef} className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-[var(--espresso)]">
                  {selectedCategory.name}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ type: "edit-category", categorySlug: selectedCategory.slug })}
                    className="rounded-full border border-[var(--line)] bg-white/88 px-3 py-2 text-xs font-semibold text-[var(--espresso)]"
                  >
                    Editar esta categoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "create-product", categorySlug: selectedCategory.slug })}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[rgba(227,106,47,0.42)] bg-white/88 text-xl font-semibold leading-none text-[var(--brand-strong)]"
                    aria-label="Adicionar produto"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {selectedCategoryProducts.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-[18px] border border-[var(--line)] bg-white/88 p-2 shadow-[0_10px_22px_rgba(61,34,23,0.05)]"
                  >
                    <ProductArt
                      title={product.namePt}
                      tone={getAdminProductTone(selectedCategory.area)}
                      area={selectedCategory.area}
                      imageUrl={product.imageUrl}
                      size="compact"
                    />
                    <div className="mt-2">
                      <h3 className="text-sm font-semibold leading-4 text-[var(--espresso)]">
                        {product.namePt}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-[var(--espresso)]">
                        {formatMoney(product.price, "pt")}
                      </p>
                      <div className="mt-2 grid gap-2">
                        <button
                          type="button"
                          onClick={() => setModal({ type: "edit-product", productId: product.id })}
                          className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--espresso)]"
                        >
                          Editar
                        </button>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="storeSlug" value={storeSlug} />
                          <input type="hidden" name="productId" value={product.id} />
                          <button
                            type="submit"
                            className="w-full rounded-full border border-[rgba(149,89,92,0.18)] px-3 py-2 text-xs font-semibold text-[var(--tone-berry)]"
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={() => setModal({ type: "create-product", categorySlug: selectedCategory.slug })}
                  className="min-h-[120px] rounded-[18px] border border-dashed border-[rgba(227,106,47,0.34)] bg-white/86 p-3 text-2xl font-semibold leading-none text-[var(--brand-strong)]"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {modal ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(40,21,14,0.48)] p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/60 bg-[rgba(255,252,248,0.98)] shadow-[0_28px_80px_rgba(40,21,14,0.3)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--espresso)]">
                {modal.type === "create-category"
                  ? `Nova seção em ${activeCatalogLabel}`
                  : modal.type === "edit-section"
                    ? "Editar seção"
                  : modal.type === "edit-category"
                    ? "Editar seção"
                    : modal.type === "create-product"
                      ? "Novo produto"
                      : "Editar produto"}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-xl leading-none text-[var(--espresso)]"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="no-scrollbar max-h-[calc(92vh-74px)] overflow-y-auto p-5">
              {modal.type === "create-category" ? (
                <form action={createCategoryAction} onSubmit={closeModalOnSubmit} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                    <div className="grid gap-4">
                      <LocalizedTextFields
                        fieldBase="name"
                        labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                        placeholders={{
                          pt: "Bebidas especiais",
                          en: "Signature drinks",
                          es: "Bebidas especiales",
                        }}
                        requiredPt
                      />
                      <LocalizedTextFields
                        fieldBase="description"
                        labels={{ pt: "Descricao PT", en: "Description EN", es: "Descripcion ES" }}
                        placeholders={{
                          pt: "Como essa nova seção aparece na vitrine.",
                          en: "How this section appears on the storefront.",
                          es: "Como aparece esta seccion en la vitrina.",
                        }}
                        textarea
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                            Seção
                          </span>
                          <select name="area" className="select" defaultValue={createCategoryArea}>
                            <optgroup label="Comidas">
                              <option value="foods">Comidas</option>
                            </optgroup>
                            <optgroup label="Bebidas">
                              <option value="hot-drinks">Bebidas quentes</option>
                              <option value="cold-drinks">Bebidas geladas</option>
                            </optgroup>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                            Posição
                          </span>
                          <select name="placement" className="select" defaultValue="LAST">
                            <option value="FIRST">Primeira da lista</option>
                            <option value="LAST">Última da lista</option>
                          </select>
                        </label>
                      </div>
                      <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                        <input type="checkbox" name="isActive" defaultChecked />
                        <span className="text-sm font-semibold text-[var(--espresso)]">
                          Seção ativa na vitrine
                        </span>
                      </label>
                    </div>
                    <div className="grid gap-4">
                      <ImageUploadField
                        name="sidebarImageUrl"
                        label="Imagem da seção"
                        description="Essa imagem pode aparecer na navegação lateral e já é otimizada automaticamente."
                        previewClassName="aspect-square rounded-[18px]"
                        cropAspectRatio={1}
                      />
                      <ColorField name="accentColor" label="Cor da seção" defaultValue="#c96b3f" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : null}

              {modal.type === "edit-section" ? (
                <form action={updateCatalogSectionAction} onSubmit={closeModalOnSubmit} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="area" value={modal.area} />

                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    defaultValues={{
                      pt: modalSection?.namePt ?? areaLabels[modal.area],
                      en: getSectionTranslationValue(modalSection, "en", "name"),
                      es: getSectionTranslationValue(modalSection, "es", "name"),
                    }}
                    requiredPt
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descricao PT", en: "Description EN", es: "Descripcion ES" }}
                    defaultValues={{
                      pt: modalSection?.descriptionPt ?? "",
                      en: getSectionTranslationValue(modalSection, "en", "description"),
                      es: getSectionTranslationValue(modalSection, "es", "description"),
                    }}
                    textarea
                  />
                  <ImageUploadField
                    name="imageUrl"
                    label="Imagem da seção"
                    defaultValue={modalSection?.imageUrl ?? getAreaPreviewImage(catalog.find((entry) => entry.area === modal.area))}
                    description="Essa imagem aparece nos cards administrativos da seção."
                    previewClassName="aspect-square rounded-[18px]"
                    cropAspectRatio={1}
                  />
                  <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <input type="checkbox" name="isActive" defaultChecked={modalSection?.isActive ?? true} />
                    <span className="text-sm font-semibold text-[var(--espresso)]">
                      Seção ativa
                    </span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : null}

              {modal.type === "edit-category" && modalCategoryRecord && modalPublicCategory ? (
                <form action={updateCategoryVisualAction} onSubmit={closeModalOnSubmit} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="categoryId" value={modalCategoryRecord.id} />
                  <input type="hidden" name="categorySlug" value={modalPublicCategory.slug} />

                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    defaultValues={{
                      pt: modalCategoryRecord.namePt ?? modalPublicCategory.namePt,
                      en: getCategoryTranslationValue(modalCategoryRecord, "en", "name"),
                      es: getCategoryTranslationValue(modalCategoryRecord, "es", "name"),
                    }}
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descricao PT", en: "Description EN", es: "Descripcion ES" }}
                    defaultValues={{
                      pt: modalCategoryRecord.descriptionPt ?? modalPublicCategory.descriptionPt ?? "",
                      en: getCategoryTranslationValue(modalCategoryRecord, "en", "description"),
                      es: getCategoryTranslationValue(modalCategoryRecord, "es", "description"),
                    }}
                    textarea
                  />
                  <ImageUploadField
                    name="sidebarImageUrl"
                    label="Imagem da lateral esquerda"
                    defaultValue={modalCategoryRecord.sidebarImageUrl ?? modalPublicCategory.sidebarImageUrl}
                    description="Essa imagem aparece na navegacao lateral do cardapio publico e e otimizada automaticamente."
                    previewClassName="aspect-square rounded-[18px]"
                    cropAspectRatio={1}
                  />
                  <ColorField
                    name="accentColor"
                    label="Cor da seção"
                    defaultValue={modalCategoryRecord.accentColor ?? modalPublicCategory.accentColor}
                  />
                  <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <input type="checkbox" name="isActive" defaultChecked={modalCategoryRecord.isActive} />
                    <span className="text-sm font-semibold text-[var(--espresso)]">
                      Seção ativa na vitrine
                    </span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : null}

              {modal.type === "create-product" && modalCategorySlug ? (
                <form action={createProductAction} onSubmit={closeModalOnSubmit} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="categorySlug" value={modalCategorySlug} />
                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    requiredPt
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descricao PT", en: "Description EN", es: "Descripcion ES" }}
                    textarea
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Preco
                      </span>
                      <input name="price" className="field" placeholder="14.90" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Estoque
                      </span>
                      <input name="stockQuantity" className="field" placeholder="18" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Posicao
                      </span>
                      <select name="placement" className="select" defaultValue="LAST">
                        <option value="FIRST">Primeiro da lista</option>
                        <option value="LAST">Ultimo da lista</option>
                      </select>
                    </label>
                  </div>
                  <ImageUploadField
                    name="imageUrl"
                    label="Imagem do produto"
                    description="Essa e a imagem que aparece no card do produto e ela e otimizada automaticamente."
                    previewClassName="aspect-[5/4] rounded-[18px]"
                    cropAspectRatio={5 / 4}
                  />
                  <div className="grid gap-4 lg:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Destaque PT
                      </span>
                      <input name="highlightPt" className="field" placeholder="Mais vendido, lancamento..." />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Highlight EN
                      </span>
                      <input name="highlightEn" className="field" placeholder="Best seller, new..." />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Destaque ES
                      </span>
                      <input name="highlightEs" className="field" placeholder="Mas pedido, novedad..." />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                      <input type="checkbox" name="isAvailable" defaultChecked />
                      <span className="text-sm font-semibold text-[var(--espresso)]">Disponivel</span>
                    </label>
                    <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                      <input type="checkbox" name="isFeatured" />
                      <span className="text-sm font-semibold text-[var(--espresso)]">Destaque</span>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : null}

              {modal.type === "edit-product" && modalProduct ? (
                <form action={updateProductAction} onSubmit={closeModalOnSubmit} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="productId" value={modalProduct.id} />
                  <input type="hidden" name="categorySlug" value={modalProduct.categorySlug} />
                  <ImageUploadField
                    name="imageUrl"
                    label="Imagem"
                    defaultValue={modalProduct.imageUrl}
                    previewClassName="aspect-[5/4] rounded-[16px]"
                    cropAspectRatio={5 / 4}
                  />
                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    defaultValues={{
                      pt: modalProduct.namePt,
                      en: getProductTranslationValue(modalProduct, "en", "name"),
                      es: getProductTranslationValue(modalProduct, "es", "name"),
                    }}
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descricao PT", en: "Description EN", es: "Descripcion ES" }}
                    defaultValues={{
                      pt: modalProduct.descriptionPt ?? "",
                      en: getProductTranslationValue(modalProduct, "en", "description"),
                      es: getProductTranslationValue(modalProduct, "es", "description"),
                    }}
                    textarea
                    minHeightClass="min-h-20"
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Preco
                      </span>
                      <input name="price" className="field" defaultValue={modalProduct.price ?? ""} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Estoque
                      </span>
                      <input
                        name="stockQuantity"
                        className="field"
                        defaultValue={modalProduct.stockQuantity ?? ""}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Ordem
                      </span>
                      <input name="sortOrder" className="field" defaultValue={modalProduct.sortOrder} />
                    </label>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Destaque PT
                      </span>
                      <input
                        name="highlightPt"
                        className="field"
                        defaultValue={modalProduct.highlightPt ?? ""}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Highlight EN
                      </span>
                      <input
                        name="highlightEn"
                        className="field"
                        defaultValue={getProductTranslationValue(modalProduct, "en", "highlight")}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Destaque ES
                      </span>
                      <input
                        name="highlightEs"
                        className="field"
                        defaultValue={getProductTranslationValue(modalProduct, "es", "highlight")}
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/70 px-3 py-2">
                      <input type="checkbox" name="isAvailable" defaultChecked={modalProduct.isAvailable} />
                      <span className="text-sm font-semibold text-[var(--espresso)]">Disponivel</span>
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/70 px-3 py-2">
                      <input type="checkbox" name="isFeatured" defaultChecked={modalProduct.isFeatured} />
                      <span className="text-sm font-semibold text-[var(--espresso)]">Destaque</span>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
