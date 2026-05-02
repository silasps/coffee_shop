import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoffeeFinanceCategory,
  CoffeeInventoryMovementType,
} from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { AdminProductsPanel } from "@/components/admin-products-panel";
import { ColorField } from "@/components/color-field";
import { ImageUploadField } from "@/components/image-upload-field";
import {
  addInventoryMovementAction,
  createFinanceEntryAction,
  createSupplierAction,
  updateStorefrontAction,
  updateSupplierAction,
} from "@/app/admin/actions";
import { formatMoney } from "@/lib/coffee/i18n";
import { buildStoreAdminPath } from "@/lib/coffee/paths";
import { getCatalog, getOperationsDashboard, getStorefront } from "@/lib/coffee/service";
import { STOREFRONT_SLOGAN_MAX_LENGTH } from "@/lib/coffee/types";
import type {
  MenuAreaSlug,
  PublicAreaData,
} from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

const areaLabels = {
  foods: "Comidas",
  "hot-drinks": "Bebidas quentes",
  "cold-drinks": "Bebidas geladas",
} as const;

const preferredProductAreas: MenuAreaSlug[] = ["hot-drinks", "cold-drinks", "foods"];

const foodCategoryLabelOverrides = {
  desserts: "Bolos",
} as const;

const financeCategoryLabels: Record<CoffeeFinanceCategory, string> = {
  SALE: "Venda",
  SUPPLY_PURCHASE: "Compra de insumos",
  OPERATIONS: "Operação",
  RENT: "Aluguel",
  PAYROLL: "Folha",
  TAXES: "Impostos",
  UTILITIES: "Água / Luz / Internet",
  MARKETING: "Marketing",
  MAINTENANCE: "Manutenção",
  EQUIPMENT: "Equipamentos",
  OTHER: "Outros",
  ADJUSTMENT: "Ajuste",
};

const inventoryTypeLabels: Record<CoffeeInventoryMovementType, string> = {
  PURCHASE: "Compra",
  ENTRY: "Entrada",
  CONSUMPTION: "Consumo",
  ADJUSTMENT: "Ajuste",
  WASTE: "Perda",
};

function isAreaData(areaData: PublicAreaData | undefined): areaData is PublicAreaData {
  return Boolean(areaData);
}

function normalizeAdminAreaData(areaData: PublicAreaData): PublicAreaData {
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

function buildFoodSidebarItems(areaData: PublicAreaData) {
  return areaData.categories.map((category) => ({
    slug: category.slug,
    label:
      category.slug in foodCategoryLabelOverrides
        ? foodCategoryLabelOverrides[category.slug as keyof typeof foodCategoryLabelOverrides]
        : category.name,
    imageUrl:
      category.sidebarImageUrl ?? category.products.find((product) => product.imageUrl)?.imageUrl ?? null,
    productCount: category.products.length,
  }));
}

function buildSectionHref(
  storeSlug: string,
  section: string,
  extras?: Record<string, string>,
) {
  const params = new URLSearchParams({ section });

  Object.entries(extras ?? {}).forEach(([key, value]) => {
    params.set(key, value);
  });

  return `${buildStoreAdminPath(storeSlug)}?${params.toString()}`;
}

export default async function StoreAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ section?: string; category?: string; area?: string }>;
}) {
  const { storeSlug } = await params;
  const query = await searchParams;
  const activeSection =
    query.section === "storefront" ||
    query.section === "products" ||
    query.section === "suppliers" ||
    query.section === "cash"
      ? query.section
      : "overview";

  const [store, dashboard, catalog] = await Promise.all([
    getStorefront(storeSlug),
    getOperationsDashboard(storeSlug),
    getCatalog("pt", storeSlug),
  ]);

  if (!store) {
    notFound();
  }

  const sales = dashboard.financeEntries
    .filter((entry) => entry.direction === "INCOME")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const expenses = dashboard.financeEntries
    .filter((entry) => entry.direction === "EXPENSE")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const balance = sales - expenses;

  const orderedCatalog = preferredProductAreas
    .map((area) => catalog.find((entry) => entry.area === area))
    .filter(isAreaData)
    .map(normalizeAdminAreaData);
  const foodsArea = orderedCatalog.find((entry) => entry.area === "foods") ?? null;
  const foodSidebarItems = foodsArea ? buildFoodSidebarItems(foodsArea) : [];
  const availableAreas = orderedCatalog.map((entry) => entry.area);
  const requestedArea = availableAreas.includes(query.area as MenuAreaSlug)
    ? (query.area as MenuAreaSlug)
    : query.category && foodsArea?.categories.some((category) => category.slug === query.category)
      ? "foods"
      : orderedCatalog[0]?.area ?? "hot-drinks";
  const selectedFoodCategorySlug =
    requestedArea === "foods"
      ? foodSidebarItems.find((item) => item.slug === query.category)?.slug ??
        foodSidebarItems[0]?.slug ??
        null
      : null;
  const displayCategories =
    requestedArea === "foods"
      ? foodsArea?.categories.filter((category) => category.slug === selectedFoodCategorySlug) ?? []
      : orderedCatalog.find((entry) => entry.area === requestedArea)?.categories ?? [];
  const currentProductHrefExtras: Record<string, string> =
    requestedArea === "foods" && selectedFoodCategorySlug
      ? { area: "foods", category: selectedFoodCategorySlug }
      : { area: requestedArea };
  const activeCatalogLabel =
    areaLabels[requestedArea];
  const activeCatalogProductCount = displayCategories.reduce(
    (total, category) => total + category.products.length,
    0,
  );
  return (
    <AdminShell
      badge="Gestão da cafeteria"
      title={store.name}
      description="Painel desktop-first para administrar vitrine, categorias, produtos, fornecedores e caixa sem depender de uma tela enorme."
      activeKey={activeSection}
      navItems={[
        {
          key: "overview",
          label: "Resumo",
          description: "Indicadores e atalhos da loja.",
          href: buildSectionHref(store.slug, "overview"),
        },
        {
          key: "storefront",
          label: "Vitrine",
          description: "Logo, frase, cores e identidade.",
          href: buildSectionHref(store.slug, "storefront"),
        },
        {
          key: "products",
          label: "Produtos",
          description: "Categorias e itens da vitrine.",
          count: dashboard.products.length,
          href: buildSectionHref(store.slug, "products", currentProductHrefExtras),
        },
        {
          key: "suppliers",
          label: "Fornecedores",
          description: "Cadastro e contatos.",
          count: dashboard.suppliers.length,
          href: buildSectionHref(store.slug, "suppliers"),
        },
        {
          key: "cash",
          label: "Caixa",
          description: "Entradas, saídas e estoque.",
          count: dashboard.financeEntries.length,
          href: buildSectionHref(store.slug, "cash"),
        },
      ]}
      stats={[
        { label: "Produtos", value: dashboard.products.length },
        { label: "Categorias", value: dashboard.categories.length },
        { label: "Fornecedores", value: dashboard.suppliers.length },
        { label: "Saldo", value: formatMoney(balance, "pt") },
      ]}
      actions={
        <>
          <a href={store.publicUrl} className="btn-primary text-center">
            Abrir vitrine
          </a>
          <Link href="/admin" className="btn-secondary text-center">
            Voltar para plataforma
          </Link>
        </>
      }
    >
      {activeSection === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <section className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Atalhos rápidos
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Editar vitrine",
                  href: buildSectionHref(store.slug, "storefront"),
                  helper: "Logo, slogan, cores e contato.",
                },
                {
                  label: "Administrar produtos",
                  href: buildSectionHref(store.slug, "products", currentProductHrefExtras),
                  helper: "Categorias, lateral esquerda e itens.",
                },
                {
                  label: "Gerir fornecedores",
                  href: buildSectionHref(store.slug, "suppliers"),
                  helper: "Contato, prazos e condições.",
                },
                {
                  label: "Abrir caixa",
                  href: buildSectionHref(store.slug, "cash"),
                  helper: "Entradas, saídas e estoque.",
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4 transition hover:-translate-y-[1px]"
                >
                  <p className="text-sm font-semibold text-[var(--espresso)]">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.helper}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Foto rápida da operação
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Vitrine
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                  {store.sloganPt || "Sem frase configurada"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {store.publicUrl}
                </p>
              </article>
              <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Foco do cardápio
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                  {activeCatalogLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {activeCatalogProductCount} produtos nesta visualização.
                </p>
              </article>
              <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Entradas
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                  {formatMoney(sales, "pt")}
                </p>
              </article>
              <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Saídas
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                  {formatMoney(expenses, "pt")}
                </p>
              </article>
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "storefront" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <form action={updateStorefrontAction} className="card-panel p-5">
            <input type="hidden" name="storeSlug" value={store.slug} />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Identidade da vitrine
            </p>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Nome da loja
                </span>
                <input name="name" className="field" defaultValue={store.name} required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Razão social
                </span>
                <input name="legalName" className="field" defaultValue={store.legalName ?? ""} />
              </label>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Frase do cabecalho PT
                  </span>
                  <input
                    name="sloganPt"
                    className="field"
                    defaultValue={store.sloganPt ?? ""}
                    maxLength={STOREFRONT_SLOGAN_MAX_LENGTH}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Header slogan EN
                  </span>
                  <input
                    name="sloganEn"
                    className="field"
                    defaultValue={store.sloganEn ?? ""}
                    maxLength={STOREFRONT_SLOGAN_MAX_LENGTH}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Frase del encabezado ES
                  </span>
                  <input
                    name="sloganEs"
                    className="field"
                    defaultValue={store.sloganEs ?? ""}
                    maxLength={STOREFRONT_SLOGAN_MAX_LENGTH}
                  />
                </label>
              </div>
              <p className="-mt-2 text-xs leading-5 text-[var(--muted)]">
                Ate {STOREFRONT_SLOGAN_MAX_LENGTH} caracteres. Se ingles ou espanhol ficarem
                vazios, o sistema gera uma traducao automatica baseada no texto em portugues.
              </p>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Descricao publica PT
                  </span>
                  <textarea
                    name="storefrontDescriptionPt"
                    className="textarea min-h-28"
                    defaultValue={store.storefrontDescriptionPt ?? ""}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Public description EN
                  </span>
                  <textarea
                    name="storefrontDescriptionEn"
                    className="textarea min-h-28"
                    defaultValue={store.storefrontDescriptionEn ?? ""}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Descripcion publica ES
                  </span>
                  <textarea
                    name="storefrontDescriptionEs"
                    className="textarea min-h-28"
                    defaultValue={store.storefrontDescriptionEs ?? ""}
                  />
                </label>
              </div>

              <ImageUploadField
                name="logoUrl"
                label="Logo"
                defaultValue={store.logoUrl}
                description="A logo e otimizada automaticamente antes de salvar."
                previewClassName="aspect-square rounded-[18px]"
                cropAspectRatio={1}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <ColorField
                  name="brandPrimaryColor"
                  label="Cor principal"
                  defaultValue={store.brandPrimaryColor}
                />
                <ColorField
                  name="brandSecondaryColor"
                  label="Cor secundária"
                  defaultValue={store.brandSecondaryColor}
                />
                <ColorField
                  name="brandAccentColor"
                  label="Cor de apoio"
                  defaultValue={store.brandAccentColor}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Idioma padrão
                  </span>
                  <select name="defaultLocale" className="select" defaultValue={store.defaultLocale}>
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Telefone / WhatsApp
                  </span>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="contactPhone" className="field" defaultValue={store.contactPhone ?? ""} />
                    <input
                      name="contactWhatsapp"
                      className="field"
                      defaultValue={store.contactWhatsapp ?? ""}
                    />
                  </div>
                </label>
              </div>

              <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                <input type="checkbox" name="isActive" defaultChecked={store.isActive} />
                <span className="text-sm font-semibold text-[var(--espresso)]">
                  Manter cafeteria ativa
                </span>
              </label>

              <button type="submit" className="btn-primary w-full">
                Salvar vitrine
              </button>
            </div>
          </form>

          <div className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Itens visuais configuráveis
            </p>
            <div className="mt-4 grid gap-3">
              {[
                "Logo com upload e preview",
                "Frase editável do cabeçalho",
                "Seletor visual de cores com código hexadecimal",
                "Contato rápido da cafeteria",
                "Ativação ou pausa da loja",
              ].map((item) => (
                <article
                  key={item}
                  className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4 text-sm leading-7 text-[var(--muted)]"
                >
                  {item}
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "products" ? (
        <AdminProductsPanel
          storeSlug={store.slug}
          catalog={orderedCatalog}
          categories={dashboard.categories}
          products={dashboard.products}
          initialArea={requestedArea}
          initialFoodCategorySlug={selectedFoodCategorySlug}
        />
      ) : null}

      {activeSection === "suppliers" ? (
        <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
          <form action={createSupplierAction} className="card-panel p-5">
            <input type="hidden" name="storeSlug" value={store.slug} />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Novo fornecedor
            </p>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Nome</span>
                <input name="name" className="field" placeholder="Laticínios Serra" required />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Contato</span>
                  <input name="contactName" className="field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Documento</span>
                  <input name="documentId" className="field" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">E-mail</span>
                  <input name="email" className="field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Telefone</span>
                  <input name="phone" className="field" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">WhatsApp</span>
                  <input name="whatsapp" className="field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Prazo em dias</span>
                  <input name="leadTimeDays" className="field" />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Condição de pagamento</span>
                <input name="paymentTerms" className="field" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Observações</span>
                <textarea name="notes" className="textarea min-h-24" />
              </label>
              <button type="submit" className="btn-primary w-full">
                Cadastrar fornecedor
              </button>
            </div>
          </form>

          <section className="grid gap-4 lg:grid-cols-2">
            {dashboard.suppliers.length === 0 ? (
              <div className="card-panel p-5 text-sm leading-7 text-[var(--muted)] lg:col-span-2">
                Ainda não há fornecedores cadastrados.
              </div>
            ) : (
              dashboard.suppliers.map((supplier) => (
                <form
                  key={supplier.id}
                  action={updateSupplierAction}
                  className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4 shadow-[0_14px_28px_rgba(61,34,23,0.06)]"
                >
                  <input type="hidden" name="storeSlug" value={store.slug} />
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--espresso)]">{supplier.name}</h3>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {supplier.paymentTerms || "Sem condição de pagamento"}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--espresso)]">
                      <input type="checkbox" name="isActive" defaultChecked={supplier.isActive} />
                      Ativo
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <input name="name" className="field" defaultValue={supplier.name} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input name="contactName" className="field" defaultValue={supplier.contactName ?? ""} />
                      <input name="documentId" className="field" defaultValue={supplier.documentId ?? ""} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input name="email" className="field" defaultValue={supplier.email ?? ""} />
                      <input name="phone" className="field" defaultValue={supplier.phone ?? ""} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input name="whatsapp" className="field" defaultValue={supplier.whatsapp ?? ""} />
                      <input
                        name="leadTimeDays"
                        className="field"
                        defaultValue={supplier.leadTimeDays ?? ""}
                      />
                    </div>
                    <input name="paymentTerms" className="field" defaultValue={supplier.paymentTerms ?? ""} />
                    <textarea name="notes" className="textarea min-h-20" defaultValue={supplier.notes ?? ""} />
                  </div>

                  <button type="submit" className="btn-secondary mt-3 w-full">
                    Salvar fornecedor
                  </button>
                </form>
              ))
            )}
          </section>
        </div>
      ) : null}

      {activeSection === "cash" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Entradas</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--espresso)]">{formatMoney(sales, "pt")}</p>
            </article>
            <article className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Saídas</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--espresso)]">{formatMoney(expenses, "pt")}</p>
            </article>
            <article className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Saldo</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--espresso)]">{formatMoney(balance, "pt")}</p>
            </article>
            <article className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Lançamentos</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--espresso)]">{dashboard.financeEntries.length}</p>
            </article>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-5">
              <form action={addInventoryMovementAction} className="card-panel p-5">
                <input type="hidden" name="storeSlug" value={store.slug} />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                  Movimento de estoque
                </p>
                <div className="mt-4 grid gap-4">
                  <input name="titlePt" className="field" placeholder="Compra de leite" required />
                  <div className="grid gap-4 md:grid-cols-2">
                    <select
                      name="type"
                      className="select"
                      defaultValue={CoffeeInventoryMovementType.PURCHASE}
                    >
                      {Object.entries(inventoryTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select name="supplierId" className="select">
                      <option value="">Sem fornecedor</option>
                      {dashboard.suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <input name="quantity" className="field" placeholder="24" />
                    <input name="unitLabel" className="field" placeholder="litros" />
                    <input name="referenceCode" className="field" placeholder="NF-2031" />
                  </div>
                  <input name="totalAmount" className="field" placeholder="198.00" />
                  <textarea name="description" className="textarea min-h-24" placeholder="Observações" />
                  <button type="submit" className="btn-secondary w-full">
                    Registrar estoque
                  </button>
                </div>
              </form>

              <form action={createFinanceEntryAction} className="card-panel p-5">
                <input type="hidden" name="storeSlug" value={store.slug} />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                  Lançamento de caixa
                </p>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <select name="direction" className="select">
                      <option value="INCOME">Entrada</option>
                      <option value="EXPENSE">Saída</option>
                    </select>
                    <select name="category" className="select" defaultValue={CoffeeFinanceCategory.OPERATIONS}>
                      {Object.entries(financeCategoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input name="descriptionPt" className="field" placeholder="Pagamento de aluguel" required />
                  <div className="grid gap-4 md:grid-cols-3">
                    <select name="supplierId" className="select md:col-span-2">
                      <option value="">Sem fornecedor</option>
                      {dashboard.suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <input name="amount" className="field" placeholder="850.00" required />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="referenceCode" className="field" placeholder="ALUG-ABR-01" />
                    <input name="notes" className="field" placeholder="Detalhe opcional" />
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    Registrar caixa
                  </button>
                </div>
              </form>
            </div>

            <div className="grid gap-5">
              <section className="card-panel p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                  Últimos lançamentos
                </p>
                <div className="mt-4 grid gap-3">
                  {dashboard.financeEntries.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-white/76 px-5 py-8 text-sm leading-7 text-[var(--muted)]">
                      Nenhum lançamento financeiro cadastrado ainda.
                    </div>
                  ) : (
                    dashboard.financeEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--espresso)]">
                              {entry.descriptionPt}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              {financeCategoryLabels[entry.category as CoffeeFinanceCategory] ?? entry.category}
                              {entry.supplierName ? ` • ${entry.supplierName}` : ""}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-[var(--espresso)]">
                            {formatMoney(entry.amount, "pt")}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="card-panel p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                  Estoque recente
                </p>
                <div className="mt-4 grid gap-3">
                  {dashboard.inventoryMovements.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-white/76 px-5 py-8 text-sm leading-7 text-[var(--muted)]">
                      Nenhum movimento de estoque cadastrado ainda.
                    </div>
                  ) : (
                    dashboard.inventoryMovements.map((movement) => (
                      <article
                        key={movement.id}
                        className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--espresso)]">
                              {movement.titlePt}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              {movement.type} • {movement.quantity ?? "-"} {movement.unitLabel ?? ""}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-[var(--espresso)]">
                            {formatMoney(movement.totalAmount ?? 0, "pt")}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
