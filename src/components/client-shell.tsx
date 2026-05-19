"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="1" y="1" width="6.5" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="1" width="6.5" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10.5" width="6.5" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="3" y="3" width="12" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1.5h6a1 1 0 0 1 1 1V4H5V2.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8.5h6M6 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCoffee() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 5h9v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6h1.5a2.5 2.5 0 0 1 0 5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 2.5c0-1 1-1.5 1-2.5M7.5 2.5c0-1 1-1.5 1-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="8" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7.5" y="5" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="2" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.58 3.58l1.42 1.42M12.99 12.99l1.42 1.42M14.42 3.58l-1.42 1.42M5.01 12.99l-1.42 1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBars() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  count?: number;
};

function buildNavItems(storeSlug: string): NavItem[] {
  return [
    {
      key: "dashboard",
      label: "Visão geral",
      href: `/painel/${storeSlug}`,
      icon: <IconGrid />,
    },
    {
      key: "pedidos",
      label: "Pedidos",
      href: `/painel/${storeSlug}/pedidos`,
      icon: <IconClipboard />,
    },
    {
      key: "cardapio",
      label: "Cardápio",
      href: `/painel/${storeSlug}/cardapio`,
      icon: <IconCoffee />,
    },
    {
      key: "financeiro",
      label: "Financeiro",
      href: `/painel/${storeSlug}/financeiro`,
      icon: <IconChart />,
    },
    {
      key: "configuracoes",
      label: "Configurações",
      href: `/painel/${storeSlug}/configuracoes`,
      icon: <IconGear />,
    },
  ];
}

type ClientShellProps = {
  storeName: string;
  storeSlug: string;
  isActive?: boolean;
  children: ReactNode;
};

function SidebarNav({
  items,
  currentPath,
  storeSlug,
  onNavigate,
}: {
  items: NavItem[];
  currentPath: string;
  storeSlug: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        const active =
          item.key === "dashboard"
            ? currentPath === `/painel/${storeSlug}`
            : currentPath.startsWith(item.href);

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-[rgba(227,106,47,0.18)] text-[#f5c09a]"
                : "text-[rgba(255,240,225,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,240,225,0.9)]"
            }`}
          >
            <span
              className={`shrink-0 transition-colors ${
                active
                  ? "text-[var(--brand)]"
                  : "text-[rgba(255,240,225,0.4)] group-hover:text-[rgba(255,240,225,0.7)]"
              }`}
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.count !== undefined && item.count > 0 ? (
              <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-bold text-white">
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function ClientShell({
  storeName,
  storeSlug,
  isActive,
  children,
}: ClientShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = buildNavItems(storeSlug);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Link
          href="/painel"
          className="flex items-center gap-2 text-[rgba(255,240,225,0.4)] transition-colors hover:text-[rgba(255,240,225,0.7)]"
          onClick={() => setDrawerOpen(false)}
        >
          <IconArrowLeft />
          <span className="text-xs font-medium tracking-wide uppercase">Minhas lojas</span>
        </Link>

        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-bold text-white">
              {storeName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[rgba(255,240,225,0.95)]">
                {storeName}
              </p>
              {isActive !== undefined ? (
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isActive ? "text-emerald-400" : "text-[rgba(255,240,225,0.3)]"
                  }`}
                >
                  {isActive ? "Ativa" : "Inativa"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-1 border-t border-[rgba(255,255,255,0.06)] pt-3">
        <SidebarNav
          items={navItems}
          currentPath={pathname}
          storeSlug={storeSlug}
          onNavigate={() => setDrawerOpen(false)}
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto bg-[#28150e]">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-[rgba(20,10,5,0.6)] backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#28150e] shadow-2xl">
            <div className="absolute right-4 top-4">
              <button
                type="button"
                aria-label="Fechar menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[rgba(255,240,225,0.5)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,240,225,0.9)]"
                onClick={() => setDrawerOpen(false)}
              >
                <IconClose />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[rgba(255,252,247,0.92)] px-4 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--espresso)]"
            onClick={() => setDrawerOpen(true)}
          >
            <IconBars />
          </button>
          <p className="min-w-0 truncate text-sm font-semibold text-[var(--espresso)]">
            {storeName}
          </p>
        </header>

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
