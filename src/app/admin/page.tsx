import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { ColorField } from "@/components/color-field";
import { ImageUploadField } from "@/components/image-upload-field";
import { StatusPill } from "@/components/status-pill";
import {
  createClientAccountAction,
  createManagedStoreAction,
  markBillingFinalNoticeAction,
  markBillingPaidAction,
  markBillingReminderAction,
} from "@/app/admin/actions";
import { buildStoreAdminPath } from "@/lib/coffee/paths";
import { formatMoney } from "@/lib/coffee/i18n";
import { getPlatformAdminDashboard } from "@/lib/coffee/service";
import { STOREFRONT_SLOGAN_MAX_LENGTH } from "@/lib/coffee/types";
import type {
  BillingInvoiceSummary,
  ClientAccessStatus,
  PlatformClientSummary,
} from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

function buildSectionHref(section: string) {
  return section === "overview" ? "/admin" : `/admin?section=${section}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sem registro";
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

function toneForClientStatus(status: ClientAccessStatus) {
  if (status === "BLOCKED") {
    return "danger" as const;
  }

  if (status === "WARNING" || status === "OVERDUE") {
    return "warning" as const;
  }

  return "success" as const;
}

function toneForInvoiceStatus(status: BillingInvoiceSummary["status"]) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "BLOCKED" || status === "OVERDUE") {
    return "danger" as const;
  }

  if (status === "UPCOMING") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function buildClientSubtitle(client: PlatformClientSummary) {
  const pieces = [
    client.ownerName || "Responsável não informado",
    client.billingEmail || "Sem e-mail financeiro",
  ];

  return pieces.join(" • ");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const activeSection =
    section === "clients" ||
    section === "stores" ||
    section === "billing" ||
    section === "new-client" ||
    section === "new-store"
      ? section
      : "overview";

  const dashboard = await getPlatformAdminDashboard();
  const highlightedClients = dashboard.clients.filter(
    (client) => client.accessStatus !== "ACTIVE",
  );

  return (
    <AdminShell
      badge="Admin global"
      title="Gestão do seu produto de cafeterias"
      description="Você vê a operação completa do SaaS: clientes, lojas, mensalidades e sinais de inadimplência. Cada cliente continua isolado nas próprias cafeterias, enquanto a plataforma fica com a visão geral."
      activeKey={activeSection}
      navItems={[
        {
          key: "overview",
          label: "Resumo",
          description: "Panorama da plataforma.",
          href: buildSectionHref("overview"),
        },
        {
          key: "clients",
          label: "Clientes",
          description: "Contas SaaS e contratos.",
          count: dashboard.stats.clientCount,
          href: buildSectionHref("clients"),
        },
        {
          key: "stores",
          label: "Cafeterias",
          description: "Lojas por cliente.",
          count: dashboard.stats.storeCount,
          href: buildSectionHref("stores"),
        },
        {
          key: "billing",
          label: "Cobrança",
          description: "Mensalidades e avisos.",
          count: dashboard.invoices.filter((invoice) => invoice.status !== "PAID").length,
          href: buildSectionHref("billing"),
        },
        {
          key: "new-client",
          label: "Novo cliente",
          description: "Cadastrar uma conta.",
          href: buildSectionHref("new-client"),
        },
        {
          key: "new-store",
          label: "Nova cafeteria",
          description: "Criar loja para um cliente.",
          href: buildSectionHref("new-store"),
        },
      ]}
      stats={[
        { label: "Clientes", value: dashboard.stats.clientCount },
        { label: "Cafeterias", value: dashboard.stats.storeCount },
        {
          label: "MRR",
          value: formatMoney(dashboard.stats.monthlyRecurringRevenue, "pt"),
        },
        {
          label: "Em atenção",
          value: dashboard.stats.warningClientCount + dashboard.stats.blockedClientCount,
          helper: `${dashboard.stats.blockedClientCount} conta(s) bloqueada(s) no total.`,
        },
      ]}
      actions={
        <>
          <Link href="/financeiro" className="btn-secondary text-center">
            Ver financeiro
          </Link>
          <Link href={buildSectionHref("new-client")} className="btn-primary text-center">
            Novo cliente
          </Link>
        </>
      }
    >
      {activeSection === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Hierarquia do sistema
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Você é o admin global e enxerga todos os clientes, cobranças e cafeterias.",
                "Cada cliente pode ter várias cafeterias e cada cafeteria mantém a gestão individual.",
                "A mensalidade fica vinculada ao cliente, não à loja isolada, então o contrato acompanha a conta toda.",
                "Avisos e bloqueio são calculados pela cobrança; a aplicação de permissão fina por login entra na próxima camada de autenticação.",
              ].map((item) => (
                <article
                  key={item}
                  className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4 text-sm leading-7 text-[var(--muted)]"
                >
                  {item}
                </article>
              ))}
            </div>
          </section>

          <section className="card-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                Clientes pedindo ação
              </p>
              <Link href={buildSectionHref("billing")} className="text-sm font-semibold text-[var(--brand-strong)]">
                Abrir cobrança
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {highlightedClients.length === 0 ? (
                <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4 text-sm text-[var(--muted)]">
                  Nenhum cliente com risco de cobrança agora.
                </article>
              ) : (
                highlightedClients.slice(0, 6).map((client) => (
                  <article
                    key={client.id}
                    className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--espresso)]">{client.name}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                          {buildClientSubtitle(client)}
                        </p>
                      </div>
                      <StatusPill
                        label={client.accessLabel}
                        tone={toneForClientStatus(client.accessStatus)}
                      />
                    </div>
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      Mensalidade {formatMoney(client.monthlyFee, "pt")} • {client.storeCount} loja(s)
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Em aberto: {formatMoney(client.outstandingAmount, "pt")}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="card-panel p-5 xl:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Regras de cobrança configuradas
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Receita mensal prevista
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--espresso)]">
                  {formatMoney(dashboard.stats.monthlyRecurringRevenue, "pt")}
                </p>
              </article>
              <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Valor pendente
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--espresso)]">
                  {formatMoney(dashboard.stats.outstandingRevenue, "pt")}
                </p>
              </article>
              <article className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Cobranças abertas
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--espresso)]">
                  {dashboard.invoices.filter((invoice) => invoice.status !== "PAID").length}
                </p>
              </article>
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "clients" ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {dashboard.clients.map((client) => (
            <article
              key={client.id}
              className="rounded-[22px] border border-[var(--line)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(61,34,23,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                    {client.slug}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--espresso)]">
                    {client.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {buildClientSubtitle(client)}
                  </p>
                </div>
                <StatusPill
                  label={client.accessLabel}
                  tone={toneForClientStatus(client.accessStatus)}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3">
                  <p className="text-xs text-[var(--muted)]">Mensalidade</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {formatMoney(client.monthlyFee, "pt")}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3">
                  <p className="text-xs text-[var(--muted)]">Em aberto</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {formatMoney(client.outstandingAmount, "pt")}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3">
                  <p className="text-xs text-[var(--muted)]">Lojas</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {client.storeCount}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3">
                  <p className="text-xs text-[var(--muted)]">Vencimento</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    Dia {client.billingDayOfMonth}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <p>Ultimo pagamento: {formatDate(client.lastPaymentAt)}</p>
                <p>Proxima cobranca: {formatDate(client.nextDueAt)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {client.stores.map((store) => (
                  <Link
                    key={store.id}
                    href={buildStoreAdminPath(store.slug)}
                    className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--espresso)]"
                  >
                    {store.name}
                  </Link>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {client.alerts.map((alert) => (
                  <p
                    key={alert}
                    className="rounded-[16px] bg-[rgba(61,34,23,0.04)] px-3 py-2 text-sm text-[var(--muted)]"
                  >
                    {alert}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activeSection === "stores" ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {dashboard.stores.map((store) => (
            <article
              key={store.id}
              className="rounded-[22px] border border-[var(--line)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(61,34,23,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                    {store.clientAccountName}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--espresso)]">
                    {store.name}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{store.slug}</p>
                </div>
                <StatusPill
                  label={store.clientAccessLabel}
                  tone={toneForClientStatus(store.clientAccessStatus)}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3 text-center">
                  <p className="text-xs text-[var(--muted)]">Produtos</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {store.productCount}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3 text-center">
                  <p className="text-xs text-[var(--muted)]">Fornec.</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {store.supplierCount}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3 text-center">
                  <p className="text-xs text-[var(--muted)]">Caixa</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {store.financeEntryCount}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={buildStoreAdminPath(store.slug)} className="btn-primary">
                  Abrir gestao
                </Link>
                <a href={store.publicUrl} className="btn-secondary">
                  Ver vitrine
                </a>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activeSection === "billing" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {dashboard.invoices.map((invoice) => (
            <article
              key={invoice.id}
              className="rounded-[22px] border border-[var(--line)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(61,34,23,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                    {invoice.clientName}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--espresso)]">
                    {invoice.referenceLabel}
                  </h2>
                </div>
                <StatusPill
                  label={invoice.statusLabel}
                  tone={toneForInvoiceStatus(invoice.status)}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3">
                  <p className="text-xs text-[var(--muted)]">Valor</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {formatMoney(invoice.amount, "pt")}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(61,34,23,0.04)] p-3">
                  <p className="text-xs text-[var(--muted)]">Vence em</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--espresso)]">
                    {formatDate(invoice.dueAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <p>Pago em: {formatDate(invoice.paidAt)}</p>
                <p>Lembrete: {formatDate(invoice.reminderSentAt)}</p>
                <p>Aviso final: {formatDate(invoice.finalNoticeSentAt)}</p>
              </div>

              {invoice.status !== "PAID" && invoice.status !== "CANCELED" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <form action={markBillingReminderAction}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <button type="submit" className="btn-secondary w-full">
                      Registrar lembrete
                    </button>
                  </form>
                  <form action={markBillingFinalNoticeAction}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <button type="submit" className="btn-secondary w-full">
                      Aviso final
                    </button>
                  </form>
                  <form action={markBillingPaidAction}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <button type="submit" className="btn-primary w-full">
                      Registrar pagamento
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {activeSection === "new-client" ? (
        <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
          <form action={createClientAccountAction} className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Novo cliente SaaS
            </p>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Nome do cliente
                </span>
                <input name="name" className="field" placeholder="Grupo Cafe do Centro" required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Slug do cliente
                </span>
                <input name="slug" className="field" placeholder="grupo-cafe-centro" required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Razao social
                </span>
                <input
                  name="legalName"
                  className="field"
                  placeholder="Grupo Cafe do Centro LTDA"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Responsavel
                  </span>
                  <input name="ownerName" className="field" placeholder="Mariana Souza" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Telefone
                  </span>
                  <input name="phone" className="field" placeholder="(81) 99999-0000" />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  E-mail financeiro
                </span>
                <input
                  name="billingEmail"
                  type="email"
                  className="field"
                  placeholder="financeiro@cliente.com"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Mensalidade
                  </span>
                  <input
                    name="monthlyFee"
                    type="number"
                    step="0.01"
                    min="1"
                    defaultValue="150"
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Dia do vencimento
                  </span>
                  <input
                    name="billingDayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue="10"
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Dias de aviso
                  </span>
                  <input
                    name="graceDays"
                    type="number"
                    min="0"
                    defaultValue="4"
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Bloqueio apos
                  </span>
                  <input
                    name="suspensionDays"
                    type="number"
                    min="1"
                    defaultValue="12"
                    className="field"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Observacoes
                </span>
                <textarea
                  name="notes"
                  className="textarea min-h-28"
                  placeholder="Contexto comercial, combinados e situacao da operacao."
                />
              </label>

              <button type="submit" className="btn-primary w-full">
                Criar cliente
              </button>
            </div>
          </form>

          <section className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Como funciona essa camada
            </p>
            <div className="mt-4 grid gap-3">
              {[
                "Cliente e o contrato principal do seu SaaS. Ele concentra mensalidade, contato financeiro e alerta de inadimplencia.",
                "Cada novo cliente ja recebe a cobranca mensal do mes atual para voce acompanhar o ciclo desde o onboarding.",
                "As cafeterias entram depois, sempre vinculadas a um cliente, o que organiza sua carteira e facilita suporte, faturamento e bloqueio.",
              ].map((item) => (
                <article
                  key={item}
                  className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4 text-sm leading-7 text-[var(--muted)]"
                >
                  {item}
                </article>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {activeSection === "new-store" ? (
        <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
          <form action={createManagedStoreAction} className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Nova cafeteria
            </p>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Cliente
                </span>
                <select
                  name="clientAccountId"
                  className="select"
                  defaultValue={dashboard.clients[0]?.id ?? ""}
                >
                  {dashboard.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Nome da loja
                </span>
                <input name="name" className="field" placeholder="Cafeteria Centro" required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Slug publico
                </span>
                <input name="slug" className="field" placeholder="cafeteria-centro" required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Razao social
                </span>
                <input name="legalName" className="field" placeholder="Cafeteria Centro LTDA" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Idioma padrao
                </span>
                <select name="defaultLocale" className="select">
                  <option value="pt">Portugues</option>
                  <option value="en">English</option>
                  <option value="es">Espanol</option>
                </select>
              </label>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Frase do cabecalho PT
                  </span>
                  <input
                    name="sloganPt"
                    className="field"
                    maxLength={STOREFRONT_SLOGAN_MAX_LENGTH}
                    placeholder="Cafes especiais e doces da casa."
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Header slogan EN
                  </span>
                  <input
                    name="sloganEn"
                    className="field"
                    maxLength={STOREFRONT_SLOGAN_MAX_LENGTH}
                    placeholder="Specialty coffee and house pastries."
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Frase del encabezado ES
                  </span>
                  <input
                    name="sloganEs"
                    className="field"
                    maxLength={STOREFRONT_SLOGAN_MAX_LENGTH}
                    placeholder="Cafe de especialidad y dulces de la casa."
                  />
                </label>
              </div>
              <p className="-mt-2 text-xs leading-5 text-[var(--muted)]">
                Ate {STOREFRONT_SLOGAN_MAX_LENGTH} caracteres. Se EN ou ES ficarem vazios, a
                cafeteria recebe uma traducao automatica baseada no portugues.
              </p>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Descricao publica PT
                  </span>
                  <textarea
                    name="storefrontDescriptionPt"
                    className="textarea min-h-28"
                    placeholder="Texto usado na vitrine e na identidade da cafeteria."
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Public description EN
                  </span>
                  <textarea
                    name="storefrontDescriptionEn"
                    className="textarea min-h-28"
                    placeholder="Public-facing copy for the storefront."
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                    Descripcion publica ES
                  </span>
                  <textarea
                    name="storefrontDescriptionEs"
                    className="textarea min-h-28"
                    placeholder="Texto publico para la vitrina."
                  />
                </label>
              </div>

              <ImageUploadField
                name="logoUrl"
                label="Logo"
                description="A logo e otimizada automaticamente antes de salvar."
                previewClassName="aspect-square rounded-[18px]"
                cropAspectRatio={1}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <ColorField name="brandPrimaryColor" label="Cor principal" />
                <ColorField
                  name="brandSecondaryColor"
                  label="Cor secundaria"
                  defaultValue="#3f2218"
                />
                <ColorField
                  name="brandAccentColor"
                  label="Cor de apoio"
                  defaultValue="#f3c56a"
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Criar cafeteria
              </button>
            </div>
          </form>

          <section className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Cliente vinculado
            </p>
            <div className="mt-4 grid gap-3">
              {dashboard.clients.slice(0, 5).map((client) => (
                <article
                  key={client.id}
                  className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--espresso)]">{client.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {client.storeCount} loja(s) • {formatMoney(client.monthlyFee, "pt")}
                      </p>
                    </div>
                    <StatusPill
                      label={client.accessLabel}
                      tone={toneForClientStatus(client.accessStatus)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      ) : null}
    </AdminShell>
  );
}
