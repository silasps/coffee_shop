export const locales = ["pt", "en", "es"] as const;

export type Locale = (typeof locales)[number];

export const menuAreas = ["foods", "hot-drinks", "cold-drinks"] as const;

export type MenuAreaSlug = (typeof menuAreas)[number];

export type CatalogCategorySeed = {
  slug: string;
  area: MenuAreaSlug;
  namePt: string;
  descriptionPt?: string;
  accentColor?: string;
  sortOrder: number;
};

export type CatalogProductSeed = {
  slug: string;
  categorySlug: string;
  namePt: string;
  descriptionPt?: string;
  price: number | null;
  available?: boolean;
  featured?: boolean;
  stockQuantity?: number | null;
  prepMinutes?: number | null;
  artTone?: "amber" | "mocha" | "forest" | "berry" | "cream";
  highlightPt?: string;
};

export type PublicCategory = CatalogCategorySeed & {
  name: string;
  description: string;
  products: PublicProduct[];
};

export type PublicProduct = {
  id: string;
  slug: string;
  categorySlug: string;
  area: MenuAreaSlug;
  name: string;
  description: string;
  originalName: string;
  price: number | null;
  isAvailable: boolean;
  stockQuantity: number | null;
  prepMinutes: number | null;
  artTone: "amber" | "mocha" | "forest" | "berry" | "cream";
  highlight: string | null;
};

export type PublicAreaData = {
  area: MenuAreaSlug;
  categories: PublicCategory[];
};

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  quantity: number;
  area: MenuAreaSlug;
};

export type CheckoutPayload = {
  customerName: string;
  channel: "TABLE" | "COUNTER" | "TOTEM";
  paymentMethod:
    | "ONLINE_CARD"
    | "PAY_LINK"
    | "PIX"
    | "PAY_AT_COUNTER"
    | "CASH_AT_COUNTER"
    | "CARD_AT_COUNTER";
  tableLabel?: string;
  notes?: string;
  locale: Locale;
  items: CartItem[];
};

export type OrderSnapshot = {
  id: string;
  displayCode: string;
  customerName: string;
  channel: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  requiresCounterPayment: boolean;
  canStartPreparation: boolean;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number | null;
  }>;
};
