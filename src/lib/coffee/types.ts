export const locales = ["pt", "en", "es"] as const;

export type Locale = (typeof locales)[number];

export type LocalizedText = {
  pt?: string | null;
  en?: string | null;
  es?: string | null;
};

export const STOREFRONT_SLOGAN_MAX_LENGTH = 44;

export const menuAreas = ["foods", "hot-drinks", "cold-drinks"] as const;

export type MenuAreaSlug = (typeof menuAreas)[number];
export type ClientAccessStatus = "ACTIVE" | "WARNING" | "OVERDUE" | "BLOCKED";
export type BillingInvoiceViewStatus =
  | "UPCOMING"
  | "OPEN"
  | "OVERDUE"
  | "BLOCKED"
  | "PAID"
  | "CANCELED";

export type CatalogCategorySeed = {
  slug: string;
  area: MenuAreaSlug;
  namePt: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  accentColor?: string;
  sidebarImageUrl?: string | null;
  sortOrder: number;
};

export type CatalogProductSeed = {
  slug: string;
  categorySlug: string;
  namePt: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  imageUrl?: string | null;
  price: number | null;
  available?: boolean;
  featured?: boolean;
  stockQuantity?: number | null;
  prepMinutes?: number | null;
  artTone?: "amber" | "mocha" | "forest" | "berry" | "cream";
  highlightPt?: string;
  highlightEn?: string;
  highlightEs?: string;
};

export type PublicCategory = CatalogCategorySeed & {
  id: string;
  name: string;
  description: string;
  products: PublicProduct[];
};

export type StorefrontConfig = {
  id: string;
  slug: string;
  name: string;
  legalName?: string | null;
  defaultLocale: Locale;
  currencyCode: string;
  isActive: boolean;
  sloganPt?: string | null;
  sloganEn?: string | null;
  sloganEs?: string | null;
  storefrontDescriptionPt?: string | null;
  storefrontDescriptionEn?: string | null;
  storefrontDescriptionEs?: string | null;
  logoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandSecondaryColor?: string | null;
  brandAccentColor?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  publicUrl: string;
};

export type PublicProduct = {
  id: string;
  slug: string;
  categorySlug: string;
  area: MenuAreaSlug;
  name: string;
  description: string;
  originalName: string;
  imageUrl: string | null;
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

export type CatalogDashboardProduct = {
  id: string;
  slug: string;
  namePt: string;
  nameEn?: string | null;
  nameEs?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  categorySlug: string;
  categoryNamePt: string;
  price: number | null;
  stockQuantity: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  highlightPt: string | null;
  highlightEn: string | null;
  highlightEs: string | null;
  sortOrder: number;
};

export type CatalogDashboardCategory = {
  id: string;
  slug: string;
  area: MenuAreaSlug;
  namePt: string;
  nameEn?: string | null;
  nameEs?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  accentColor?: string | null;
  sidebarImageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

export type CatalogDashboardSection = {
  id?: string;
  area: MenuAreaSlug;
  namePt: string;
  nameEn?: string | null;
  nameEs?: string | null;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type SupplierRecord = {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  documentId?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type FinanceEntryRecord = {
  id: string;
  direction: "INCOME" | "EXPENSE";
  category: string;
  descriptionPt: string;
  amount: number;
  supplierName?: string | null;
  referenceCode?: string | null;
  notes?: string | null;
  happenedAt: string;
};

export type InventoryMovementRecord = {
  id: string;
  titlePt: string;
  type: string;
  quantity: number | null;
  unitLabel?: string | null;
  totalAmount: number | null;
  supplierName?: string | null;
  referenceCode?: string | null;
  happenedAt: string;
};

export type OperationsDashboard = {
  isLive: boolean;
  store: StorefrontConfig;
  orders: OrderSnapshot[];
  products: CatalogDashboardProduct[];
  categories: CatalogDashboardCategory[];
  sections: CatalogDashboardSection[];
  inventoryMovements: InventoryMovementRecord[];
  financeEntries: FinanceEntryRecord[];
  suppliers: SupplierRecord[];
};

export type ManagedStoreSummary = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  productCount: number;
  supplierCount: number;
  financeEntryCount: number;
  publicUrl: string;
  updatedAt: string;
  clientAccountId?: string | null;
  clientAccountName?: string | null;
  clientAccountSlug?: string | null;
  clientAccessStatus: ClientAccessStatus;
  clientAccessLabel: string;
};

export type BillingInvoiceSummary = {
  id: string;
  clientAccountId: string;
  clientName: string;
  clientSlug: string;
  referenceLabel: string;
  referenceMonth: string;
  amount: number;
  dueAt: string;
  paidAt?: string | null;
  reminderSentAt?: string | null;
  finalNoticeSentAt?: string | null;
  status: BillingInvoiceViewStatus;
  statusLabel: string;
  daysUntilDue?: number | null;
  daysOverdue?: number | null;
};

export type PlatformClientSummary = {
  id: string;
  slug: string;
  name: string;
  legalName?: string | null;
  ownerName?: string | null;
  billingEmail?: string | null;
  phone?: string | null;
  monthlyFee: number;
  billingDayOfMonth: number;
  graceDays: number;
  suspensionDays: number;
  notes?: string | null;
  isActive: boolean;
  accessStatus: ClientAccessStatus;
  accessLabel: string;
  storeCount: number;
  activeStoreCount: number;
  outstandingInvoiceCount: number;
  outstandingAmount: number;
  nextDueAt?: string | null;
  lastPaymentAt?: string | null;
  alerts: string[];
  stores: Array<{
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  }>;
};

export type PlatformDashboardStats = {
  clientCount: number;
  storeCount: number;
  activeStoreCount: number;
  blockedClientCount: number;
  warningClientCount: number;
  monthlyRecurringRevenue: number;
  outstandingRevenue: number;
};

export type PlatformAdminDashboard = {
  isLive: boolean;
  stats: PlatformDashboardStats;
  clients: PlatformClientSummary[];
  stores: ManagedStoreSummary[];
  invoices: BillingInvoiceSummary[];
};

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  quantity: number;
  area: MenuAreaSlug;
  notes?: string;
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
    notes?: string | null;
  }>;
};
