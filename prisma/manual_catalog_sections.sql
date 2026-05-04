CREATE TABLE IF NOT EXISTS coffee_shop_catalog_sections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "storeId" TEXT NOT NULL REFERENCES coffee_shop_stores(id) ON DELETE CASCADE,
  area "CoffeeMenuArea" NOT NULL,
  "namePt" TEXT NOT NULL,
  "nameEn" TEXT,
  "nameEs" TEXT,
  "descriptionPt" TEXT,
  "descriptionEn" TEXT,
  "descriptionEs" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS coffee_shop_catalog_sections_store_area_key
  ON coffee_shop_catalog_sections("storeId", area);

CREATE INDEX IF NOT EXISTS coffee_shop_catalog_sections_store_sort_idx
  ON coffee_shop_catalog_sections("storeId", "sortOrder");

INSERT INTO coffee_shop_catalog_sections (
  "storeId",
  area,
  "namePt",
  "nameEn",
  "nameEs",
  "sortOrder"
)
SELECT s.id, 'HOT_DRINKS'::"CoffeeMenuArea", 'Bebidas quentes', 'Hot drinks', 'Bebidas calientes', 10
FROM coffee_shop_stores s
ON CONFLICT ("storeId", area) DO NOTHING;

INSERT INTO coffee_shop_catalog_sections (
  "storeId",
  area,
  "namePt",
  "nameEn",
  "nameEs",
  "sortOrder"
)
SELECT s.id, 'COLD_DRINKS'::"CoffeeMenuArea", 'Bebidas geladas', 'Cold drinks', 'Bebidas frias', 20
FROM coffee_shop_stores s
ON CONFLICT ("storeId", area) DO NOTHING;

INSERT INTO coffee_shop_catalog_sections (
  "storeId",
  area,
  "namePt",
  "nameEn",
  "nameEs",
  "sortOrder"
)
SELECT s.id, 'FOODS'::"CoffeeMenuArea", 'Comidas', 'Foods', 'Comidas', 30
FROM coffee_shop_stores s
ON CONFLICT ("storeId", area) DO NOTHING;
