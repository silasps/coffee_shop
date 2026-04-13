"use server";

import { revalidatePath } from "next/cache";
import {
  CoffeeFinanceCategory,
  CoffeeFinanceDirection,
  CoffeeInventoryMovementType,
} from "@prisma/client";
import {
  createCatalogCategory,
  createCatalogProduct,
  createFinanceEntry,
  createInventoryMovement,
  createManagedStore,
  createSupplier,
  deleteCatalogProduct,
  updateCatalogProduct,
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

export async function createManagedStoreAction(formData: FormData) {
  await createManagedStore({
    slug: formData.get("slug")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    legalName: formData.get("legalName")?.toString() ?? "",
    defaultLocale:
      (formData.get("defaultLocale")?.toString() as "pt" | "en" | "es") ?? "pt",
    sloganPt: formData.get("sloganPt")?.toString() ?? "",
    storefrontDescriptionPt: formData.get("storefrontDescriptionPt")?.toString() ?? "",
    logoUrl: formData.get("logoUrl")?.toString() ?? "",
    brandPrimaryColor: formData.get("brandPrimaryColor")?.toString() ?? "",
    brandSecondaryColor: formData.get("brandSecondaryColor")?.toString() ?? "",
    brandAccentColor: formData.get("brandAccentColor")?.toString() ?? "",
  });

  revalidatePath("/admin");
  revalidatePath("/financeiro");
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
    storefrontDescriptionPt: formData.get("storefrontDescriptionPt")?.toString() ?? "",
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
    accentColor: formData.get("accentColor")?.toString() ?? "",
    sidebarImageUrl: formData.get("sidebarImageUrl")?.toString() ?? "",
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
    descriptionPt: parseOptionalString(formData.get("descriptionPt")),
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
    descriptionPt: formData.get("descriptionPt")?.toString() ?? "",
    price: parseOptionalNumber(formData.get("price")),
    stockQuantity: parseOptionalNumber(formData.get("stockQuantity")),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    highlightPt: formData.get("highlightPt")?.toString() ?? "",
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
    descriptionPt: formData.get("descriptionPt")?.toString() ?? "",
    price: parseOptionalNumber(formData.get("price")),
    stockQuantity: parseOptionalNumber(formData.get("stockQuantity")),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    highlightPt: formData.get("highlightPt")?.toString() ?? "",
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
