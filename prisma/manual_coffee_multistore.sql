DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeeTeamRole') THEN
    CREATE TYPE "CoffeeTeamRole" AS ENUM ('ADMIN', 'SELLER', 'FINANCE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeeMenuArea') THEN
    CREATE TYPE "CoffeeMenuArea" AS ENUM ('FOODS', 'HOT_DRINKS', 'COLD_DRINKS');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeeOrderChannel') THEN
    CREATE TYPE "CoffeeOrderChannel" AS ENUM ('TABLE', 'COUNTER', 'TOTEM');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeeOrderStatus') THEN
    CREATE TYPE "CoffeeOrderStatus" AS ENUM (
      'AWAITING_PAYMENT',
      'IN_QUEUE',
      'PREPARING',
      'READY',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeePaymentMethod') THEN
    CREATE TYPE "CoffeePaymentMethod" AS ENUM (
      'ONLINE_CARD',
      'PAY_LINK',
      'PIX',
      'PAY_AT_COUNTER',
      'CASH_AT_COUNTER',
      'CARD_AT_COUNTER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeePaymentStatus') THEN
    CREATE TYPE "CoffeePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeeInventoryMovementType') THEN
    CREATE TYPE "CoffeeInventoryMovementType" AS ENUM (
      'PURCHASE',
      'ENTRY',
      'CONSUMPTION',
      'ADJUSTMENT',
      'WASTE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeeFinanceDirection') THEN
    CREATE TYPE "CoffeeFinanceDirection" AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffeeFinanceCategory') THEN
    CREATE TYPE "CoffeeFinanceCategory" AS ENUM (
      'SALE',
      'SUPPLY_PURCHASE',
      'OPERATIONS',
      'RENT',
      'PAYROLL',
      'TAXES',
      'UTILITIES',
      'MARKETING',
      'MAINTENANCE',
      'EQUIPMENT',
      'OTHER',
      'ADJUSTMENT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "coffee_shop_stores" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
  "defaultLocale" TEXT NOT NULL DEFAULT 'pt',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sloganPt" TEXT,
  "storefrontDescriptionPt" TEXT,
  "logoUrl" TEXT,
  "brandPrimaryColor" TEXT,
  "brandSecondaryColor" TEXT,
  "brandAccentColor" TEXT,
  "contactPhone" TEXT,
  "contactWhatsapp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_stores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coffee_shop_stores_slug_key"
  ON "coffee_shop_stores"("slug");

CREATE TABLE IF NOT EXISTS "coffee_shop_team_members" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT,
  "role" "CoffeeTeamRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "prefersCounter" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_team_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_team_members_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "coffee_shop_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "coffee_shop_team_members_email_key"
  ON "coffee_shop_team_members"("email");

CREATE INDEX IF NOT EXISTS "coffee_shop_team_members_storeId_role_isActive_idx"
  ON "coffee_shop_team_members"("storeId", "role", "isActive");

CREATE TABLE IF NOT EXISTS "coffee_shop_catalog_categories" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "area" "CoffeeMenuArea" NOT NULL,
  "slug" TEXT NOT NULL,
  "namePt" TEXT NOT NULL,
  "descriptionPt" TEXT,
  "accentColor" TEXT,
  "sidebarImageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_catalog_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_catalog_categories_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "coffee_shop_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "coffee_shop_catalog_categories_storeId_slug_key"
  ON "coffee_shop_catalog_categories"("storeId", "slug");

CREATE INDEX IF NOT EXISTS "coffee_shop_catalog_categories_storeId_area_sortOrder_idx"
  ON "coffee_shop_catalog_categories"("storeId", "area", "sortOrder");

CREATE TABLE IF NOT EXISTS "coffee_shop_suppliers" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "documentId" TEXT,
  "paymentTerms" TEXT,
  "leadTimeDays" INTEGER,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_suppliers_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "coffee_shop_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "coffee_shop_suppliers_storeId_isActive_name_idx"
  ON "coffee_shop_suppliers"("storeId", "isActive", "name");

CREATE TABLE IF NOT EXISTS "coffee_shop_products" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sku" TEXT,
  "namePt" TEXT NOT NULL,
  "descriptionPt" TEXT,
  "imageUrl" TEXT,
  "artTone" TEXT,
  "highlightPt" TEXT,
  "basePrice" DECIMAL(10, 2),
  "stockQuantity" INTEGER,
  "prepMinutes" INTEGER,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_products_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "coffee_shop_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coffee_shop_products_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "coffee_shop_catalog_categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "coffee_shop_products_storeId_slug_key"
  ON "coffee_shop_products"("storeId", "slug");

CREATE INDEX IF NOT EXISTS "coffee_shop_products_storeId_categoryId_sortOrder_idx"
  ON "coffee_shop_products"("storeId", "categoryId", "sortOrder");

CREATE INDEX IF NOT EXISTS "coffee_shop_products_storeId_isAvailable_idx"
  ON "coffee_shop_products"("storeId", "isAvailable");

CREATE TABLE IF NOT EXISTS "coffee_shop_orders" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "displayCode" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "tableLabel" TEXT,
  "notes" TEXT,
  "channel" "CoffeeOrderChannel" NOT NULL,
  "status" "CoffeeOrderStatus" NOT NULL,
  "paymentMethod" "CoffeePaymentMethod" NOT NULL,
  "paymentStatus" "CoffeePaymentStatus" NOT NULL DEFAULT 'PENDING',
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "total" DECIMAL(10, 2) NOT NULL,
  "requiresCounterPayment" BOOLEAN NOT NULL DEFAULT false,
  "canStartPreparation" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_orders_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "coffee_shop_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "coffee_shop_orders_displayCode_key"
  ON "coffee_shop_orders"("displayCode");

CREATE INDEX IF NOT EXISTS "coffee_shop_orders_storeId_status_createdAt_idx"
  ON "coffee_shop_orders"("storeId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "coffee_shop_orders_storeId_paymentStatus_createdAt_idx"
  ON "coffee_shop_orders"("storeId", "paymentStatus", "createdAt");

CREATE TABLE IF NOT EXISTS "coffee_shop_order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "productSlug" TEXT NOT NULL,
  "productNamePt" TEXT NOT NULL,
  "productDescription" TEXT,
  "notes" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(10, 2),
  "totalPrice" DECIMAL(10, 2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_order_items_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "coffee_shop_orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coffee_shop_order_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "coffee_shop_products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "coffee_shop_order_items_orderId_idx"
  ON "coffee_shop_order_items"("orderId");

CREATE TABLE IF NOT EXISTS "coffee_shop_inventory_movements" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT,
  "supplierId" TEXT,
  "titlePt" TEXT NOT NULL,
  "description" TEXT,
  "type" "CoffeeInventoryMovementType" NOT NULL,
  "quantity" DECIMAL(10, 2),
  "unitLabel" TEXT,
  "unitCost" DECIMAL(10, 2),
  "totalAmount" DECIMAL(10, 2),
  "referenceCode" TEXT,
  "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_inventory_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_inventory_movements_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "coffee_shop_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coffee_shop_inventory_movements_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "coffee_shop_products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "coffee_shop_inventory_movements_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "coffee_shop_suppliers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "coffee_shop_inventory_movements_storeId_type_happenedAt_idx"
  ON "coffee_shop_inventory_movements"("storeId", "type", "happenedAt");

CREATE TABLE IF NOT EXISTS "coffee_shop_finance_entries" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT,
  "inventoryMovementId" TEXT,
  "supplierId" TEXT,
  "direction" "CoffeeFinanceDirection" NOT NULL,
  "category" "CoffeeFinanceCategory" NOT NULL,
  "descriptionPt" TEXT NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referenceCode" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coffee_shop_finance_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coffee_shop_finance_entries_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "coffee_shop_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coffee_shop_finance_entries_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "coffee_shop_orders"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "coffee_shop_finance_entries_inventoryMovementId_fkey"
    FOREIGN KEY ("inventoryMovementId") REFERENCES "coffee_shop_inventory_movements"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "coffee_shop_finance_entries_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "coffee_shop_suppliers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "coffee_shop_finance_entries_storeId_direction_happenedAt_idx"
  ON "coffee_shop_finance_entries"("storeId", "direction", "happenedAt");

CREATE INDEX IF NOT EXISTS "coffee_shop_finance_entries_storeId_category_happenedAt_idx"
  ON "coffee_shop_finance_entries"("storeId", "category", "happenedAt");
