import Link from "next/link";
import { getManagedStores } from "@/lib/coffee/service";
import { StatusPill } from "@/components/status-pill";
import type { ClientAccessStatus } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

function accessTone(status: ClientAccessStatus) {
  if (status === "BLOCKED") return "danger" as const;
  if (status === "OVERDUE" || status === "WARNING") return "warning" as const;
  return "success" as const;
}

export default async function PainelPage() {
  const stores = await getManagedStores();

  return (
    <div className="site-shell px-0 py-6 md:py-10">
      <div className="space-y-6">
        <header className="card-panel p-6 md:p-8">
          <span className="pill">Painel do cliente</span>
          <h1 className="display-title mt-4 text-3xl leading-none text-[var(--espresso)] md:text-4xl">
            Minhas lojas
          </h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Selecione uma loja para gerenciar pedidos, cardápio e configurações.
          </p>
        </header>

        {stores.length === 0 ? (
          <div className="card-panel flex flex-col items-center gap-4 px-6 py-16 text-center">
            <p className="text-2xl">☕</p>
            <p className="font-semibold text-[var(--espresso)]">Nenhuma loja cadastrada</p>
            <p className="text-sm text-[var(--muted)]">
              Entre em contato para adicionar sua primeira cafeteria.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/painel/${store.slug}`}
                className="card-panel group flex flex-col gap-4 p-5 transition-all hover:-translate-y-[2px] hover:shadow-[0_24px_48px_rgba(61,34,23,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-base font-bold text-white">
                      {store.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--espresso)]">{store.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{store.slug}</p>
                    </div>
                  </div>
                  <StatusPill
                    tone={store.isActive ? "success" : "neutral"}
                    label={store.isActive ? "Ativa" : "Inativa"}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3">
                  <div className="text-center">
                    <p className="text-base font-bold text-[var(--espresso)]">
                      {store.productCount}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Produtos
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-[var(--espresso)]">
                      {store.supplierCount}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Fornecedores
                    </p>
                  </div>
                  <div className="text-center">
                    <StatusPill
                      tone={accessTone(store.clientAccessStatus)}
                      label={store.clientAccessLabel}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
