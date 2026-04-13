import Link from "next/link";
import { formatMoney } from "@/lib/coffee/i18n";
import { buildStoreAdminPath } from "@/lib/coffee/paths";
import { getManagedStores, getOperationsDashboard } from "@/lib/coffee/service";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const stores = await getManagedStores();
  const dashboards = await Promise.all(stores.map((store) => getOperationsDashboard(store.slug)));

  const storeSnapshots = dashboards.map((dashboard) => {
    const income = dashboard.financeEntries
      .filter((entry) => entry.direction === "INCOME")
      .reduce((acc, entry) => acc + entry.amount, 0);
    const expense = dashboard.financeEntries
      .filter((entry) => entry.direction === "EXPENSE")
      .reduce((acc, entry) => acc + entry.amount, 0);

    return {
      slug: dashboard.store.slug,
      name: dashboard.store.name,
      income,
      expense,
      balance: income - expense,
      suppliers: dashboard.suppliers.length,
      recentEntries: dashboard.financeEntries.slice(0, 4),
    };
  });

  const totalIncome = storeSnapshots.reduce((acc, store) => acc + store.income, 0);
  const totalExpense = storeSnapshots.reduce((acc, store) => acc + store.expense, 0);
  const totalSuppliers = storeSnapshots.reduce((acc, store) => acc + store.suppliers, 0);

  const latestEntries = storeSnapshots
    .flatMap((store) =>
      store.recentEntries.map((entry) => ({
        ...entry,
        storeName: store.name,
      })),
    )
    .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))
    .slice(0, 18);

  return (
    <main className="site-shell py-8">
      <section className="glass-panel rounded-[34px] p-8 md:p-10">
        <p className="pill">Financeiro</p>
        <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)] md:text-7xl">
          Entradas, saídas e fornecedores
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-8 text-[var(--muted)]">
          Visão consolidada da plataforma para acompanhar receita, despesas, compras e saúde
          financeira de cada cafeteria sem misturar os números entre clientes.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Receita consolidada</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{formatMoney(totalIncome, "pt")}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Despesas consolidadas</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{formatMoney(totalExpense, "pt")}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Fornecedores ativos</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{totalSuppliers}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="card-panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Resumo por cafeteria
            </p>
          </div>
          <div className="grid gap-4 p-6">
            {storeSnapshots.map((store) => (
              <article
                key={store.slug}
                className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--espresso)]">{store.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      Entradas: {formatMoney(store.income, "pt")} • Saídas:{" "}
                      {formatMoney(store.expense, "pt")}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                      Saldo parcial: {formatMoney(store.balance, "pt")} • Fornecedores: {store.suppliers}
                    </p>
                  </div>
                  <Link href={buildStoreAdminPath(store.slug)} className="btn-primary">
                    Abrir financeiro da loja
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="card-panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Lançamentos mais recentes
            </p>
          </div>
          <div className="space-y-4 p-6">
            {latestEntries.map((entry) => (
              <article
                key={`${entry.storeName}-${entry.id}`}
                className="rounded-[22px] border border-[var(--line)] bg-white/72 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                      {entry.storeName}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                      {entry.descriptionPt}
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-[var(--espresso)]">
                    {entry.direction === "INCOME" ? "Entrada" : "Saída"}
                  </p>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {entry.category} • {entry.supplierName ?? "Sem fornecedor"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                  {formatMoney(entry.amount, "pt")}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
