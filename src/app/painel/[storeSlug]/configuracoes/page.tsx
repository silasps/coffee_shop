import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/coffee/service";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStorefront(storeSlug);

  if (!store) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          {store.name}
        </p>
        <h1 className="display-title mt-1 text-2xl text-[var(--espresso)]">Configurações</h1>
      </div>

      {/* Config sections */}
      <div className="space-y-3">
        {[
          {
            title: "Identidade da loja",
            description: "Nome, slogan, logo e cores da marca",
            icon: "🎨",
          },
          {
            title: "Idioma e região",
            description: "Idioma padrão do cardápio público",
            icon: "🌐",
          },
          {
            title: "Contato",
            description: "Telefone e WhatsApp para clientes",
            icon: "📞",
          },
          {
            title: "Status da loja",
            description: "Ativar ou desativar o cardápio público",
            icon: store.isActive ? "✅" : "⏸️",
          },
        ].map((section) => (
          <button
            key={section.title}
            type="button"
            className="card-panel flex w-full items-center gap-4 p-5 text-left transition-all hover:-translate-y-[1px]"
          >
            <span className="text-2xl">{section.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--espresso)]">{section.title}</p>
              <p className="text-sm text-[var(--muted)]">{section.description}</p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0 text-[var(--muted)]"
            >
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-[var(--muted)]">
        As configurações serão expandidas em breve.
      </p>
    </div>
  );
}
