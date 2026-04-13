"use client";

import { useEffect, useRef, useState } from "react";
import { ColorField } from "@/components/color-field";
import { ImageUploadField } from "@/components/image-upload-field";
import { ProductArt } from "@/components/product-art";
import {
  createCategoryAction,
  createProductAction,
  deleteProductAction,
  updateCategoryVisualAction,
  updateProductAction,
} from "@/app/admin/actions";
import { formatMoney } from "@/lib/coffee/i18n";
import type {
  CatalogDashboardCategory,
  CatalogDashboardProduct,
  MenuAreaSlug,
  PublicAreaData,
  PublicCategory,
} from "@/lib/coffee/types";

type AdminProductsPanelProps = {
  storeSlug: string;
  catalog: PublicAreaData[];
  categories: CatalogDashboardCategory[];
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
  desserts: "Bolos",
} as const;

function getCategoryPreviewImage(category: PublicCategory) {
  return category.sidebarImageUrl ?? category.products.find((product) => product.imageUrl)?.imageUrl ?? null;
}

function getAreaPreviewImage(areaData: PublicAreaData) {
  return (
    areaData.categories.find((category) => category.sidebarImageUrl)?.sidebarImageUrl ??
    areaData.categories
      .flatMap((category) => category.products)
      .find((product) => product.imageUrl)?.imageUrl ??
    null
  );
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
  return displayCategory.products
    .map((product) => productsBySlug.get(product.slug))
    .filter((product): product is CatalogDashboardProduct => Boolean(product));
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

export function AdminProductsPanel({
  storeSlug,
  catalog,
  categories,
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [selectedArea, setSelectedArea] = useState<MenuAreaSlug>(
    availableAreas.includes(initialArea) ? initialArea : catalog[0]?.area ?? "hot-drinks",
  );
  const [selectedFoodCategorySlug, setSelectedFoodCategorySlug] = useState<string | null>(
    foodSidebarItems.find((item) => item.slug === initialFoodCategorySlug)?.slug ??
      foodSidebarItems[0]?.slug ??
      null,
  );
  const effectiveFoodCategorySlug = foodSidebarItems.some(
    (item) => item.slug === selectedFoodCategorySlug,
  )
    ? selectedFoodCategorySlug
    : foodSidebarItems[0]?.slug ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("section", "products");

    if (selectedArea === "foods") {
      params.set("area", "foods");

      if (effectiveFoodCategorySlug) {
        params.set("category", effectiveFoodCategorySlug);
      } else {
        params.delete("category");
      }
    } else {
      params.set("area", selectedArea);
      params.delete("category");
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [effectiveFoodCategorySlug, selectedArea]);

  const displayCategories =
    selectedArea === "foods"
      ? foodsArea?.categories.filter((category) => category.slug === effectiveFoodCategorySlug) ?? []
      : catalog.find((entry) => entry.area === selectedArea)?.categories ?? [];
  const activeCatalogLabel =
    selectedArea === "foods"
      ? displayCategories[0]?.name ?? "Sem categorias"
      : areaLabels[selectedArea];
  const activeCatalogProductCount = displayCategories.reduce(
    (total, category) => total + category.products.length,
    0,
  );
  const createCategoryArea = selectedArea === "foods" ? "foods" : selectedArea;

  return (
    <div className="pb-1">
      <section className="card-panel overflow-hidden p-3 sm:p-4">
        <div className="grid gap-3 lg:h-[calc(100vh-8rem)] lg:grid-cols-[120px_minmax(0,1fr)] lg:gap-5">
          <aside className="min-w-0 lg:min-h-0 lg:self-stretch">
            <div className="no-scrollbar overflow-x-auto lg:h-full lg:overflow-x-hidden lg:overflow-y-auto">
              <nav className="flex gap-4 pb-1 lg:h-full lg:flex-col lg:gap-5 lg:pb-0 lg:pr-1">
                <div className="min-w-max space-y-2 lg:min-w-0">
                  <p className="border-b border-[rgba(72,46,34,0.16)] pb-1 text-left text-[13px] font-semibold text-[var(--espresso)] lg:text-center">
                    {sidebarGroupLabels.drinks}
                  </p>
                  <div className="flex gap-2 lg:flex-col lg:items-center">
                    {drinksAreas.map((areaData) => {
                      const isActive = selectedArea === areaData.area;

                      return (
                        <button
                          key={areaData.area}
                          type="button"
                          onClick={() => setSelectedArea(areaData.area)}
                          className={`relative flex h-[82px] w-[82px] shrink-0 items-end overflow-hidden rounded-[22px] border p-2.5 text-left transition hover:-translate-y-[1px] sm:h-[88px] sm:w-[88px] sm:p-3 lg:h-[92px] lg:w-[92px] ${
                            isActive
                              ? "border-[#f4cf3d] shadow-[0_0_0_2px_rgba(244,207,61,0.28),0_16px_28px_rgba(61,34,23,0.18)]"
                              : "border-[rgba(90,52,37,0.2)] shadow-[0_10px_20px_rgba(61,34,23,0.12)]"
                          }`}
                        >
                          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,#6f4a3a,#2f1b15)]" />
                            {getAreaPreviewImage(areaData) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getAreaPreviewImage(areaData) as string}
                                alt={areaLabels[areaData.area]}
                                className="absolute inset-0 h-full w-full scale-110 object-cover"
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,16,10,0.2),rgba(28,16,10,0.68))]" />
                          </div>
                          <span
                            className="display-title relative z-10 block w-full break-words text-[12px] leading-[0.96] text-white sm:text-[13px]"
                            style={{ textShadow: "0 3px 14px rgba(0, 0, 0, 0.5)" }}
                          >
                            {areaLabels[areaData.area]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {foodsArea ? (
                  <div className="min-w-max space-y-2 lg:min-w-0">
                    <p className="border-b border-[rgba(72,46,34,0.16)] pb-1 text-left text-[13px] font-semibold text-[var(--espresso)] lg:text-center">
                      {sidebarGroupLabels.foods}
                    </p>
                    <div className="flex gap-2 lg:flex-col lg:items-center">
                      {foodSidebarItems.map((item) => {
                        const isActive =
                          selectedArea === "foods" && effectiveFoodCategorySlug === item.slug;

                        return (
                          <button
                            key={item.slug}
                            type="button"
                            onClick={() => {
                              setSelectedArea("foods");
                              setSelectedFoodCategorySlug(item.slug);
                            }}
                            className={`relative flex h-[82px] w-[82px] shrink-0 items-end overflow-hidden rounded-[22px] border p-2.5 text-left transition hover:-translate-y-[1px] sm:h-[88px] sm:w-[88px] sm:p-3 lg:h-[92px] lg:w-[92px] ${
                              isActive
                                ? "border-[#f4cf3d] shadow-[0_0_0_2px_rgba(244,207,61,0.28),0_16px_28px_rgba(61,34,23,0.18)]"
                                : "border-[rgba(90,52,37,0.2)] shadow-[0_10px_20px_rgba(61,34,23,0.12)]"
                            }`}
                          >
                            <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
                              <div className="absolute inset-0 bg-[linear-gradient(180deg,#7b573f,#2f1b15)]" />
                              {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.imageUrl}
                                  alt={item.label}
                                  className="absolute inset-0 h-full w-full scale-110 object-cover"
                                />
                              ) : null}
                              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,16,10,0.2),rgba(28,16,10,0.68))]" />
                            </div>
                            <span
                              className="display-title relative z-10 block w-full break-words text-[12px] leading-[0.96] text-white sm:text-[13px]"
                              style={{ textShadow: "0 3px 14px rgba(0, 0, 0, 0.5)" }}
                            >
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </nav>
            </div>
          </aside>

          <div className="min-h-0 min-w-0">
            <section className="flex h-[72vh] min-h-[540px] overflow-hidden rounded-[28px] border border-[var(--line)] bg-[rgba(255,250,244,0.82)] shadow-[0_18px_40px_rgba(61,34,23,0.08)] lg:h-full">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="shrink-0 overflow-hidden border-b border-[rgba(72,46,34,0.12)] bg-[rgba(255,247,240,0.94)] backdrop-blur-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
                    <h2 className="display-title text-2xl font-semibold text-[var(--espresso)] sm:text-3xl">
                      {activeCatalogLabel}
                    </h2>

                    <div className="rounded-[22px] border border-[rgba(227,106,47,0.18)] bg-white/88 px-4 py-3 text-right shadow-[0_12px_24px_rgba(61,34,23,0.08)]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                        Produtos
                      </p>
                      <p className="mt-1 text-2xl font-semibold leading-none text-[var(--espresso)]">
                        {activeCatalogProductCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div ref={contentRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="space-y-4">
                    <details className="rounded-[22px] border border-[var(--line)] bg-white/86">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--espresso)] sm:px-5">
                        Nova seção
                      </summary>

                      <form
                        action={createCategoryAction}
                        className="grid gap-4 border-t border-[var(--line)] p-4 sm:p-5"
                      >
                        <input type="hidden" name="storeSlug" value={storeSlug} />

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                          <div className="grid gap-4">
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                                Nome da seção
                              </span>
                              <input
                                name="namePt"
                                className="field"
                                placeholder="Bebidas especiais"
                                required
                              />
                            </label>

                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                                Descrição
                              </span>
                              <textarea
                                name="descriptionPt"
                                className="textarea min-h-24"
                                placeholder="Como essa nova seção aparece na vitrine."
                              />
                            </label>

                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                                  Onde ela aparece
                                </span>
                                <select
                                  key={createCategoryArea}
                                  name="area"
                                  className="select"
                                  defaultValue={createCategoryArea}
                                >
                                  <optgroup label="Bebidas">
                                    <option value="hot-drinks">Bebidas quentes</option>
                                    <option value="cold-drinks">Bebidas geladas</option>
                                  </optgroup>
                                  <optgroup label="Comidas">
                                    <option value="foods">Comidas</option>
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

                            <ColorField
                              name="accentColor"
                              label="Cor da seção"
                              defaultValue="#c96b3f"
                            />
                          </div>
                        </div>

                        <button type="submit" className="btn-primary w-full">
                          Criar seção
                        </button>
                      </form>
                    </details>

                    {displayCategories.length === 0 ? (
                      <div className="rounded-[26px] border border-dashed border-[var(--line)] bg-white/76 px-5 py-8 text-sm leading-7 text-[var(--muted)]">
                        Esta visualizacao ainda nao tem categorias ativas.
                      </div>
                    ) : (
                      <>
                        {displayCategories.map((displayCategory) => {
                          const categoryRecord = categoriesBySlug.get(displayCategory.slug) ?? null;
                          const categoryProducts = getDashboardProductsForDisplayCategory(
                            displayCategory,
                            productsBySlug,
                          );
                          const productTone = getAdminProductTone(displayCategory.area);

                          return (
                            <section
                              key={displayCategory.slug}
                              className="overflow-hidden rounded-[30px] border border-[var(--line)] bg-[rgba(255,252,248,0.92)] shadow-[0_16px_32px_rgba(61,34,23,0.06)]"
                            >
                              <div className="border-b border-[rgba(72,46,34,0.08)] px-4 py-4 sm:px-5">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                                      {areaLabels[displayCategory.area]}
                                    </p>
                                    <h2 className="display-title mt-2 text-2xl font-semibold text-[var(--espresso)] sm:text-3xl">
                                      {displayCategory.name}
                                    </h2>
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                                      {displayCategory.description || "Sem descricao cadastrada."}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[rgba(61,34,23,0.08)] px-3 py-1 text-xs font-semibold text-[var(--espresso)]">
                                    {categoryProducts.length} itens
                                  </span>
                                </div>
                              </div>

                              <div className="grid gap-3 border-b border-[rgba(72,46,34,0.08)] bg-[rgba(255,250,244,0.82)] p-4 lg:grid-cols-2">
                                <details className="rounded-[20px] border border-[var(--line)] bg-white/84 px-4 py-3">
                                  <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--espresso)]">
                                    Editar secao
                                  </summary>
                                  <form action={updateCategoryVisualAction} className="mt-4 grid gap-4">
                                    <input type="hidden" name="storeSlug" value={storeSlug} />
                                    <input type="hidden" name="categoryId" value={categoryRecord?.id ?? ""} />

                                    <ImageUploadField
                                      name="sidebarImageUrl"
                                      label="Imagem da lateral esquerda"
                                      defaultValue={
                                        categoryRecord?.sidebarImageUrl ?? displayCategory.sidebarImageUrl
                                      }
                                      description="Essa imagem aparece na navegacao lateral do cardapio publico e e otimizada automaticamente."
                                      previewClassName="aspect-square rounded-[18px]"
                                      cropAspectRatio={1}
                                    />

                                    <ColorField
                                      name="accentColor"
                                      label="Cor da secao"
                                      defaultValue={
                                        categoryRecord?.accentColor ?? displayCategory.accentColor
                                      }
                                    />

                                    <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                                      <input
                                        type="checkbox"
                                        name="isActive"
                                        defaultChecked={categoryRecord?.isActive ?? true}
                                      />
                                      <span className="text-sm font-semibold text-[var(--espresso)]">
                                        Categoria ativa na vitrine
                                      </span>
                                    </label>

                                    <button type="submit" className="btn-secondary w-full">
                                      Salvar secao
                                    </button>
                                  </form>
                                </details>

                                <details className="rounded-[20px] border border-[var(--line)] bg-white/84 px-4 py-3">
                                  <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--espresso)]">
                                    Novo produto
                                  </summary>
                                  <form action={createProductAction} className="mt-4 grid gap-4">
                                    <input type="hidden" name="storeSlug" value={storeSlug} />
                                    <input type="hidden" name="categorySlug" value={displayCategory.slug} />

                                    <label className="block">
                                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                                        Nome
                                      </span>
                                      <input name="namePt" className="field" required />
                                    </label>

                                    <label className="block">
                                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                                        Descricao
                                      </span>
                                      <textarea name="descriptionPt" className="textarea min-h-24" />
                                    </label>

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

                                    <label className="block">
                                      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                                        Destaque
                                      </span>
                                      <input
                                        name="highlightPt"
                                        className="field"
                                        placeholder="Mais vendido, lancamento..."
                                      />
                                    </label>

                                    <div className="grid gap-3 md:grid-cols-2">
                                      <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                                        <input type="checkbox" name="isAvailable" defaultChecked />
                                        <span className="text-sm font-semibold text-[var(--espresso)]">
                                          Disponivel
                                        </span>
                                      </label>
                                      <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                                        <input type="checkbox" name="isFeatured" />
                                        <span className="text-sm font-semibold text-[var(--espresso)]">
                                          Destaque
                                        </span>
                                      </label>
                                    </div>

                                    <button type="submit" className="btn-primary w-full">
                                      Inserir produto
                                    </button>
                                  </form>
                                </details>
                              </div>

                              <div className="space-y-3 p-4 sm:p-5">
                                {categoryProducts.length === 0 ? (
                                  <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/76 px-5 py-8 text-sm leading-7 text-[var(--muted)]">
                                    Ainda nao ha produtos nessa categoria.
                                  </div>
                                ) : (
                                  categoryProducts.map((product) => (
                                    <article
                                      key={product.id}
                                      className="rounded-[26px] border border-[rgba(72,46,34,0.1)] bg-white p-3 shadow-[0_12px_28px_rgba(61,34,23,0.05)] sm:p-4"
                                    >
                                      <div className="grid grid-cols-[minmax(96px,1fr)_minmax(0,3fr)] items-stretch gap-3 sm:grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] sm:gap-4">
                                        <div className="h-full">
                                          <ProductArt
                                            title={product.namePt}
                                            tone={productTone}
                                            size="column"
                                            area={displayCategory.area}
                                            imageUrl={product.imageUrl}
                                          />
                                        </div>

                                        <div className="flex min-h-[168px] min-w-0 flex-col">
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <h3 className="text-base font-semibold leading-5 text-[var(--espresso)] sm:text-lg">
                                                {product.namePt}
                                              </h3>
                                              {product.highlightPt ? (
                                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                                                  {product.highlightPt}
                                                </p>
                                              ) : null}
                                            </div>

                                            <div className="text-right">
                                              <p className="text-[22px] font-semibold leading-none text-[var(--espresso)]">
                                                {formatMoney(product.price, "pt")}
                                              </p>
                                              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                                                Estoque {product.stockQuantity ?? 0}
                                              </p>
                                              <p className="text-xs leading-5 text-[var(--muted)]">
                                                Ordem #{product.sortOrder}
                                              </p>
                                            </div>
                                          </div>

                                          <p className="mt-2 text-[13px] leading-5 text-[var(--muted)]">
                                            {product.descriptionPt || "Sem descricao cadastrada."}
                                          </p>

                                          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                                            <div className="flex flex-wrap gap-2">
                                              <span className="rounded-full bg-[rgba(61,34,23,0.08)] px-3 py-1 text-xs font-semibold text-[var(--espresso)]">
                                                {product.isAvailable ? "Disponivel" : "Indisponivel"}
                                              </span>
                                              {product.isFeatured ? (
                                                <span className="rounded-full bg-[rgba(227,106,47,0.12)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                                                  Destaque
                                                </span>
                                              ) : null}
                                            </div>

                                            <form action={deleteProductAction} className="shrink-0">
                                              <input type="hidden" name="storeSlug" value={storeSlug} />
                                              <input type="hidden" name="productId" value={product.id} />
                                              <button
                                                type="submit"
                                                className="rounded-full border border-[rgba(149,89,92,0.18)] px-4 py-2.5 text-sm font-semibold text-[var(--tone-berry)]"
                                              >
                                                Excluir
                                              </button>
                                            </form>
                                          </div>
                                        </div>
                                      </div>

                                      <details className="mt-4 rounded-[18px] border border-[var(--line)] bg-[rgba(255,250,244,0.84)]">
                                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--espresso)]">
                                          Editar produto
                                        </summary>

                                        <form
                                          action={updateProductAction}
                                          className="grid gap-3 border-t border-[var(--line)] p-4"
                                        >
                                          <input type="hidden" name="storeSlug" value={storeSlug} />
                                          <input type="hidden" name="productId" value={product.id} />
                                          <input
                                            type="hidden"
                                            name="categorySlug"
                                            value={product.categorySlug}
                                          />

                                          <ImageUploadField
                                            name="imageUrl"
                                            label="Imagem"
                                            defaultValue={product.imageUrl}
                                            previewClassName="aspect-[5/4] rounded-[16px]"
                                            cropAspectRatio={5 / 4}
                                          />

                                          <label className="block">
                                            <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                                              Nome
                                            </span>
                                            <input
                                              name="namePt"
                                              className="field"
                                              defaultValue={product.namePt}
                                            />
                                          </label>

                                          <label className="block">
                                            <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                                              Descricao
                                            </span>
                                            <textarea
                                              name="descriptionPt"
                                              className="textarea min-h-20"
                                              defaultValue={product.descriptionPt ?? ""}
                                            />
                                          </label>

                                          <div className="grid gap-3 sm:grid-cols-3">
                                            <label className="block">
                                              <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                                                Preco
                                              </span>
                                              <input
                                                name="price"
                                                className="field"
                                                defaultValue={product.price ?? ""}
                                              />
                                            </label>
                                            <label className="block">
                                              <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                                                Estoque
                                              </span>
                                              <input
                                                name="stockQuantity"
                                                className="field"
                                                defaultValue={product.stockQuantity ?? ""}
                                              />
                                            </label>
                                            <label className="block">
                                              <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                                                Ordem
                                              </span>
                                              <input
                                                name="sortOrder"
                                                className="field"
                                                defaultValue={product.sortOrder}
                                              />
                                            </label>
                                          </div>

                                          <label className="block">
                                            <span className="mb-1.5 block text-sm font-semibold text-[var(--espresso)]">
                                              Destaque
                                            </span>
                                            <input
                                              name="highlightPt"
                                              className="field"
                                              defaultValue={product.highlightPt ?? ""}
                                            />
                                          </label>

                                          <div className="grid gap-2 sm:grid-cols-2">
                                            <label className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/70 px-3 py-2">
                                              <input
                                                type="checkbox"
                                                name="isAvailable"
                                                defaultChecked={product.isAvailable}
                                              />
                                              <span className="text-sm font-semibold text-[var(--espresso)]">
                                                Disponivel
                                              </span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/70 px-3 py-2">
                                              <input
                                                type="checkbox"
                                                name="isFeatured"
                                                defaultChecked={product.isFeatured}
                                              />
                                              <span className="text-sm font-semibold text-[var(--espresso)]">
                                                Destaque
                                              </span>
                                            </label>
                                          </div>

                                          <button type="submit" className="btn-secondary w-full">
                                            Salvar produto
                                          </button>
                                        </form>
                                      </details>
                                    </article>
                                  ))
                                )}
                              </div>
                            </section>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
