import { StatusPill } from "@/components/status-pill";
import { formatMoney } from "@/lib/coffee/i18n";
import { getOperationsDashboard } from "@/lib/coffee/service";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const dashboard = await getOperationsDashboard();
  const sales = dashboard.financeEntries
    .filter((entry) => entry.direction === "INCOME")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const expenses = dashboard.financeEntries
    .filter((entry) => entry.direction === "EXPENSE")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const net = sales - expenses;

  return (
    <main className="site-shell py-8">
      <section className="glass-panel rounded-[34px] p-8 md:p-10">
        <p className="pill">Financeiro</p>
        <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)] md:text-7xl">
          Vendas, caixa e insumos
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Acompanhamento consolidado das vendas concluídas, entradas e saídas de insumos e visão
          operacional do caixa em uma mesma tela.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Receita registrada</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{formatMoney(sales, "pt")}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Despesas e insumos</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{formatMoney(expenses, "pt")}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Resultado parcial</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{formatMoney(net, "pt")}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card-panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Lançamentos financeiros
            </p>
          </div>
          <div className="overflow-x-auto p-6">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.financeEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <StatusPill
                        label={entry.direction === "INCOME" ? "Entrada" : "Saída"}
                        tone={entry.direction === "INCOME" ? "success" : "warning"}
                      />
                    </td>
                    <td>{entry.category}</td>
                    <td>{entry.descriptionPt}</td>
                    <td>{formatMoney(entry.amount, "pt")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Movimentos de insumos
            </p>
            <div className="mt-4 space-y-4">
              {dashboard.inventoryMovements.map((movement) => (
                <article key={movement.id} className="rounded-[22px] border border-[var(--line)] bg-white/72 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--espresso)]">{movement.titlePt}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {movement.quantity ?? "-"} {movement.unitLabel ?? ""}
                      </p>
                    </div>
                    <StatusPill label={movement.type} tone="neutral" />
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Valor vinculado: {formatMoney(movement.totalAmount ?? 0, "pt")}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="card-panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Gateway sugerido
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <p>
                <strong className="text-[var(--espresso)]">Stripe</strong> é a melhor base para tokenização,
                checkout internacional, Apple Pay / Google Pay e cartões estrangeiros.
              </p>
              <p>
                <strong className="text-[var(--espresso)]">Mercado Pago</strong> pode entrar como complemento
                local para Pix e adquirência brasileira, se você quiser maximizar conversão no Brasil.
              </p>
              <p>
                Para este projeto, a combinação mais forte costuma ser Stripe como principal e Pix integrado
                por Stripe ou por um parceiro local, dependendo das taxas e do fluxo desejado.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
