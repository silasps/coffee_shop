import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ClientShell } from "@/components/client-shell";
import { getStorefront } from "@/lib/coffee/service";

export default async function StorePainelLayout({
  params,
  children,
}: {
  params: Promise<{ storeSlug: string }>;
  children: ReactNode;
}) {
  const { storeSlug } = await params;
  const store = await getStorefront(storeSlug);

  if (!store) notFound();

  return (
    <ClientShell
      storeName={store.name}
      storeSlug={storeSlug}
      isActive={store.isActive}
    >
      {children}
    </ClientShell>
  );
}
