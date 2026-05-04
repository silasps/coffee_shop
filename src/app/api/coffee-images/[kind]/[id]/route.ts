import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const ONE_DAY_SECONDS = 60 * 60 * 24;

function parseDataImage(value: string | null) {
  if (!value?.startsWith("data:image/")) {
    return null;
  }

  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ kind: string; id: string }>;
  },
) {
  const { kind, id } = await params;
  const imageUrl =
    kind === "product"
      ? (
          await prisma.coffeeProduct.findUnique({
            where: { id },
            select: { imageUrl: true },
          })
        )?.imageUrl
      : kind === "category"
        ? (
            await prisma.coffeeCatalogCategory.findUnique({
              where: { id },
              select: { sidebarImageUrl: true },
            })
          )?.sidebarImageUrl
        : null;

  const image = parseDataImage(imageUrl ?? null);

  if (!image) {
    notFound();
  }

  return new Response(image.bytes, {
    headers: {
      "Cache-Control": `public, max-age=${ONE_DAY_SECONDS}, stale-while-revalidate=${ONE_DAY_SECONDS}`,
      "Content-Type": image.contentType,
    },
  });
}
