import Link from "next/link";
import { buildStorePath, DEFAULT_STORE_SLUG } from "@/lib/coffee/paths";

export default function NotFoundPage() {
  return (
    <main className="site-shell flex min-h-screen items-center justify-center py-12">
      <div className="card-panel max-w-xl p-10 text-center">
        <p className="pill">404</p>
        <h1 className="display-title mt-5 text-5xl font-semibold text-[var(--espresso)]">
          Página não encontrada
        </h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">
          O conteúdo pode ter sido movido ou ainda não foi cadastrado nesta base inicial.
        </p>
        <Link href={buildStorePath(DEFAULT_STORE_SLUG, "pt")} className="btn-primary mt-6">
          Voltar para o cardápio
        </Link>
      </div>
    </main>
  );
}
