WITH target_stores AS (
  SELECT id
  FROM coffee_shop_stores
  WHERE slug = 'coffee-shop-main'
)
UPDATE coffee_shop_catalog_categories c
SET
  "namePt" = CASE c.slug
    WHEN 'desserts' THEN 'Bolos'
    WHEN 'cold-teas-and-lemonade' THEN 'Chás Gelados'
    WHEN 'cold-beverages' THEN 'Refrigerantes'
    WHEN 'juices-and-vitaminas' THEN 'Sucos'
    ELSE c."namePt"
  END,
  "descriptionPt" = CASE c.slug
    WHEN 'cold-teas-and-lemonade' THEN 'Chás batidos e refrescantes para pedidos rápidos ou retirada no balcão.'
    WHEN 'cold-beverages' THEN 'Geladeira completa com refrigerantes, energéticos, água e opções prontas.'
    WHEN 'juices-and-vitaminas' THEN 'Sucos naturais, polpas batidas e limonada da casa.'
    ELSE c."descriptionPt"
  END,
  "nameEn" = CASE c.slug
    WHEN 'cold-teas-and-lemonade' THEN 'Iced Teas'
    WHEN 'cold-beverages' THEN 'Soft Drinks'
    WHEN 'juices-and-vitaminas' THEN 'Juices'
    ELSE c."nameEn"
  END,
  "nameEs" = CASE c.slug
    WHEN 'cold-teas-and-lemonade' THEN 'Tes Frios'
    WHEN 'cold-beverages' THEN 'Refrescos'
    WHEN 'juices-and-vitaminas' THEN 'Zumos'
    ELSE c."nameEs"
  END,
  "updatedAt" = now()
FROM target_stores s
WHERE c."storeId" = s.id
  AND c.slug IN ('desserts', 'cold-teas-and-lemonade', 'cold-beverages', 'juices-and-vitaminas');

INSERT INTO coffee_shop_catalog_categories (
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
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'manual-vitaminas-' || s.id,
  s.id,
  'COLD_DRINKS'::"CoffeeMenuArea",
  'vitaminas',
  'Vitaminas',
  'Smoothies',
  'Batidos',
  'Vitaminas cremosas batidas na hora.',
  'Creamy fruit smoothies blended to order.',
  'Batidos cremosos de fruta preparados al momento.',
  'var(--tone-cream)',
  55,
  true,
  now(),
  now()
FROM coffee_shop_stores s
WHERE s.slug = 'coffee-shop-main'
  AND NOT EXISTS (
    SELECT 1
    FROM coffee_shop_catalog_categories c
    WHERE c."storeId" = s.id
      AND c.slug = 'vitaminas'
  );

UPDATE coffee_shop_products p
SET
  "categoryId" = target_category.id,
  "updatedAt" = now()
FROM coffee_shop_stores s
JOIN coffee_shop_catalog_categories target_category
  ON target_category."storeId" = s.id
WHERE p."storeId" = s.id
  AND s.slug = 'coffee-shop-main'
  AND (
    (p.slug = 'limonada-suica' AND target_category.slug = 'juices-and-vitaminas')
    OR (p.slug = 'vitamina-banana-maca' AND target_category.slug = 'vitaminas')
  );
