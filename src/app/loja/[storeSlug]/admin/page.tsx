import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StoreAdminShortcutPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { storeSlug } = await params;
  const query = await searchParams;
  const nextSearch = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextSearch.append(key, item));
      return;
    }

    if (value) {
      nextSearch.set(key, value);
    }
  });

  const suffix = nextSearch.toString() ? `?${nextSearch.toString()}` : "";

  redirect(`/admin/${storeSlug}${suffix}`);
}
