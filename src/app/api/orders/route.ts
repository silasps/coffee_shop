import { NextResponse } from "next/server";
import { createOrder } from "@/lib/coffee/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await createOrder(payload);

    return NextResponse.json({
      orderId: result.id,
      displayCode: result.displayCode,
      requiresCounterPayment: result.requiresCounterPayment,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o pedido.",
      },
      { status: 400 },
    );
  }
}
