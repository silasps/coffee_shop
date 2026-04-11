import { getCatalog, getOperationsDashboard } from "@/lib/coffee/service";
import { formatMoney } from "@/lib/coffee/i18n";
import { addInventoryMovementAction, createProductAction, updateProductAction } from "@/app/admin/actions";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [catalog, dashboard] = await Promise.all([
    getCatalog("pt"),
    getOperationsDashboard(),
  ]);

  const categories = catalog.flatMap((area) => area.categories);
  const unavailableCount = dashboard.products.filter((product) => !product.isAvailable).length;
  const missingPriceCount = dashboard.products.filter((product) => product.price === null).length;

  return (
    <main className="site-shell py-8">
      <section className="glass-panel rounded-[34px] p-8 md:p-10">
        <p className="pill">Administrador</p>
        <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)] md:text-7xl">
          Gestão do cardápio e estoque
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Cadastre produtos, ajuste disponibilidade, estoque, destaques e registre
          entrada ou saída de insumos sem misturar dados com o sistema antigo.
        </p>

        {!dashboard.isLive ? (
          <div className="mt-6 rounded-[24px] border border-[rgba(227,106,47,0.18)] bg-[rgba(255,243,234,0.9)] p-5 text-sm leading-6 text-[var(--brand-strong)]">
            O banco ainda não respondeu com as tabelas novas do café, então este painel está
            exibindo dados de demonstração. Assim que rodar `npm run db:push`, ele passa a operar
            com persistência real.
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Produtos acompanhados</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{dashboard.products.length}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Indisponíveis</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{unavailableCount}</p>
        </div>
        <div className="dashboard-stat">
          <p className="text-sm font-semibold text-[var(--muted)]">Itens com preço pendente</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--espresso)]">{missingPriceCount}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form action={createProductAction} className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            Novo produto
          </p>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Categoria</span>
              <select name="categorySlug" className="select" required>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.namePt}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Nome</span>
              <input name="namePt" className="field" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Descrição</span>
              <textarea name="descriptionPt" className="textarea min-h-28" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Preço</span>
                <input name="price" className="field" placeholder="14.00" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Estoque</span>
                <input name="stockQuantity" className="field" placeholder="16" />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Imagem do produto</span>
              <input name="imageUrl" className="field" placeholder="https://..." />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Destaque</span>
              <input name="highlightPt" className="field" placeholder="Mais pedido, lançamento..." />
            </label>
            <label className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
              <input type="checkbox" name="isAvailable" />
              <span className="text-sm font-semibold text-[var(--espresso)]">Liberar produto imediatamente</span>
            </label>
            <button type="submit" className="btn-primary w-full">
              Cadastrar produto
            </button>
          </div>
        </form>

        <form action={addInventoryMovementAction} className="card-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            Movimentação de insumos
          </p>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Título</span>
              <input name="titlePt" className="field" placeholder="Compra de leite" required />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Tipo</span>
                <select name="type" className="select">
                  <option value="PURCHASE">Compra</option>
                  <option value="ENTRY">Entrada</option>
                  <option value="CONSUMPTION">Consumo</option>
                  <option value="ADJUSTMENT">Ajuste</option>
                  <option value="WASTE">Perda</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Quantidade</span>
                <input name="quantity" className="field" placeholder="24" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Unidade</span>
                <input name="unitLabel" className="field" placeholder="litros, kg, caixas..." />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Valor total</span>
                <input name="totalAmount" className="field" placeholder="198.00" />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Observações</span>
              <textarea name="description" className="textarea min-h-28" />
            </label>
            <button type="submit" className="btn-primary w-full">
              Registrar movimento
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 card-panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            Produtos monitorados
          </p>
        </div>
        <div className="grid gap-4 p-6 xl:grid-cols-2">
          {dashboard.products.map((product) => (
            <form
              key={product.id}
              action={updateProductAction}
              className="rounded-[24px] border border-[var(--line)] bg-white/72 p-5"
            >
              <input type="hidden" name="productId" value={product.id} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--espresso)]">{product.namePt}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatMoney(product.price, "pt")}
                  </p>
                </div>
                <StatusPill
                  label={product.isAvailable ? "Disponível" : "Indisponível"}
                  tone={product.isAvailable ? "success" : "warning"}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Estoque</span>
                  <input
                    name="stockQuantity"
                    className="field"
                    defaultValue={product.stockQuantity ?? ""}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Destaque</span>
                  <input
                    name="highlightPt"
                    className="field"
                    defaultValue={product.highlightPt ?? ""}
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">Imagem</span>
                <input name="imageUrl" className="field" defaultValue={product.imageUrl ?? ""} />
              </label>
              <label className="mt-4 inline-flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
                <input type="checkbox" name="isAvailable" defaultChecked={product.isAvailable} />
                <span className="text-sm font-semibold text-[var(--espresso)]">Manter disponível</span>
              </label>
              <button type="submit" className="btn-secondary mt-4 w-full">
                Salvar ajustes
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
