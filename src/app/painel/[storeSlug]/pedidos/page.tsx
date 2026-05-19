import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/coffee/service";

export const dynamic = "force-dynamic";

export default async function PedidosPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStorefront(storeSlug);

  if (!store) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            {store.name}
          </p>
          <h1 className="display-title mt-1 text-2xl text-[var(--espresso)]">Pedidos</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-700">Ao vivo</span>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["Todos", "Aguardando", "Preparando", "Pronto", "Concluído"].map((label) => (
          <button
            key={label}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              label === "Todos"
                ? "border-[rgba(227,106,47,0.28)] bg-[rgba(255,239,226,0.96)] text-[var(--brand-strong)]"
                : "border-[var(--line)] bg-white/80 text-[var(--espresso)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders list placeholder */}
      <section className="card-panel">
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <p className="text-3xl">📋</p>
          <p className="font-semibold text-[var(--espresso)]">Nenhum pedido ativo</p>
          <p className="max-w-xs text-sm text-[var(--muted)]">
            Os pedidos aparecerão aqui assim que os clientes realizarem compras no cardápio público.
          </p>
        </div>
      </section>
    </div>
  );
}
