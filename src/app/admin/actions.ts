"use server";

import { revalidatePath } from "next/cache";
import { CoffeeInventoryMovementType } from "@prisma/client";
import {
  createCatalogProduct,
  createInventoryMovement,
  updateCatalogProduct,
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

export async function createProductAction(formData: FormData) {
  await createCatalogProduct({
    categorySlug: formData.get("categorySlug")?.toString() ?? "",
    namePt: formData.get("namePt")?.toString() ?? "",
    descriptionPt: formData.get("descriptionPt")?.toString() ?? "",
    price: parseOptionalNumber(formData.get("price")),
    stockQuantity: parseOptionalNumber(formData.get("stockQuantity")),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    highlightPt: formData.get("highlightPt")?.toString() ?? "",
    isAvailable: formData.get("isAvailable") === "on",
  });

  revalidatePath("/admin");
  revalidatePath("/pt");
}

export async function updateProductAction(formData: FormData) {
  await updateCatalogProduct({
    productId: formData.get("productId")?.toString() ?? "",
    stockQuantity: parseOptionalNumber(formData.get("stockQuantity")),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    highlightPt: formData.get("highlightPt")?.toString() ?? "",
    isAvailable: formData.get("isAvailable") === "on",
  });

  revalidatePath("/admin");
  revalidatePath("/pt");
}

export async function addInventoryMovementAction(formData: FormData) {
  await createInventoryMovement({
    titlePt: formData.get("titlePt")?.toString() ?? "",
    type:
      (formData.get("type")?.toString() as CoffeeInventoryMovementType) ??
      CoffeeInventoryMovementType.PURCHASE,
    quantity: parseOptionalNumber(formData.get("quantity")),
    unitLabel: formData.get("unitLabel")?.toString() ?? "",
    totalAmount: parseOptionalNumber(formData.get("totalAmount")),
    description: formData.get("description")?.toString() ?? "",
  });

  revalidatePath("/admin");
  revalidatePath("/financeiro");
}
