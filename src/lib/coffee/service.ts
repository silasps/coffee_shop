import {
  CoffeeCatalogCategory,
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
import { z } from "zod";
import {
  areaCategoryOrder,
  catalogCategories,
  catalogProducts,
  demoFinanceEntries,
  demoInventoryMovements,
  demoOrders,
} from "@/lib/coffee/catalog-data";
import { getAreaName, translateCategory } from "@/lib/coffee/i18n";
import { buildStorePublicUrl, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_SLOGAN_MAX_LENGTH } from "@/lib/coffee/types";
import type {
  CatalogDashboardCategory,
  CatalogDashboardProduct,
  CheckoutPayload,
  FinanceEntryRecord,
  InventoryMovementRecord,
  Locale,
  ManagedStoreSummary,
  MenuAreaSlug,
  OperationsDashboard,
  OrderSnapshot,
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

const shouldSkipDatabase = process.env.COFFEE_SHOP_SKIP_DB === "1";
const modelFieldCache = new Map<string, Set<string>>();

const defaultStoreSeed = {
  slug: DEFAULT_STORE_SLUG,
  name: "Cafeteria AT",
  legalName: "Coffee Shop",
  currencyCode: "BRL",
  defaultLocale: "pt",
  sloganPt: "De Tamandaré para o mundo.",
  storefrontDescriptionPt:
    "Cardápio digital, pedidos e operação de cafeteria em uma mesma base reutilizável.",
  brandPrimaryColor: "#e36a2f",
  brandSecondaryColor: "#3d2217",
  brandAccentColor: "#f0c067",
  logoUrl: "/brand/logo-dark.png",
} as const;

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
    storefrontDescriptionPt: defaultStoreSeed.storefrontDescriptionPt,
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
  storefrontDescriptionPt: string | null;
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
    storefrontDescriptionPt: store.storefrontDescriptionPt,
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

        const translations = translateCategory(
          category.slug,
          locale,
          category.namePt,
          category.descriptionPt,
        );

        const products: PublicProduct[] = catalogProducts
          .filter((product) => product.categorySlug === categorySlug)
          .map((product) => ({
            id: product.slug,
            slug: product.slug,
            categorySlug,
            area: category.area,
            name: product.namePt,
            description: product.descriptionPt ?? "",
            originalName: product.namePt,
            imageUrl: product.imageUrl ?? null,
            price: product.price,
            isAvailable: product.available ?? product.price !== null,
            stockQuantity: product.stockQuantity ?? 12,
            prepMinutes: product.prepMinutes ?? 8,
            artTone: product.artTone ?? "mocha",
            highlight: product.highlightPt ?? null,
          }));

        return {
          ...category,
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
    data: catalogCategories.map((category) => ({
      storeId,
      slug: category.slug,
      area: areaMap[category.area],
      namePt: category.namePt,
      descriptionPt: category.descriptionPt,
      accentColor: category.accentColor ?? null,
      sidebarImageUrl: category.sidebarImageUrl ?? null,
      sortOrder: category.sortOrder,
    })),
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

      return [
        {
          storeId,
          categoryId: category.id,
          slug: product.slug,
          namePt: product.namePt,
          descriptionPt: product.descriptionPt ?? null,
          imageUrl: product.imageUrl ?? null,
          artTone: product.artTone ?? getToneForCategory(category.area),
          highlightPt: product.highlightPt ?? null,
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

async function ensureDefaultStoreRecord() {
  return prisma.$transaction(async (tx) => {
    const createData = filterModelWriteData("CoffeeShopStore", {
      slug: defaultStoreSeed.slug,
      name: defaultStoreSeed.name,
      legalName: defaultStoreSeed.legalName,
      currencyCode: defaultStoreSeed.currencyCode,
      defaultLocale: defaultStoreSeed.defaultLocale,
      sloganPt: defaultStoreSeed.sloganPt,
      storefrontDescriptionPt: defaultStoreSeed.storefrontDescriptionPt,
      logoUrl: defaultStoreSeed.logoUrl,
      brandPrimaryColor: defaultStoreSeed.brandPrimaryColor,
      brandSecondaryColor: defaultStoreSeed.brandSecondaryColor,
      brandAccentColor: defaultStoreSeed.brandAccentColor,
    }) as Prisma.CoffeeShopStoreUncheckedCreateInput;

    const store = await tx.coffeeShopStore.upsert({
      where: { slug: DEFAULT_STORE_SLUG },
      update: {},
      create: createData,
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
    return ensureDefaultStoreRecord();
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

function mapCategory(
  locale: Locale,
  category: CoffeeCatalogCategory & {
    products: Array<{
      id: string;
      slug: string;
      namePt: string;
      descriptionPt: string | null;
      imageUrl: string | null;
      basePrice: Prisma.Decimal | null;
      isAvailable: boolean;
      stockQuantity: number | null;
      prepMinutes: number | null;
      artTone: string | null;
      highlightPt: string | null;
    }>;
  },
): PublicCategory {
  const area = reverseAreaMap[category.area];
  const translations = translateCategory(
    category.slug,
    locale,
    category.namePt,
    category.descriptionPt ?? undefined,
  );

  return {
    slug: category.slug,
    area,
    namePt: category.namePt,
    descriptionPt: category.descriptionPt ?? undefined,
    accentColor: category.accentColor ?? undefined,
    sidebarImageUrl:
      category.sidebarImageUrl ??
      category.products.find((product) => product.imageUrl)?.imageUrl ??
      null,
    sortOrder: category.sortOrder,
    name: translations.name,
    description: translations.description,
    products: category.products.map((product) => ({
      id: product.id,
      slug: product.slug,
      categorySlug: category.slug,
      area,
      name: product.namePt,
      originalName: product.namePt,
      description: product.descriptionPt ?? "",
      imageUrl: product.imageUrl ?? null,
      price: moneyToNumber(product.basePrice),
      isAvailable: product.isAvailable,
      stockQuantity: product.stockQuantity,
      prepMinutes: product.prepMinutes,
      artTone: (product.artTone as PublicProduct["artTone"] | null) ?? "mocha",
      highlight: product.highlightPt ?? null,
    })),
  };
}

function buildFallbackProducts(): CatalogDashboardProduct[] {
  const categoryMap = new Map(catalogCategories.map((category) => [category.slug, category]));

  return catalogProducts.slice(0, 24).map((product, index) => {
    const category = categoryMap.get(product.categorySlug);

    return {
      id: product.slug,
      slug: product.slug,
      namePt: product.namePt,
      descriptionPt: product.descriptionPt ?? null,
      categorySlug: product.categorySlug,
      categoryNamePt: category?.namePt ?? product.categorySlug,
      price: product.price,
      stockQuantity: product.stockQuantity ?? 12,
      isAvailable: product.available ?? product.price !== null,
      isFeatured: product.featured ?? false,
      imageUrl: product.imageUrl ?? null,
      highlightPt: product.highlightPt ?? null,
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
    id: category.slug,
    slug: category.slug,
    area: category.area,
    namePt: category.namePt,
    descriptionPt: category.descriptionPt ?? null,
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

function buildFallbackDashboard(storeSlug = DEFAULT_STORE_SLUG): OperationsDashboard {
  return {
    isLive: false,
    store: buildFallbackStorefront(storeSlug),
    orders: demoOrders,
    products: buildFallbackProducts(),
    categories: buildFallbackCategories(),
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

export async function getStorefront(storeSlug = DEFAULT_STORE_SLUG) {
  if (shouldSkipDatabase) {
    return buildFallbackStorefront(storeSlug);
  }

  try {
    const store = await getStoreRecord(storeSlug);

    if (!store) {
      return null;
    }

    return mapStorefront(store);
  } catch {
    return storeSlug === DEFAULT_STORE_SLUG ? buildFallbackStorefront(storeSlug) : null;
  }
}

export async function getManagedStores(): Promise<ManagedStoreSummary[]> {
  if (shouldSkipDatabase) {
    const fallback = buildFallbackStorefront();

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
      },
    ];
  }

  try {
    await ensureDefaultStoreRecord();

    const stores = await prisma.coffeeShopStore.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            products: true,
            suppliers: true,
            financeEntries: true,
          },
        },
      },
    });

    return stores.map((store) => ({
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
    }));
  } catch {
    const fallback = buildFallbackStorefront();

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
      },
    ];
  }
}

export async function getCatalog(
  locale: Locale,
  storeSlug = DEFAULT_STORE_SLUG,
): Promise<PublicAreaData[]> {
  if (shouldSkipDatabase) {
    return buildFallbackCatalog(locale);
  }

  try {
    if (storeSlug === DEFAULT_STORE_SLUG) {
      await ensureDefaultStoreRecord();
    }

    const store = await prisma.coffeeShopStore.findUnique({
      where: { slug: storeSlug },
      include: {
        categories: {
          where: { isActive: true },
          include: {
            products: {
              orderBy: [{ sortOrder: "asc" }, { namePt: "asc" }],
            },
          },
          orderBy: [{ sortOrder: "asc" }, { namePt: "asc" }],
        },
      },
    });

    if (!store || store.categories.length === 0) {
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
  } catch {
    return buildFallbackCatalog(locale);
  }
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
          take: 60,
        },
        categories: {
          include: {
            _count: {
              select: { products: true },
            },
          },
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
        descriptionPt: product.descriptionPt,
        categorySlug: product.category.slug,
        categoryNamePt: product.category.namePt,
        price: moneyToNumber(product.basePrice),
        stockQuantity: product.stockQuantity,
        isAvailable: product.isAvailable,
        isFeatured: product.isFeatured,
        imageUrl: product.imageUrl,
        highlightPt: product.highlightPt,
        sortOrder: product.sortOrder,
      })),
      categories: store.categories.map<CatalogDashboardCategory>((category) => ({
        id: category.id,
        slug: category.slug,
        area: reverseAreaMap[category.area],
        namePt: category.namePt,
        descriptionPt: category.descriptionPt,
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
  } catch {
    return buildFallbackDashboard(storeSlug);
  }
}

export async function createManagedStore(input: {
  slug: string;
  name: string;
  legalName?: string;
  defaultLocale?: Locale;
  sloganPt?: string;
  storefrontDescriptionPt?: string;
  logoUrl?: string;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  brandAccentColor?: string;
}) {
  const slug = slugify(input.slug);

  if (!slug) {
    throw new Error("Informe um slug válido para a cafeteria.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.coffeeShopStore.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Já existe uma cafeteria com esse endereço.");
    }

    const store = await tx.coffeeShopStore.create({
      data: filterModelWriteData("CoffeeShopStore", {
        slug,
        name: input.name.trim(),
        legalName: cleanOptionalString(input.legalName),
        defaultLocale: input.defaultLocale ?? "pt",
        sloganPt: cleanOptionalBoundedString(
          input.sloganPt,
          "A frase do cabeçalho",
          STOREFRONT_SLOGAN_MAX_LENGTH,
        ),
        storefrontDescriptionPt: cleanOptionalString(input.storefrontDescriptionPt),
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
      storefrontDescriptionPt: store.storefrontDescriptionPt,
      logoUrl: store.logoUrl,
      brandPrimaryColor: store.brandPrimaryColor,
      brandSecondaryColor: store.brandSecondaryColor,
      brandAccentColor: store.brandAccentColor,
      contactPhone: store.contactPhone,
      contactWhatsapp: store.contactWhatsapp,
    });
  });
}

export async function updateStorefrontSettings(input: {
  storeSlug: string;
  name: string;
  legalName?: string;
  defaultLocale?: Locale;
  sloganPt?: string;
  storefrontDescriptionPt?: string;
  logoUrl?: string;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  brandAccentColor?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  isActive?: boolean;
}) {
  const store = await getStoreOrThrow(input.storeSlug);

  return prisma.coffeeShopStore.update({
    where: { id: store.id },
    data: filterModelWriteData("CoffeeShopStore", {
      name: input.name.trim(),
      legalName: cleanOptionalString(input.legalName),
      defaultLocale: input.defaultLocale ?? store.defaultLocale,
      sloganPt: cleanOptionalBoundedString(
        input.sloganPt,
        "A frase do cabeçalho",
        STOREFRONT_SLOGAN_MAX_LENGTH,
      ),
      storefrontDescriptionPt: cleanOptionalString(input.storefrontDescriptionPt),
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
  accentColor?: string;
  sidebarImageUrl?: string;
  isActive?: boolean;
}) {
  const store = await getStoreOrThrow(input.storeSlug);

  const category = await prisma.coffeeCatalogCategory.findFirst({
    where: {
      id: input.categoryId,
      storeId: store.id,
    },
  });

  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  return prisma.coffeeCatalogCategory.update({
    where: { id: category.id },
    data: {
      accentColor: cleanOptionalString(input.accentColor),
      sidebarImageUrl: cleanOptionalString(input.sidebarImageUrl),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  });
}

export async function createCatalogCategory(input: {
  storeSlug?: string;
  area: MenuAreaSlug;
  namePt: string;
  descriptionPt?: string;
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

    return tx.coffeeCatalogCategory.create({
      data: {
        storeId: store.id,
        area,
        slug,
        namePt: nextName,
        descriptionPt: cleanOptionalString(input.descriptionPt),
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
  descriptionPt?: string;
  price?: number | null;
  stockQuantity?: number | null;
  imageUrl?: string;
  isAvailable?: boolean;
  highlightPt?: string;
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

    return tx.coffeeProduct.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        slug,
        namePt: input.namePt.trim(),
        descriptionPt: cleanOptionalString(input.descriptionPt),
        basePrice: toNullableNumber(input.price),
        stockQuantity:
          typeof input.stockQuantity === "number" ? Math.max(0, Math.round(input.stockQuantity)) : 0,
        imageUrl: cleanOptionalString(input.imageUrl),
        isAvailable: Boolean(input.isAvailable),
        highlightPt: cleanOptionalString(input.highlightPt),
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
  descriptionPt?: string;
  price?: number | null;
  stockQuantity?: number | null;
  isAvailable?: boolean;
  imageUrl?: string;
  highlightPt?: string;
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

  return prisma.coffeeProduct.update({
    where: { id: product.id },
    data: {
      categoryId: nextCategory.id,
      slug: nextSlug,
      namePt: nextName,
      descriptionPt:
        input.descriptionPt !== undefined
          ? cleanOptionalString(input.descriptionPt)
          : product.descriptionPt,
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
      highlightPt:
        input.highlightPt !== undefined
          ? cleanOptionalString(input.highlightPt)
          : product.highlightPt,
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

export async function getOrderById(id: string, storeSlug?: string) {
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
      include: { items: true },
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
      items: order.items.map((item) => ({
        id: item.id,
        name: item.productNamePt,
        quantity: item.quantity,
        unitPrice: moneyToNumber(item.unitPrice),
        notes: item.notes,
      })),
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
