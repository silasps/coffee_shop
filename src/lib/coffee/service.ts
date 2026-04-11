import {
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
import { prisma } from "@/lib/prisma";
import {
  areaCategoryOrder,
  catalogCategories,
  catalogProducts,
  COFFEE_SHOP_SLUG,
  demoFinanceEntries,
  demoInventoryMovements,
  demoOrders,
} from "@/lib/coffee/catalog-data";
import { getAreaName, translateCategory } from "@/lib/coffee/i18n";
import type {
  CheckoutPayload,
  Locale,
  MenuAreaSlug,
  OrderSnapshot,
  PublicAreaData,
  PublicCategory,
  PublicProduct,
} from "@/lib/coffee/types";

const areaMap: Record<MenuAreaSlug, CoffeeMenuArea> = {
  foods: CoffeeMenuArea.FOODS,
  "hot-drinks": CoffeeMenuArea.HOT_DRINKS,
  "cold-drinks": CoffeeMenuArea.COLD_DRINKS,
};

const shouldSkipDatabase = process.env.COFFEE_SHOP_SKIP_DB === "1";

const reverseAreaMap: Record<CoffeeMenuArea, MenuAreaSlug> = {
  FOODS: "foods",
  HOT_DRINKS: "hot-drinks",
  COLD_DRINKS: "cold-drinks",
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
  items: z
    .array(
      z.object({
        slug: z.string(),
        name: z.string(),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        area: z.enum(["foods", "hot-drinks", "cold-drinks"]),
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
            price: product.price,
            isAvailable: product.available ?? product.price !== null,
            stockQuantity: product.stockQuantity ?? 12,
            prepMinutes: product.prepMinutes ?? 8,
            artTone: product.artTone ?? "mocha",
            highlight: product.highlightPt ?? null,
          }));

        return {
          ...category,
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

async function getStoreId() {
  const store = await prisma.coffeeShopStore.upsert({
    where: { slug: COFFEE_SHOP_SLUG },
    update: {},
    create: {
      slug: COFFEE_SHOP_SLUG,
      name: "Coffee Shop",
      legalName: "Coffee Shop",
    },
  });

  return store.id;
}

export async function getCatalog(locale: Locale) {
  if (shouldSkipDatabase) {
    return buildFallbackCatalog(locale);
  }

  try {
    const store = await prisma.coffeeShopStore.findUnique({
      where: { slug: COFFEE_SHOP_SLUG },
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
        const translations = translateCategory(
          category.slug,
          locale,
          category.namePt,
          category.descriptionPt ?? undefined,
        );

        const mappedCategory: PublicCategory = {
          slug: category.slug,
          area,
          namePt: category.namePt,
          descriptionPt: category.descriptionPt ?? undefined,
          accentColor: category.accentColor ?? undefined,
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
            price: moneyToNumber(product.basePrice),
            isAvailable: product.isAvailable,
            stockQuantity: product.stockQuantity,
            prepMinutes: product.prepMinutes,
            artTone:
              (product.artTone as PublicProduct["artTone"] | null) ?? "mocha",
            highlight: product.highlightPt ?? null,
          })),
        };

        accumulator[area].push(mappedCategory);

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

export async function getAreaCatalog(locale: Locale, area: MenuAreaSlug) {
  const catalog = await getCatalog(locale);
  return (
    catalog.find((entry) => entry.area === area) ?? {
      area,
      categories: [],
    }
  );
}

export async function getProductBySlug(locale: Locale, slug: string) {
  const catalog = await getCatalog(locale);
  const products = catalog.flatMap((area) => area.categories.flatMap((category) => category.products));
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getOperationsDashboard() {
  if (shouldSkipDatabase) {
    return {
      isLive: false,
      orders: demoOrders,
      products: catalogProducts.slice(0, 18).map((product) => ({
        id: product.slug,
        slug: product.slug,
        namePt: product.namePt,
        price: product.price,
        stockQuantity: product.stockQuantity ?? 14,
        isAvailable: product.available ?? product.price !== null,
        imageUrl: null,
        highlightPt: product.highlightPt ?? null,
      })),
      inventoryMovements: demoInventoryMovements,
      financeEntries: demoFinanceEntries,
    };
  }

  try {
    const store = await prisma.coffeeShopStore.findUnique({
      where: { slug: COFFEE_SHOP_SLUG },
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 12,
        },
        products: {
          orderBy: [{ isAvailable: "asc" }, { namePt: "asc" }],
          take: 40,
        },
        inventoryMovements: {
          orderBy: { happenedAt: "desc" },
          take: 12,
        },
        financeEntries: {
          orderBy: { happenedAt: "desc" },
          take: 16,
        },
      },
    });

    if (!store) {
      throw new Error("Missing store");
    }

    return {
      isLive: true,
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
        })),
      })),
      products: store.products.map((product) => ({
        id: product.id,
        slug: product.slug,
        namePt: product.namePt,
        price: moneyToNumber(product.basePrice),
        stockQuantity: product.stockQuantity,
        isAvailable: product.isAvailable,
        imageUrl: product.imageUrl,
        highlightPt: product.highlightPt,
      })),
      inventoryMovements: store.inventoryMovements.map((movement) => ({
        id: movement.id,
        titlePt: movement.titlePt,
        type: movement.type,
        quantity: moneyToNumber(movement.quantity),
        unitLabel: movement.unitLabel,
        totalAmount: moneyToNumber(movement.totalAmount),
        happenedAt: movement.happenedAt.toISOString(),
      })),
      financeEntries: store.financeEntries.map((entry) => ({
        id: entry.id,
        direction: entry.direction,
        category: entry.category,
        descriptionPt: entry.descriptionPt,
        amount: Number(entry.amount),
        happenedAt: entry.happenedAt.toISOString(),
      })),
    };
  } catch {
    return {
      isLive: false,
      orders: demoOrders,
      products: catalogProducts.slice(0, 18).map((product) => ({
        id: product.slug,
        slug: product.slug,
        namePt: product.namePt,
        price: product.price,
        stockQuantity: product.stockQuantity ?? 14,
        isAvailable: product.available ?? product.price !== null,
        imageUrl: null,
        highlightPt: product.highlightPt ?? null,
      })),
      inventoryMovements: demoInventoryMovements,
      financeEntries: demoFinanceEntries,
    };
  }
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

export async function createOrder(payload: CheckoutPayload) {
  const parsed = checkoutSchema.parse(payload);
  const storeId = await getStoreId();

  const slugs = parsed.items.map((item) => item.slug);
  const products = await prisma.coffeeProduct.findMany({
    where: {
      storeId,
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
        storeId,
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
        storeId,
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

export async function getOrderById(id: string) {
  if (shouldSkipDatabase) {
    return demoOrders.find((order) => order.id === id) ?? null;
  }

  try {
    const order = await prisma.coffeeOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
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

export async function createCatalogProduct(input: {
  categorySlug: string;
  namePt: string;
  descriptionPt?: string;
  price?: number | null;
  stockQuantity?: number | null;
  imageUrl?: string;
  isAvailable?: boolean;
  highlightPt?: string;
}) {
  const storeId = await getStoreId();

  const category = await prisma.coffeeCatalogCategory.findFirst({
    where: { storeId, slug: input.categorySlug },
  });

  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  const baseSlug = input.namePt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const slug = `${baseSlug}-${Math.floor(Math.random() * 90 + 10)}`;

  return prisma.coffeeProduct.create({
    data: {
      storeId,
      categoryId: category.id,
      slug,
      namePt: input.namePt,
      descriptionPt: input.descriptionPt,
      basePrice: input.price ?? null,
      stockQuantity: input.stockQuantity ?? 0,
      imageUrl: input.imageUrl ?? null,
      isAvailable: input.isAvailable ?? false,
      highlightPt: input.highlightPt ?? null,
      artTone: "amber",
    },
  });
}

export async function updateCatalogProduct(input: {
  productId: string;
  stockQuantity?: number | null;
  isAvailable?: boolean;
  imageUrl?: string;
  highlightPt?: string;
}) {
  return prisma.coffeeProduct.update({
    where: { id: input.productId },
    data: {
      stockQuantity: input.stockQuantity ?? undefined,
      isAvailable: input.isAvailable ?? undefined,
      imageUrl: input.imageUrl ?? undefined,
      highlightPt: input.highlightPt ?? undefined,
    },
  });
}

export async function createInventoryMovement(input: {
  titlePt: string;
  type: CoffeeInventoryMovementType;
  quantity?: number | null;
  unitLabel?: string;
  totalAmount?: number | null;
  description?: string;
}) {
  const storeId = await getStoreId();

  return prisma.$transaction(async (tx) => {
    const movement = await tx.coffeeInventoryMovement.create({
      data: {
        storeId,
        titlePt: input.titlePt,
        type: input.type,
        quantity: input.quantity ?? null,
        unitLabel: input.unitLabel ?? null,
        totalAmount: input.totalAmount ?? null,
        description: input.description ?? null,
      },
    });

    if (input.totalAmount && input.totalAmount > 0) {
      await tx.coffeeFinanceEntry.create({
        data: {
          storeId,
          inventoryMovementId: movement.id,
          direction: CoffeeFinanceDirection.EXPENSE,
          category: CoffeeFinanceCategory.SUPPLY_PURCHASE,
          descriptionPt: input.titlePt,
          amount: input.totalAmount,
        },
      });
    }

    return movement;
  });
}

export async function getAreaNavigation(locale: Locale) {
  return (Object.keys(areaMap) as MenuAreaSlug[]).map((area) => ({
    area,
    label: getAreaName(area, locale),
  }));
}
