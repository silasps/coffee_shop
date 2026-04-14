import Link from "next/link";

const accessCards = [
  {
    title: "Vendedor",
    href: "/vendedor",
    description:
      "Fila de preparo, confirmação de pagamento no balcão e status dos pedidos.",
  },
  {
    title: "Administrador",
    href: "/admin",
    description:
      "Visao global da plataforma: clientes, cafeterias, mensalidades e cobranca centralizada.",
  },
  {
    title: "Financeiro",
    href: "/financeiro",
    description:
      "Acompanhamento de vendas, entradas, saídas de insumos e visão consolidada do caixa.",
  },
];

export default function AccessPage() {
  return (
    <main className="site-shell py-8">
      <section className="glass-panel rounded-[34px] p-8 md:p-10">
        <p className="pill">Acessos</p>
        <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)] md:text-7xl">
          Portais operacionais
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Nesta base, os portais ja estao separados por funcao. A camada de autenticacao
          fina entra na proxima etapa para limitar o que cada gestor pode enxergar.
        </p>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        {accessCards.map((card) => (
          <Link key={card.href} href={card.href} className="card-panel p-6 transition hover:-translate-y-[2px]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Acesso interno
            </p>
            <h2 className="display-title mt-3 text-4xl font-semibold text-[var(--espresso)]">
              {card.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{card.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 card-panel p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
          Fluxo previsto
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
          <li>Cliente pode pedir na mesa, no balcão ou no totem.</li>
          <li>Todo pedido cai na mesma fila do vendedor para preparo.</li>
          <li>Pedidos com pagamento no balcão só liberam produção após confirmação.</li>
          <li>O admin global acompanha clientes, varias lojas por cliente e a cobranca mensal.</li>
          <li>Financeiro acompanha venda, compra de insumos e movimentos operacionais.</li>
        </ul>
      </section>
    </main>
  );
}
