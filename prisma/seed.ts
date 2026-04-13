import {
  CoffeeFinanceCategory,
  CoffeeFinanceDirection,
  CoffeeInventoryMovementType,
  CoffeeMenuArea,
  CoffeeTeamRole,
  PrismaClient,
} from "@prisma/client";
import {
  catalogCategories,
  catalogProducts,
  COFFEE_SHOP_SLUG,
} from "../src/lib/coffee/catalog-data";

const prisma = new PrismaClient();

const areaMap: Record<string, CoffeeMenuArea> = {
  foods: CoffeeMenuArea.FOODS,
  "hot-drinks": CoffeeMenuArea.HOT_DRINKS,
  "cold-drinks": CoffeeMenuArea.COLD_DRINKS,
};

async function main() {
  console.log("Seeding coffee shop...");

  const store = await prisma.coffeeShopStore.upsert({
    where: { slug: COFFEE_SHOP_SLUG },
    update: {
      name: "Cafeteria AT",
      legalName: "Coffee Shop",
      currencyCode: "BRL",
      defaultLocale: "pt",
      sloganPt: "De Tamandaré para o mundo.",
      storefrontDescriptionPt:
        "Cardápio, operação e gestão financeira em uma base reutilizável para cafeterias.",
      logoUrl: "/brand/logo-dark.png",
      brandPrimaryColor: "#e36a2f",
      brandSecondaryColor: "#3d2217",
      brandAccentColor: "#f0c067",
    },
    create: {
      slug: COFFEE_SHOP_SLUG,
      name: "Cafeteria AT",
      legalName: "Coffee Shop",
      currencyCode: "BRL",
      defaultLocale: "pt",
      sloganPt: "De Tamandaré para o mundo.",
      storefrontDescriptionPt:
        "Cardápio, operação e gestão financeira em uma base reutilizável para cafeterias.",
      logoUrl: "/brand/logo-dark.png",
      brandPrimaryColor: "#e36a2f",
      brandSecondaryColor: "#3d2217",
      brandAccentColor: "#f0c067",
    },
  });

  await prisma.coffeeFinanceEntry.deleteMany({ where: { storeId: store.id } });
  await prisma.coffeeInventoryMovement.deleteMany({ where: { storeId: store.id } });
  await prisma.coffeeOrderItem.deleteMany({
    where: { order: { storeId: store.id } },
  });
  await prisma.coffeeOrder.deleteMany({ where: { storeId: store.id } });
  await prisma.coffeeProduct.deleteMany({ where: { storeId: store.id } });
  await prisma.coffeeCatalogCategory.deleteMany({ where: { storeId: store.id } });
  await prisma.coffeeSupplier.deleteMany({ where: { storeId: store.id } });
  await prisma.coffeeTeamMember.deleteMany({ where: { storeId: store.id } });

  const categoriesBySlug = new Map<string, string>();

  for (const category of catalogCategories) {
    const created = await prisma.coffeeCatalogCategory.create({
      data: {
        storeId: store.id,
        slug: category.slug,
        area: areaMap[category.area],
        namePt: category.namePt,
        descriptionPt: category.descriptionPt,
        accentColor: category.accentColor,
        sidebarImageUrl:
          catalogProducts.find((product) => product.categorySlug === category.slug)?.imageUrl ?? null,
        sortOrder: category.sortOrder,
      },
    });

    categoriesBySlug.set(category.slug, created.id);
  }

  await prisma.coffeeProduct.createMany({
    data: catalogProducts.map((product, index) => ({
      storeId: store.id,
      categoryId: categoriesBySlug.get(product.categorySlug) as string,
      slug: product.slug,
      namePt: product.namePt,
      descriptionPt: product.descriptionPt,
      basePrice: product.price,
      stockQuantity: product.stockQuantity ?? 16,
      isAvailable: product.available ?? product.price !== null,
      isFeatured: product.featured ?? false,
      prepMinutes: product.prepMinutes ?? 8,
      artTone: product.artTone ?? "mocha",
      highlightPt: product.highlightPt,
      sortOrder: index + 1,
    })),
  });

  await prisma.coffeeTeamMember.createMany({
    data: [
      {
        storeId: store.id,
        fullName: "Administrador AT",
        email: "admin@cafeteria-at.local",
        role: CoffeeTeamRole.ADMIN,
      },
      {
        storeId: store.id,
        fullName: "Vendedor AT",
        email: "vendedor@cafeteria-at.local",
        role: CoffeeTeamRole.SELLER,
      },
      {
        storeId: store.id,
        fullName: "Financeiro AT",
        email: "financeiro@cafeteria-at.local",
        role: CoffeeTeamRole.FINANCE,
      },
    ],
  });

  const mainSupplier = await prisma.coffeeSupplier.create({
    data: {
      storeId: store.id,
      name: "Laticínios Serra",
      contactName: "Mariana",
      phone: "(81) 99999-2020",
      whatsapp: "(81) 99999-2020",
      paymentTerms: "28 dias",
      leadTimeDays: 2,
      notes: "Fornecedor principal de leite, creme e derivados.",
    },
  });

  const milkPurchase = await prisma.coffeeInventoryMovement.create({
    data: {
      storeId: store.id,
      supplierId: mainSupplier.id,
      titlePt: "Compra inicial de leite",
      type: CoffeeInventoryMovementType.PURCHASE,
      quantity: 24,
      unitLabel: "litros",
      totalAmount: 198,
      description: "Entrada inicial para cappuccinos, mochas e chocolates.",
      referenceCode: "NF-1001",
    },
  });

  await prisma.coffeeFinanceEntry.create({
    data: {
      storeId: store.id,
      inventoryMovementId: milkPurchase.id,
      supplierId: mainSupplier.id,
      direction: CoffeeFinanceDirection.EXPENSE,
      category: CoffeeFinanceCategory.SUPPLY_PURCHASE,
      descriptionPt: "Compra inicial de leite",
      amount: 198,
      referenceCode: "NF-1001",
      notes: "Compra inicial para abertura da operação.",
    },
  });

  console.log("Coffee shop seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
