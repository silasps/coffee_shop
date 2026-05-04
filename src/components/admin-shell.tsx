"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type AdminNavItem = {
  key: string;
  label: string;
  href: string;
  description?: string;
  count?: string | number;
};

type AdminStat = {
  label: string;
  value: string | number;
  helper?: string;
};

type AdminShellProps = {
  badge: string;
  title: string;
  description: string;
  navItems: AdminNavItem[];
  activeKey: string;
  stats?: AdminStat[];
  actions?: ReactNode;
  children: ReactNode;
};

function countLabel(count: string | number | undefined) {
  if (count === undefined || count === null || count === "") {
    return null;
  }

  return (
    <span className="rounded-full bg-[rgba(61,34,23,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--espresso)]">
      {count}
    </span>
  );
}

export function AdminShell({
  badge,
  title,
  description,
  navItems,
  activeKey,
  stats = [],
  actions,
  children,
}: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="site-shell px-0 py-6 md:py-8">
      <div className="space-y-5">
        <header className="card-panel overflow-hidden">
          <div className="flex flex-col gap-5 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <span className="pill">{badge}</span>
                <div className="space-y-2">
                  <h1 className="display-title text-3xl leading-none text-[var(--espresso)] md:text-4xl">
                    {title}
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">
                    {description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {actions ? <div className="hidden flex-wrap gap-3 lg:flex">{actions}</div> : null}
                <button
                  type="button"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-white/80 text-[var(--espresso)] shadow-[0_10px_24px_rgba(61,34,23,0.08)] lg:hidden"
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="flex flex-col gap-1.5">
                    <span className="block h-0.5 w-5 rounded-full bg-current" />
                    <span className="block h-0.5 w-5 rounded-full bg-current" />
                    <span className="block h-0.5 w-5 rounded-full bg-current" />
                  </span>
                </button>
              </div>
            </div>

            {actions ? <div className="flex flex-wrap gap-3 lg:hidden">{actions}</div> : null}

            <nav className="hidden flex-wrap gap-2 border-t border-[var(--line)] pt-4 lg:flex">
              {navItems.map((item) => {
                const active = item.key === activeKey;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-[rgba(227,106,47,0.28)] bg-[rgba(255,239,226,0.96)] text-[var(--brand-strong)] shadow-[0_12px_26px_rgba(227,106,47,0.14)]"
                        : "border-[var(--line)] bg-white/82 text-[var(--espresso)] hover:-translate-y-[1px] hover:border-[rgba(227,106,47,0.18)]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {countLabel(item.count)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {stats.length ? (
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article key={stat.label} className="dashboard-stat px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-semibold leading-none text-[var(--espresso)]">{stat.value}</p>
                {stat.helper ? (
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{stat.helper}</p>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        <main className="space-y-5">{children}</main>
      </div>

      {menuOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[rgba(40,21,14,0.38)] backdrop-blur-[2px]"
            aria-label="Fechar navegação"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="fixed inset-y-0 right-0 z-50 w-[min(88vw,360px)] p-4">
            <div className="card-panel flex h-full flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                    Menu da gestão
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--espresso)]">{title}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white/80 text-xl text-[var(--espresso)]"
                  aria-label="Fechar menu"
                  onClick={() => setMenuOpen(false)}
                >
                  ×
                </button>
              </div>

              <nav className="grid gap-3 overflow-y-auto p-5">
                {navItems.map((item) => {
                  const active = item.key === activeKey;

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`rounded-[18px] border p-4 transition ${
                        active
                          ? "border-[rgba(227,106,47,0.28)] bg-[rgba(255,239,226,0.96)] shadow-[0_12px_26px_rgba(227,106,47,0.12)]"
                          : "border-[var(--line)] bg-white/88"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--espresso)]">
                            {item.label}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        {countLabel(item.count)}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {actions ? (
                <div className="border-t border-[var(--line)] p-5">
                  <div className="grid gap-3">{actions}</div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
