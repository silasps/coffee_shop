import {
  completeOrderAction,
  markOrderPaidAction,
  markReadyAction,
  startPreparingAction,
} from "@/app/vendedor/actions";
import { StatusPill } from "@/components/status-pill";
import { formatMoney } from "@/lib/coffee/i18n";
import { getOperationsDashboard } from "@/lib/coffee/service";

export const dynamic = "force-dynamic";

function getToneForStatus(status: string) {
  if (status === "AWAITING_PAYMENT") {
    return "warning";
  }
  if (status === "READY" || status === "COMPLETED") {
    return "success";
  }
  if (status === "CANCELLED") {
    return "danger";
  }
  return "neutral";
}

export default async function SellerPage() {
  const dashboard = await getOperationsDashboard();
  const pendingPayment = dashboard.orders.filter((order) => order.status === "AWAITING_PAYMENT");
  const activeQueue = dashboard.orders.filter((order) =>
    ["IN_QUEUE", "PREPARING"].includes(order.status),
  );
  const readyOrders = dashboard.orders.filter((order) => order.status === "READY");

  return (
    <main className="site-shell py-8">
      <section className="glass-panel rounded-[34px] p-8 md:p-10">
        <p className="pill">Vendedor</p>
        <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)] md:text-7xl">
          Fila de pedidos e preparo
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Todos os pedidos entram no mesmo fluxo operacional. Os que exigem pagamento no balcão
          aguardam liberação aqui antes de seguirem para a produção.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Aguardando pagamento</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{pendingPayment.length}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Em fila ou preparo</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{activeQueue.length}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Prontos para retirada</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{readyOrders.length}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            Espera de pagamento
          </p>
          <div className="mt-5 space-y-4">
            {pendingPayment.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nenhum pedido aguardando pagamento.</p>
            ) : (
              pendingPayment.map((order) => (
                <article key={order.id} className="rounded-[22px] border border-[var(--line)] bg-white/72 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                        {order.displayCode}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                        {order.customerName}
                      </h3>
                    </div>
                    <StatusPill label={order.status} tone="warning" />
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {order.paymentMethod} • {formatMoney(order.total, "pt")}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity}x {item.name}
                        {item.notes?.trim() ? ` • ${item.notes.trim()}` : ""}
                      </li>
                    ))}
                  </ul>
                  <form action={markOrderPaidAction} className="mt-4">
                    <input type="hidden" name="orderId" value={order.id} />
                    <button type="submit" className="btn-primary w-full">
                      Confirmar pagamento e liberar preparo
                    </button>
                  </form>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            Em produção
          </p>
          <div className="mt-5 space-y-4">
            {activeQueue.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nenhum pedido na fila agora.</p>
            ) : (
              activeQueue.map((order) => (
                <article key={order.id} className="rounded-[22px] border border-[var(--line)] bg-white/72 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                        {order.displayCode}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                        {order.customerName}
                      </h3>
                    </div>
                    <StatusPill label={order.status} tone={getToneForStatus(order.status)} />
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity}x {item.name}
                        {item.notes?.trim() ? ` • ${item.notes.trim()}` : ""}
                      </li>
                    ))}
                  </ul>
                  {order.status === "IN_QUEUE" ? (
                    <form action={startPreparingAction} className="mt-4">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button type="submit" className="btn-secondary w-full">
                        Iniciar preparo
                      </button>
                    </form>
                  ) : (
                    <form action={markReadyAction} className="mt-4">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button type="submit" className="btn-primary w-full">
                        Marcar como pronto
                      </button>
                    </form>
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            Retirada / entrega
          </p>
          <div className="mt-5 space-y-4">
            {readyOrders.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nenhum pedido pronto no momento.</p>
            ) : (
              readyOrders.map((order) => (
                <article key={order.id} className="rounded-[22px] border border-[var(--line)] bg-white/72 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                        {order.displayCode}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--espresso)]">
                        Chamar {order.customerName}
                      </h3>
                    </div>
                    <StatusPill label="Pronto" tone="success" />
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Total {formatMoney(order.total, "pt")}
                  </p>
                  <form action={completeOrderAction} className="mt-4">
                    <input type="hidden" name="orderId" value={order.id} />
                    <button type="submit" className="btn-secondary w-full">
                      Finalizar pedido
                    </button>
                  </form>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
