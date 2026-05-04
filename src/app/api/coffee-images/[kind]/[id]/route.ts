import { prisma } from "@/lib/prisma";

const ONE_DAY_SECONDS = 60 * 60 * 24;

function notFoundImage() {
  return new Response("Image not found", { status: 404 });
}

function parseDataImage(value: string) {
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
  let imageUrl: string | null | undefined = null;

  if (kind === "product") {
    imageUrl = (
      await prisma.coffeeProduct.findUnique({
        where: { id },
        select: { imageUrl: true },
      })
    )?.imageUrl;
  } else if (kind === "category") {
    const category = await prisma.coffeeCatalogCategory.findUnique({
      where: { id },
      select: {
        sidebarImageUrl: true,
        products: {
          where: {
            imageUrl: {
              not: null,
            },
          },
          orderBy: [{ sortOrder: "asc" }, { namePt: "asc" }],
          select: { imageUrl: true },
          take: 1,
        },
      },
    });

    imageUrl = category?.sidebarImageUrl ?? category?.products[0]?.imageUrl;
  } else {
    return notFoundImage();
  }

  if (!imageUrl) {
    return notFoundImage();
  }

  if (!imageUrl.startsWith("data:image/")) {
    return Response.redirect(imageUrl, 307);
  }

  const image = parseDataImage(imageUrl);

  if (!image) {
    return notFoundImage();
  }

  return new Response(image.bytes, {
    headers: {
      "Cache-Control": `public, max-age=${ONE_DAY_SECONDS}, stale-while-revalidate=${ONE_DAY_SECONDS}`,
      "Content-Type": image.contentType,
    },
  });
}
