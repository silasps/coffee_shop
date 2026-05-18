CREATE TEMP TABLE coffee_restore_categories (payload jsonb);
\copy coffee_restore_categories(payload) FROM 'backups/coffee_shop_catalog_categories_20260518134232.jsonl'

INSERT INTO public.coffee_shop_catalog_categories (
  id,
  "storeId",
  area,
  slug,
  "namePt",
  "nameEn",
  "nameEs",
  "descriptionPt",
  "descriptionEn",
  "descriptionEs",
  "accentColor",
  "sidebarImageUrl",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  payload->>'id',
  payload->>'storeId',
  (payload->>'area')::public."CoffeeMenuArea",
  payload->>'slug',
  payload->>'namePt',
  payload->>'nameEn',
  payload->>'nameEs',
  payload->>'descriptionPt',
  payload->>'descriptionEn',
  payload->>'descriptionEs',
  payload->>'accentColor',
  payload->>'sidebarImageUrl',
  COALESCE((payload->>'sortOrder')::integer, 0),
  COALESCE((payload->>'isActive')::boolean, true),
  (payload->>'createdAt')::timestamp,
  (payload->>'updatedAt')::timestamp
FROM coffee_restore_categories
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE coffee_restore_products (payload jsonb);
\copy coffee_restore_products(payload) FROM 'backups/coffee_shop_products_20260518134232.jsonl'

INSERT INTO public.coffee_shop_products (
  id,
  "storeId",
  "categoryId",
  slug,
  sku,
  "namePt",
  "nameEn",
  "nameEs",
  "descriptionPt",
  "descriptionEn",
  "descriptionEs",
  "imageUrl",
  "artTone",
  "highlightPt",
  "highlightEn",
  "highlightEs",
  "basePrice",
  "stockQuantity",
  "prepMinutes",
  "isAvailable",
  "isFeatured",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  payload->>'id',
  payload->>'storeId',
  payload->>'categoryId',
  payload->>'slug',
  payload->>'sku',
  payload->>'namePt',
  payload->>'nameEn',
  payload->>'nameEs',
  payload->>'descriptionPt',
  payload->>'descriptionEn',
  payload->>'descriptionEs',
  payload->>'imageUrl',
  payload->>'artTone',
  payload->>'highlightPt',
  payload->>'highlightEn',
  payload->>'highlightEs',
  (payload->>'basePrice')::numeric,
  (payload->>'stockQuantity')::integer,
  (payload->>'prepMinutes')::integer,
  COALESCE((payload->>'isAvailable')::boolean, true),
  COALESCE((payload->>'isFeatured')::boolean, false),
  COALESCE((payload->>'sortOrder')::integer, 0),
  (payload->>'createdAt')::timestamp,
  (payload->>'updatedAt')::timestamp
FROM coffee_restore_products
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE coffee_restore_inventory_movements (payload jsonb);
\copy coffee_restore_inventory_movements(payload) FROM 'backups/coffee_shop_inventory_movements_20260518134232.jsonl'

INSERT INTO public.coffee_shop_inventory_movements (
  id,
  "storeId",
  "productId",
  "supplierId",
  "titlePt",
  description,
  type,
  quantity,
  "unitLabel",
  "unitCost",
  "totalAmount",
  "referenceCode",
  "happenedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  payload->>'id',
  payload->>'storeId',
  payload->>'productId',
  payload->>'supplierId',
  payload->>'titlePt',
  payload->>'description',
  (payload->>'type')::public."CoffeeInventoryMovementType",
  (payload->>'quantity')::numeric,
  payload->>'unitLabel',
  (payload->>'unitCost')::numeric,
  (payload->>'totalAmount')::numeric,
  payload->>'referenceCode',
  (payload->>'happenedAt')::timestamp,
  (payload->>'createdAt')::timestamp,
  (payload->>'updatedAt')::timestamp
FROM coffee_restore_inventory_movements
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE coffee_restore_finance_entries (payload jsonb);
\copy coffee_restore_finance_entries(payload) FROM 'backups/coffee_shop_finance_entries_20260518134232.jsonl'

INSERT INTO public.coffee_shop_finance_entries (
  id,
  "storeId",
  "orderId",
  "inventoryMovementId",
  "supplierId",
  direction,
  category,
  "descriptionPt",
  amount,
  "happenedAt",
  "referenceCode",
  notes,
  "createdAt",
  "updatedAt"
)
SELECT
  payload->>'id',
  payload->>'storeId',
  payload->>'orderId',
  payload->>'inventoryMovementId',
  payload->>'supplierId',
  (payload->>'direction')::public."CoffeeFinanceDirection",
  (payload->>'category')::public."CoffeeFinanceCategory",
  payload->>'descriptionPt',
  (payload->>'amount')::numeric,
  (payload->>'happenedAt')::timestamp,
  payload->>'referenceCode',
  payload->>'notes',
  (payload->>'createdAt')::timestamp,
  (payload->>'updatedAt')::timestamp
FROM coffee_restore_finance_entries
ON CONFLICT (id) DO NOTHING;
