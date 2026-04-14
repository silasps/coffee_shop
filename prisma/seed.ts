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
import { fillLocalizedText } from "../src/lib/coffee/content-i18n";

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
      sloganEn: "From Tamandare to the world.",
      sloganEs: "De Tamandare al mundo.",
      storefrontDescriptionPt:
        "Cardápio, operação e gestão financeira em uma base reutilizável para cafeterias.",
      storefrontDescriptionEn:
        "Menu, operations, and financial management in one reusable cafe foundation.",
      storefrontDescriptionEs:
        "Menu, operacion y gestion financiera en una base reutilizable para cafeterias.",
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
      sloganEn: "From Tamandare to the world.",
      sloganEs: "De Tamandare al mundo.",
      storefrontDescriptionPt:
        "Cardápio, operação e gestão financeira em uma base reutilizável para cafeterias.",
      storefrontDescriptionEn:
        "Menu, operations, and financial management in one reusable cafe foundation.",
      storefrontDescriptionEs:
        "Menu, operacion y gestion financiera en una base reutilizable para cafeterias.",
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
    const name = fillLocalizedText(
      {
        pt: category.namePt,
        en: category.nameEn,
        es: category.nameEs,
      },
      { kind: "category-name", slug: category.slug },
    );
    const description = fillLocalizedText(
      {
        pt: category.descriptionPt,
        en: category.descriptionEn,
        es: category.descriptionEs,
      },
      { kind: "category-description", slug: category.slug },
    );

    const created = await prisma.coffeeCatalogCategory.create({
      data: {
        storeId: store.id,
        slug: category.slug,
        area: areaMap[category.area],
        namePt: name.pt ?? category.namePt,
        nameEn: name.en,
        nameEs: name.es,
        descriptionPt: description.pt,
        descriptionEn: description.en,
        descriptionEs: description.es,
        accentColor: category.accentColor,
        sidebarImageUrl:
          catalogProducts.find((product) => product.categorySlug === category.slug)?.imageUrl ?? null,
        sortOrder: category.sortOrder,
      },
    });

    categoriesBySlug.set(category.slug, created.id);
  }

  await prisma.coffeeProduct.createMany({
    data: catalogProducts.map((product, index) => {
      const name = fillLocalizedText(
        {
          pt: product.namePt,
          en: product.nameEn,
          es: product.nameEs,
        },
        { kind: "product-name", slug: product.slug },
      );
      const description = fillLocalizedText(
        {
          pt: product.descriptionPt,
          en: product.descriptionEn,
          es: product.descriptionEs,
        },
        { kind: "product-description", slug: product.slug },
      );
      const highlight = fillLocalizedText(
        {
          pt: product.highlightPt,
          en: product.highlightEn,
          es: product.highlightEs,
        },
        { kind: "product-highlight", slug: product.slug },
      );

      return {
        storeId: store.id,
        categoryId: categoriesBySlug.get(product.categorySlug) as string,
        slug: product.slug,
        namePt: name.pt ?? product.namePt,
        nameEn: name.en,
        nameEs: name.es,
        descriptionPt: description.pt,
        descriptionEn: description.en,
        descriptionEs: description.es,
        basePrice: product.price,
        stockQuantity: product.stockQuantity ?? 16,
        isAvailable: product.available ?? product.price !== null,
        isFeatured: product.featured ?? false,
        prepMinutes: product.prepMinutes ?? 8,
        artTone: product.artTone ?? "mocha",
        highlightPt: highlight.pt,
        highlightEn: highlight.en,
        highlightEs: highlight.es,
        sortOrder: index + 1,
      };
    }),
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
