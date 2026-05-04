import {
  CoffeeBillingInvoiceStatus,
  CoffeeFinanceCategory,
  CoffeeFinanceDirection,
  CoffeeInventoryMovementType,
  CoffeeMenuArea,
  CoffeeOrderChannel,
  CoffeeOrderStatus,
  CoffeePaymentMethod,
  CoffeePaymentStatus,
  Prisma,
} from "@prisma/client";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import {
  areaCategoryOrder,
  catalogCategories,
  catalogProducts,
  demoFinanceEntries,
  demoInventoryMovements,
  demoOrders,
} from "@/lib/coffee/catalog-data";
import {
  fillLocalizedText,
  resolveCategoryCopy,
  resolveProductCopy,
} from "@/lib/coffee/content-i18n";
import { getAreaName } from "@/lib/coffee/i18n";
import { buildStorePublicUrl, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_SLOGAN_MAX_LENGTH } from "@/lib/coffee/types";
import type {
  CatalogDashboardCategory,
  CatalogDashboardSection,
  CatalogDashboardProduct,
  BillingInvoiceSummary,
  CheckoutPayload,
  ClientAccessStatus,
  FinanceEntryRecord,
  InventoryMovementRecord,
  Locale,
  ManagedStoreSummary,
  MenuAreaSlug,
  OperationsDashboard,
  OrderSnapshot,
  PlatformAdminDashboard,
  PlatformClientSummary,
  PublicAreaData,
  PublicCategory,
  PublicProduct,
  StorefrontConfig,
  SupplierRecord,
} from "@/lib/coffee/types";

const areaMap: Record<MenuAreaSlug, CoffeeMenuArea> = {
  foods: CoffeeMenuArea.FOODS,
  "hot-drinks": CoffeeMenuArea.HOT_DRINKS,
  "cold-drinks": CoffeeMenuArea.COLD_DRINKS,
};

const reverseAreaMap: Record<CoffeeMenuArea, MenuAreaSlug> = {
  FOODS: "foods",
  HOT_DRINKS: "hot-drinks",
  COLD_DRINKS: "cold-drinks",
};

const defaultCatalogSections: Record<MenuAreaSlug, Omit<CatalogDashboardSection, "area">> = {
  foods: {
    namePt: "Comidas",
    nameEn: "Foods",
    nameEs: "Comidas",
    descriptionPt: null,
    descriptionEn: null,
    descriptionEs: null,
    imageUrl: null,
    sortOrder: 30,
    isActive: true,
  },
  "hot-drinks": {
    namePt: "Bebidas quentes",
    nameEn: "Hot drinks",
    nameEs: "Bebidas calientes",
    descriptionPt: null,
    descriptionEn: null,
    descriptionEs: null,
    imageUrl: null,
    sortOrder: 10,
    isActive: true,
  },
  "cold-drinks": {
    namePt: "Bebidas geladas",
    nameEn: "Cold drinks",
    nameEs: "Bebidas frias",
    descriptionPt: null,
    descriptionEn: null,
    descriptionEs: null,
    imageUrl: null,
    sortOrder: 20,
    isActive: true,
  },
};

const shouldSkipDatabase = process.env.COFFEE_SHOP_SKIP_DB === "1";
const modelFieldCache = new Map<string, Set<string>>();
const PUBLIC_CACHE_SECONDS = 300;

export function getPublicStorefrontCacheTag(storeSlug = DEFAULT_STORE_SLUG) {
  return `coffee-storefront:${storeSlug}`;
}

export function getPublicCatalogCacheTag(storeSlug = DEFAULT_STORE_SLUG, locale?: Locale) {
  return locale
    ? `coffee-catalog:${storeSlug}:${locale}`
    : `coffee-catalog:${storeSlug}`;
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return typeof error === "string" ? error : "Erro desconhecido.";
}

function reportFallback(scope: string, storeSlug: string, error?: unknown) {
  const suffix = error ? ` Motivo: ${formatErrorMessage(error)}` : "";
  console.warn(`[coffee] ${scope} para "${storeSlug}". Usando dados de fallback.${suffix}`);
}

const defaultStoreSeed = {
  slug: DEFAULT_STORE_SLUG,
  name: "Cafeteria AT",
  legalName: "Coffee Shop",
  currencyCode: "BRL",
  defaultLocale: "pt",
  sloganPt: "De Tamandaré para o mundo.",
  sloganEn: "From Tamandare to the world.",
  sloganEs: "De Tamandare al mundo.",
  storefrontDescriptionPt:
    "Cardápio digital, pedidos e operação de cafeteria em uma mesma base reutilizável.",
  storefrontDescriptionEn:
    "Digital menu, ordering, and cafe operations in one reusable foundation.",
  storefrontDescriptionEs:
    "Menu digital, pedidos y operacion de cafeteria en una misma base reutilizable.",
  brandPrimaryColor: "#e36a2f",
  brandSecondaryColor: "#3d2217",
  brandAccentColor: "#f0c067",
  logoUrl: "/brand/logo-dark.png",
} as const;

const defaultClientSeed = {
  slug: "conta-principal",
  name: "Conta principal",
  legalName: "Conta principal da plataforma",
  ownerName: "Equipe AT",
  billingEmail: "financeiro@cafeteria-at.local",
  monthlyFee: 150,
  billingDayOfMonth: 10,
  graceDays: 4,
  suspensionDays: 12,
  notes:
    "Conta criada automaticamente para sustentar a gestão multi-cafeteria enquanto novos clientes são cadastrados.",
} as const;

type BillingRules = {
  isActive: boolean;
  billingDayOfMonth: number;
  graceDays: number;
  suspensionDays: number;
};

type BillingInvoiceSource = {
  id: string;
  clientAccountId: string;
  referenceMonth: Date;
  amount: Prisma.Decimal | number;
  dueAt: Date;
  paidAt: Date | null;
  reminderSentAt: Date | null;
  finalNoticeSentAt: Date | null;
  status: CoffeeBillingInvoiceStatus;
  clientAccount: {
    name: string;
    slug: string;
    isActive: boolean;
    billingDayOfMonth: number;
    graceDays: number;
    suspensionDays: number;
  };
};

const checkoutSchema = z.object({
  customerName: z.string().min(2),
  channel: z.enum(["TABLE", "COUNTER", "TOTEM"]),
  paymentMethod: z.enum([
    "ONLINE_CARD",
    "PAY_LINK",
    "PIX",
    "PAY_AT_COUNTER",
    "CASH_AT_COUNTER",
    "CARD_AT_COUNTER",
  ]),
  tableLabel: z.string().optional(),
  notes: z.string().optional(),
  locale: z.enum(["pt", "en", "es"]),
  storeSlug: z.string().optional(),
  items: z
    .array(
      z.object({
        slug: z.string(),
        name: z.string(),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        area: z.enum(["foods", "hot-drinks", "cold-drinks"]),
        notes: z.string().trim().max(280).optional(),
      }),
    )
    .min(1),
});

function moneyToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
}

function cleanOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isInlineImageUrl(value: string | null | undefined) {
  return Boolean(value?.startsWith("data:image/"));
}

function buildPublicImagePath(kind: "category" | "product", id: string) {
  return `/api/coffee-images/${kind}/${encodeURIComponent(id)}`;
}

function normalizePublicImageUrl(
  value: string | null | undefined,
  kind: "category" | "product",
  id: string,
) {
  if (!value) {
    return null;
  }

  return isInlineImageUrl(value) ? buildPublicImagePath(kind, id) : value;
}

function cleanOptionalBoundedString(
  value: string | null | undefined,
  fieldLabel: string,
  maxLength: number,
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldLabel} deve ter no máximo ${maxLength} caracteres.`);
  }

  return trimmed;
}

function buildStoreLocalizedFields(input: {
  sloganPt?: string | null;
  sloganEn?: string | null;
  sloganEs?: string | null;
  storefrontDescriptionPt?: string | null;
  storefrontDescriptionEn?: string | null;
  storefrontDescriptionEs?: string | null;
}) {
  const slogan = fillLocalizedText(
    {
      pt: cleanOptionalBoundedString(
        input.sloganPt,
        "A frase do cabeçalho",
        STOREFRONT_SLOGAN_MAX_LENGTH,
      ),
      en: cleanOptionalBoundedString(
        input.sloganEn,
        "The header slogan",
        STOREFRONT_SLOGAN_MAX_LENGTH,
      ),
      es: cleanOptionalBoundedString(
        input.sloganEs,
        "La frase del encabezado",
        STOREFRONT_SLOGAN_MAX_LENGTH,
      ),
    },
    { kind: "store-slogan" },
  );
  const description = fillLocalizedText(
    {
      pt: cleanOptionalString(input.storefrontDescriptionPt),
      en: cleanOptionalString(input.storefrontDescriptionEn),
      es: cleanOptionalString(input.storefrontDescriptionEs),
    },
    { kind: "store-description" },
  );

  return {
    sloganPt: slogan.pt,
    sloganEn: slogan.en,
    sloganEs: slogan.es,
    storefrontDescriptionPt: description.pt,
    storefrontDescriptionEn: description.en,
    storefrontDescriptionEs: description.es,
  };
}

function buildCategoryLocalizedFields(input: {
  slug: string;
  namePt: string;
  nameEn?: string | null;
  nameEs?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
}) {
  const name = fillLocalizedText(
    {
      pt: input.namePt.trim(),
      en: cleanOptionalString(input.nameEn),
      es: cleanOptionalString(input.nameEs),
    },
    { kind: "category-name", slug: input.slug },
  );
  const description = fillLocalizedText(
    {
      pt: cleanOptionalString(input.descriptionPt),
      en: cleanOptionalString(input.descriptionEn),
      es: cleanOptionalString(input.descriptionEs),
    },
    { kind: "category-description", slug: input.slug },
  );

  return {
    namePt: name.pt ?? input.namePt.trim(),
    nameEn: name.en,
    nameEs: name.es,
    descriptionPt: description.pt,
    descriptionEn: description.en,
    descriptionEs: description.es,
  };
}

function buildSectionLocalizedFields(input: {
  area: MenuAreaSlug;
  namePt: string;
  nameEn?: string | null;
  nameEs?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
}) {
  const name = fillLocalizedText(
    {
      pt: input.namePt.trim(),
      en: cleanOptionalString(input.nameEn),
      es: cleanOptionalString(input.nameEs),
    },
    { kind: "category-name", slug: input.area },
  );
  const description = fillLocalizedText(
    {
      pt: cleanOptionalString(input.descriptionPt),
      en: cleanOptionalString(input.descriptionEn),
      es: cleanOptionalString(input.descriptionEs),
    },
    { kind: "category-description", slug: input.area },
  );

  return {
    namePt: name.pt ?? input.namePt.trim(),
    nameEn: name.en,
    nameEs: name.es,
    descriptionPt: description.pt,
    descriptionEn: description.en,
    descriptionEs: description.es,
  };
}

function buildProductLocalizedFields(input: {
  slug: string;
  namePt: string;
  nameEn?: string | null;
  nameEs?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  highlightPt?: string | null;
  highlightEn?: string | null;
  highlightEs?: string | null;
}) {
  const name = fillLocalizedText(
    {
      pt: input.namePt.trim(),
      en: cleanOptionalString(input.nameEn),
      es: cleanOptionalString(input.nameEs),
    },
    { kind: "product-name", slug: input.slug },
  );
  const description = fillLocalizedText(
    {
      pt: cleanOptionalString(input.descriptionPt),
      en: cleanOptionalString(input.descriptionEn),
      es: cleanOptionalString(input.descriptionEs),
    },
    { kind: "product-description", slug: input.slug },
  );
  const highlight = fillLocalizedText(
    {
      pt: cleanOptionalString(input.highlightPt),
      en: cleanOptionalString(input.highlightEn),
      es: cleanOptionalString(input.highlightEs),
    },
    { kind: "product-highlight", slug: input.slug },
  );

  return {
    namePt: name.pt ?? input.namePt.trim(),
    nameEn: name.en,
    nameEs: name.es,
    descriptionPt: description.pt,
    descriptionEn: description.en,
    descriptionEs: description.es,
    highlightPt: highlight.pt,
    highlightEn: highlight.en,
    highlightEs: highlight.es,
  };
}

function getModelFieldSet(modelName: string) {
  const cached = modelFieldCache.get(modelName);

  if (cached) {
    return cached;
  }

  const fieldSet = new Set(
    Prisma.dmmf.datamodel.models
      .find((model) => model.name === modelName)
      ?.fields.map((field) => field.name) ?? [],
  );

  modelFieldCache.set(modelName, fieldSet);
  return fieldSet;
}

function filterModelWriteData<T extends Record<string, unknown>>(modelName: string, data: T) {
  const allowedFields = getModelFieldSet(modelName);

  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) => value !== undefined && allowedFields.has(key),
    ),
  ) as Partial<T>;
}

function toNullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function startOfMonth(referenceDate = new Date()) {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12, 0, 0, 0);
}

function clampDayOfMonth(referenceMonth: Date, dayOfMonth: number) {
  const daysInMonth = new Date(
    referenceMonth.getFullYear(),
    referenceMonth.getMonth() + 1,
    0,
  ).getDate();

  return Math.min(Math.max(1, Math.round(dayOfMonth || 1)), daysInMonth);
}

function buildDueDate(referenceMonth: Date, dayOfMonth: number) {
  return new Date(
    referenceMonth.getFullYear(),
    referenceMonth.getMonth(),
    clampDayOfMonth(referenceMonth, dayOfMonth),
    12,
    0,
    0,
    0,
  );
}

function startOfDay(referenceDate: Date) {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );
}

function differenceInCalendarDays(left: Date, right: Date) {
  const leftDay = startOfDay(left);
  const rightDay = startOfDay(right);
  return Math.round((leftDay.getTime() - rightDay.getTime()) / 86_400_000);
}

function formatBillingReference(referenceMonth: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(referenceMonth);
}

function formatShortDate(referenceDate: Date | null | undefined) {
  if (!referenceDate) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR").format(referenceDate);
}

function getBillingRules(input: BillingRules) {
  return {
    isActive: input.isActive,
    billingDayOfMonth: Math.max(1, Math.round(input.billingDayOfMonth || 10)),
    graceDays: Math.max(0, Math.round(input.graceDays || 0)),
    suspensionDays: Math.max(
      Math.max(1, Math.round(input.graceDays || 0) + 1),
      Math.round(input.suspensionDays || 1),
    ),
  };
}

function getInvoiceViewStatus(
  invoice: Pick<
    BillingInvoiceSource,
    "dueAt" | "paidAt" | "status" | "clientAccount"
  >,
) {
  if (invoice.status === CoffeeBillingInvoiceStatus.CANCELED) {
    return {
      status: "CANCELED" as const,
      statusLabel: "Cancelada",
      daysUntilDue: null,
      daysOverdue: null,
    };
  }

  if (invoice.paidAt || invoice.status === CoffeeBillingInvoiceStatus.PAID) {
    return {
      status: "PAID" as const,
      statusLabel: "Paga",
      daysUntilDue: null,
      daysOverdue: null,
    };
  }

  const rules = getBillingRules(invoice.clientAccount);
  const today = new Date();
  const dayDiff = differenceInCalendarDays(invoice.dueAt, today);

  if (!rules.isActive) {
    return {
      status: "BLOCKED" as const,
      statusLabel: "Conta pausada",
      daysUntilDue: dayDiff > 0 ? dayDiff : null,
      daysOverdue: dayDiff < 0 ? Math.abs(dayDiff) : null,
    };
  }

  if (dayDiff > 3) {
    return {
      status: "OPEN" as const,
      statusLabel: "Em aberto",
      daysUntilDue: dayDiff,
      daysOverdue: null,
    };
  }

  if (dayDiff > 0) {
    return {
      status: "UPCOMING" as const,
      statusLabel: `Vence em ${dayDiff} dia${dayDiff === 1 ? "" : "s"}`,
      daysUntilDue: dayDiff,
      daysOverdue: null,
    };
  }

  if (dayDiff === 0) {
    return {
      status: "OPEN" as const,
      statusLabel: "Vence hoje",
      daysUntilDue: 0,
      daysOverdue: null,
    };
  }

  const daysOverdue = Math.abs(dayDiff);

  if (daysOverdue > rules.suspensionDays) {
    return {
      status: "BLOCKED" as const,
      statusLabel: "Bloqueio automático",
      daysUntilDue: null,
      daysOverdue,
    };
  }

  if (daysOverdue > rules.graceDays) {
    return {
      status: "OVERDUE" as const,
      statusLabel: "Em atraso",
      daysUntilDue: null,
      daysOverdue,
    };
  }

  return {
    status: "OPEN" as const,
    statusLabel: `Em aberto (${daysOverdue} dia${daysOverdue === 1 ? "" : "s"} de atraso)`,
    daysUntilDue: null,
    daysOverdue,
  };
}

function mapBillingInvoiceSummary(invoice: BillingInvoiceSource): BillingInvoiceSummary {
  const view = getInvoiceViewStatus(invoice);

  return {
    id: invoice.id,
    clientAccountId: invoice.clientAccountId,
    clientName: invoice.clientAccount.name,
    clientSlug: invoice.clientAccount.slug,
    referenceLabel: formatBillingReference(invoice.referenceMonth),
    referenceMonth: invoice.referenceMonth.toISOString(),
    amount: moneyToNumber(invoice.amount) ?? 0,
    dueAt: invoice.dueAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    reminderSentAt: invoice.reminderSentAt?.toISOString() ?? null,
    finalNoticeSentAt: invoice.finalNoticeSentAt?.toISOString() ?? null,
    status: view.status,
    statusLabel: view.statusLabel,
    daysUntilDue: view.daysUntilDue,
    daysOverdue: view.daysOverdue,
  };
}

function buildClientAlerts(client: PlatformClientSummary, latestInvoice: BillingInvoiceSummary | null) {
  const alerts: string[] = [];

  if (!client.isActive) {
    alerts.push("Conta pausada manualmente na plataforma.");
  }

  if (!latestInvoice) {
    alerts.push("Nenhuma cobrança aberta no momento.");
    return alerts;
  }

  if (latestInvoice.status === "UPCOMING" && latestInvoice.daysUntilDue !== null) {
    alerts.push(`Próxima cobrança vence em ${latestInvoice.daysUntilDue} dia(s).`);
  }

  if (latestInvoice.status === "OPEN" && latestInvoice.daysOverdue) {
    alerts.push(`Cobrança em aberto há ${latestInvoice.daysOverdue} dia(s).`);
  }

  if (latestInvoice.status === "OVERDUE" && latestInvoice.daysOverdue) {
    alerts.push(`Cliente com ${latestInvoice.daysOverdue} dia(s) de atraso.`);
  }

  if (latestInvoice.status === "BLOCKED" && latestInvoice.daysOverdue) {
    alerts.push(`Acesso sujeito a bloqueio por ${latestInvoice.daysOverdue} dia(s) de atraso.`);
  }

  if (latestInvoice.reminderSentAt) {
    alerts.push(`Lembrete registrado em ${formatShortDate(new Date(latestInvoice.reminderSentAt))}.`);
  }

  if (latestInvoice.finalNoticeSentAt) {
    alerts.push(
      `Aviso final registrado em ${formatShortDate(new Date(latestInvoice.finalNoticeSentAt))}.`,
    );
  }

  return alerts;
}

function buildFallbackStorefront(storeSlug = DEFAULT_STORE_SLUG): StorefrontConfig {
  const isDefaultStore = storeSlug === DEFAULT_STORE_SLUG;

  return {
    id: `fallback-${storeSlug}`,
    slug: storeSlug,
    name: isDefaultStore ? defaultStoreSeed.name : titleFromSlug(storeSlug),
    legalName: isDefaultStore ? defaultStoreSeed.legalName : titleFromSlug(storeSlug),
    defaultLocale: "pt",
    currencyCode: "BRL",
    isActive: true,
    sloganPt: defaultStoreSeed.sloganPt,
    sloganEn: defaultStoreSeed.sloganEn,
    sloganEs: defaultStoreSeed.sloganEs,
    storefrontDescriptionPt: defaultStoreSeed.storefrontDescriptionPt,
    storefrontDescriptionEn: defaultStoreSeed.storefrontDescriptionEn,
    storefrontDescriptionEs: defaultStoreSeed.storefrontDescriptionEs,
    logoUrl: defaultStoreSeed.logoUrl,
    brandPrimaryColor: defaultStoreSeed.brandPrimaryColor,
    brandSecondaryColor: defaultStoreSeed.brandSecondaryColor,
    brandAccentColor: defaultStoreSeed.brandAccentColor,
    contactPhone: null,
    contactWhatsapp: null,
    publicUrl: buildStorePublicUrl(storeSlug),
  };
}

function mapStorefront(store: {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  defaultLocale: string;
  currencyCode: string;
  isActive: boolean;
  sloganPt: string | null;
  sloganEn: string | null;
  sloganEs: string | null;
  storefrontDescriptionPt: string | null;
  storefrontDescriptionEn: string | null;
  storefrontDescriptionEs: string | null;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  brandAccentColor: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
}): StorefrontConfig {
  const locale = store.defaultLocale === "en" || store.defaultLocale === "es" ? store.defaultLocale : "pt";

  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    legalName: store.legalName,
    defaultLocale: locale,
    currencyCode: store.currencyCode,
    isActive: store.isActive,
    sloganPt: store.sloganPt,
    sloganEn: store.sloganEn,
    sloganEs: store.sloganEs,
    storefrontDescriptionPt: store.storefrontDescriptionPt,
    storefrontDescriptionEn: store.storefrontDescriptionEn,
    storefrontDescriptionEs: store.storefrontDescriptionEs,
    logoUrl: store.logoUrl,
    brandPrimaryColor: store.brandPrimaryColor,
    brandSecondaryColor: store.brandSecondaryColor,
    brandAccentColor: store.brandAccentColor,
    contactPhone: store.contactPhone,
    contactWhatsapp: store.contactWhatsapp,
    publicUrl: buildStorePublicUrl(store.slug, locale),
  };
}

function buildFallbackCatalog(locale: Locale): PublicAreaData[] {
  return Object.entries(areaCategoryOrder).map(([area, categorySlugs]) => {
    const categories: PublicCategory[] = categorySlugs
      .map((categorySlug) => {
        const category = catalogCategories.find((item) => item.slug === categorySlug);

        if (!category) {
          return null;
        }

        const products: PublicProduct[] = catalogProducts
          .filter((product) => product.categorySlug === categorySlug)
          .map((product) => {
            const translations = resolveProductCopy(locale, product);

            return {
              id: product.slug,
              slug: product.slug,
              categorySlug,
              area: category.area,
              name: translations.name,
              description: translations.description,
              originalName: product.namePt,
              imageUrl: product.imageUrl ?? null,
              price: product.price,
              isAvailable: product.available ?? product.price !== null,
              stockQuantity: product.stockQuantity ?? 12,
              prepMinutes: product.prepMinutes ?? 8,
              artTone: product.artTone ?? "mocha",
              highlight: translations.highlight,
            };
          });
        const translations = resolveCategoryCopy(locale, category);

        return {
          ...category,
          id: category.slug,
          sidebarImageUrl:
            category.sidebarImageUrl ??
            products.find((product) => product.imageUrl)?.imageUrl ??
            null,
          name: translations.name,
          description: translations.description,
          products,
        };
      })
      .filter(Boolean) as PublicCategory[];

    return {
      area: area as MenuAreaSlug,
      categories,
    };
  });
}

async function seedStoreCategories(storeId: string, tx: Prisma.TransactionClient) {
  const existingCount = await tx.coffeeCatalogCategory.count({
    where: { storeId },
  });

  if (existingCount > 0) {
    return;
  }

  await tx.coffeeCatalogCategory.createMany({
    skipDuplicates: true,
    data: catalogCategories.map((category) => {
      const localized = buildCategoryLocalizedFields({
        slug: category.slug,
        namePt: category.namePt,
        nameEn: category.nameEn,
        nameEs: category.nameEs,
        descriptionPt: category.descriptionPt,
        descriptionEn: category.descriptionEn,
        descriptionEs: category.descriptionEs,
      });

      return {
        storeId,
        slug: category.slug,
        area: areaMap[category.area],
        ...localized,
        accentColor: category.accentColor ?? null,
        sidebarImageUrl: category.sidebarImageUrl ?? null,
        sortOrder: category.sortOrder,
      };
    }),
  });
}

async function seedStoreProducts(storeId: string, tx: Prisma.TransactionClient) {
  const existingCount = await tx.coffeeProduct.count({
    where: { storeId },
  });

  if (existingCount > 0) {
    return;
  }

  const categories = await tx.coffeeCatalogCategory.findMany({
    where: { storeId },
    select: {
      id: true,
      slug: true,
      area: true,
    },
  });

  if (categories.length === 0) {
    return;
  }

  const categoryMap = new Map(categories.map((category) => [category.slug, category]));
  const sortOrderByCategory = new Map<string, number>();

  await tx.coffeeProduct.createMany({
    skipDuplicates: true,
    data: catalogProducts.flatMap((product) => {
      const category = categoryMap.get(product.categorySlug);

      if (!category) {
        return [];
      }

      const sortOrder = (sortOrderByCategory.get(product.categorySlug) ?? 0) + 1;
      sortOrderByCategory.set(product.categorySlug, sortOrder);
      const localized = buildProductLocalizedFields({
        slug: product.slug,
        namePt: product.namePt,
        nameEn: product.nameEn,
        nameEs: product.nameEs,
        descriptionPt: product.descriptionPt,
        descriptionEn: product.descriptionEn,
        descriptionEs: product.descriptionEs,
        highlightPt: product.highlightPt,
        highlightEn: product.highlightEn,
        highlightEs: product.highlightEs,
      });

      return [
        {
          storeId,
          categoryId: category.id,
          slug: product.slug,
          ...localized,
          imageUrl: product.imageUrl ?? null,
          artTone: product.artTone ?? getToneForCategory(category.area),
          basePrice: toNullableNumber(product.price),
          stockQuantity:
            typeof product.stockQuantity === "number"
              ? Math.max(0, Math.round(product.stockQuantity))
              : 12,
          prepMinutes:
            typeof product.prepMinutes === "number"
              ? Math.max(0, Math.round(product.prepMinutes))
              : 8,
          isAvailable: product.available ?? product.price !== null,
          isFeatured: product.featured ?? false,
          sortOrder,
        },
      ];
    }),
  });
}

async function ensureDefaultClientAccount(tx: Prisma.TransactionClient) {
  const createData = filterModelWriteData("CoffeeClientAccount", {
    slug: defaultClientSeed.slug,
    name: defaultClientSeed.name,
    legalName: defaultClientSeed.legalName,
    ownerName: defaultClientSeed.ownerName,
    billingEmail: defaultClientSeed.billingEmail,
    monthlyFee: defaultClientSeed.monthlyFee,
    billingDayOfMonth: defaultClientSeed.billingDayOfMonth,
    graceDays: defaultClientSeed.graceDays,
    suspensionDays: defaultClientSeed.suspensionDays,
    notes: defaultClientSeed.notes,
  }) as Prisma.CoffeeClientAccountUncheckedCreateInput;

  return tx.coffeeClientAccount.upsert({
    where: { slug: defaultClientSeed.slug },
    update: {},
    create: createData,
  });
}

async function ensureMonthlyBillingInvoice(
  tx: Prisma.TransactionClient,
  clientAccount: {
    id: string;
    monthlyFee: Prisma.Decimal | number;
    billingDayOfMonth: number;
  },
  referenceDate = new Date(),
) {
  const referenceMonth = startOfMonth(referenceDate);

  return tx.coffeeBillingInvoice.upsert({
    where: {
      clientAccountId_referenceMonth: {
        clientAccountId: clientAccount.id,
        referenceMonth,
      },
    },
    update: {},
    create: {
      clientAccountId: clientAccount.id,
      referenceMonth,
      amount: moneyToNumber(clientAccount.monthlyFee) ?? defaultClientSeed.monthlyFee,
      dueAt: buildDueDate(referenceMonth, clientAccount.billingDayOfMonth),
      status: CoffeeBillingInvoiceStatus.OPEN,
    },
  });
}

async function ensureBillingStructure(referenceDate = new Date()) {
  return prisma.$transaction(async (tx) => {
    const defaultClient = await ensureDefaultClientAccount(tx);

    await tx.coffeeShopStore.updateMany({
      where: { clientAccountId: null },
      data: { clientAccountId: defaultClient.id },
    });

    const clientAccounts = await tx.coffeeClientAccount.findMany({
      select: {
        id: true,
        monthlyFee: true,
        billingDayOfMonth: true,
      },
    });

    for (const clientAccount of clientAccounts) {
      await ensureMonthlyBillingInvoice(tx, clientAccount, referenceDate);
    }

    return defaultClient;
  });
}

async function ensureDefaultStoreRecord() {
  return prisma.$transaction(async (tx) => {
    const defaultClient = await ensureDefaultClientAccount(tx);
    const localizedStoreContent = buildStoreLocalizedFields({
      sloganPt: defaultStoreSeed.sloganPt,
      sloganEn: defaultStoreSeed.sloganEn,
      sloganEs: defaultStoreSeed.sloganEs,
      storefrontDescriptionPt: defaultStoreSeed.storefrontDescriptionPt,
      storefrontDescriptionEn: defaultStoreSeed.storefrontDescriptionEn,
      storefrontDescriptionEs: defaultStoreSeed.storefrontDescriptionEs,
    });
    const createData = filterModelWriteData("CoffeeShopStore", {
      clientAccountId: defaultClient.id,
      slug: defaultStoreSeed.slug,
      name: defaultStoreSeed.name,
      legalName: defaultStoreSeed.legalName,
      currencyCode: defaultStoreSeed.currencyCode,
      defaultLocale: defaultStoreSeed.defaultLocale,
      ...localizedStoreContent,
      logoUrl: defaultStoreSeed.logoUrl,
      brandPrimaryColor: defaultStoreSeed.brandPrimaryColor,
      brandSecondaryColor: defaultStoreSeed.brandSecondaryColor,
      brandAccentColor: defaultStoreSeed.brandAccentColor,
    }) as Prisma.CoffeeShopStoreUncheckedCreateInput;

    const store = await tx.coffeeShopStore.upsert({
      where: { slug: DEFAULT_STORE_SLUG },
      update: filterModelWriteData("CoffeeShopStore", {
        clientAccountId: defaultClient.id,
      }) as Prisma.CoffeeShopStoreUncheckedUpdateInput,
      create: createData,
    });

    await ensureMonthlyBillingInvoice(tx, {
      id: defaultClient.id,
      monthlyFee: defaultClient.monthlyFee,
      billingDayOfMonth: defaultClient.billingDayOfMonth,
    });
    await seedStoreCategories(store.id, tx);
    await seedStoreProducts(store.id, tx);

    return store;
  });
}

async function getStoreRecord(storeSlug = DEFAULT_STORE_SLUG) {
  if (shouldSkipDatabase) {
    return null;
  }

  if (storeSlug === DEFAULT_STORE_SLUG) {
    const existingStore = await prisma.coffeeShopStore.findUnique({
      where: { slug: DEFAULT_STORE_SLUG },
    });

    return existingStore ?? ensureDefaultStoreRecord();
  }

  return prisma.coffeeShopStore.findUnique({
    where: { slug: storeSlug },
  });
}

async function getStoreOrThrow(storeSlug = DEFAULT_STORE_SLUG) {
  const store = await getStoreRecord(storeSlug);

  if (!store) {
    throw new Error("Cafeteria não encontrada.");
  }

  return store;
}

type PublicCatalogCategoryRecord = {
  id: string;
  area: CoffeeMenuArea;
  slug: string;
  namePt: string;
  nameEn: string | null;
  nameEs: string | null;
  descriptionPt: string | null;
  descriptionEn: string | null;
  descriptionEs: string | null;
  accentColor: string | null;
  sidebarImageUrl: string | null;
  sortOrder: number;
  products: Array<{
    id: string;
    slug: string;
    namePt: string;
    nameEn: string | null;
    nameEs: string | null;
    descriptionPt: string | null;
    descriptionEn: string | null;
    descriptionEs: string | null;
    imageUrl: string | null;
    basePrice: Prisma.Decimal | null;
    isAvailable: boolean;
    stockQuantity: number | null;
    prepMinutes: number | null;
    artTone: string | null;
    highlightPt: string | null;
    highlightEn: string | null;
    highlightEs: string | null;
  }>;
};

function mapCategory(locale: Locale, category: PublicCatalogCategoryRecord): PublicCategory {
  const area = reverseAreaMap[category.area];
  const translations = resolveCategoryCopy(locale, category);

  return {
    id: category.id,
    slug: category.slug,
    area,
    namePt: category.namePt,
    nameEn: category.nameEn ?? undefined,
    nameEs: category.nameEs ?? undefined,
    descriptionPt: category.descriptionPt ?? undefined,
    descriptionEn: category.descriptionEn ?? undefined,
    descriptionEs: category.descriptionEs ?? undefined,
    accentColor: category.accentColor ?? undefined,
    sidebarImageUrl:
      normalizePublicImageUrl(category.sidebarImageUrl, "category", category.id) ??
      (() => {
        const product = category.products.find((item) => item.imageUrl);
        return product ? normalizePublicImageUrl(product.imageUrl, "product", product.id) : null;
      })() ??
      null,
    sortOrder: category.sortOrder,
    name: translations.name,
    description: translations.description,
    products: category.products.map((product) => {
      const productCopy = resolveProductCopy(locale, product);

      return {
        id: product.id,
        slug: product.slug,
        categorySlug: category.slug,
        area,
        name: productCopy.name,
        originalName: product.namePt,
        description: productCopy.description,
        imageUrl: normalizePublicImageUrl(product.imageUrl, "product", product.id),
        price: moneyToNumber(product.basePrice),
        isAvailable: product.isAvailable,
        stockQuantity: product.stockQuantity,
        prepMinutes: product.prepMinutes,
        artTone: (product.artTone as PublicProduct["artTone"] | null) ?? "mocha",
        highlight: productCopy.highlight,
      };
    }),
  };
}

function buildFallbackProducts(): CatalogDashboardProduct[] {
  const categoryMap = new Map(catalogCategories.map((category) => [category.slug, category]));

  return catalogProducts.slice(0, 24).map((product, index) => {
    const category = categoryMap.get(product.categorySlug);
    const localized = buildProductLocalizedFields({
      slug: product.slug,
      namePt: product.namePt,
      nameEn: product.nameEn,
      nameEs: product.nameEs,
      descriptionPt: product.descriptionPt,
      descriptionEn: product.descriptionEn,
      descriptionEs: product.descriptionEs,
      highlightPt: product.highlightPt,
      highlightEn: product.highlightEn,
      highlightEs: product.highlightEs,
    });

    return {
      id: product.slug,
      slug: product.slug,
      namePt: localized.namePt,
      nameEn: localized.nameEn,
      nameEs: localized.nameEs,
      descriptionPt: localized.descriptionPt,
      descriptionEn: localized.descriptionEn,
      descriptionEs: localized.descriptionEs,
      categorySlug: product.categorySlug,
      categoryNamePt: category?.namePt ?? product.categorySlug,
      price: product.price,
      stockQuantity: product.stockQuantity ?? 12,
      isAvailable: product.available ?? product.price !== null,
      isFeatured: product.featured ?? false,
      imageUrl: product.imageUrl ?? null,
      highlightPt: localized.highlightPt,
      highlightEn: localized.highlightEn,
      highlightEs: localized.highlightEs,
      sortOrder: index + 1,
    };
  });
}

function buildFallbackCategories(): CatalogDashboardCategory[] {
  const productCountByCategory = catalogProducts.reduce<Record<string, number>>((acc, product) => {
    acc[product.categorySlug] = (acc[product.categorySlug] ?? 0) + 1;
    return acc;
  }, {});

  return catalogCategories.map((category) => ({
    ...buildCategoryLocalizedFields({
      slug: category.slug,
      namePt: category.namePt,
      nameEn: category.nameEn,
      nameEs: category.nameEs,
      descriptionPt: category.descriptionPt,
      descriptionEn: category.descriptionEn,
      descriptionEs: category.descriptionEs,
    }),
    id: category.slug,
    slug: category.slug,
    area: category.area,
    accentColor: category.accentColor ?? null,
    sidebarImageUrl:
      category.sidebarImageUrl ??
      catalogProducts.find((product) => product.categorySlug === category.slug)?.imageUrl ??
      null,
    sortOrder: category.sortOrder,
    isActive: true,
    productCount: productCountByCategory[category.slug] ?? 0,
  }));
}

function buildFallbackSections(): CatalogDashboardSection[] {
  return (Object.keys(defaultCatalogSections) as MenuAreaSlug[]).map((area) => ({
    area,
    ...defaultCatalogSections[area],
  }));
}

function buildFallbackDashboard(storeSlug = DEFAULT_STORE_SLUG): OperationsDashboard {
  return {
    isLive: false,
    store: buildFallbackStorefront(storeSlug),
    orders: demoOrders,
    products: buildFallbackProducts(),
    categories: buildFallbackCategories(),
    sections: buildFallbackSections(),
    inventoryMovements: demoInventoryMovements.map((movement) => ({
      ...movement,
      supplierName: null,
      referenceCode: null,
    })),
    financeEntries: demoFinanceEntries.map((entry) => ({
      ...entry,
      direction: entry.direction as FinanceEntryRecord["direction"],
      supplierName: null,
      referenceCode: null,
      notes: null,
    })),
    suppliers: [],
  };
}

function mapInventoryMovement(movement: {
  id: string;
  titlePt: string;
  type: CoffeeInventoryMovementType;
  quantity: Prisma.Decimal | null;
  unitLabel: string | null;
  totalAmount: Prisma.Decimal | null;
  referenceCode: string | null;
  happenedAt: Date;
  supplier: { name: string } | null;
}): InventoryMovementRecord {
  return {
    id: movement.id,
    titlePt: movement.titlePt,
    type: movement.type,
    quantity: moneyToNumber(movement.quantity),
    unitLabel: movement.unitLabel,
    totalAmount: moneyToNumber(movement.totalAmount),
    supplierName: movement.supplier?.name ?? null,
    referenceCode: movement.referenceCode,
    happenedAt: movement.happenedAt.toISOString(),
  };
}

function mapFinanceEntry(entry: {
  id: string;
  direction: CoffeeFinanceDirection;
  category: CoffeeFinanceCategory;
  descriptionPt: string;
  amount: Prisma.Decimal;
  referenceCode: string | null;
  notes: string | null;
  happenedAt: Date;
  supplier: { name: string } | null;
}): FinanceEntryRecord {
  return {
    id: entry.id,
    direction: entry.direction,
    category: entry.category,
    descriptionPt: entry.descriptionPt,
    amount: Number(entry.amount),
    supplierName: entry.supplier?.name ?? null,
    referenceCode: entry.referenceCode,
    notes: entry.notes,
    happenedAt: entry.happenedAt.toISOString(),
  };
}

function mapSupplier(supplier: {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  documentId: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
}): SupplierRecord {
  return {
    id: supplier.id,
    name: supplier.name,
    contactName: supplier.contactName,
    email: supplier.email,
    phone: supplier.phone,
    whatsapp: supplier.whatsapp,
    documentId: supplier.documentId,
    paymentTerms: supplier.paymentTerms,
    leadTimeDays: supplier.leadTimeDays,
    notes: supplier.notes,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt.toISOString(),
  };
}

function getClientAccessMeta(accessStatus: ClientAccessStatus) {
  if (accessStatus === "BLOCKED") {
    return { accessStatus, accessLabel: "Bloqueado por cobrança" };
  }

  if (accessStatus === "OVERDUE") {
    return { accessStatus, accessLabel: "Em atraso" };
  }

  if (accessStatus === "WARNING") {
    return { accessStatus, accessLabel: "Aviso de cobrança" };
  }

  return { accessStatus, accessLabel: "Operação saudável" };
}

function buildPlatformClientSummary(input: {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  ownerName: string | null;
  billingEmail: string | null;
  phone: string | null;
  monthlyFee: Prisma.Decimal | number;
  billingDayOfMonth: number;
  graceDays: number;
  suspensionDays: number;
  notes: string | null;
  isActive: boolean;
  stores: Array<{
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  }>;
  invoices: BillingInvoiceSummary[];
}): PlatformClientSummary {
  const invoicePriority: Record<BillingInvoiceSummary["status"], number> = {
    BLOCKED: 5,
    OVERDUE: 4,
    OPEN: 3,
    UPCOMING: 2,
    PAID: 1,
    CANCELED: 0,
  };

  const outstandingInvoices = input.invoices
    .filter((invoice) => !["PAID", "CANCELED"].includes(invoice.status))
    .sort((left, right) => {
      const priorityDiff = invoicePriority[right.status] - invoicePriority[left.status];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left.dueAt.localeCompare(right.dueAt);
    });

  const latestInvoice = outstandingInvoices[0] ?? input.invoices[0] ?? null;

  let accessStatus: ClientAccessStatus = "ACTIVE";

  if (!input.isActive) {
    accessStatus = "BLOCKED";
  } else if (outstandingInvoices.some((invoice) => invoice.status === "BLOCKED")) {
    accessStatus = "BLOCKED";
  } else if (outstandingInvoices.some((invoice) => invoice.status === "OVERDUE")) {
    accessStatus = "OVERDUE";
  } else if (
    outstandingInvoices.some((invoice) =>
      invoice.status === "UPCOMING" ||
      invoice.status === "OPEN" ||
      ((invoice.daysOverdue ?? 0) > 0 && invoice.status !== "PAID"),
    )
  ) {
    accessStatus = "WARNING";
  }

  const meta = getClientAccessMeta(accessStatus);
  const lastPaymentAt = input.invoices
    .filter((invoice) => invoice.paidAt)
    .sort((left, right) => (right.paidAt ?? "").localeCompare(left.paidAt ?? ""))[0]?.paidAt ?? null;

  const client: PlatformClientSummary = {
    id: input.id,
    slug: input.slug,
    name: input.name,
    legalName: input.legalName,
    ownerName: input.ownerName,
    billingEmail: input.billingEmail,
    phone: input.phone,
    monthlyFee: moneyToNumber(input.monthlyFee) ?? defaultClientSeed.monthlyFee,
    billingDayOfMonth: input.billingDayOfMonth,
    graceDays: input.graceDays,
    suspensionDays: input.suspensionDays,
    notes: input.notes,
    isActive: input.isActive,
    accessStatus: meta.accessStatus,
    accessLabel: meta.accessLabel,
    storeCount: input.stores.length,
    activeStoreCount: input.stores.filter((store) => store.isActive).length,
    outstandingInvoiceCount: outstandingInvoices.length,
    outstandingAmount: outstandingInvoices.reduce((total, invoice) => total + invoice.amount, 0),
    nextDueAt: latestInvoice?.dueAt ?? null,
    lastPaymentAt,
    alerts: [],
    stores: input.stores,
  };

  client.alerts = buildClientAlerts(client, latestInvoice);
  return client;
}

async function createUniqueProductSlug(storeId: string, baseName: string, productId?: string) {
  const baseSlug = slugify(baseName) || "produto";
  let candidate = baseSlug;
  let attempt = 1;

  while (true) {
    const existing = await prisma.coffeeProduct.findFirst({
      where: {
        storeId,
        slug: candidate,
        ...(productId ? { NOT: { id: productId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }
}

async function createUniqueCategorySlug(storeId: string, baseName: string, categoryId?: string) {
  const baseSlug = slugify(baseName) || "secao";
  let candidate = baseSlug;
  let attempt = 1;

  while (true) {
    const existing = await prisma.coffeeCatalogCategory.findFirst({
      where: {
        storeId,
        slug: candidate,
        ...(categoryId ? { NOT: { id: categoryId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }
}

function getToneForCategory(categoryArea: CoffeeMenuArea): PublicProduct["artTone"] {
  if (categoryArea === CoffeeMenuArea.COLD_DRINKS) {
    return "cream";
  }

  if (categoryArea === CoffeeMenuArea.HOT_DRINKS) {
    return "mocha";
  }

  return "amber";
}

function createDisplayCode() {
  const minuteCode = new Date().toISOString().slice(11, 16).replace(":", "");
  return `AT-${minuteCode}-${Math.floor(Math.random() * 90 + 10)}`;
}

async function registerSaleEntry({
  tx,
  storeId,
  orderId,
  descriptionPt,
  amount,
}: {
  tx: Prisma.TransactionClient;
  storeId: string;
  orderId: string;
  descriptionPt: string;
  amount: number;
}) {
  const existingEntry = await tx.coffeeFinanceEntry.findFirst({
    where: {
      storeId,
      orderId,
      category: CoffeeFinanceCategory.SALE,
    },
  });

  if (existingEntry) {
    return existingEntry;
  }

  return tx.coffeeFinanceEntry.create({
    data: {
      storeId,
      orderId,
      direction: CoffeeFinanceDirection.INCOME,
      category: CoffeeFinanceCategory.SALE,
      descriptionPt,
      amount,
    },
  });
}

async function decrementStockForOrder(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string; quantity: number }>,
) {
  for (const item of items) {
    await tx.coffeeProduct.update({
      where: { id: item.productId },
      data: {
        stockQuantity: {
          decrement: item.quantity,
        },
      },
    });
  }
}

function resolveExpenseCategory(type: CoffeeInventoryMovementType) {
  return type === CoffeeInventoryMovementType.PURCHASE
    ? CoffeeFinanceCategory.SUPPLY_PURCHASE
    : CoffeeFinanceCategory.OPERATIONS;
}

async function getStorefrontUncached(storeSlug = DEFAULT_STORE_SLUG) {
  if (shouldSkipDatabase) {
    reportFallback("Banco desativado na configuração da vitrine", storeSlug);
    return buildFallbackStorefront(storeSlug);
  }

  try {
    const store = await getStoreRecord(storeSlug);

    if (!store) {
      return null;
    }

    return mapStorefront(store);
  } catch (error) {
    reportFallback("Falha ao carregar a vitrine", storeSlug, error);
    return storeSlug === DEFAULT_STORE_SLUG ? buildFallbackStorefront(storeSlug) : null;
  }
}

export async function getStorefront(storeSlug = DEFAULT_STORE_SLUG) {
  return unstable_cache(
    () => getStorefrontUncached(storeSlug),
    ["coffee-public-storefront", storeSlug],
    {
      revalidate: PUBLIC_CACHE_SECONDS,
      tags: [getPublicStorefrontCacheTag(storeSlug)],
    },
  )();
}

export async function getManagedStores(): Promise<ManagedStoreSummary[]> {
  if (shouldSkipDatabase) {
    const fallback = buildFallbackStorefront();
    const fallbackMeta = getClientAccessMeta("WARNING");

    return [
      {
        id: fallback.id,
        slug: fallback.slug,
        name: fallback.name,
        isActive: true,
        productCount: buildFallbackProducts().length,
        supplierCount: 0,
        financeEntryCount: demoFinanceEntries.length,
        publicUrl: fallback.publicUrl,
        updatedAt: new Date().toISOString(),
        clientAccountId: "fallback-client",
        clientAccountName: defaultClientSeed.name,
        clientAccountSlug: defaultClientSeed.slug,
        clientAccessStatus: fallbackMeta.accessStatus,
        clientAccessLabel: fallbackMeta.accessLabel,
      },
    ];
  }

  try {
    await ensureDefaultStoreRecord();
    await ensureBillingStructure();

    const stores = await prisma.coffeeShopStore.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      include: {
        clientAccount: {
          select: {
            id: true,
            slug: true,
            name: true,
            isActive: true,
            monthlyFee: true,
            billingDayOfMonth: true,
            graceDays: true,
            suspensionDays: true,
            invoices: {
              orderBy: [{ dueAt: "desc" }],
              take: 6,
            },
          },
        },
        _count: {
          select: {
            products: true,
            suppliers: true,
            financeEntries: true,
          },
        },
      },
    });

    return stores.map((store) => {
      const invoiceSummaries = (store.clientAccount?.invoices ?? []).map((invoice) =>
        mapBillingInvoiceSummary({
          ...invoice,
          amount: invoice.amount,
          clientAccountId: store.clientAccount?.id ?? "",
          clientAccount: {
            name: store.clientAccount?.name ?? defaultClientSeed.name,
            slug: store.clientAccount?.slug ?? defaultClientSeed.slug,
            isActive: store.clientAccount?.isActive ?? true,
            billingDayOfMonth: store.clientAccount?.billingDayOfMonth ?? defaultClientSeed.billingDayOfMonth,
            graceDays: store.clientAccount?.graceDays ?? defaultClientSeed.graceDays,
            suspensionDays: store.clientAccount?.suspensionDays ?? defaultClientSeed.suspensionDays,
          },
        }),
      );

      const clientSummary = buildPlatformClientSummary({
        id: store.clientAccount?.id ?? "fallback-client",
        slug: store.clientAccount?.slug ?? defaultClientSeed.slug,
        name: store.clientAccount?.name ?? defaultClientSeed.name,
        legalName: null,
        ownerName: null,
        billingEmail: null,
        phone: null,
        monthlyFee: store.clientAccount?.monthlyFee ?? defaultClientSeed.monthlyFee,
        billingDayOfMonth: store.clientAccount?.billingDayOfMonth ?? defaultClientSeed.billingDayOfMonth,
        graceDays: store.clientAccount?.graceDays ?? defaultClientSeed.graceDays,
        suspensionDays: store.clientAccount?.suspensionDays ?? defaultClientSeed.suspensionDays,
        notes: null,
        isActive: store.clientAccount?.isActive ?? true,
        stores: [
          {
            id: store.id,
            slug: store.slug,
            name: store.name,
            isActive: store.isActive,
          },
        ],
        invoices: invoiceSummaries,
      });

      return {
        id: store.id,
        slug: store.slug,
        name: store.name,
        isActive: store.isActive,
        productCount: store._count.products,
        supplierCount: store._count.suppliers,
        financeEntryCount: store._count.financeEntries,
        publicUrl: buildStorePublicUrl(
          store.slug,
          store.defaultLocale === "en" || store.defaultLocale === "es" ? store.defaultLocale : "pt",
        ),
        updatedAt: store.updatedAt.toISOString(),
        clientAccountId: store.clientAccount?.id ?? null,
        clientAccountName: store.clientAccount?.name ?? defaultClientSeed.name,
        clientAccountSlug: store.clientAccount?.slug ?? defaultClientSeed.slug,
        clientAccessStatus: clientSummary.accessStatus,
        clientAccessLabel: clientSummary.accessLabel,
      };
    });
  } catch {
    const fallback = buildFallbackStorefront();
    const fallbackMeta = getClientAccessMeta("WARNING");

    return [
      {
        id: fallback.id,
        slug: fallback.slug,
        name: fallback.name,
        isActive: true,
        productCount: buildFallbackProducts().length,
        supplierCount: 0,
        financeEntryCount: demoFinanceEntries.length,
        publicUrl: fallback.publicUrl,
        updatedAt: new Date().toISOString(),
        clientAccountId: "fallback-client",
        clientAccountName: defaultClientSeed.name,
        clientAccountSlug: defaultClientSeed.slug,
        clientAccessStatus: fallbackMeta.accessStatus,
        clientAccessLabel: fallbackMeta.accessLabel,
      },
    ];
  }
}

export async function getPlatformAdminDashboard(): Promise<PlatformAdminDashboard> {
  const buildFallbackPlatformDashboard = (): PlatformAdminDashboard => {
    const referenceMonth = startOfMonth();
    const dueAt = buildDueDate(referenceMonth, defaultClientSeed.billingDayOfMonth);
    const fallbackInvoice = mapBillingInvoiceSummary({
      id: "fallback-invoice",
      clientAccountId: "fallback-client",
      referenceMonth,
      amount: defaultClientSeed.monthlyFee,
      dueAt,
      paidAt: null,
      reminderSentAt: null,
      finalNoticeSentAt: null,
      status: CoffeeBillingInvoiceStatus.OPEN,
      clientAccount: {
        name: defaultClientSeed.name,
        slug: defaultClientSeed.slug,
        isActive: true,
        billingDayOfMonth: defaultClientSeed.billingDayOfMonth,
        graceDays: defaultClientSeed.graceDays,
        suspensionDays: defaultClientSeed.suspensionDays,
      },
    });
    const fallbackStore = buildFallbackStorefront();
    const fallbackClient = buildPlatformClientSummary({
      id: "fallback-client",
      slug: defaultClientSeed.slug,
      name: defaultClientSeed.name,
      legalName: defaultClientSeed.legalName,
      ownerName: defaultClientSeed.ownerName,
      billingEmail: defaultClientSeed.billingEmail,
      phone: null,
      monthlyFee: defaultClientSeed.monthlyFee,
      billingDayOfMonth: defaultClientSeed.billingDayOfMonth,
      graceDays: defaultClientSeed.graceDays,
      suspensionDays: defaultClientSeed.suspensionDays,
      notes: defaultClientSeed.notes,
      isActive: true,
      stores: [
        {
          id: fallbackStore.id,
          slug: fallbackStore.slug,
          name: fallbackStore.name,
          isActive: true,
        },
      ],
      invoices: [fallbackInvoice],
    });

    return {
      isLive: false,
      stats: {
        clientCount: 1,
        storeCount: 1,
        activeStoreCount: 1,
        blockedClientCount: fallbackClient.accessStatus === "BLOCKED" ? 1 : 0,
        warningClientCount:
          fallbackClient.accessStatus === "WARNING" || fallbackClient.accessStatus === "OVERDUE"
            ? 1
            : 0,
        monthlyRecurringRevenue: defaultClientSeed.monthlyFee,
        outstandingRevenue:
          fallbackInvoice.status === "PAID" || fallbackInvoice.status === "CANCELED"
            ? 0
            : fallbackInvoice.amount,
      },
      clients: [fallbackClient],
      stores: [
        {
          id: fallbackStore.id,
          slug: fallbackStore.slug,
          name: fallbackStore.name,
          isActive: true,
          productCount: buildFallbackProducts().length,
          supplierCount: 0,
          financeEntryCount: demoFinanceEntries.length,
          publicUrl: fallbackStore.publicUrl,
          updatedAt: new Date().toISOString(),
          clientAccountId: fallbackClient.id,
          clientAccountName: fallbackClient.name,
          clientAccountSlug: fallbackClient.slug,
          clientAccessStatus: fallbackClient.accessStatus,
          clientAccessLabel: fallbackClient.accessLabel,
        },
      ],
      invoices: [fallbackInvoice],
    };
  };

  if (shouldSkipDatabase) {
    return buildFallbackPlatformDashboard();
  }

  try {
    await ensureDefaultStoreRecord();
    await ensureBillingStructure();

    const clientAccounts = await prisma.coffeeClientAccount.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      include: {
        stores: {
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
          select: {
            id: true,
            slug: true,
            name: true,
            isActive: true,
            defaultLocale: true,
            updatedAt: true,
            _count: {
              select: {
                products: true,
                suppliers: true,
                financeEntries: true,
              },
            },
          },
        },
        invoices: {
          orderBy: [{ dueAt: "desc" }],
          take: 12,
        },
      },
    });

    const clients = clientAccounts.map((clientAccount) => {
      const invoices = clientAccount.invoices.map((invoice) =>
        mapBillingInvoiceSummary({
          ...invoice,
          amount: invoice.amount,
          clientAccountId: clientAccount.id,
          clientAccount: {
            name: clientAccount.name,
            slug: clientAccount.slug,
            isActive: clientAccount.isActive,
            billingDayOfMonth: clientAccount.billingDayOfMonth,
            graceDays: clientAccount.graceDays,
            suspensionDays: clientAccount.suspensionDays,
          },
        }),
      );

      return buildPlatformClientSummary({
        id: clientAccount.id,
        slug: clientAccount.slug,
        name: clientAccount.name,
        legalName: clientAccount.legalName,
        ownerName: clientAccount.ownerName,
        billingEmail: clientAccount.billingEmail,
        phone: clientAccount.phone,
        monthlyFee: clientAccount.monthlyFee,
        billingDayOfMonth: clientAccount.billingDayOfMonth,
        graceDays: clientAccount.graceDays,
        suspensionDays: clientAccount.suspensionDays,
        notes: clientAccount.notes,
        isActive: clientAccount.isActive,
        stores: clientAccount.stores.map((store) => ({
          id: store.id,
          slug: store.slug,
          name: store.name,
          isActive: store.isActive,
        })),
        invoices,
      });
    });

    const stores: ManagedStoreSummary[] = clientAccounts.flatMap((clientAccount) => {
      const client = clients.find((entry) => entry.id === clientAccount.id);
      return clientAccount.stores.map((store) => ({
        id: store.id,
        slug: store.slug,
        name: store.name,
        isActive: store.isActive,
        productCount: store._count.products,
        supplierCount: store._count.suppliers,
        financeEntryCount: store._count.financeEntries,
        publicUrl: buildStorePublicUrl(
          store.slug,
          store.defaultLocale === "en" || store.defaultLocale === "es" ? store.defaultLocale : "pt",
        ),
        updatedAt: store.updatedAt.toISOString(),
        clientAccountId: clientAccount.id,
        clientAccountName: clientAccount.name,
        clientAccountSlug: clientAccount.slug,
        clientAccessStatus: client?.accessStatus ?? "ACTIVE",
        clientAccessLabel: client?.accessLabel ?? "Operação saudável",
      }));
    });

    const invoices = clientAccounts
      .flatMap((clientAccount) =>
        clientAccount.invoices.map((invoice) =>
          mapBillingInvoiceSummary({
            ...invoice,
            amount: invoice.amount,
            clientAccountId: clientAccount.id,
            clientAccount: {
              name: clientAccount.name,
              slug: clientAccount.slug,
              isActive: clientAccount.isActive,
              billingDayOfMonth: clientAccount.billingDayOfMonth,
              graceDays: clientAccount.graceDays,
              suspensionDays: clientAccount.suspensionDays,
            },
          }),
        ),
      )
      .sort((left, right) => right.dueAt.localeCompare(left.dueAt));

    return {
      isLive: true,
      stats: {
        clientCount: clients.length,
        storeCount: stores.length,
        activeStoreCount: stores.filter((store) => store.isActive).length,
        blockedClientCount: clients.filter((client) => client.accessStatus === "BLOCKED").length,
        warningClientCount: clients.filter((client) =>
          client.accessStatus === "WARNING" || client.accessStatus === "OVERDUE",
        ).length,
        monthlyRecurringRevenue: clients.reduce((total, client) => total + client.monthlyFee, 0),
        outstandingRevenue: clients.reduce(
          (total, client) => total + client.outstandingAmount,
          0,
        ),
      },
      clients,
      stores,
      invoices,
    };
  } catch {
    return buildFallbackPlatformDashboard();
  }
}

async function getCatalogUncached(
  locale: Locale,
  storeSlug = DEFAULT_STORE_SLUG,
): Promise<PublicAreaData[]> {
  if (shouldSkipDatabase) {
    reportFallback("Banco desativado na configuração do catálogo", storeSlug);
    return buildFallbackCatalog(locale);
  }

  try {
    const store = await prisma.coffeeShopStore.findUnique({
      where: { slug: storeSlug },
      select: {
        categories: {
          where: { isActive: true },
          select: {
            id: true,
            area: true,
            slug: true,
            namePt: true,
            nameEn: true,
            nameEs: true,
            descriptionPt: true,
            descriptionEn: true,
            descriptionEs: true,
            accentColor: true,
            sidebarImageUrl: true,
            sortOrder: true,
            products: {
              select: {
                id: true,
                slug: true,
                namePt: true,
                nameEn: true,
                nameEs: true,
                descriptionPt: true,
                descriptionEn: true,
                descriptionEs: true,
                imageUrl: true,
                basePrice: true,
                isAvailable: true,
                stockQuantity: true,
                prepMinutes: true,
                artTone: true,
                highlightPt: true,
                highlightEn: true,
                highlightEs: true,
              },
              orderBy: [{ sortOrder: "asc" }, { namePt: "asc" }],
            },
          },
          orderBy: [{ sortOrder: "asc" }, { namePt: "asc" }],
        },
      },
    });

    if (!store || store.categories.length === 0) {
      reportFallback("Loja sem categorias ativas no catálogo", storeSlug);
      return buildFallbackCatalog(locale);
    }

    const grouped = store.categories.reduce<Record<MenuAreaSlug, PublicCategory[]>>(
      (accumulator, category) => {
        const area = reverseAreaMap[category.area];
        accumulator[area].push(mapCategory(locale, category));
        return accumulator;
      },
      { foods: [], "hot-drinks": [], "cold-drinks": [] },
    );

    return (Object.keys(grouped) as MenuAreaSlug[]).map((area) => ({
      area,
      categories: grouped[area],
    }));
  } catch (error) {
    reportFallback("Falha ao carregar o catálogo", storeSlug, error);
    return buildFallbackCatalog(locale);
  }
}

export async function getCatalog(
  locale: Locale,
  storeSlug = DEFAULT_STORE_SLUG,
): Promise<PublicAreaData[]> {
  return unstable_cache(
    () => getCatalogUncached(locale, storeSlug),
    ["coffee-public-catalog", storeSlug, locale],
    {
      revalidate: PUBLIC_CACHE_SECONDS,
      tags: [
        getPublicCatalogCacheTag(storeSlug),
        getPublicCatalogCacheTag(storeSlug, locale),
      ],
    },
  )();
}

export async function getAreaCatalog(
  locale: Locale,
  area: MenuAreaSlug,
  storeSlug = DEFAULT_STORE_SLUG,
) {
  const catalog = await getCatalog(locale, storeSlug);

  return (
    catalog.find((entry) => entry.area === area) ?? {
      area,
      categories: [],
    }
  );
}

export async function getProductBySlug(
  locale: Locale,
  slug: string,
  storeSlug = DEFAULT_STORE_SLUG,
) {
  const catalog = await getCatalog(locale, storeSlug);
  const products = catalog.flatMap((area) => area.categories.flatMap((category) => category.products));
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getOperationsDashboard(
  storeSlug = DEFAULT_STORE_SLUG,
): Promise<OperationsDashboard> {
  if (shouldSkipDatabase) {
    reportFallback("Banco desativado na configuração do painel operacional", storeSlug);
    return buildFallbackDashboard(storeSlug);
  }

  try {
    if (storeSlug === DEFAULT_STORE_SLUG) {
      await ensureDefaultStoreRecord();
    }

    const store = await prisma.coffeeShopStore.findUnique({
      where: { slug: storeSlug },
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 16,
        },
        products: {
          include: { category: true },
          orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { namePt: "asc" }],
        },
        categories: {
          include: {
            _count: {
              select: { products: true },
            },
          },
          orderBy: [{ sortOrder: "asc" }, { namePt: "asc" }],
        },
        catalogSections: {
          orderBy: [{ sortOrder: "asc" }, { namePt: "asc" }],
        },
        inventoryMovements: {
          include: {
            supplier: {
              select: { name: true },
            },
          },
          orderBy: { happenedAt: "desc" },
          take: 20,
        },
        financeEntries: {
          include: {
            supplier: {
              select: { name: true },
            },
          },
          orderBy: { happenedAt: "desc" },
          take: 24,
        },
        suppliers: {
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
          take: 40,
        },
      },
    });

    if (!store) {
      reportFallback("Loja não encontrada no painel operacional", storeSlug);
      return buildFallbackDashboard(storeSlug);
    }

    return {
      isLive: true,
      store: mapStorefront(store),
      orders: store.orders.map<OrderSnapshot>((order) => ({
        id: order.id,
        displayCode: order.displayCode,
        customerName: order.customerName,
        channel: order.channel,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        requiresCounterPayment: order.requiresCounterPayment,
        canStartPreparation: order.canStartPreparation,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.productNamePt,
          quantity: item.quantity,
          unitPrice: moneyToNumber(item.unitPrice),
          notes: item.notes,
        })),
      })),
      products: store.products.map<CatalogDashboardProduct>((product) => ({
        id: product.id,
        slug: product.slug,
        namePt: product.namePt,
        nameEn: product.nameEn,
        nameEs: product.nameEs,
        descriptionPt: product.descriptionPt,
        descriptionEn: product.descriptionEn,
        descriptionEs: product.descriptionEs,
        categorySlug: product.category.slug,
        categoryNamePt: product.category.namePt,
        price: moneyToNumber(product.basePrice),
        stockQuantity: product.stockQuantity,
        isAvailable: product.isAvailable,
        isFeatured: product.isFeatured,
        imageUrl: product.imageUrl,
        highlightPt: product.highlightPt,
        highlightEn: product.highlightEn,
        highlightEs: product.highlightEs,
        sortOrder: product.sortOrder,
      })),
      sections: (Object.keys(defaultCatalogSections) as MenuAreaSlug[]).map<CatalogDashboardSection>((area) => {
        const section = store.catalogSections.find((item) => reverseAreaMap[item.area] === area);
        const defaults = defaultCatalogSections[area];

        return {
          id: section?.id,
          area,
          namePt: section?.namePt ?? defaults.namePt,
          nameEn: section?.nameEn ?? defaults.nameEn,
          nameEs: section?.nameEs ?? defaults.nameEs,
          descriptionPt: section?.descriptionPt ?? defaults.descriptionPt,
          descriptionEn: section?.descriptionEn ?? defaults.descriptionEn,
          descriptionEs: section?.descriptionEs ?? defaults.descriptionEs,
          imageUrl: section?.imageUrl ?? defaults.imageUrl,
          sortOrder: section?.sortOrder ?? defaults.sortOrder,
          isActive: section?.isActive ?? defaults.isActive,
        };
      }),
      categories: store.categories.map<CatalogDashboardCategory>((category) => ({
        id: category.id,
        slug: category.slug,
        area: reverseAreaMap[category.area],
        namePt: category.namePt,
        nameEn: category.nameEn,
        nameEs: category.nameEs,
        descriptionPt: category.descriptionPt,
        descriptionEn: category.descriptionEn,
        descriptionEs: category.descriptionEs,
        accentColor: category.accentColor,
        sidebarImageUrl: category.sidebarImageUrl,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        productCount: category._count.products,
      })),
      inventoryMovements: store.inventoryMovements.map(mapInventoryMovement),
      financeEntries: store.financeEntries.map(mapFinanceEntry),
      suppliers: store.suppliers.map(mapSupplier),
    };
  } catch (error) {
    reportFallback("Falha ao carregar o painel operacional", storeSlug, error);
    return buildFallbackDashboard(storeSlug);
  }
}

async function resolveClientAccountId(clientAccountId?: string | null) {
  if (clientAccountId?.trim()) {
    const existing = await prisma.coffeeClientAccount.findUnique({
      where: { id: clientAccountId.trim() },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Cliente não encontrado para vincular a cafeteria.");
    }

    return existing.id;
  }

  const defaultClient = await ensureBillingStructure();
  return defaultClient.id;
}

export async function createClientAccount(input: {
  slug: string;
  name: string;
  legalName?: string;
  ownerName?: string;
  billingEmail?: string;
  phone?: string;
  monthlyFee?: number | null;
  billingDayOfMonth?: number | null;
  graceDays?: number | null;
  suspensionDays?: number | null;
  notes?: string;
}) {
  const slug = slugify(input.slug);

  if (!slug) {
    throw new Error("Informe um slug válido para o cliente.");
  }

  if (!input.name.trim()) {
    throw new Error("Informe o nome do cliente.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.coffeeClientAccount.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Já existe um cliente com esse identificador.");
    }

    const clientAccount = await tx.coffeeClientAccount.create({
      data: filterModelWriteData("CoffeeClientAccount", {
        slug,
        name: input.name.trim(),
        legalName: cleanOptionalString(input.legalName),
        ownerName: cleanOptionalString(input.ownerName),
        billingEmail: cleanOptionalString(input.billingEmail),
        phone: cleanOptionalString(input.phone),
        monthlyFee:
          typeof input.monthlyFee === "number" && Number.isFinite(input.monthlyFee) && input.monthlyFee > 0
            ? input.monthlyFee
            : defaultClientSeed.monthlyFee,
        billingDayOfMonth:
          typeof input.billingDayOfMonth === "number" && Number.isFinite(input.billingDayOfMonth)
            ? Math.max(1, Math.round(input.billingDayOfMonth))
            : defaultClientSeed.billingDayOfMonth,
        graceDays:
          typeof input.graceDays === "number" && Number.isFinite(input.graceDays)
            ? Math.max(0, Math.round(input.graceDays))
            : defaultClientSeed.graceDays,
        suspensionDays:
          typeof input.suspensionDays === "number" && Number.isFinite(input.suspensionDays)
            ? Math.max(1, Math.round(input.suspensionDays))
            : defaultClientSeed.suspensionDays,
        notes: cleanOptionalString(input.notes),
      }) as Prisma.CoffeeClientAccountUncheckedCreateInput,
    });

    await ensureMonthlyBillingInvoice(tx, {
      id: clientAccount.id,
      monthlyFee: clientAccount.monthlyFee,
      billingDayOfMonth: clientAccount.billingDayOfMonth,
    });

    return clientAccount;
  });
}

export async function createManagedStore(input: {
  clientAccountId?: string;
  slug: string;
  name: string;
  legalName?: string;
  defaultLocale?: Locale;
  sloganPt?: string;
  sloganEn?: string;
  sloganEs?: string;
  storefrontDescriptionPt?: string;
  storefrontDescriptionEn?: string;
  storefrontDescriptionEs?: string;
  logoUrl?: string;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  brandAccentColor?: string;
}) {
  const slug = slugify(input.slug);

  if (!slug) {
    throw new Error("Informe um slug válido para a cafeteria.");
  }

  if (!input.name.trim()) {
    throw new Error("Informe o nome da cafeteria.");
  }

  const resolvedClientAccountId = await resolveClientAccountId(input.clientAccountId);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.coffeeShopStore.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Já existe uma cafeteria com esse endereço.");
    }

    const localizedStoreContent = buildStoreLocalizedFields(input);
    const store = await tx.coffeeShopStore.create({
      data: filterModelWriteData("CoffeeShopStore", {
        clientAccountId: resolvedClientAccountId,
        slug,
        name: input.name.trim(),
        legalName: cleanOptionalString(input.legalName),
        defaultLocale: input.defaultLocale ?? "pt",
        ...localizedStoreContent,
        logoUrl: cleanOptionalString(input.logoUrl),
        brandPrimaryColor: cleanOptionalString(input.brandPrimaryColor),
        brandSecondaryColor: cleanOptionalString(input.brandSecondaryColor),
        brandAccentColor: cleanOptionalString(input.brandAccentColor),
      }) as Prisma.CoffeeShopStoreUncheckedCreateInput,
    });

    await seedStoreCategories(store.id, tx);

    return mapStorefront({
      ...store,
      legalName: store.legalName,
      sloganPt: store.sloganPt,
      sloganEn: store.sloganEn,
      sloganEs: store.sloganEs,
      storefrontDescriptionPt: store.storefrontDescriptionPt,
      storefrontDescriptionEn: store.storefrontDescriptionEn,
      storefrontDescriptionEs: store.storefrontDescriptionEs,
      logoUrl: store.logoUrl,
      brandPrimaryColor: store.brandPrimaryColor,
      brandSecondaryColor: store.brandSecondaryColor,
      brandAccentColor: store.brandAccentColor,
      contactPhone: store.contactPhone,
      contactWhatsapp: store.contactWhatsapp,
    });
  });
}

export async function markBillingInvoiceReminder(
  invoiceId: string,
  noticeType: "REMINDER" | "FINAL_NOTICE",
) {
  const invoice = await prisma.coffeeBillingInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, paidAt: true, status: true },
  });

  if (!invoice) {
    throw new Error("Cobrança não encontrada.");
  }

  if (invoice.paidAt || invoice.status === CoffeeBillingInvoiceStatus.PAID) {
    throw new Error("Essa cobrança já foi quitada.");
  }

  return prisma.coffeeBillingInvoice.update({
    where: { id: invoiceId },
    data:
      noticeType === "FINAL_NOTICE"
        ? { finalNoticeSentAt: new Date() }
        : { reminderSentAt: new Date() },
  });
}

export async function markBillingInvoicePaid(invoiceId: string) {
  const invoice = await prisma.coffeeBillingInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true },
  });

  if (!invoice) {
    throw new Error("Cobrança não encontrada.");
  }

  return prisma.coffeeBillingInvoice.update({
    where: { id: invoiceId },
    data: {
      paidAt: new Date(),
      status: CoffeeBillingInvoiceStatus.PAID,
    },
  });
}

export async function updateStorefrontSettings(input: {
  storeSlug: string;
  name: string;
  legalName?: string;
  defaultLocale?: Locale;
  sloganPt?: string;
  sloganEn?: string;
  sloganEs?: string;
  storefrontDescriptionPt?: string;
  storefrontDescriptionEn?: string;
  storefrontDescriptionEs?: string;
  logoUrl?: string;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  brandAccentColor?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  isActive?: boolean;
}) {
  const store = await getStoreOrThrow(input.storeSlug);
  const localizedStoreContent = buildStoreLocalizedFields(input);

  return prisma.coffeeShopStore.update({
    where: { id: store.id },
    data: filterModelWriteData("CoffeeShopStore", {
      name: input.name.trim(),
      legalName: cleanOptionalString(input.legalName),
      defaultLocale: input.defaultLocale ?? store.defaultLocale,
      ...localizedStoreContent,
      logoUrl: cleanOptionalString(input.logoUrl),
      brandPrimaryColor: cleanOptionalString(input.brandPrimaryColor),
      brandSecondaryColor: cleanOptionalString(input.brandSecondaryColor),
      brandAccentColor: cleanOptionalString(input.brandAccentColor),
      contactPhone: cleanOptionalString(input.contactPhone),
      contactWhatsapp: cleanOptionalString(input.contactWhatsapp),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    }) as Prisma.CoffeeShopStoreUncheckedUpdateInput,
  });
}

export async function updateCategoryVisuals(input: {
  storeSlug: string;
  categoryId: string;
  categorySlug?: string;
  namePt?: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  accentColor?: string;
  sidebarImageUrl?: string;
  isActive?: boolean;
}) {
  const store = await getStoreOrThrow(input.storeSlug);

  const category = await prisma.coffeeCatalogCategory.findFirst({
    where: {
      storeId: store.id,
      OR: [
        ...(input.categoryId ? [{ id: input.categoryId }] : []),
        ...(input.categorySlug ? [{ slug: input.categorySlug }] : []),
      ],
    },
  });

  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  const nextName = input.namePt?.trim() || category.namePt;

  if (!nextName) {
    throw new Error("Informe o nome da seção.");
  }

  const localized = buildCategoryLocalizedFields({
    slug: category.slug,
    namePt: nextName,
    nameEn: input.nameEn !== undefined ? input.nameEn : category.nameEn,
    nameEs: input.nameEs !== undefined ? input.nameEs : category.nameEs,
    descriptionPt:
      input.descriptionPt !== undefined ? input.descriptionPt : category.descriptionPt,
    descriptionEn:
      input.descriptionEn !== undefined ? input.descriptionEn : category.descriptionEn,
    descriptionEs:
      input.descriptionEs !== undefined ? input.descriptionEs : category.descriptionEs,
  });

  return prisma.coffeeCatalogCategory.update({
    where: { id: category.id },
    data: {
      ...localized,
      accentColor: cleanOptionalString(input.accentColor),
      sidebarImageUrl: cleanOptionalString(input.sidebarImageUrl),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  });
}

export async function updateCatalogSection(input: {
  storeSlug: string;
  area: MenuAreaSlug;
  namePt?: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  imageUrl?: string;
  isActive?: boolean;
}) {
  const store = await getStoreOrThrow(input.storeSlug);
  const defaults = defaultCatalogSections[input.area];
  const nextName = input.namePt?.trim() || defaults.namePt;

  if (!nextName) {
    throw new Error("Informe o nome da seção.");
  }

  const localized = buildSectionLocalizedFields({
    area: input.area,
    namePt: nextName,
    nameEn: input.nameEn,
    nameEs: input.nameEs,
    descriptionPt: input.descriptionPt,
    descriptionEn: input.descriptionEn,
    descriptionEs: input.descriptionEs,
  });

  return prisma.coffeeCatalogSection.upsert({
    where: {
      storeId_area: {
        storeId: store.id,
        area: areaMap[input.area],
      },
    },
    create: {
      storeId: store.id,
      area: areaMap[input.area],
      ...localized,
      imageUrl: cleanOptionalString(input.imageUrl),
      sortOrder: defaults.sortOrder,
      isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    },
    update: {
      ...localized,
      imageUrl: cleanOptionalString(input.imageUrl),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  });
}

export async function createCatalogCategory(input: {
  storeSlug?: string;
  area: MenuAreaSlug;
  namePt: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  accentColor?: string;
  sidebarImageUrl?: string;
  isActive?: boolean;
  placement?: "FIRST" | "LAST";
}) {
  const store = await getStoreOrThrow(input.storeSlug ?? DEFAULT_STORE_SLUG);
  const nextName = input.namePt.trim();

  if (!nextName) {
    throw new Error("Informe o nome da seção.");
  }

  const slug = await createUniqueCategorySlug(store.id, nextName);

  return prisma.$transaction(async (tx) => {
    const area = areaMap[input.area];
    const placement = input.placement ?? "LAST";
    let sortOrder = 10;

    if (placement === "FIRST") {
      await tx.coffeeCatalogCategory.updateMany({
        where: {
          storeId: store.id,
          area,
        },
        data: {
          sortOrder: {
            increment: 10,
          },
        },
      });
    } else {
      const maxSortOrder =
        (
          await tx.coffeeCatalogCategory.aggregate({
            where: {
              storeId: store.id,
              area,
            },
            _max: { sortOrder: true },
          })
        )._max.sortOrder ?? 0;

      sortOrder = maxSortOrder + 10;
    }

    const localized = buildCategoryLocalizedFields({
      slug,
      namePt: nextName,
      nameEn: input.nameEn,
      nameEs: input.nameEs,
      descriptionPt: input.descriptionPt,
      descriptionEn: input.descriptionEn,
      descriptionEs: input.descriptionEs,
    });

    return tx.coffeeCatalogCategory.create({
      data: {
        storeId: store.id,
        area,
        slug,
        ...localized,
        accentColor: cleanOptionalString(input.accentColor),
        sidebarImageUrl: cleanOptionalString(input.sidebarImageUrl),
        sortOrder,
        isActive: typeof input.isActive === "boolean" ? input.isActive : true,
      },
    });
  });
}

export async function createCatalogProduct(input: {
  storeSlug?: string;
  categorySlug: string;
  namePt: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  price?: number | null;
  stockQuantity?: number | null;
  imageUrl?: string;
  isAvailable?: boolean;
  highlightPt?: string;
  highlightEn?: string;
  highlightEs?: string;
  isFeatured?: boolean;
  placement?: "FIRST" | "LAST";
}) {
  const store = await getStoreOrThrow(input.storeSlug ?? DEFAULT_STORE_SLUG);

  const category = await prisma.coffeeCatalogCategory.findFirst({
    where: { storeId: store.id, slug: input.categorySlug },
  });

  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  const slug = await createUniqueProductSlug(store.id, input.namePt);
  return prisma.$transaction(async (tx) => {
    const placement = input.placement ?? "LAST";
    let sortOrder = 1;

    if (placement === "FIRST") {
      await tx.coffeeProduct.updateMany({
        where: {
          storeId: store.id,
          categoryId: category.id,
        },
        data: {
          sortOrder: {
            increment: 1,
          },
        },
      });
    } else {
      const maxSortOrder =
        (
          await tx.coffeeProduct.aggregate({
            where: { storeId: store.id, categoryId: category.id },
            _max: { sortOrder: true },
          })
        )._max.sortOrder ?? 0;

      sortOrder = maxSortOrder + 1;
    }

    const localized = buildProductLocalizedFields({
      slug,
      namePt: input.namePt,
      nameEn: input.nameEn,
      nameEs: input.nameEs,
      descriptionPt: input.descriptionPt,
      descriptionEn: input.descriptionEn,
      descriptionEs: input.descriptionEs,
      highlightPt: input.highlightPt,
      highlightEn: input.highlightEn,
      highlightEs: input.highlightEs,
    });

    return tx.coffeeProduct.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        slug,
        ...localized,
        basePrice: toNullableNumber(input.price),
        stockQuantity:
          typeof input.stockQuantity === "number" ? Math.max(0, Math.round(input.stockQuantity)) : 0,
        imageUrl: cleanOptionalString(input.imageUrl),
        isAvailable: Boolean(input.isAvailable),
        isFeatured: Boolean(input.isFeatured),
        artTone: getToneForCategory(category.area),
        sortOrder,
      },
    });
  });
}

export async function updateCatalogProduct(input: {
  storeSlug?: string;
  productId: string;
  categorySlug?: string;
  namePt?: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  price?: number | null;
  stockQuantity?: number | null;
  isAvailable?: boolean;
  imageUrl?: string;
  highlightPt?: string;
  highlightEn?: string;
  highlightEs?: string;
  isFeatured?: boolean;
  sortOrder?: number | null;
}) {
  const store = await getStoreOrThrow(input.storeSlug ?? DEFAULT_STORE_SLUG);

  const product = await prisma.coffeeProduct.findFirst({
    where: {
      id: input.productId,
      storeId: store.id,
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const nextCategory =
    input.categorySlug && input.categorySlug !== product.category.slug
      ? await prisma.coffeeCatalogCategory.findFirst({
          where: {
            storeId: store.id,
            slug: input.categorySlug,
          },
        })
      : product.category;

  if (!nextCategory) {
    throw new Error("Categoria não encontrada.");
  }

  const nextName = input.namePt?.trim() || product.namePt;
  const nextSlug =
    nextName !== product.namePt
      ? await createUniqueProductSlug(store.id, nextName, product.id)
      : product.slug;
  const localized = buildProductLocalizedFields({
    slug: nextSlug,
    namePt: nextName,
    nameEn: input.nameEn !== undefined ? input.nameEn : product.nameEn,
    nameEs: input.nameEs !== undefined ? input.nameEs : product.nameEs,
    descriptionPt:
      input.descriptionPt !== undefined ? input.descriptionPt : product.descriptionPt,
    descriptionEn:
      input.descriptionEn !== undefined ? input.descriptionEn : product.descriptionEn,
    descriptionEs:
      input.descriptionEs !== undefined ? input.descriptionEs : product.descriptionEs,
    highlightPt:
      input.highlightPt !== undefined ? input.highlightPt : product.highlightPt,
    highlightEn:
      input.highlightEn !== undefined ? input.highlightEn : product.highlightEn,
    highlightEs:
      input.highlightEs !== undefined ? input.highlightEs : product.highlightEs,
  });

  return prisma.coffeeProduct.update({
    where: { id: product.id },
    data: {
      categoryId: nextCategory.id,
      slug: nextSlug,
      ...localized,
      basePrice:
        input.price !== undefined ? toNullableNumber(input.price) : product.basePrice,
      stockQuantity:
        input.stockQuantity !== undefined
          ? Math.max(0, Math.round(input.stockQuantity ?? 0))
          : product.stockQuantity,
      isAvailable:
        typeof input.isAvailable === "boolean" ? input.isAvailable : product.isAvailable,
      imageUrl:
        input.imageUrl !== undefined ? cleanOptionalString(input.imageUrl) : product.imageUrl,
      isFeatured:
        typeof input.isFeatured === "boolean" ? input.isFeatured : product.isFeatured,
      sortOrder:
        typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
          ? Math.max(1, Math.round(input.sortOrder))
          : product.sortOrder,
      artTone: getToneForCategory(nextCategory.area),
    },
  });
}

export async function deleteCatalogProduct(input: {
  storeSlug?: string;
  productId: string;
}) {
  const store = await getStoreOrThrow(input.storeSlug ?? DEFAULT_STORE_SLUG);

  const product = await prisma.coffeeProduct.findFirst({
    where: {
      id: input.productId,
      storeId: store.id,
    },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  return prisma.coffeeProduct.delete({
    where: { id: product.id },
  });
}

export async function createSupplier(input: {
  storeSlug: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  documentId?: string;
  paymentTerms?: string;
  leadTimeDays?: number | null;
  notes?: string;
}) {
  const store = await getStoreOrThrow(input.storeSlug);

  return prisma.coffeeSupplier.create({
    data: {
      storeId: store.id,
      name: input.name.trim(),
      contactName: cleanOptionalString(input.contactName),
      email: cleanOptionalString(input.email),
      phone: cleanOptionalString(input.phone),
      whatsapp: cleanOptionalString(input.whatsapp),
      documentId: cleanOptionalString(input.documentId),
      paymentTerms: cleanOptionalString(input.paymentTerms),
      leadTimeDays:
        typeof input.leadTimeDays === "number" && Number.isFinite(input.leadTimeDays)
          ? Math.max(0, Math.round(input.leadTimeDays))
          : null,
      notes: cleanOptionalString(input.notes),
    },
  });
}

export async function updateSupplier(input: {
  storeSlug: string;
  supplierId: string;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  documentId?: string;
  paymentTerms?: string;
  leadTimeDays?: number | null;
  notes?: string;
  isActive?: boolean;
}) {
  const store = await getStoreOrThrow(input.storeSlug);

  const supplier = await prisma.coffeeSupplier.findFirst({
    where: {
      id: input.supplierId,
      storeId: store.id,
    },
  });

  if (!supplier) {
    throw new Error("Fornecedor não encontrado.");
  }

  return prisma.coffeeSupplier.update({
    where: { id: supplier.id },
    data: {
      name: input.name?.trim() || supplier.name,
      contactName:
        input.contactName !== undefined ? cleanOptionalString(input.contactName) : supplier.contactName,
      email: input.email !== undefined ? cleanOptionalString(input.email) : supplier.email,
      phone: input.phone !== undefined ? cleanOptionalString(input.phone) : supplier.phone,
      whatsapp:
        input.whatsapp !== undefined ? cleanOptionalString(input.whatsapp) : supplier.whatsapp,
      documentId:
        input.documentId !== undefined ? cleanOptionalString(input.documentId) : supplier.documentId,
      paymentTerms:
        input.paymentTerms !== undefined
          ? cleanOptionalString(input.paymentTerms)
          : supplier.paymentTerms,
      leadTimeDays:
        input.leadTimeDays !== undefined
          ? typeof input.leadTimeDays === "number" && Number.isFinite(input.leadTimeDays)
            ? Math.max(0, Math.round(input.leadTimeDays))
            : null
          : supplier.leadTimeDays,
      notes: input.notes !== undefined ? cleanOptionalString(input.notes) : supplier.notes,
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  });
}

export async function createInventoryMovement(input: {
  storeSlug?: string;
  titlePt: string;
  type: CoffeeInventoryMovementType;
  quantity?: number | null;
  unitLabel?: string;
  totalAmount?: number | null;
  description?: string;
  supplierId?: string;
  referenceCode?: string;
}) {
  const store = await getStoreOrThrow(input.storeSlug ?? DEFAULT_STORE_SLUG);

  return prisma.$transaction(async (tx) => {
    const movement = await tx.coffeeInventoryMovement.create({
      data: {
        storeId: store.id,
        titlePt: input.titlePt.trim(),
        type: input.type,
        quantity: toNullableNumber(input.quantity),
        unitLabel: cleanOptionalString(input.unitLabel),
        totalAmount: toNullableNumber(input.totalAmount),
        description: cleanOptionalString(input.description),
        supplierId: cleanOptionalString(input.supplierId),
        referenceCode: cleanOptionalString(input.referenceCode),
      },
      include: {
        supplier: {
          select: { name: true },
        },
      },
    });

    if (input.totalAmount && input.totalAmount > 0) {
      await tx.coffeeFinanceEntry.create({
        data: {
          storeId: store.id,
          inventoryMovementId: movement.id,
          supplierId: cleanOptionalString(input.supplierId),
          direction: CoffeeFinanceDirection.EXPENSE,
          category: resolveExpenseCategory(input.type),
          descriptionPt: input.titlePt.trim(),
          amount: input.totalAmount,
          referenceCode: cleanOptionalString(input.referenceCode),
          notes: cleanOptionalString(input.description),
        },
      });
    }

    return movement;
  });
}

export async function createFinanceEntry(input: {
  storeSlug: string;
  direction: CoffeeFinanceDirection;
  category: CoffeeFinanceCategory;
  descriptionPt: string;
  amount: number;
  supplierId?: string;
  referenceCode?: string;
  notes?: string;
}) {
  const store = await getStoreOrThrow(input.storeSlug);

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Informe um valor válido para o lançamento.");
  }

  return prisma.coffeeFinanceEntry.create({
    data: {
      storeId: store.id,
      supplierId: cleanOptionalString(input.supplierId),
      direction: input.direction,
      category: input.category,
      descriptionPt: input.descriptionPt.trim(),
      amount: input.amount,
      referenceCode: cleanOptionalString(input.referenceCode),
      notes: cleanOptionalString(input.notes),
    },
  });
}

export async function createOrder(payload: CheckoutPayload & { storeSlug?: string }) {
  const parsed = checkoutSchema.parse(payload);
  const store = await getStoreOrThrow(parsed.storeSlug ?? DEFAULT_STORE_SLUG);

  const slugs = parsed.items.map((item) => item.slug);
  const products = await prisma.coffeeProduct.findMany({
    where: {
      storeId: store.id,
      slug: { in: slugs },
    },
  });

  if (!products.length) {
    throw new Error("Nenhum produto do carrinho foi encontrado no banco.");
  }

  const productMap = new Map(products.map((product) => [product.slug, product]));
  const lineItems = parsed.items.map((item) => {
    const product = productMap.get(item.slug);

    if (!product || !product.basePrice || !product.isAvailable) {
      throw new Error(`Produto indisponível: ${item.name}`);
    }

    const unitPrice = Number(product.basePrice);

    return {
      productId: product.id,
      productSlug: product.slug,
      productNamePt: product.namePt,
      productDescription: product.descriptionPt,
      notes: item.notes?.trim() || null,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    };
  });

  const subtotal = lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const requiresCounterPayment =
    parsed.paymentMethod === "PAY_AT_COUNTER" ||
    parsed.paymentMethod === "CASH_AT_COUNTER" ||
    parsed.paymentMethod === "CARD_AT_COUNTER";

  const initialStatus = requiresCounterPayment
    ? CoffeeOrderStatus.AWAITING_PAYMENT
    : CoffeeOrderStatus.IN_QUEUE;
  const paymentStatus = requiresCounterPayment
    ? CoffeePaymentStatus.PENDING
    : CoffeePaymentStatus.PAID;

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.coffeeOrder.create({
      data: {
        storeId: store.id,
        displayCode: createDisplayCode(),
        customerName: parsed.customerName,
        tableLabel: parsed.tableLabel,
        notes: parsed.notes,
        channel: parsed.channel as CoffeeOrderChannel,
        status: initialStatus,
        paymentMethod: parsed.paymentMethod as CoffeePaymentMethod,
        paymentStatus,
        subtotal,
        total: subtotal,
        requiresCounterPayment,
        canStartPreparation: !requiresCounterPayment,
        paidAt: requiresCounterPayment ? null : new Date(),
        items: {
          create: lineItems.map((item) => ({
            productId: item.productId,
            productSlug: item.productSlug,
            productNamePt: item.productNamePt,
            productDescription: item.productDescription,
            notes: item.notes,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: { items: true },
    });

    if (!requiresCounterPayment) {
      await registerSaleEntry({
        tx,
        storeId: store.id,
        orderId: createdOrder.id,
        descriptionPt: `Venda do pedido ${createdOrder.displayCode}`,
        amount: subtotal,
      });

      await decrementStockForOrder(
        tx,
        lineItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );
    }

    return createdOrder;
  });

  return {
    id: order.id,
    displayCode: order.displayCode,
    requiresCounterPayment,
    message: requiresCounterPayment
      ? "Seu pedido aguarda pagamento no balcão."
      : "Pedido pago e enviado para a produção.",
  };
}

export async function getOrderById(
  id: string,
  storeSlug?: string,
  locale: Locale = "pt",
) {
  if (shouldSkipDatabase) {
    return demoOrders.find((order) => order.id === id) ?? null;
  }

  try {
    const storeId =
      storeSlug && storeSlug !== DEFAULT_STORE_SLUG
        ? (await prisma.coffeeShopStore.findUnique({
            where: { slug: storeSlug },
            select: { id: true },
          }))?.id
        : undefined;

    const order = await prisma.coffeeOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order || (storeId && order.storeId !== storeId)) {
      return null;
    }

    return {
      id: order.id,
      displayCode: order.displayCode,
      customerName: order.customerName,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: Number(order.total),
      requiresCounterPayment: order.requiresCounterPayment,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => {
        const localizedProductName = item.product
          ? resolveProductCopy(locale, item.product).name
          : item.productNamePt;

        return {
          id: item.id,
          name: localizedProductName,
          quantity: item.quantity,
          unitPrice: moneyToNumber(item.unitPrice),
          notes: item.notes,
        };
      }),
    };
  } catch {
    return demoOrders.find((order) => order.id === id) ?? null;
  }
}

export async function updateOrderStatus(orderId: string, nextStatus: CoffeeOrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.coffeeOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error("Pedido não encontrado.");
    }

    if (
      nextStatus === CoffeeOrderStatus.IN_QUEUE &&
      order.paymentStatus === CoffeePaymentStatus.PENDING
    ) {
      await tx.coffeeOrder.update({
        where: { id: orderId },
        data: {
          paymentStatus: CoffeePaymentStatus.PAID,
          status: CoffeeOrderStatus.IN_QUEUE,
          canStartPreparation: true,
          paidAt: new Date(),
        },
      });

      await registerSaleEntry({
        tx,
        storeId: order.storeId,
        orderId: order.id,
        descriptionPt: `Venda do pedido ${order.displayCode}`,
        amount: Number(order.total),
      });

      const itemsToDecrement = order.items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId as string,
          quantity: item.quantity,
        }));

      await decrementStockForOrder(tx, itemsToDecrement);

      return;
    }

    await tx.coffeeOrder.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        readyAt: nextStatus === CoffeeOrderStatus.READY ? new Date() : undefined,
        completedAt:
          nextStatus === CoffeeOrderStatus.COMPLETED ? new Date() : undefined,
      },
    });
  });
}

export async function getAreaNavigation(locale: Locale) {
  return (Object.keys(areaMap) as MenuAreaSlug[]).map((area) => ({
    area,
    label: getAreaName(area, locale),
  }));
}
