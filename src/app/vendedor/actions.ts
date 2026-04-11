"use server";

import { revalidatePath } from "next/cache";
import { CoffeeOrderStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/coffee/service";

export async function markOrderPaidAction(formData: FormData) {
  await updateOrderStatus(
    formData.get("orderId")?.toString() ?? "",
    CoffeeOrderStatus.IN_QUEUE,
  );

  revalidatePath("/vendedor");
  revalidatePath("/financeiro");
}

export async function startPreparingAction(formData: FormData) {
  await updateOrderStatus(
    formData.get("orderId")?.toString() ?? "",
    CoffeeOrderStatus.PREPARING,
  );

  revalidatePath("/vendedor");
}

export async function markReadyAction(formData: FormData) {
  await updateOrderStatus(
    formData.get("orderId")?.toString() ?? "",
    CoffeeOrderStatus.READY,
  );

  revalidatePath("/vendedor");
}

export async function completeOrderAction(formData: FormData) {
  await updateOrderStatus(
    formData.get("orderId")?.toString() ?? "",
    CoffeeOrderStatus.COMPLETED,
  );

  revalidatePath("/vendedor");
}
