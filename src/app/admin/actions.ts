"use server";

import { revalidatePath } from "next/cache";
import {
  CoffeeFinanceCategory,
  CoffeeFinanceDirection,
  CoffeeInventoryMovementType,
} from "@prisma/client";
import {
  createClientAccount,
  createCatalogCategory,
  createCatalogProduct,
  createFinanceEntry,
  createInventoryMovement,
  createManagedStore,
  createSupplier,
  deleteCatalogProduct,
  markBillingInvoicePaid,
  markBillingInvoiceReminder,
  updateCatalogProduct,
  updateCatalogSection,
  updateCategoryVisuals,
  updateStorefrontSettings,
  updateSupplier,
} from "@/lib/coffee/service";

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.toString().trim().replace(",", ".");

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalString(value: FormDataEntryValue | null) {
  const trimmed = value?.toString().trim();
  return trimmed ? trimmed : undefined;
}

function revalidateStorePaths(storeSlug: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/${storeSlug}`);
  revalidatePath("/financeiro");
  revalidatePath(`/loja/${storeSlug}`, "layout");
}

function revalidatePlatformPaths() {
  revalidatePath("/admin");
  revalidatePath("/financeiro");
  revalidatePath("/acesso");
}

export async function createClientAccountAction(formData: FormData) {
  await createClientAccount({
    slug: formData.get("slug")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    legalName: formData.get("legalName")?.toString() ?? "",
    ownerName: formData.get("ownerName")?.toString() ?? "",
    billingEmail: formData.get("billingEmail")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    monthlyFee: parseOptionalNumber(formData.get("monthlyFee")),
    billingDayOfMonth: parseOptionalNumber(formData.get("billingDayOfMonth")),
    graceDays: parseOptionalNumber(formData.get("graceDays")),
    suspensionDays: parseOptionalNumber(formData.get("suspensionDays")),
    notes: formData.get("notes")?.toString() ?? "",
  });

  revalidatePlatformPaths();
}

export async function createManagedStoreAction(formData: FormData) {
  await createManagedStore({
    clientAccountId: formData.get("clientAccountId")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    legalName: formData.get("legalName")?.toString() ?? "",
    defaultLocale:
      (formData.get("defaultLocale")?.toString() as "pt" | "en" | "es") ?? "pt",
    sloganPt: formData.get("sloganPt")?.toString() ?? "",
    sloganEn: formData.get("sloganEn")?.toString() ?? "",
    sloganEs: formData.get("sloganEs")?.toString() ?? "",
    storefrontDescriptionPt: formData.get("storefrontDescriptionPt")?.toString() ?? "",
    storefrontDescriptionEn: formData.get("storefrontDescriptionEn")?.toString() ?? "",
    storefrontDescriptionEs: formData.get("storefrontDescriptionEs")?.toString() ?? "",
    logoUrl: formData.get("logoUrl")?.toString() ?? "",
    brandPrimaryColor: formData.get("brandPrimaryColor")?.toString() ?? "",
    brandSecondaryColor: formData.get("brandSecondaryColor")?.toString() ?? "",
    brandAccentColor: formData.get("brandAccentColor")?.toString() ?? "",
  });

  revalidatePlatformPaths();
}

export async function markBillingReminderAction(formData: FormData) {
  await markBillingInvoiceReminder(
    formData.get("invoiceId")?.toString() ?? "",
    "REMINDER",
  );

  revalidatePlatformPaths();
}

export async function markBillingFinalNoticeAction(formData: FormData) {
  await markBillingInvoiceReminder(
    formData.get("invoiceId")?.toString() ?? "",
    "FINAL_NOTICE",
  );

  revalidatePlatformPaths();
}

export async function markBillingPaidAction(formData: FormData) {
  await markBillingInvoicePaid(formData.get("invoiceId")?.toString() ?? "");

  revalidatePlatformPaths();
}

export async function updateStorefrontAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await updateStorefrontSettings({
    storeSlug,
    name: formData.get("name")?.toString() ?? "",
    legalName: formData.get("legalName")?.toString() ?? "",
    defaultLocale:
      (formData.get("defaultLocale")?.toString() as "pt" | "en" | "es") ?? "pt",
    sloganPt: formData.get("sloganPt")?.toString() ?? "",
    sloganEn: formData.get("sloganEn")?.toString() ?? "",
    sloganEs: formData.get("sloganEs")?.toString() ?? "",
    storefrontDescriptionPt: formData.get("storefrontDescriptionPt")?.toString() ?? "",
    storefrontDescriptionEn: formData.get("storefrontDescriptionEn")?.toString() ?? "",
    storefrontDescriptionEs: formData.get("storefrontDescriptionEs")?.toString() ?? "",
    logoUrl: formData.get("logoUrl")?.toString() ?? "",
    brandPrimaryColor: formData.get("brandPrimaryColor")?.toString() ?? "",
    brandSecondaryColor: formData.get("brandSecondaryColor")?.toString() ?? "",
    brandAccentColor: formData.get("brandAccentColor")?.toString() ?? "",
    contactPhone: formData.get("contactPhone")?.toString() ?? "",
    contactWhatsapp: formData.get("contactWhatsapp")?.toString() ?? "",
    isActive: formData.get("isActive") === "on",
  });

  revalidateStorePaths(storeSlug);
}

export async function updateCategoryVisualAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await updateCategoryVisuals({
    storeSlug,
    categoryId: formData.get("categoryId")?.toString() ?? "",
    categorySlug: formData.get("categorySlug")?.toString() ?? "",
    namePt: formData.get("namePt")?.toString() ?? "",
    nameEn: formData.get("nameEn")?.toString() ?? "",
    nameEs: formData.get("nameEs")?.toString() ?? "",
    descriptionPt: parseOptionalString(formData.get("descriptionPt")),
    descriptionEn: parseOptionalString(formData.get("descriptionEn")),
    descriptionEs: parseOptionalString(formData.get("descriptionEs")),
    accentColor: formData.get("accentColor")?.toString() ?? "",
    sidebarImageUrl: formData.get("sidebarImageUrl")?.toString() ?? "",
    isActive: formData.get("isActive") === "on",
  });

  revalidateStorePaths(storeSlug);
}

export async function updateCatalogSectionAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await updateCatalogSection({
    storeSlug,
    area:
      (formData.get("area")?.toString() as "foods" | "hot-drinks" | "cold-drinks") ??
      "foods",
    namePt: formData.get("namePt")?.toString() ?? "",
    nameEn: parseOptionalString(formData.get("nameEn")),
    nameEs: parseOptionalString(formData.get("nameEs")),
    descriptionPt: parseOptionalString(formData.get("descriptionPt")),
    descriptionEn: parseOptionalString(formData.get("descriptionEn")),
    descriptionEs: parseOptionalString(formData.get("descriptionEs")),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    isActive: formData.get("isActive") === "on",
  });

  revalidateStorePaths(storeSlug);
}

export async function createCategoryAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await createCatalogCategory({
    storeSlug,
    area:
      (formData.get("area")?.toString() as "foods" | "hot-drinks" | "cold-drinks") ??
      "foods",
    namePt: formData.get("namePt")?.toString() ?? "",
    nameEn: parseOptionalString(formData.get("nameEn")),
    nameEs: parseOptionalString(formData.get("nameEs")),
    descriptionPt: parseOptionalString(formData.get("descriptionPt")),
    descriptionEn: parseOptionalString(formData.get("descriptionEn")),
    descriptionEs: parseOptionalString(formData.get("descriptionEs")),
    accentColor: parseOptionalString(formData.get("accentColor")),
    sidebarImageUrl: parseOptionalString(formData.get("sidebarImageUrl")),
    isActive: formData.get("isActive") === "on",
    placement:
      (formData.get("placement")?.toString() as "FIRST" | "LAST" | undefined) ??
      "LAST",
  });

  revalidateStorePaths(storeSlug);
}

export async function createProductAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await createCatalogProduct({
    storeSlug,
    categorySlug: formData.get("categorySlug")?.toString() ?? "",
    namePt: formData.get("namePt")?.toString() ?? "",
    nameEn: formData.get("nameEn")?.toString() ?? "",
    nameEs: formData.get("nameEs")?.toString() ?? "",
    descriptionPt: formData.get("descriptionPt")?.toString() ?? "",
    descriptionEn: formData.get("descriptionEn")?.toString() ?? "",
    descriptionEs: formData.get("descriptionEs")?.toString() ?? "",
    price: parseOptionalNumber(formData.get("price")),
    stockQuantity: parseOptionalNumber(formData.get("stockQuantity")),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    highlightPt: formData.get("highlightPt")?.toString() ?? "",
    highlightEn: formData.get("highlightEn")?.toString() ?? "",
    highlightEs: formData.get("highlightEs")?.toString() ?? "",
    isAvailable: formData.get("isAvailable") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    placement:
      (formData.get("placement")?.toString() as "FIRST" | "LAST" | undefined) ??
      "LAST",
  });

  revalidateStorePaths(storeSlug);
}

export async function updateProductAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await updateCatalogProduct({
    storeSlug,
    productId: formData.get("productId")?.toString() ?? "",
    categorySlug: formData.get("categorySlug")?.toString() ?? "",
    namePt: formData.get("namePt")?.toString() ?? "",
    nameEn: formData.get("nameEn")?.toString() ?? "",
    nameEs: formData.get("nameEs")?.toString() ?? "",
    descriptionPt: formData.get("descriptionPt")?.toString() ?? "",
    descriptionEn: formData.get("descriptionEn")?.toString() ?? "",
    descriptionEs: formData.get("descriptionEs")?.toString() ?? "",
    price: parseOptionalNumber(formData.get("price")),
    stockQuantity: parseOptionalNumber(formData.get("stockQuantity")),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    highlightPt: formData.get("highlightPt")?.toString() ?? "",
    highlightEn: formData.get("highlightEn")?.toString() ?? "",
    highlightEs: formData.get("highlightEs")?.toString() ?? "",
    isAvailable: formData.get("isAvailable") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    sortOrder: parseOptionalNumber(formData.get("sortOrder")),
  });

  revalidateStorePaths(storeSlug);
}

export async function deleteProductAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await deleteCatalogProduct({
    storeSlug,
    productId: formData.get("productId")?.toString() ?? "",
  });

  revalidateStorePaths(storeSlug);
}

export async function createSupplierAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await createSupplier({
    storeSlug,
    name: formData.get("name")?.toString() ?? "",
    contactName: formData.get("contactName")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    whatsapp: formData.get("whatsapp")?.toString() ?? "",
    documentId: formData.get("documentId")?.toString() ?? "",
    paymentTerms: formData.get("paymentTerms")?.toString() ?? "",
    leadTimeDays: parseOptionalNumber(formData.get("leadTimeDays")),
    notes: formData.get("notes")?.toString() ?? "",
  });

  revalidateStorePaths(storeSlug);
}

export async function updateSupplierAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await updateSupplier({
    storeSlug,
    supplierId: formData.get("supplierId")?.toString() ?? "",
    name: parseOptionalString(formData.get("name")),
    contactName: formData.get("contactName")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    whatsapp: formData.get("whatsapp")?.toString() ?? "",
    documentId: formData.get("documentId")?.toString() ?? "",
    paymentTerms: formData.get("paymentTerms")?.toString() ?? "",
    leadTimeDays: parseOptionalNumber(formData.get("leadTimeDays")),
    notes: formData.get("notes")?.toString() ?? "",
    isActive: formData.get("isActive") === "on",
  });

  revalidateStorePaths(storeSlug);
}

export async function addInventoryMovementAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await createInventoryMovement({
    storeSlug,
    titlePt: formData.get("titlePt")?.toString() ?? "",
    type:
      (formData.get("type")?.toString() as CoffeeInventoryMovementType) ??
      CoffeeInventoryMovementType.PURCHASE,
    quantity: parseOptionalNumber(formData.get("quantity")),
    unitLabel: formData.get("unitLabel")?.toString() ?? "",
    totalAmount: parseOptionalNumber(formData.get("totalAmount")),
    description: formData.get("description")?.toString() ?? "",
    supplierId: formData.get("supplierId")?.toString() ?? "",
    referenceCode: formData.get("referenceCode")?.toString() ?? "",
  });

  revalidateStorePaths(storeSlug);
}

export async function createFinanceEntryAction(formData: FormData) {
  const storeSlug = formData.get("storeSlug")?.toString() ?? "";

  await createFinanceEntry({
    storeSlug,
    direction:
      (formData.get("direction")?.toString() as CoffeeFinanceDirection) ??
      CoffeeFinanceDirection.EXPENSE,
    category:
      (formData.get("category")?.toString() as CoffeeFinanceCategory) ??
      CoffeeFinanceCategory.OPERATIONS,
    descriptionPt: formData.get("descriptionPt")?.toString() ?? "",
    amount: parseOptionalNumber(formData.get("amount")) ?? 0,
    supplierId: formData.get("supplierId")?.toString() ?? "",
    referenceCode: formData.get("referenceCode")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  });

  revalidateStorePaths(storeSlug);
}
