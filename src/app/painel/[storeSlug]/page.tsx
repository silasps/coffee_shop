import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/coffee/service";
import { buildStorePath } from "@/lib/coffee/paths";

export const dynamic = "force-dynamic";

export default async function StoreDashboardPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStorefront(storeSlug);

  if (!store) notFound();

  const publicUrl = buildStorePath(storeSlug, store.defaultLocale);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          Visão geral
        </p>
        <h1 className="display-title mt-1 text-2xl text-[var(--espresso)]">{store.name}</h1>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={`/painel/${storeSlug}/pedidos`}
          className="card-panel flex flex-col gap-2 p-5 transition-all hover:-translate-y-[2px]"
        >
          <span className="text-xl">📋</span>
          <p className="font-semibold text-[var(--espresso)]">Pedidos</p>
          <p className="text-xs text-[var(--muted)]">Acompanhar em tempo real</p>
        </Link>
        <Link
          href={`/painel/${storeSlug}/cardapio`}
          className="card-panel flex flex-col gap-2 p-5 transition-all hover:-translate-y-[2px]"
        >
          <span className="text-xl">☕</span>
          <p className="font-semibold text-[var(--espresso)]">Cardápio</p>
          <p className="text-xs text-[var(--muted)]">Produtos e categorias</p>
        </Link>
        <Link
          href={publicUrl}
          target="_blank"
          rel="noopener"
          className="card-panel flex flex-col gap-2 p-5 transition-all hover:-translate-y-[2px]"
        >
          <span className="text-xl">🔗</span>
          <p className="font-semibold text-[var(--espresso)]">Ver loja</p>
          <p className="text-xs text-[var(--muted)]">Abrir cardápio público</p>
        </Link>
      </div>

      {/* Stats placeholder */}
      <section className="card-panel divide-y divide-[var(--line)]">
        <div className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Resumo do dia
          </p>
        </div>
        <div className="grid divide-x divide-[var(--line)] sm:grid-cols-3">
          {[
            { label: "Pedidos hoje", value: "—" },
            { label: "Receita do dia", value: "—" },
            { label: "Ticket médio", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--espresso)]">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent orders placeholder */}
      <section className="card-panel">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Últimos pedidos
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <p className="text-sm text-[var(--muted)]">
            Nenhum pedido ainda.{" "}
            <Link
              href={publicUrl}
              target="_blank"
              className="font-semibold text-[var(--brand-strong)] underline underline-offset-2"
            >
              Abra o cardápio público
            </Link>{" "}
            para receber o primeiro.
          </p>
        </div>
      </section>
    </div>
  );
}
