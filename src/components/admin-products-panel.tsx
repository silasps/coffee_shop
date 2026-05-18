"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import { ColorField } from "@/components/color-field";
import { ImageUploadField } from "@/components/image-upload-field";
import { ProductArt, SectionArt } from "@/components/product-art";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  deleteProductAction,
  deleteSectionAction,
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
type RootCategoryEdit = {
  name: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  imageUrl: string;
  accentColor?: string;
  isActive?: boolean;
};
type RootExtraCategory = {
  slug: string;
  name: string;
  area: MenuAreaSlug;
  imageUrl?: string | null;
  productCount: number;
};
type ProductFlowView = "root-categories" | "sections" | "categories" | "products";
type CatalogNodeType = "category" | "section" | "subsection" | "product";
type CatalogParentType = "root" | "category" | "section" | "subsection";
type AdminProductsModal =
  | {
      type: "create-category";
      nodeType?: Extract<CatalogNodeType, "category" | "section" | "subsection">;
      parentId?: string;
      parentType?: CatalogParentType;
      area?: MenuAreaSlug;
    }
  | {
      type: "choose-child";
      parentId: string;
      parentType: CatalogParentType;
      area: MenuAreaSlug;
      categorySlug?: string;
    }
  | { type: "edit-root-category"; section: CatalogSectionSlug }
  | { type: "edit-section"; area: MenuAreaSlug }
  | { type: "edit-category"; categorySlug: string }
  | { type: "create-product"; categorySlug?: string; parentId?: string; parentType?: CatalogParentType; area?: MenuAreaSlug }
  | { type: "edit-product"; productId: string }
  | null;
type DeleteConfirm = {
  title: string;
  message: string;
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
} | null;

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
  const router = useRouter();
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
  const [rootCategoryEdits, setRootCategoryEdits] = useState<
    Partial<Record<CatalogSectionSlug, RootCategoryEdit>>
  >({});
  const [rootExtraCategories, setRootExtraCategories] = useState<RootExtraCategory[]>([]);
  const [modal, setModal] = useState<AdminProductsModal>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const storedRootCategories = window.localStorage.getItem(`coffee-root-categories:${storeSlug}`);
        setRootCategoryEdits(
          storedRootCategories
            ? (JSON.parse(storedRootCategories) as Partial<Record<CatalogSectionSlug, RootCategoryEdit>>)
            : {},
        );
      } catch {
        setRootCategoryEdits({});
      }

      try {
        const storedExtraCategories = window.localStorage.getItem(`coffee-root-extra-categories:${storeSlug}`);
        setRootExtraCategories(storedExtraCategories ? (JSON.parse(storedExtraCategories) as RootExtraCategory[]) : []);
      } catch {
        setRootExtraCategories([]);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [storeSlug]);
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
  const createCategoryArea =
    modal?.type === "create-category" && modal.area
      ? modal.area
      : selectedSection === "foods"
        ? "foods"
        : selectedDrinkArea;
  const modalCategorySlug =
    modal?.type === "edit-category"
      ? modal.categorySlug
      : modal?.type === "create-product"
        ? modal.categorySlug ?? null
        : null;
  const modalCategoryRecord = modalCategorySlug ? categoriesBySlug.get(modalCategorySlug) ?? null : null;
  const modalSection = modal?.type === "edit-section" ? sectionsByArea.get(modal.area) ?? null : null;
  const modalPublicCategory = modalCategorySlug
    ? catalog.flatMap((entry) => entry.categories).find((category) => category.slug === modalCategorySlug) ??
      null
    : null;
  const modalProduct =
    modal?.type === "edit-product"
      ? products.find((product) => product.id === modal.productId) ??
        selectedCategoryProducts.find((product) => product.id === modal.productId) ??
        null
      : null;
  const closeModalOnSubmit = () => {
    setModal(null);
  };
  const productTargetCategories =
    modal?.type === "create-product"
      ? catalog
          .filter((entry) => {
            if (modal.categorySlug) return entry.categories.some((category) => category.slug === modal.categorySlug);
            if (modal.parentType === "category") {
              return selectedSection === "foods" ? entry.area === "foods" : entry.area !== "foods";
            }
            if (modal.parentType === "section") return entry.area === modal.area;
            return true;
          })
          .flatMap((entry) => entry.categories)
      : [];
  const autoProductCategorySlug = modalCategorySlug ?? productTargetCategories[0]?.slug ?? "";
  async function createProductAndRefresh(formData: FormData) {
    const categorySlug = formData.get("categorySlug")?.toString() ?? "";

    await createProductAction(formData);
    setModal(null);

    if (categorySlug) {
      const category = catalog.flatMap((entry) => entry.categories).find((item) => item.slug === categorySlug);
      if (category) {
        setSelectedSection(category.area === "foods" ? "foods" : "drinks");
        if (category.area !== "foods") setSelectedDrinkArea(category.area);
        setSelectedCategorySlug(category.slug);
        setFlowView("products");
      }
    }

    router.refresh();
  }
  function openCreateCategoryModal(input?: {
    nodeType?: Extract<CatalogNodeType, "category" | "section" | "subsection">;
    parentId?: string;
    parentType?: CatalogParentType;
    area?: MenuAreaSlug;
  }) {
    setModal({
      type: "create-category",
      nodeType: input?.nodeType ?? "category",
      parentId: input?.parentId ?? storeSlug,
      parentType: input?.parentType ?? "root",
      area: input?.area ?? createCategoryArea,
    });
  }
  async function createCategoryAndRefresh(formData: FormData) {
    const area = (formData.get("area")?.toString() as MenuAreaSlug | undefined) ?? createCategoryArea;
    const nodeType = (formData.get("type")?.toString() as CatalogNodeType | undefined) ?? "subsection";
    const created = await createCategoryAction(formData);

    setModal(null);
    if (created && nodeType === "category") {
      const next = [
        ...rootExtraCategories.filter((category) => category.slug !== created.slug),
        {
          slug: created.slug,
          name: created.namePt,
          area: created.area,
          imageUrl: created.sidebarImageUrl,
          productCount: created.productCount,
        },
      ];

      setRootExtraCategories(next);
      window.localStorage.setItem(`coffee-root-extra-categories:${storeSlug}`, JSON.stringify(next));
    }
    if (nodeType === "category" || nodeType === "section") {
      setSelectedSection(area === "foods" ? "foods" : "drinks");
      if (area !== "foods") setSelectedDrinkArea(area);
      setSelectedCategorySlug(null);
      setFlowView("sections");
    } else if (area === "foods") {
      setSelectedSection("foods");
      setSelectedCategorySlug(null);
      setFlowView("sections");
    } else {
      setSelectedSection("drinks");
      setSelectedDrinkArea(area);
      setSelectedCategorySlug(null);
      setFlowView("categories");
    }
    router.refresh();
  }
  const drinksRootName = rootCategoryEdits.drinks?.name || "Bebidas";
  const foodsRootName = rootCategoryEdits.foods?.name || "Comidas";
  const drinksRootImage = rootCategoryEdits.drinks?.imageUrl || getRootPreviewImage(drinksAreas);
  const foodsRootImage = rootCategoryEdits.foods?.imageUrl || getAreaPreviewImage(foodsArea);
  const getRootDefaults = (section: CatalogSectionSlug) => rootCategoryEdits[section] ?? {
    name: section === "drinks" ? "Bebidas" : "Comidas",
    imageUrl: section === "drinks" ? getRootPreviewImage(drinksAreas) ?? "" : getAreaPreviewImage(foodsArea) ?? "",
    accentColor: "#c96b3f",
    isActive: true,
  };

  function saveRootCategoryEdit(formData: FormData, section: CatalogSectionSlug) {
    const next = {
      ...rootCategoryEdits,
      [section]: {
        name: formData.get("namePt")?.toString().trim() || (section === "drinks" ? "Bebidas" : "Comidas"),
        nameEn: formData.get("nameEn")?.toString() ?? "",
        nameEs: formData.get("nameEs")?.toString() ?? "",
        descriptionPt: formData.get("descriptionPt")?.toString() ?? "",
        descriptionEn: formData.get("descriptionEn")?.toString() ?? "",
        descriptionEs: formData.get("descriptionEs")?.toString() ?? "",
        imageUrl: formData.get("sidebarImageUrl")?.toString() ?? "",
        accentColor: formData.get("accentColor")?.toString() ?? "#c96b3f",
        isActive: formData.get("isActive") === "on",
      },
    };

    setRootCategoryEdits(next);
    window.localStorage.setItem(`coffee-root-categories:${storeSlug}`, JSON.stringify(next));
    setModal(null);
  }
  async function confirmDelete(formData: FormData) {
    if (!deleteConfirm) return;

    await deleteConfirm.action(formData);
    const categorySlug = formData.get("categorySlug")?.toString();
    if (categorySlug) {
      const next = rootExtraCategories.filter((category) => category.slug !== categorySlug);
      setRootExtraCategories(next);
      window.localStorage.setItem(`coffee-root-extra-categories:${storeSlug}`, JSON.stringify(next));
    }
    setDeleteConfirm(null);
    setModal(null);
    router.refresh();
  }

  return (
    <div className="pb-1">
      <section className="overflow-hidden rounded-[18px] border border-[#c6c6c6]/50 bg-white/70 p-4">
        <div className="min-h-[360px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-normal text-[#878181]">
                {flowView === "root-categories"
                  ? "Gestão de produtos"
                  : flowView === "sections"
                    ? "Categorias"
                  : flowView === "categories"
                    ? activeCatalogLabel
                    : selectedCategory?.name ?? activeSubsectionLabel}
              </p>
              <h2 className="mt-2 text-4xl font-normal leading-none text-black">
                {flowView === "root-categories"
                  ? "Categorias"
                  : flowView === "sections"
                    ? "Seções"
                  : flowView === "categories"
                    ? "Subseções"
                    : "Produtos"}
              </h2>
            </div>
            <div className="grid min-w-[126px] gap-2">
              <span className="rounded-[14px] border border-[#c6c6c6] bg-[#ff972e] px-4 py-2 text-center text-3xl font-normal leading-none text-white">
                {activeCatalogProductCount} <span className="align-middle text-xl">produtos</span>
              </span>
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
                  className="rounded-[14px] border border-[#c6c6c6]/70 bg-white/70 px-5 py-2 text-base font-normal text-[#747171]"
                >
                  Voltar
                </button>
              ) : null}
            </div>
          </div>

          {flowView === "root-categories" ? (
            <div ref={contentRef} className="mt-8 grid grid-cols-1 gap-3">
              <article className="relative min-h-[112px] overflow-hidden rounded-[18px]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection("drinks");
                    setSelectedCategorySlug(null);
                    setFlowView("sections");
                  }}
                  className="absolute inset-0 text-left transition hover:-translate-y-[1px]"
                >
                  <SectionArt label={drinksRootName} area="cold-drinks" imageUrl={drinksRootImage} />
                  <span className="relative z-10 flex h-full min-h-[112px] flex-col justify-end p-3 text-white">
                    <span className="text-xl font-normal leading-tight">{drinksRootName}</span>
                    <span className="mt-1 text-xs font-normal text-white">
                      {drinksAreas.length} seções · {drinksProductCount} produtos
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit-root-category", section: "drinks" })}
                  className="absolute right-2 top-2 z-20 rounded-[18px] border border-white bg-[#ff943c] px-3 py-1.5 text-xs font-normal text-white"
                >
                  Editar
                </button>
              </article>

              <article className="relative min-h-[112px] overflow-hidden rounded-[18px]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection("foods");
                    setSelectedCategorySlug(null);
                    setFlowView("sections");
                  }}
                  className="absolute inset-0 text-left transition hover:-translate-y-[1px]"
                >
                  <SectionArt label={foodsRootName} area="foods" imageUrl={foodsRootImage} />
                  <span className="relative z-10 flex h-full min-h-[112px] flex-col justify-end p-3 text-white">
                    <span className="text-xl font-normal leading-tight">{foodsRootName}</span>
                    <span className="mt-1 text-xs font-normal text-white">
                      {foodSidebarItems.length} seções · {foodsProductCount} produtos
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit-root-category", section: "foods" })}
                  className="absolute right-2 top-2 z-20 rounded-[18px] border border-white bg-[#ff943c] px-3 py-1.5 text-xs font-normal text-white"
                >
                  Editar
                </button>
              </article>

              {rootExtraCategories.map((category) => (
                <article key={category.slug} className="relative min-h-[112px] overflow-hidden rounded-[18px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSection(category.area === "foods" ? "foods" : "drinks");
                      if (category.area !== "foods") setSelectedDrinkArea(category.area);
                      setSelectedCategorySlug(category.slug);
                      setFlowView("products");
                    }}
                    className="absolute inset-0 text-left transition hover:-translate-y-[1px]"
                  >
                    <SectionArt label={category.name} area={category.area} imageUrl={category.imageUrl} />
                    <span className="relative z-10 flex h-full min-h-[112px] flex-col justify-end p-3 text-white">
                      <span className="text-xl font-normal leading-tight">{category.name}</span>
                      <span className="mt-1 text-xs font-normal text-white">
                        {category.productCount} produtos
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "edit-category", categorySlug: category.slug })}
                    className="absolute right-2 top-2 z-20 rounded-[18px] border border-white bg-[#ff943c] px-3 py-1.5 text-xs font-normal text-white"
                  >
                    Editar
                  </button>
                </article>
              ))}

              <button
                type="button"
                onClick={() =>
                  openCreateCategoryModal({
                    nodeType: "category",
                    parentId: storeSlug,
                    parentType: "root",
                    area: createCategoryArea,
                  })
                }
                className="flex min-h-[120px] items-center justify-center rounded-[18px] border border-dashed border-[#ff943c] bg-white/50 text-2xl font-bold leading-none text-[#ff943c]"
                aria-label="Adicionar categoria"
              >
                +
              </button>
            </div>
          ) : null}

          {flowView === "sections" ? (
            <div ref={contentRef} className="mt-8">
              {selectedSection === "drinks" ? (
                <>
                  <div className="mb-5">
                    <h3 className="text-4xl font-normal text-black">Bebidas</h3>
                  </div>
                <div className="grid grid-cols-2 gap-3">
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
                      className="relative min-h-[96px] overflow-hidden rounded-[18px] text-left transition hover:-translate-y-[1px]"
                    >
                      <SectionArt
                        label={sectionsByArea.get(areaData.area)?.namePt ?? areaLabels[areaData.area]}
                        area={areaData.area}
                        imageUrl={sectionsByArea.get(areaData.area)?.imageUrl ?? getAreaPreviewImage(areaData)}
                      />
                      <span className="relative z-10 flex h-full min-h-[96px] flex-col justify-end p-2.5 text-white">
                        <span className="text-sm font-normal leading-tight">
                          {sectionsByArea.get(areaData.area)?.namePt ?? areaLabels[areaData.area]}
                        </span>
                        <span className="mt-1 text-xs font-normal text-white">
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
                        className="absolute right-2 top-2 z-20 rounded-[18px] border border-white bg-[#ff943c] px-3 py-1.5 text-xs font-normal text-white"
                      >
                        Editar
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSection("drinks");
                      setModal({
                        type: "choose-child",
                        parentId: "drinks",
                        parentType: "category",
                        area: selectedDrinkArea,
                      });
                    }}
                    className="min-h-[96px] rounded-[18px] border border-dashed border-[#ff943c] bg-white/50 p-3 text-2xl font-bold leading-none text-[#ff943c]"
                    aria-label="Adicionar seção em Bebidas"
                  >
                    +
                  </button>
                </div>
                </>
              ) : (
                <>
                  <div className="mb-5">
                  <h3 className="text-4xl font-normal text-black">Comidas</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {foodSidebarItems.map((item) => (
                    <article key={item.slug} className="relative min-h-[96px] overflow-hidden rounded-[18px]">
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
                        <span className="relative z-10 flex h-full min-h-[96px] flex-col justify-end p-2.5 text-white">
                          <span className="text-sm font-normal leading-tight">{item.label}</span>
                          <span className="mt-1 text-xs font-normal text-white">
                            {item.productCount} produtos
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ type: "edit-category", categorySlug: item.slug })}
                        className="absolute right-2 top-2 z-20 rounded-[18px] border border-white bg-[#ff943c] px-3 py-1.5 text-xs font-normal text-white"
                      >
                        Editar
                      </button>
                    </article>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSection("foods");
                      setModal({
                        type: "choose-child",
                        parentId: "foods",
                        parentType: "category",
                        area: "foods",
                      });
                    }}
                    className="min-h-[96px] rounded-[18px] border border-dashed border-[#ff943c] bg-white/50 p-3 text-2xl font-bold leading-none text-[#ff943c]"
                    aria-label="Adicionar seção em Comidas"
                  >
                    +
                  </button>
                </div>
                </>
              )}
            </div>
          ) : null}

          {flowView === "categories" ? (
            <div ref={contentRef} className="mt-8">
              <p className="mb-5 text-4xl font-normal text-black">
                {activeSubsectionLabel}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {displayCategories.map((category) => (
                  <article key={category.slug} className="relative min-h-[96px] overflow-hidden rounded-[18px]">
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
                      <span className="relative z-10 flex h-full min-h-[96px] flex-col justify-end p-2.5 text-white">
                        <span className="text-sm font-normal leading-tight">{category.name}</span>
                        <span className="mt-1 text-xs font-normal text-white">
                          {category.products.length} produtos
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit-category", categorySlug: category.slug })}
                      className="absolute right-2 top-2 z-20 rounded-[18px] border border-white bg-[#ff943c] px-3 py-1.5 text-xs font-normal text-white"
                    >
                      Editar
                    </button>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setModal({
                      type: "choose-child",
                      parentId: selectedDrinkArea,
                      parentType: "section",
                      area: createCategoryArea,
                    })
                  }
                  className="min-h-[96px] rounded-[18px] border border-dashed border-[#ff943c] bg-white/50 p-3 text-2xl font-bold leading-none text-[#ff943c]"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}

          {flowView === "products" && selectedCategory ? (
            <div ref={contentRef} className="mt-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-4xl font-normal text-black">
                  {selectedCategory.name}
                </p>
                <div className="hidden items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ type: "edit-category", categorySlug: selectedCategory.slug })}
                    className="rounded-full border border-[var(--line)] bg-white/88 px-3 py-2 text-xs font-semibold text-[var(--espresso)]"
                  >
                    Editar esta categoria
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModal({
                        type: "choose-child",
                        parentId: selectedCategory.id,
                        parentType: "subsection",
                        area: selectedCategory.area,
                        categorySlug: selectedCategory.slug,
                      })
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[rgba(227,106,47,0.42)] bg-white/88 text-xl font-semibold leading-none text-[var(--brand-strong)]"
                    aria-label="Adicionar produto"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedCategoryProducts.map((product) => (
                  <article
                    key={product.id}
                    className="relative min-h-[96px] overflow-hidden rounded-[18px] border border-[#c6c6c6]/60 bg-white/88"
                  >
                    <div className="absolute inset-0">
                      <ProductArt
                        title={product.namePt}
                        tone={getAdminProductTone(selectedCategory.area)}
                        area={selectedCategory.area}
                        imageUrl={product.imageUrl}
                        size="admin-card"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-10 bg-[rgba(55,52,48,0.78)] p-2 text-white">
                      <h3 className="line-clamp-2 text-sm font-normal leading-tight">
                        {product.namePt}
                      </h3>
                      <p className="mt-1 text-sm font-normal">
                        {formatMoney(product.price, "pt")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit-product", productId: product.id })}
                      className="absolute right-2 top-2 z-20 rounded-[18px] border border-white bg-[#ff943c] px-3 py-1.5 text-xs font-normal text-white"
                    >
                      Editar
                    </button>
                    <form action={deleteProductAction} className="hidden">
                      <input type="hidden" name="storeSlug" value={storeSlug} />
                      <input type="hidden" name="productId" value={product.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-white/86 px-4 py-2 text-xs font-semibold text-[var(--tone-berry)]"
                      >
                        Excluir
                      </button>
                    </form>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setModal({
                      type: "choose-child",
                      parentId: selectedCategory.id,
                      parentType: "subsection",
                      area: selectedCategory.area,
                      categorySlug: selectedCategory.slug,
                    })
                  }
                  className="min-h-[96px] rounded-[18px] border border-dashed border-[#ff943c] bg-white/50 p-3 text-2xl font-bold leading-none text-[#ff943c]"
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
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[#f8eee3] p-3 py-8"
          role="dialog"
          aria-modal="true"
        >
          <div data-product-modal className="w-full max-w-[640px] overflow-hidden rounded-[18px] border border-[#c6c6c6]/70 bg-white/70">
            <div className="flex items-center justify-between gap-4 border-b border-[#c6c6c6]/70 px-7 py-5">
              <h2 className="text-2xl font-bold text-black">
                {modal.type === "choose-child"
                  ? "O que deseja criar?"
                  : modal.type === "create-category"
                    ? modal.nodeType === "category"
                      ? "Nova categoria"
                      : modal.nodeType === "section"
                        ? "Nova seção"
                        : `Nova subseção em ${activeCatalogLabel}`
                  : modal.type === "edit-root-category"
                    ? "Editar categoria"
                  : modal.type === "edit-section"
                    ? "Editar seção"
                  : modal.type === "edit-category"
                    ? "Editar subseção"
                    : modal.type === "create-product"
                      ? "Novo produto"
                      : "Editar produto"}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6c6c6]/70 bg-white text-lg font-bold leading-none text-black"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="no-scrollbar max-h-[calc(100vh-120px)] overflow-y-auto p-7">
              {modal.type === "choose-child" ? (
                <div className="grid gap-3">
                  <p className="text-sm font-semibold text-[#747171]">O que deseja criar?</p>
                  {modal.parentType === "subsection" && modal.categorySlug ? (
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          type: "create-product",
                          categorySlug: modal.categorySlug as string,
                          parentId: modal.parentId,
                          parentType: modal.parentType,
                        })
                      }
                      className="btn-primary w-full"
                    >
                      Criar Produto
                    </button>
                  ) : null}
                  {modal.parentType === "section" ? (
                    <>
                    <button
                      type="button"
                      onClick={() =>
                        openCreateCategoryModal({
                          nodeType: "subsection",
                          parentId: modal.parentId,
                          parentType: modal.parentType,
                          area: modal.area,
                        })
                      }
                      className="btn-primary w-full"
                    >
                      Criar Subseção
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          type: "create-product",
                          parentId: modal.parentId,
                          parentType: modal.parentType,
                          area: modal.area,
                        })
                      }
                      className="btn-primary w-full"
                    >
                      Criar Produto
                    </button>
                    </>
                  ) : null}
                  {modal.parentType === "category" ? (
                    <>
                    <button
                      type="button"
                      onClick={() =>
                        openCreateCategoryModal({
                          nodeType: "section",
                          parentId: modal.parentId,
                          parentType: modal.parentType,
                          area: modal.area,
                        })
                      }
                      className="btn-primary w-full"
                    >
                      Criar Seção
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          type: "create-product",
                          parentId: modal.parentId,
                          parentType: modal.parentType,
                          area: modal.area,
                        })
                      }
                      className="btn-primary w-full"
                    >
                      Criar Produto
                    </button>
                    </>
                  ) : null}
                  <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full">
                    Cancelar
                  </button>
                </div>
              ) : null}

              {modal.type === "edit-root-category" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveRootCategoryEdit(new FormData(event.currentTarget), modal.section);
                  }}
                  className="grid gap-4"
                >
                  <input type="hidden" name="type" value="category" />
                  <input type="hidden" name="parentId" value={storeSlug} />
                  <input type="hidden" name="parentType" value="root" />
                  <input type="hidden" name="area" value={modal.section === "foods" ? "foods" : "hot-drinks"} />
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                    <div className="grid gap-4">
                      <LocalizedTextFields
                        fieldBase="name"
                        labels={{ pt: "Nome PT", en: "Name EN", es: "Nombre ES" }}
                        defaultValues={{
                          pt: getRootDefaults(modal.section).name,
                          en: getRootDefaults(modal.section).nameEn ?? "",
                          es: getRootDefaults(modal.section).nameEs ?? "",
                        }}
                        requiredPt
                      />
                      <LocalizedTextFields
                        fieldBase="description"
                        labels={{ pt: "Descricao PT", en: "Description EN", es: "Descripcion ES" }}
                        defaultValues={{
                          pt: getRootDefaults(modal.section).descriptionPt ?? "",
                          en: getRootDefaults(modal.section).descriptionEn ?? "",
                          es: getRootDefaults(modal.section).descriptionEs ?? "",
                        }}
                        textarea
                      />
                      <div className="grid gap-4">
                        <label className="block">
                          <span>Posição</span>
                          <select name="placement" className="select" defaultValue="LAST">
                            <option value="FIRST">Primeira da lista</option>
                            <option value="LAST">Última da lista</option>
                          </select>
                        </label>
                      </div>
                      <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                        <input type="checkbox" name="isActive" defaultChecked={getRootDefaults(modal.section).isActive ?? true} />
                        <span>Seção ativa na vitrine</span>
                      </label>
                    </div>
                    <div className="grid gap-4">
                      <ImageUploadField
                        name="sidebarImageUrl"
                        label="Imagem da seção"
                        defaultValue={getRootDefaults(modal.section).imageUrl}
                        previewClassName="aspect-square rounded-[18px]"
                        cropAspectRatio={1}
                      />
                      <ColorField name="accentColor" label="Cor da seção" defaultValue={getRootDefaults(modal.section).accentColor ?? "#c96b3f"} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        title: "Excluir categoria?",
                        message: "Isso remove apenas a personalização desta categoria raiz.",
                        fields: {},
                        action: async () => {
                          const next = { ...rootCategoryEdits };
                          delete next[modal.section];
                          setRootCategoryEdits(next);
                          window.localStorage.setItem(`coffee-root-categories:${storeSlug}`, JSON.stringify(next));
                        },
                      })
                    }
                    className="btn-secondary w-full border-red-500 text-red-600"
                  >
                    Excluir
                  </button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full border-red-500 text-red-600">
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : null}

              {modal.type === "create-category" ? (
                <form action={createCategoryAndRefresh} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="type" value={modal.nodeType ?? "subsection"} />
                  <input type="hidden" name="parentId" value={modal.parentId ?? ""} />
                  <input type="hidden" name="parentType" value={modal.parentType ?? "section"} />
                  <input type="hidden" name="area" value={createCategoryArea} />

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
                      <div className="grid gap-4">
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
                  <input type="hidden" name="type" value="section" />
                  <input type="hidden" name="parentId" value={modal.area === "foods" ? "foods" : "drinks"} />
                  <input type="hidden" name="parentType" value="category" />
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
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        title: "Excluir seção?",
                        message: "Confirme se deseja excluir esta seção.",
                        action: deleteSectionAction,
                        fields: { storeSlug, area: modal.area },
                      })
                    }
                    className="btn-secondary w-full border-red-500 text-red-600"
                  >
                    Excluir
                  </button>
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
                  <input type="hidden" name="type" value="subsection" />
                  <input type="hidden" name="parentId" value={modalPublicCategory.area} />
                  <input type="hidden" name="parentType" value="section" />
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
                  <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <input type="checkbox" name="isActive" defaultChecked={modalCategoryRecord.isActive} />
                    <span className="text-sm font-semibold text-[var(--espresso)]">
                      Seção ativa na vitrine
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        title: "Excluir categoria?",
                        message: "Confirme se deseja excluir esta categoria e seus produtos.",
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
                    Excluir
                  </button>
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

              {modal.type === "create-product" && autoProductCategorySlug ? (
                <form action={createProductAndRefresh} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="type" value="product" />
                  <input type="hidden" name="parentId" value={modal.parentId ?? autoProductCategorySlug} />
                  <input type="hidden" name="parentType" value={modal.parentType ?? "subsection"} />
                  <input type="hidden" name="categorySlug" value={autoProductCategorySlug} />
                  <ImageUploadField
                    name="imageUrl"
                    label="Colocar preview da imagem aqui"
                    description="Essa e a imagem que aparece no card do produto."
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
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full border-red-500 text-red-600">
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : null}

              {modal.type === "edit-product" && modalProduct ? (
                <form action={updateProductAction} onSubmit={closeModalOnSubmit} className="grid gap-4">
                  <input type="hidden" name="storeSlug" value={storeSlug} />
                  <input type="hidden" name="type" value="product" />
                  <input type="hidden" name="parentId" value={modalProduct.categorySlug} />
                  <input type="hidden" name="parentType" value="subsection" />
                  <input type="hidden" name="productId" value={modalProduct.id} />
                  <input type="hidden" name="categorySlug" value={modalProduct.categorySlug} />
                  <ImageUploadField
                    name="imageUrl"
                    label="Colocar preview da imagem aqui"
                    defaultValue={modalProduct.imageUrl}
                    previewClassName="aspect-[5/3] rounded-[16px]"
                    cropAspectRatio={5 / 3}
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
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        title: "Excluir produto?",
                        message: "Confirme se deseja excluir este produto.",
                        action: deleteProductAction,
                        fields: { storeSlug, productId: modalProduct.id },
                      })
                    }
                    className="btn-secondary w-full border-red-500 text-red-600"
                  >
                    Excluir
                  </button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="submit" className="btn-primary w-full">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setModal(null)} className="btn-secondary w-full border-red-500 text-red-600">
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirm ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(40,21,14,0.38)] p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#c6c6c6]/70 bg-white p-6">
            <h2 className="text-2xl font-bold text-black">{deleteConfirm.title}</h2>
            <p className="mt-3 text-sm text-[#747171]">{deleteConfirm.message}</p>
            <form action={confirmDelete} className="mt-6 grid gap-3 sm:grid-cols-2">
              {Object.entries(deleteConfirm.fields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <button type="button" onClick={() => setDeleteConfirm(null)} className="btn-secondary w-full">
                Cancelar
              </button>
              <button type="submit" className="btn-secondary w-full border-red-500 text-red-600">
                Confirmar exclusão
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
