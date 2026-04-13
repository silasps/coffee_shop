import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { ColorField } from "@/components/color-field";
import { ImageUploadField } from "@/components/image-upload-field";
import { createManagedStoreAction } from "@/app/admin/actions";
import { buildStoreAdminPath } from "@/lib/coffee/paths";
import { getManagedStores } from "@/lib/coffee/service";
import { STOREFRONT_SLOGAN_MAX_LENGTH } from "@/lib/coffee/types";

export const dynamic = "force-dynamic";

function buildSectionHref(section: string) {
  return section === "overview" ? "/admin" : `/admin?section=${section}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const activeSection =
    section === "stores" || section === "new-store" ? section : "overview";
  const stores = await getManagedStores();
  const activeStores = stores.filter((store) => store.isActive).length;
  const totalProducts = stores.reduce((acc, store) => acc + store.productCount, 0);

  return (
    <AdminShell
      badge="Plataforma"
      title="Gestão multi-cafeteria"
      description="Um backoffice central para cadastrar cafeterias, acompanhar a operação da plataforma e navegar rápido para cada loja sem depender de uma tela gigante e rolável."
      activeKey={activeSection}
      navItems={[
        {
          key: "overview",
          label: "Resumo",
          description: "Indicadores e atalhos principais.",
          href: buildSectionHref("overview"),
        },
        {
          key: "stores",
          label: "Cafeterias",
          description: "Lista de lojas e acessos.",
          count: stores.length,
          href: buildSectionHref("stores"),
        },
        {
          key: "new-store",
          label: "Nova cafeteria",
          description: "Criar uma nova operação.",
          href: buildSectionHref("new-store"),
        },
      ]}
      stats={[
        { label: "Cafeterias", value: stores.length },
        { label: "Lojas ativas", value: activeStores },
        { label: "Produtos", value: totalProducts },
      ]}
      actions={
        <>
          <Link href="/financeiro" className="btn-primary">
            Ver financeiro
          </Link>
          <Link href={buildSectionHref("new-store")} className="btn-secondary text-center">
            Cadastrar loja
          </Link>
        </>
      }
    >
      {activeSection === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Como a plataforma funciona
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Cada cafeteria tem URL pública própria em /loja/<slug>/<idioma>.",
                "A identidade visual, catálogo, estoque, fornecedores e caixa são separados por loja.",
                "O painel principal serve para navegar e abrir a gestão específica de cada cafeteria.",
                "Dentro da loja, o ideal é trabalhar por menus: vitrine, produtos, fornecedores e caixa.",
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              Cafeterias recentes
            </p>
            <div className="mt-4 grid gap-3">
              {stores.slice(0, 5).map((store) => (
                <Link
                  key={store.id}
                  href={buildStoreAdminPath(store.slug)}
                  className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4 transition hover:-translate-y-[1px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--espresso)]">{store.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {store.slug}
                      </p>
                    </div>
                    <span className="rounded-full bg-[rgba(61,34,23,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--espresso)]">
                      {store.productCount} itens
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "stores" ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {stores.map((store) => (
            <article
              key={store.id}
              className="rounded-[22px] border border-[var(--line)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(61,34,23,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                    {store.slug}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--espresso)]">
                    {store.name}
                  </h2>
                </div>
                <span className="rounded-full bg-[rgba(61,34,23,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--espresso)]">
                  {store.isActive ? "Ativa" : "Pausada"}
                </span>
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
                  Abrir gestão
                </Link>
                <a href={store.publicUrl} className="btn-secondary">
                  Ver vitrine
                </a>
              </div>
            </article>
          ))}
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
                  Nome da loja
                </span>
                <input name="name" className="field" placeholder="Cafeteria Centro" required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Slug público
                </span>
                <input name="slug" className="field" placeholder="cafeteria-centro" required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Razão social
                </span>
                <input name="legalName" className="field" placeholder="Cafeteria Centro LTDA" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Idioma padrão
                </span>
                <select name="defaultLocale" className="select">
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Frase do cabeçalho
                </span>
                <input
                  name="sloganPt"
                  className="field"
                  maxLength={STOREFRONT_SLOGAN_MAX_LENGTH}
                  placeholder="Cafés especiais e doces da casa."
                />
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Até {STOREFRONT_SLOGAN_MAX_LENGTH} caracteres para manter a frase visível no
                  cabeçalho.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
                  Descrição pública
                </span>
                <textarea
                  name="storefrontDescriptionPt"
                  className="textarea min-h-28"
                  placeholder="Texto usado na vitrine e na identidade da cafeteria."
                />
              </label>

              <ImageUploadField
                name="logoUrl"
                label="Logo"
                description="A logo e otimizada automaticamente antes de salvar."
                previewClassName="aspect-square rounded-[18px]"
                cropAspectRatio={1}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <ColorField name="brandPrimaryColor" label="Cor principal" />
                <ColorField name="brandSecondaryColor" label="Cor secundária" defaultValue="#3f2218" />
                <ColorField name="brandAccentColor" label="Cor de apoio" defaultValue="#f3c56a" />
              </div>

              <button type="submit" className="btn-primary w-full">
                Criar cafeteria
              </button>
            </div>
          </form>

          <div className="card-panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
              O que nasce junto
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "URL pública por loja",
                "Catálogo próprio",
                "Tema por cores da marca",
                "Categorias laterais configuráveis",
                "Produtos e estoque independentes",
                "Fornecedores e caixa separados",
              ].map((item) => (
                <article
                  key={item}
                  className="rounded-[18px] border border-[var(--line)] bg-white/82 p-4 text-sm font-semibold text-[var(--espresso)]"
                >
                  {item}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
