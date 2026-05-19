"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FocusEvent } from "react";
import { ImageUploadField } from "@/components/image-upload-field";
import { ProductArt, SectionArt } from "@/components/product-art";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
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

// root → drink-areas (bebidas only) → categories → products
// root → categories (comidas) → products
type AdminView = "root" | "drink-areas" | "categories" | "products";

type AdminModal =
  | { type: "create-category"; area: MenuAreaSlug }
  | { type: "edit-section"; area: MenuAreaSlug }
  | { type: "edit-category"; categorySlug: string }
  | { type: "create-product"; categorySlug: string }
  | { type: "edit-product"; productId: string }
  | null;

type DeleteConfirm = {
  title: string;
  message: string;
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
} | null;

const translationLocales = ["pt", "en", "es"] as const;

const areaLabels: Record<MenuAreaSlug, string> = {
  "hot-drinks": "Bebidas Quentes",
  "cold-drinks": "Bebidas Geladas",
  foods: "Comidas",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function getCategoryPreviewImage(category: PublicCategory) {
  return category.sidebarImageUrl ?? category.products.find((p) => p.imageUrl)?.imageUrl ?? null;
}

function getAreasPreviewImage(areas: (PublicAreaData | null | undefined)[]) {
  return areas
    .filter(Boolean)
    .flatMap((a) => a!.categories)
    .map(getCategoryPreviewImage)
    .find(Boolean) ?? null;
}

function getDashboardProducts(
  displayCategory: PublicCategory,
  productsBySlug: Map<string, CatalogDashboardProduct>,
): CatalogDashboardProduct[] {
  return displayCategory.products.map((product, index) => {
    const dash = productsBySlug.get(product.slug);
    if (dash) return dash;
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

function getProductTone(area: MenuAreaSlug) {
  if (area === "cold-drinks") return "cream" as const;
  if (area === "hot-drinks") return "mocha" as const;
  return "amber" as const;
}

function catTranslation(
  category: CatalogDashboardCategory | null | undefined,
  locale: "en" | "es",
  field: "name" | "description",
) {
  if (!category) return "";
  return resolveLocalizedText(
    locale,
    field === "name"
      ? { pt: category.namePt, en: category.nameEn, es: category.nameEs }
      : { pt: category.descriptionPt, en: category.descriptionEn, es: category.descriptionEs },
    { kind: field === "name" ? "category-name" : "category-description", slug: category.slug },
  ) ?? "";
}

function sectionTranslation(
  section: CatalogDashboardSection | null | undefined,
  locale: "en" | "es",
  field: "name" | "description",
) {
  if (!section) return "";
  return resolveLocalizedText(
    locale,
    field === "name"
      ? { pt: section.namePt, en: section.nameEn, es: section.nameEs }
      : { pt: section.descriptionPt, en: section.descriptionEn, es: section.descriptionEs },
    { kind: field === "name" ? "category-name" : "category-description", slug: section.area },
  ) ?? "";
}

function productTranslation(
  product: CatalogDashboardProduct,
  locale: "en" | "es",
  field: "name" | "description" | "highlight",
) {
  return resolveLocalizedText(
    locale,
    field === "name"
      ? { pt: product.namePt, en: product.nameEn, es: product.nameEs }
      : field === "description"
        ? { pt: product.descriptionPt, en: product.descriptionEn, es: product.descriptionEs }
        : { pt: product.highlightPt, en: product.highlightEn, es: product.highlightEs },
    {
      kind:
        field === "name"
          ? "product-name"
          : field === "description"
            ? "product-description"
            : "product-highlight",
      slug: product.slug,
    },
  ) ?? "";
}

function localizedName(fieldBase: string, locale: TranslationLocale) {
  return `${fieldBase}${locale.charAt(0).toUpperCase()}${locale.slice(1)}`;
}

function fireGlobalFeedback(visible: boolean) {
  window.dispatchEvent(new CustomEvent(`global-action-feedback:${visible ? "show" : "hide"}`));
}

async function callTranslate(text: string, from: TranslationLocale, to: TranslationLocale[]) {
  const response = await fetch("/api/admin/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, from, to }),
  });
  if (!response.ok) return null;
  return (await response.json()) as { translations?: Partial<Record<TranslationLocale, string>> };
}

async function autoTranslateSiblings(
  control: HTMLInputElement | HTMLTextAreaElement,
  fieldBase: string,
) {
  const form = control.form;
  const from = control.dataset.locale as TranslationLocale | undefined;
  const text = control.value.trim();
  if (!form || !from || !text) return;

  control.dataset.autoTranslated = "false";
  const targets = translationLocales.filter((l) => l !== from);
  const toFill = targets
    .map((locale) => {
      const field = form.elements.namedItem(localizedName(fieldBase, locale));
      return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
        ? { locale, field }
        : null;
    })
    .filter(
      (e): e is { locale: TranslationLocale; field: HTMLInputElement | HTMLTextAreaElement } =>
        Boolean(e) && (!e!.field.value.trim() || e!.field.dataset.autoTranslated === "true"),
    );

  if (toFill.length === 0) return;

  fireGlobalFeedback(true);
  const result = await callTranslate(text, from, toFill.map((e) => e.locale)).finally(() =>
    fireGlobalFeedback(false),
  );

  result?.translations &&
    toFill.forEach(({ locale, field }) => {
      const translated = result.translations?.[locale]?.trim();
      if (translated) {
        field.value = translated;
        field.dataset.autoTranslated = "true";
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
}

// ── LocalizedTextFields ───────────────────────────────────────────────────────

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
        const name = localizedName(fieldBase, locale);
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
            void autoTranslateSiblings(event.currentTarget, fieldBase);
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

// ── Main component ────────────────────────────────────────────────────────────

type AdminProductsPanelProps = {
  storeSlug: string;
  catalog: PublicAreaData[];
  categories: CatalogDashboardCategory[];
  sections: CatalogDashboardSection[];
  products: CatalogDashboardProduct[];
  initialArea: MenuAreaSlug | null;
  initialFoodCategorySlug: string | null;
};

export function AdminProductsPanel({
  storeSlug,
  catalog,
  categories,
  sections,
  products,
  initialArea,
  initialFoodCategorySlug,
}: AdminProductsPanelProps) {
  const router = useRouter();

  const drinksAreas = catalog.filter((e) => e.area !== "foods");
  const foodsArea = catalog.find((e) => e.area === "foods") ?? null;
  const categoriesBySlug = new Map(categories.map((c) => [c.slug, c]));
  const productsBySlug = new Map(products.map((p) => [p.slug, p]));
  const sectionsByArea = new Map(sections.map((s) => [s.area, s]));

  // navigation state
  const initialView: AdminView = (() => {
    if (initialArea === "foods") return initialFoodCategorySlug ? "products" : "categories";
    if (catalog.some((e) => e.area === initialArea)) return "categories";
    return "root";
  })();

  const [view, setView] = useState<AdminView>(initialView);
  const [selectedArea, setSelectedArea] = useState<MenuAreaSlug>(
    initialArea || drinksAreas[0]?.area || "hot-drinks",
  );
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    initialArea === "foods" ? initialFoodCategorySlug : null,
  );
  const [modal, setModal] = useState<AdminModal>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null);

  // derived display data
  const currentAreaData = catalog.find((e) => e.area === selectedArea) ?? null;
  const displayCategories = currentAreaData?.categories ?? [];
  const selectedCategory = displayCategories.find((c) => c.slug === selectedCategorySlug) ?? null;
  const selectedCategoryProducts = selectedCategory
    ? getDashboardProducts(selectedCategory, productsBySlug)
    : [];

  // product counts
  const drinkProducts = drinksAreas.reduce(
    (t, a) => t + a.categories.reduce((at, c) => at + c.products.length, 0),
    0,
  );
  const foodProducts = foodsArea?.categories.reduce((t, c) => t + c.products.length, 0) ?? 0;
  const currentCount =
    view === "root"
      ? drinkProducts + foodProducts
      : view === "drink-areas"
        ? drinkProducts
        : view === "categories"
          ? displayCategories.reduce((t, c) => t + c.products.length, 0)
          : selectedCategoryProducts.length;

  // navigation helpers
  function goBack() {
    if (view === "products") {
      setSelectedCategorySlug(null);
      setView(selectedArea === "foods" ? "categories" : "categories");
    } else if (view === "categories" && selectedArea !== "foods") {
      setView("drink-areas");
    } else {
      setView("root");
    }
  }

  function openCategories(area: MenuAreaSlug) {
    setSelectedArea(area);
    setSelectedCategorySlug(null);
    setView("categories");
    syncUrl(area, null);
  }

  function openProducts(categorySlug: string) {
    setSelectedCategorySlug(categorySlug);
    setView("products");
    syncUrl(selectedArea, selectedArea === "foods" ? categorySlug : null);
  }

  function syncUrl(area: MenuAreaSlug, categorySlug: string | null) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("section", "products");
    params.set("area", area);
    if (categorySlug) params.set("category", categorySlug);
    else params.delete("category");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  // modal data
  const modalCatSlug =
    modal?.type === "edit-category"
      ? modal.categorySlug
      : modal?.type === "create-product"
        ? modal.categorySlug
        : null;
  const modalCategoryRecord = modalCatSlug ? categoriesBySlug.get(modalCatSlug) ?? null : null;
  const modalSection = modal?.type === "edit-section" ? sectionsByArea.get(modal.area) ?? null : null;
  const modalPublicCategory = modalCatSlug
    ? catalog.flatMap((e) => e.categories).find((c) => c.slug === modalCatSlug) ?? null
    : null;
  const modalProduct =
    modal?.type === "edit-product"
      ? products.find((p) => p.id === modal.productId) ?? null
      : null;

  // action wrappers
  async function handleCreateCategory(formData: FormData) {
    await createCategoryAction(formData);
    setModal(null);
    router.refresh();
  }

  async function handleCreateProduct(formData: FormData) {
    const catSlug = formData.get("categorySlug")?.toString() ?? "";
    await createProductAction(formData);
    setModal(null);
    if (catSlug) {
      const cat = catalog.flatMap((e) => e.categories).find((c) => c.slug === catSlug);
      if (cat) {
        setSelectedArea(cat.area);
        setSelectedCategorySlug(cat.slug);
        setView("products");
      }
    }
    router.refresh();
  }

  async function handleDeleteConfirm(formData: FormData) {
    if (!deleteConfirm) return;
    await deleteConfirm.action(formData);
    setDeleteConfirm(null);
    setModal(null);
    router.refresh();
  }

  // breadcrumb
  const crumbs: { label: string; onClick?: () => void }[] = [];
  if (view !== "root") {
    crumbs.push({ label: "Categorias", onClick: () => setView("root") });
  }
  if (view === "drink-areas") {
    crumbs.push({ label: "Bebidas" });
  }
  if (view === "categories" && selectedArea !== "foods") {
    crumbs.push({ label: "Bebidas", onClick: () => setView("drink-areas") });
    crumbs.push({ label: sectionsByArea.get(selectedArea)?.namePt ?? areaLabels[selectedArea] });
  }
  if (view === "categories" && selectedArea === "foods") {
    crumbs.push({ label: "Comidas" });
  }
  if (view === "products") {
    if (selectedArea !== "foods") {
      crumbs.push({ label: "Bebidas", onClick: () => setView("drink-areas") });
      crumbs.push({
        label: sectionsByArea.get(selectedArea)?.namePt ?? areaLabels[selectedArea],
        onClick: () => {
          setSelectedCategorySlug(null);
          setView("categories");
        },
      });
    } else {
      crumbs.push({
        label: "Comidas",
        onClick: () => {
          setSelectedCategorySlug(null);
          setView("categories");
        },
      });
    }
    crumbs.push({ label: selectedCategory?.name ?? "" });
  }

  const pageTitle =
    view === "root"
      ? "Categorias"
      : view === "drink-areas"
        ? "Bebidas"
        : view === "categories"
          ? sectionsByArea.get(selectedArea)?.namePt ?? areaLabels[selectedArea]
          : selectedCategory?.name ?? "Produtos";

  const sectionName = (area: MenuAreaSlug) =>
    sectionsByArea.get(area)?.namePt ?? areaLabels[area];

  return (
    <div className="pb-1">
      <section className="overflow-hidden rounded-[18px] border border-[#c6c6c6]/50 bg-white/70 p-4">
        {/* ── header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {crumbs.length > 0 && (
              <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-[#878181]">
                {crumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-[#c6c6c6]">/</span>}
                    {crumb.onClick ? (
                      <button
                        type="button"
                        onClick={crumb.onClick}
                        className="transition hover:text-black"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="font-medium text-black">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <h2 className="text-3xl font-normal leading-none text-black">{pageTitle}</h2>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-[14px] border border-[#c6c6c6] bg-[#ff972e] px-4 py-2 text-center text-2xl font-normal leading-none text-white">
              {currentCount}
              <span className="ml-1 align-middle text-sm">produtos</span>
            </span>
            {view !== "root" && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-[14px] border border-[#c6c6c6]/70 bg-white/70 px-4 py-2 text-sm font-normal text-[#747171] transition hover:bg-white"
              >
                ← Voltar
              </button>
            )}
          </div>
        </div>

        {/* ── root: Bebidas + Comidas ── */}
        {view === "root" && (
          <div className="mt-6 grid gap-3">
            <RootCard
              label="Bebidas"
              subtitle={`${drinksAreas.reduce((t, a) => t + a.categories.length, 0)} categorias · ${drinkProducts} produtos`}
              area="hot-drinks"
              imageUrl={getAreasPreviewImage(drinksAreas)}
              onClick={() => setView("drink-areas")}
            />
            <RootCard
              label="Comidas"
              subtitle={`${foodsArea?.categories.length ?? 0} categorias · ${foodProducts} produtos`}
              area="foods"
              imageUrl={getAreasPreviewImage(foodsArea ? [foodsArea] : [])}
              onClick={() => openCategories("foods")}
            />
          </div>
        )}

        {/* ── drink areas: Bebidas Quentes + Bebidas Geladas ── */}
        {view === "drink-areas" && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {drinksAreas.map((areaData) => (
              <article
                key={areaData.area}
                className="relative min-h-[104px] overflow-hidden rounded-[18px]"
              >
                <button
                  type="button"
                  onClick={() => openCategories(areaData.area)}
                  className="absolute inset-0 text-left transition hover:-translate-y-[1px]"
                >
                  <SectionArt
                    label={sectionName(areaData.area)}
                    area={areaData.area}
                    imageUrl={sectionsByArea.get(areaData.area)?.imageUrl ?? getAreasPreviewImage([areaData])}
                  />
                  <span className="relative z-10 flex h-full min-h-[104px] flex-col justify-end p-3 text-white">
                    <span className="text-base font-medium leading-tight">{sectionName(areaData.area)}</span>
                    <span className="mt-0.5 text-xs text-white/75">
                      {areaData.categories.length} categorias ·{" "}
                      {areaData.categories.reduce((t, c) => t + c.products.length, 0)} produtos
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit-section", area: areaData.area })}
                  className="absolute right-2 top-2 z-20 rounded-full border border-white/30 bg-black/35 px-3 py-1 text-xs text-white backdrop-blur-sm transition hover:bg-black/55"
                >
                  Editar
                </button>
              </article>
            ))}
          </div>
        )}

        {/* ── categories ── */}
        {view === "categories" && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {displayCategories.map((category) => (
              <article
                key={category.slug}
                className="relative min-h-[104px] overflow-hidden rounded-[18px]"
              >
                <button
                  type="button"
                  onClick={() => openProducts(category.slug)}
                  className="absolute inset-0 text-left transition hover:-translate-y-[1px]"
                >
                  <SectionArt
                    label={category.name}
                    area={category.area}
                    imageUrl={getCategoryPreviewImage(category)}
                  />
                  <span className="relative z-10 flex h-full min-h-[104px] flex-col justify-end p-3 text-white">
                    <span className="text-base font-medium leading-tight">{category.name}</span>
                    <span className="mt-0.5 text-xs text-white/75">{category.products.length} produtos</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit-category", categorySlug: category.slug })}
                  className="absolute right-2 top-2 z-20 rounded-full border border-white/30 bg-black/35 px-3 py-1 text-xs text-white backdrop-blur-sm transition hover:bg-black/55"
                >
                  Editar
                </button>
              </article>
            ))}
            <button
              type="button"
              onClick={() => setModal({ type: "create-category", area: selectedArea })}
              className="flex min-h-[104px] items-center justify-center rounded-[18px] border border-dashed border-[#ff943c] bg-white/50 text-3xl font-light text-[#ff943c] transition hover:bg-white/80"
              aria-label="Nova categoria"
            >
              +
            </button>
          </div>
        )}

        {/* ── products ── */}
        {view === "products" && selectedCategory && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {selectedCategoryProducts.map((product) => (
              <article
                key={product.id}
                className="relative min-h-[104px] overflow-hidden rounded-[18px] border border-[#c6c6c6]/60"
              >
                <div className="absolute inset-0">
                  <ProductArt
                    title={product.namePt}
                    tone={getProductTone(selectedCategory.area)}
                    area={selectedCategory.area}
                    imageUrl={product.imageUrl}
                    size="admin-card"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 bg-[rgba(30,18,10,0.72)] px-2.5 py-2 text-white">
                  <h3 className="line-clamp-2 text-sm font-normal leading-tight">{product.namePt}</h3>
                  <p className="mt-0.5 text-xs opacity-85">{formatMoney(product.price, "pt")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit-product", productId: product.id })}
                  className="absolute right-2 top-2 z-20 rounded-full border border-white/30 bg-black/35 px-3 py-1 text-xs text-white backdrop-blur-sm transition hover:bg-black/55"
                >
                  Editar
                </button>
              </article>
            ))}
            <button
              type="button"
              onClick={() =>
                setModal({ type: "create-product", categorySlug: selectedCategory.slug })
              }
              className="flex min-h-[104px] items-center justify-center rounded-[18px] border border-dashed border-[#ff943c] bg-white/50 text-3xl font-light text-[#ff943c] transition hover:bg-white/80"
              aria-label="Novo produto"
            >
              +
            </button>
          </div>
        )}
      </section>

      {/* ── modals ── */}
      {modal && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[#f8eee3] p-3 py-8"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[640px] overflow-hidden rounded-[18px] border border-[#c6c6c6]/70 bg-white/70">
            <div className="flex items-center justify-between gap-4 border-b border-[#c6c6c6]/70 px-6 py-5">
              <h2 className="text-xl font-bold text-black">
                {modal.type === "create-category"
                  ? `Nova categoria — ${sectionName(modal.area)}`
                  : modal.type === "edit-section"
                    ? `Editar — ${sectionName(modal.area)}`
                    : modal.type === "edit-category"
                      ? "Editar categoria"
                      : modal.type === "create-product"
                        ? "Novo produto"
                        : "Editar produto"}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c6c6c6]/70 bg-white text-lg font-bold leading-none text-black"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="no-scrollbar max-h-[calc(100vh-120px)] overflow-y-auto p-6">
              {/* create category */}
              {modal.type === "create-category" && (
                <form action={handleCreateCategory} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="area" value={modal.area} />
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="grid gap-4">
                      <LocalizedTextFields
                        fieldBase="name"
                        labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                        placeholders={{ pt: "Ex: Cafés especiais" }}
                        requiredPt
                      />
                      <LocalizedTextFields
                        fieldBase="description"
                        labels={{ pt: "Descrição PT", en: "Description EN", es: "Descripción ES" }}
                        textarea
                        minHeightClass="min-h-20"
                      />
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                          Posição
                        </span>
                        <select name="placement" className="select" defaultValue="LAST">
                          <option value="FIRST">Primeira da lista</option>
                          <option value="LAST">Última da lista</option>
                        </select>
                      </label>
                      <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                        <input type="checkbox" name="isActive" defaultChecked />
                        <span className="text-sm font-semibold text-[var(--espresso)]">
                          Ativa na vitrine
                        </span>
                      </label>
                    </div>
                    <div className="grid gap-4">
                      <ImageUploadField
                        name="sidebarImageUrl"
                        label="Imagem"
                        previewClassName="aspect-square rounded-[18px]"
                        cropAspectRatio={1}
                      />
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
              )}

              {/* edit section (area) */}
              {modal.type === "edit-section" && (
                <form
                  action={updateCatalogSectionAction}
                  onSubmit={() => setModal(null)}
                  className="grid gap-4"
                >
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="area" value={modal.area} />
                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    defaultValues={{
                      pt: modalSection?.namePt ?? areaLabels[modal.area],
                      en: sectionTranslation(modalSection, "en", "name"),
                      es: sectionTranslation(modalSection, "es", "name"),
                    }}
                    requiredPt
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descrição PT", en: "Description EN", es: "Descripción ES" }}
                    defaultValues={{
                      pt: modalSection?.descriptionPt ?? "",
                      en: sectionTranslation(modalSection, "en", "description"),
                      es: sectionTranslation(modalSection, "es", "description"),
                    }}
                    textarea
                    minHeightClass="min-h-20"
                  />
                  <ImageUploadField
                    name="imageUrl"
                    label="Imagem"
                    defaultValue={
                      modalSection?.imageUrl ??
                      getAreasPreviewImage(drinksAreas.filter((a) => a.area === modal.area))
                    }
                    previewClassName="aspect-square rounded-[18px]"
                    cropAspectRatio={1}
                  />
                  <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={modalSection?.isActive ?? true}
                    />
                    <span className="text-sm font-semibold text-[var(--espresso)]">
                      Ativa na vitrine
                    </span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="btn-secondary w-full"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              )}

              {/* edit category */}
              {modal.type === "edit-category" && modalCategoryRecord && modalPublicCategory && (
                <form
                  action={updateCategoryVisualAction}
                  onSubmit={() => setModal(null)}
                  className="grid gap-4"
                >
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="categoryId" value={modalCategoryRecord.id} />
                  <input type="hidden" name="categorySlug" value={modalPublicCategory.slug} />
                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    defaultValues={{
                      pt: modalCategoryRecord.namePt ?? modalPublicCategory.namePt,
                      en: catTranslation(modalCategoryRecord, "en", "name"),
                      es: catTranslation(modalCategoryRecord, "es", "name"),
                    }}
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descrição PT", en: "Description EN", es: "Descripción ES" }}
                    defaultValues={{
                      pt:
                        modalCategoryRecord.descriptionPt ??
                        modalPublicCategory.descriptionPt ??
                        "",
                      en: catTranslation(modalCategoryRecord, "en", "description"),
                      es: catTranslation(modalCategoryRecord, "es", "description"),
                    }}
                    textarea
                    minHeightClass="min-h-20"
                  />
                  <ImageUploadField
                    name="sidebarImageUrl"
                    label="Imagem"
                    defaultValue={
                      modalCategoryRecord.sidebarImageUrl ?? modalPublicCategory.sidebarImageUrl
                    }
                    previewClassName="aspect-square rounded-[18px]"
                    cropAspectRatio={1}
                  />
                  <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={modalCategoryRecord.isActive}
                    />
                    <span className="text-sm font-semibold text-[var(--espresso)]">
                      Ativa na vitrine
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        title: "Excluir categoria?",
                        message:
                          "Isso remove a categoria e todos os seus produtos permanentemente.",
                        action: deleteCategoryAction,
                        fields: {
                          storeSlug,
                          categoryId: modalCategoryRecord.id,
                          categorySlug: modalPublicCategory.slug,
                        },
                      })
                    }
                    className="btn-secondary w-full border-red-500 text-red-600"
                  >
                    Excluir categoria
                  </button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="btn-secondary w-full"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              )}

              {/* create product */}
              {modal.type === "create-product" && (
                <form action={handleCreateProduct} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="categorySlug" value={modal.categorySlug} />
                  <ImageUploadField
                    name="imageUrl"
                    label="Imagem do produto"
                    previewClassName="aspect-[5/3] rounded-[16px]"
                    cropAspectRatio={5 / 3}
                  />
                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    requiredPt
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descrição PT", en: "Description EN", es: "Descripción ES" }}
                    textarea
                    minHeightClass="min-h-20"
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Preço
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
                        Posição
                      </span>
                      <select name="placement" className="select" defaultValue="LAST">
                        <option value="FIRST">Primeiro</option>
                        <option value="LAST">Último</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Destaque PT
                      </span>
                      <input name="highlightPt" className="field" placeholder="Mais vendido..." />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Highlight EN
                      </span>
                      <input name="highlightEn" className="field" placeholder="Best seller..." />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                        Destaque ES
                      </span>
                      <input name="highlightEs" className="field" placeholder="Más pedido..." />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                      <input type="checkbox" name="isAvailable" defaultChecked />
                      <span className="text-sm font-semibold text-[var(--espresso)]">Disponível</span>
                    </label>
                    <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                      <input type="checkbox" name="isFeatured" />
                      <span className="text-sm font-semibold text-[var(--espresso)]">Destaque</span>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="btn-secondary w-full"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              )}

              {/* edit product */}
              {modal.type === "edit-product" && modalProduct && (
                <form
                  action={updateProductAction}
                  onSubmit={() => setModal(null)}
                  className="grid gap-4"
                >
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="productId" value={modalProduct.id} />
                  <input type="hidden" name="categorySlug" value={modalProduct.categorySlug} />
                  <ImageUploadField
                    name="imageUrl"
                    label="Imagem do produto"
                    defaultValue={modalProduct.imageUrl}
                    previewClassName="aspect-[5/3] rounded-[16px]"
                    cropAspectRatio={5 / 3}
                  />
                  <LocalizedTextFields
                    fieldBase="name"
                    labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                    defaultValues={{
                      pt: modalProduct.namePt,
                      en: productTranslation(modalProduct, "en", "name"),
                      es: productTranslation(modalProduct, "es", "name"),
                    }}
                  />
                  <LocalizedTextFields
                    fieldBase="description"
                    labels={{ pt: "Descrição PT", en: "Description EN", es: "Descripción ES" }}
                    defaultValues={{
                      pt: modalProduct.descriptionPt ?? "",
                      en: productTranslation(modalProduct, "en", "description"),
                      es: productTranslation(modalProduct, "es", "description"),
                    }}
                    textarea
                    minHeightClass="min-h-20"
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Preço
                      </span>
                      <input
                        name="price"
                        className="field"
                        defaultValue={modalProduct.price ?? ""}
                      />
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
                      <input
                        name="sortOrder"
                        className="field"
                        defaultValue={modalProduct.sortOrder}
                      />
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
                        defaultValue={productTranslation(modalProduct, "en", "highlight")}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                        Destaque ES
                      </span>
                      <input
                        name="highlightEs"
                        className="field"
                        defaultValue={productTranslation(modalProduct, "es", "highlight")}
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/70 px-3 py-2">
                      <input
                        type="checkbox"
                        name="isAvailable"
                        defaultChecked={modalProduct.isAvailable}
                      />
                      <span className="text-sm font-semibold text-[var(--espresso)]">
                        Disponível
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/70 px-3 py-2">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        defaultChecked={modalProduct.isFeatured}
                      />
                      <span className="text-sm font-semibold text-[var(--espresso)]">
                        Destaque
                      </span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        title: "Excluir produto?",
                        message: "Isso remove o produto permanentemente.",
                        action: deleteProductAction,
                        fields: { storeSlug, productId: modalProduct.id },
                      })
                    }
                    className="btn-secondary w-full border-red-500 text-red-600"
                  >
                    Excluir produto
                  </button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="btn-secondary w-full"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── delete confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(40,21,14,0.38)] p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#c6c6c6]/70 bg-white p-6">
            <h2 className="text-xl font-bold text-black">{deleteConfirm.title}</h2>
            <p className="mt-2 text-sm text-[#747171]">{deleteConfirm.message}</p>
            <form action={handleDeleteConfirm} className="mt-6 grid gap-3 sm:grid-cols-2">
              {Object.entries(deleteConfirm.fields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary w-full"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-secondary w-full border-red-500 text-red-600"
              >
                Confirmar exclusão
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RootCard ──────────────────────────────────────────────────────────────────

function RootCard({
  label,
  subtitle,
  area,
  imageUrl,
  onClick,
}: {
  label: string;
  subtitle: string;
  area: MenuAreaSlug;
  imageUrl: string | null | undefined;
  onClick: () => void;
}) {
  return (
    <article className="relative min-h-[120px] overflow-hidden rounded-[18px]">
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 text-left transition hover:-translate-y-[1px]"
      >
        <SectionArt label={label} area={area} imageUrl={imageUrl} />
        <span className="relative z-10 flex h-full min-h-[120px] flex-col justify-end p-4 text-white">
          <span className="text-2xl font-normal leading-tight">{label}</span>
          <span className="mt-1 text-xs text-white/75">{subtitle}</span>
        </span>
      </button>
    </article>
  );
}
