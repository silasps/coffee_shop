import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/coffee/service";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStorefront(storeSlug);

  if (!store) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          {store.name}
        </p>
        <h1 className="display-title mt-1 text-2xl text-[var(--espresso)]">Financeiro</h1>
      </div>

      {/* Month summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Receita do mês", value: "—", color: "text-emerald-700" },
          { label: "Despesas", value: "—", color: "text-red-700" },
          { label: "Saldo", value: "—", color: "text-[var(--espresso)]" },
        ].map((stat) => (
          <div key={stat.label} className="card-panel px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {stat.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Entries list placeholder */}
      <section className="card-panel">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Lançamentos
          </p>
          <button type="button" className="btn-primary text-xs">
            Novo lançamento
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
          <p className="text-3xl">📊</p>
          <p className="font-semibold text-[var(--espresso)]">Sem lançamentos</p>
          <p className="text-sm text-[var(--muted)]">
            Registre receitas e despesas para acompanhar a saúde financeira da loja.
          </p>
        </div>
      </section>
    </div>
  );
}
