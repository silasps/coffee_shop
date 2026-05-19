"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  createFinanceEntryAction,
  deleteFinanceEntryAction,
  updateFinanceEntryAction,
} from "@/app/admin/actions";

type FinanceEntry = {
  id: string;
  direction: string;
  category: string;
  descriptionPt: string;
  amount: number;
  supplierName?: string | null;
  referenceCode?: string | null;
  happenedAt: string;
};

type OrderItem = {
  id: string;
  displayCode: string | null;
  customerName: string | null;
  status: string;
  total: number;
  createdAt: string;
  items: { id: string; name: string; quantity: number }[];
};

type Supplier = { id: string; name: string };

type Props = {
  storeSlug: string;
  financeEntries: FinanceEntry[];
  orders: OrderItem[];
  suppliers: Supplier[];
  financeCategoryLabels: Record<string, string>;
  defaultCategory: string;
};

type QuickFilter = "today" | "7days" | "month" | "year";
type ChartFilter = "all" | "income" | "expense";
type Modal =
  | null
  | { type: "add" }
  | { type: "edit"; entry: FinanceEntry }
  | { type: "delete"; entry: FinanceEntry };

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  IN_QUEUE: "Na fila",
  PREPARING: "Preparando",
  READY: "Pronto",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const CAT_COLORS = [
  "#9333ea", "#f97316", "#22c55e", "#0ea5e9",
  "#f43f5e", "#f59e0b", "#6366f1", "#14b8a6",
];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateDisplay(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// SVG donut chart
function DonutChart({
  segments,
  total,
}: {
  segments: { pct: number; color: string }[];
  total: number;
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const gap = 1.5; // px gap between segments

  let cumPct = 0;
  const segs = segments.map((seg) => {
    const dashLength = Math.max(0, (seg.pct / 100) * circ - gap);
    const offset = circ - (cumPct / 100) * circ;
    cumPct += seg.pct;
    return { ...seg, dashLength, offset };
  });

  return (
    <div className="relative mx-auto flex h-[140px] w-[140px] items-center justify-center">
      <svg
        width="140"
        height="140"
        viewBox="0 0 120 120"
        className="absolute inset-0"
      >
        <g transform="rotate(-90 60 60)">
          {segs.length === 0 ? (
            <circle cx={60} cy={60} r={r} fill="none" stroke="#e5e7eb" strokeWidth="18" />
          ) : (
            segs.map((seg, i) => (
              <circle
                key={i}
                cx={60}
                cy={60}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="18"
                strokeDasharray={`${seg.dashLength} ${circ}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="butt"
              />
            ))
          )}
        </g>
      </svg>
      <div className="relative text-center">
        <p className="text-sm font-bold leading-tight text-[var(--espresso)]">{fmt(total)}</p>
        <p className="text-[10px] text-[var(--muted)]">Total</p>
      </div>
    </div>
  );
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="absolute inset-0 bg-[rgba(20,10,5,0.5)] backdrop-blur-sm"
      onClick={onClose}
      aria-label="Fechar"
    />
  );
}

function ConfirmModal({
  title,
  children,
  onClose,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClose={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="font-semibold text-[var(--espresso)]">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const CUSTOM_CATS_KEY = "finance_custom_cats";

function EntryModal({
  storeSlug,
  financeCategoryLabels,
  defaultCategory,
  suppliers,
  entry,
  onClose,
}: {
  storeSlug: string;
  financeCategoryLabels: Record<string, string>;
  defaultCategory: string;
  suppliers: Supplier[];
  entry?: FinanceEntry;
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<"INCOME" | "EXPENSE">(
    (entry?.direction as "INCOME" | "EXPENSE") ?? "EXPENSE",
  );
  const [rawDigits, setRawDigits] = useState<string>(() =>
    entry?.amount ? String(Math.round(entry.amount * 100)) : "",
  );
  const [pending, startTransition] = useTransition();

  // Date
  const dateRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (entry?.happenedAt) return entry.happenedAt.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  });

  // Category pills
  const [selectedCat, setSelectedCat] = useState<string>(entry?.category ?? defaultCategory);
  const [customCats, setCustomCats] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) ?? "[]"); }
    catch { return []; }
  });
  const [addingCat, setAddingCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatLabel, setEditCatLabel] = useState("");

  const isCustomCat = selectedCat.startsWith("__custom__::");
  const customCatLabel = isCustomCat ? selectedCat.slice(12) : "";

  function addCustomCat() {
    const label = newCatLabel.trim();
    if (!label) return;
    const next = customCats.includes(label) ? customCats : [...customCats, label];
    setCustomCats(next);
    localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(next));
    setSelectedCat(`__custom__::${label}`);
    setNewCatLabel("");
  }

  function removeCustomCat(label: string) {
    const next = customCats.filter((l) => l !== label);
    setCustomCats(next);
    localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(next));
    if (selectedCat === `__custom__::${label}`) setSelectedCat(defaultCategory);
  }

  function startEditCat(label: string) {
    setEditingCat(label);
    setEditCatLabel(label);
  }

  function confirmEditCat() {
    const trimmed = editCatLabel.trim();
    if (!trimmed || !editingCat) { setEditingCat(null); return; }
    const next = customCats.map((l) => (l === editingCat ? trimmed : l));
    setCustomCats(next);
    localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(next));
    if (selectedCat === `__custom__::${editingCat}`) setSelectedCat(`__custom__::${trimmed}`);
    setEditingCat(null);
  }

  const isIncome = direction === "INCOME";
  const isEdit = Boolean(entry);

  const numericCents = parseInt(rawDigits || "0", 10);
  const displayAmount = (numericCents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const submitAmount = (numericCents / 100).toFixed(2);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
    setRawDigits(digits.slice(0, 10));
  }

  const headerCls = isIncome ? "bg-emerald-600" : "bg-rose-600";
  const saveCls = isIncome
    ? "bg-emerald-600 hover:bg-emerald-700"
    : "bg-rose-600 hover:bg-rose-700";

  return (
    <>
    {/* Category management modal */}
    {addingCat && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => { setAddingCat(false); setNewCatLabel(""); }}
          aria-label="Fechar"
        />
        <div className="relative w-full max-w-xs overflow-hidden rounded-[24px] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <p className="font-semibold text-[var(--espresso)]">Gerenciar categorias</p>
            <button
              type="button"
              onClick={() => { setAddingCat(false); setNewCatLabel(""); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400"
            >
              ×
            </button>
          </div>
          <div className="p-5">
            {customCats.length > 0 && (
              <div className="mb-4 space-y-2">
                {customCats.map((label) => (
                  <div key={label} className="flex items-center gap-2 rounded-[10px] bg-gray-50 px-3 py-2">
                    {editingCat === label ? (
                      <>
                        <input
                          autoFocus
                          className="min-w-0 flex-1 rounded-[8px] border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-gray-400"
                          value={editCatLabel}
                          onChange={(e) => setEditCatLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); confirmEditCat(); }
                            if (e.key === "Escape") setEditingCat(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={confirmEditCat}
                          className="shrink-0 text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCat(null)}
                          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{label}</span>
                        <button
                          type="button"
                          onClick={() => startEditCat(label)}
                          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-700"
                          title="Editar"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomCat(label)}
                          className="shrink-0 text-base leading-none text-gray-400 transition hover:text-rose-500"
                          title="Excluir"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-[12px] border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCustomCat(); }
                  if (e.key === "Escape") { setAddingCat(false); setNewCatLabel(""); }
                }}
                placeholder="Nova categoria..."
              />
              <button
                type="button"
                onClick={addCustomCat}
                className="shrink-0 rounded-[12px] bg-[var(--brand-strong)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Adicionar
              </button>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => { setAddingCat(false); setNewCatLabel(""); setEditingCat(null); }}
                className="btn-secondary w-full"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClose={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (numericCents <= 0) return;
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              if (isEdit) {
                await updateFinanceEntryAction(fd);
              } else {
                await createFinanceEntryAction(fd);
              }
              onClose();
            });
          }}
        >
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="direction" value={direction} />
          <input type="hidden" name="happenedAt" value={selectedDate} />
          <input type="hidden" name="category" value={isCustomCat ? "OTHER" : selectedCat} />
          {isCustomCat && <input type="hidden" name="notes" value={customCatLabel} />}
          {entry && <input type="hidden" name="entryId" value={entry.id} />}

          {/* Colored header */}
          <div className={`${headerCls} px-5 pt-5 pb-5 transition-colors duration-200`}>
            <p className="mb-4 text-sm font-medium text-white/80">
              {isIncome ? "Receita" : "Despesa"}
            </p>

            {/* Value input */}
            <div className="mb-5 rounded-[16px] bg-white/15 px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
                Valor da transação
              </p>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white/25 px-3 py-1 text-sm font-bold text-white">
                  R$
                </span>
                <input type="hidden" name="amount" value={submitAmount} />
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  placeholder="0,00"
                  className="flex-1 bg-transparent text-3xl font-light text-white placeholder-white/40 outline-none"
                />
              </div>
            </div>

            {/* Direction toggle */}
            <div className="flex gap-1 rounded-full bg-white/20 p-1">
              <button
                type="button"
                onClick={() => setDirection("EXPENSE")}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                  !isIncome ? "bg-white text-rose-600 shadow-sm" : "text-white"
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setDirection("INCOME")}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                  isIncome ? "bg-white text-emerald-600 shadow-sm" : "text-white"
                }`}
              >
                Receita
              </button>
            </div>
          </div>

          {/* White body */}
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-0 divide-y divide-gray-100 px-5 pb-5 pt-4">
              {/* Descrição */}
              <div className="flex items-center gap-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">
                  📄
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-400">Descrição *</p>
                  <input
                    name="descriptionPt"
                    className="w-full bg-transparent text-sm font-medium text-gray-800 placeholder-gray-300 outline-none"
                    placeholder="Sem descrição"
                    defaultValue={entry?.descriptionPt ?? ""}
                    required
                  />
                </div>
              </div>

              {/* Data */}
              <div className="flex items-center gap-4 py-3">
                <button
                  type="button"
                  onClick={() => dateRef.current?.showPicker()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base transition hover:bg-gray-200"
                  title="Escolher data"
                >
                  📅
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-400">Data</p>
                  <input
                    ref={dateRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="sr-only"
                  />
                  <p className="text-sm font-medium text-gray-800">{fmtDateDisplay(selectedDate)}</p>
                </div>
              </div>

              {/* Categoria */}
              <div className="flex items-center gap-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">
                  🏷
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-400">Categoria *</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none"
                    >
                      {Object.entries(financeCategoryLabels).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                      {customCats.length > 0 && (
                        <optgroup label="Personalizadas">
                          {customCats.map((label) => (
                            <option key={label} value={`__custom__::${label}`}>{label}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => setAddingCat(true)}
                      className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-200"
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>
              </div>

              {/* Referência */}
              <div className="flex items-center gap-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">
                  🔖
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-400">Referência</p>
                  <input
                    name="referenceCode"
                    className="w-full bg-transparent text-sm font-medium text-gray-800 placeholder-gray-300 outline-none"
                    placeholder="Opcional"
                    defaultValue={entry?.referenceCode ?? ""}
                  />
                </div>
              </div>

              {/* Fornecedor */}
              {suppliers.length > 0 && (
                <div className="flex items-center gap-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">
                    🏢
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400">Fornecedor</p>
                    <select
                      name="supplierId"
                      className="w-full bg-transparent text-sm font-medium text-gray-800 outline-none"
                    >
                      <option value="">Nenhum</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Save button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={pending}
                  className={`w-full rounded-[16px] py-4 text-sm font-bold text-white transition ${saveCls} disabled:opacity-60`}
                >
                  {pending
                    ? "Salvando…"
                    : isEdit
                      ? `Salvar ${isIncome ? "Receita" : "Despesa"}`
                      : `Registrar ${isIncome ? "Receita" : "Despesa"}`}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export function CashPanel({
  storeSlug,
  financeEntries,
  orders,
  suppliers,
  financeCategoryLabels,
  defaultCategory,
}: Props) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("month");
  const [chartFilter, setChartFilter] = useState<ChartFilter>("all");
  const [modal, setModal] = useState<Modal>(null);
  const [deletePending, startDelete] = useTransition();

  const close = () => setModal(null);

  function prevMonth() {
    setViewMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }
  function nextMonth() {
    setViewMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }
  function setQuick(f: QuickFilter) {
    setQuickFilter(f);
    if (f === "month") setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
  }

  const inRange = (dateStr: string) => {
    const d = new Date(dateStr);
    if (quickFilter === "today") return d.toDateString() === now.toDateString();
    if (quickFilter === "7days") return d >= new Date(now.getTime() - 7 * 86_400_000);
    if (quickFilter === "year") return d.getFullYear() === now.getFullYear();
    return d.getMonth() === viewMonth.month && d.getFullYear() === viewMonth.year;
  };

  const allItems = useMemo(() => {
    const fe = financeEntries
      .filter((e) => inRange(e.happenedAt))
      .map((e) => ({ _kind: "finance" as const, _date: e.happenedAt, ...e }));
    const oo = orders
      .filter((o) => inRange(o.createdAt))
      .map((o) => ({ _kind: "order" as const, _date: o.createdAt, ...o }));
    return [...fe, ...oo].sort(
      (a, b) => new Date(b._date).getTime() - new Date(a._date).getTime(),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financeEntries, orders, quickFilter, viewMonth]);

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of allItems) {
      if (item._kind === "finance") {
        if (chartFilter === "income" && item.direction !== "INCOME") continue;
        if (chartFilter === "expense" && item.direction !== "EXPENSE") continue;
        const k = `${item.direction}::${item.category}`;
        map.set(k, (map.get(k) ?? 0) + item.amount);
      } else if (item.status !== "CANCELLED") {
        if (chartFilter === "expense") continue;
        const k = "INCOME::SALE";
        map.set(k, (map.get(k) ?? 0) + item.total);
      }
    }

    const entries = Array.from(map.entries()).map(([k, amount]) => {
      const [dir, cat] = k.split("::");
      return { dir, cat, amount };
    });
    const total = entries.reduce((s, e) => s + e.amount, 0);
    return entries
      .map((e) => ({ ...e, pct: total > 0 ? (e.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .map((e, i) => ({ ...e, color: CAT_COLORS[i % CAT_COLORS.length] }));
  }, [allItems, chartFilter]);

  const chartTotal = breakdown.reduce((s, e) => s + e.amount, 0);

  const loc = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const dateRange = (() => {
    if (quickFilter === "today") return loc(now);
    if (quickFilter === "7days") return `${loc(new Date(now.getTime() - 7 * 86_400_000))} — ${loc(now)}`;
    if (quickFilter === "year") return `01/01/${now.getFullYear()} — 31/12/${now.getFullYear()}`;
    return `${loc(new Date(viewMonth.year, viewMonth.month, 1))} — ${loc(new Date(viewMonth.year, viewMonth.month + 1, 0))}`;
  })();

  function handleDelete(entry: FinanceEntry) {
    startDelete(async () => {
      const fd = new FormData();
      fd.set("storeSlug", storeSlug);
      fd.set("entryId", entry.id);
      await deleteFinanceEntryAction(fd);
      close();
    });
  }

  const CHART_TABS: { key: ChartFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "income", label: "Receitas" },
    { key: "expense", label: "Despesas" },
  ];

  const QUICK_TABS: { key: QuickFilter; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7days", label: "7 dias atrás" },
    { key: "month", label: "Este mês" },
    { key: "year", label: "Esse ano" },
  ];

  return (
    <div className="space-y-4">
      {/* FAB fixo */}
      <button
        type="button"
        onClick={() => setModal({ type: "add" })}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-strong)] text-2xl font-bold text-white shadow-[0_6px_20px_rgba(227,106,47,0.48)] transition hover:scale-110 active:scale-95"
      >
        +
      </button>

      {/* Row 1: month nav */}
      <div className="flex items-center rounded-[18px] border border-[var(--line)] bg-white/82 px-4 py-3">
          <button
            type="button"
            onClick={prevMonth}
            disabled={quickFilter !== "month"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-base text-[var(--muted)] transition hover:bg-[var(--line)] hover:text-[var(--espresso)] disabled:opacity-30"
          >
            ←
          </button>
          <span className="flex-1 text-center text-2xl font-semibold text-[var(--espresso)]">
            {quickFilter === "month" ? MONTHS[viewMonth.month] : "—"}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={quickFilter !== "month"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-base text-[var(--muted)] transition hover:bg-[var(--line)] hover:text-[var(--espresso)] disabled:opacity-30"
          >
            →
          </button>
      </div>

      {/* Row 2: quick filter tabs */}
      <div className="grid grid-cols-4 gap-1 rounded-[14px] border border-[var(--line)] bg-white/82 p-1">
        {QUICK_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setQuick(key)}
            className={`rounded-[10px] py-2 text-xs font-semibold transition ${
              quickFilter === key
                ? "bg-[var(--brand-strong)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--espresso)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        {/* Lançamentos list */}
        <section className="card-panel p-5">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            Lançamentos
          </p>
          <p className="mb-4 text-xs text-[var(--muted)]">
            {dateRange}
          </p>

          {allItems.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-white/76 px-5 py-10 text-center text-sm text-[var(--muted)]">
              Nenhum lançamento em {MONTHS[viewMonth.month]}.
            </div>
          ) : (
            <div className="space-y-2">
              {allItems.map((item) => {
                if (item._kind === "order") {
                  const isActive = item.status !== "CANCELLED";
                  return (
                    <article
                      key={item.id}
                      className={`flex items-center gap-3 rounded-[12px] border-l-[3px] bg-white/82 px-4 py-3 ${
                        isActive ? "border-l-emerald-400" : "border-l-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[var(--espresso)]">
                          Pedido #{item.displayCode ?? item.id.slice(0, 6)}
                          {item.customerName ? ` — ${item.customerName}` : ""}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">
                          Vitrine · {STATUS_LABELS[item.status] ?? item.status}
                          {item.items.length > 0
                            ? ` · ${item.items.length} item${item.items.length !== 1 ? "s" : ""}`
                            : ""}
                          {" · "}{fmtDay(item.createdAt)}
                        </p>
                      </div>
                      <p className={`shrink-0 text-sm font-bold ${isActive ? "text-emerald-700" : "text-slate-400"}`}>
                        {isActive ? "+" : ""}
                        {fmt(item.total)}
                      </p>
                    </article>
                  );
                }

                const isIncome = item.direction === "INCOME";
                return (
                  <article
                    key={item.id}
                    className={`flex items-center gap-3 rounded-[12px] border-l-[3px] bg-white/82 px-4 py-3 ${
                      isIncome ? "border-l-emerald-400" : "border-l-rose-400"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[var(--espresso)]">
                        {item.descriptionPt}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {financeCategoryLabels[item.category] ?? item.category}
                        {" · "}{fmtDay(item.happenedAt)}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${isIncome ? "text-emerald-700" : "text-rose-600"}`}>
                      {isIncome ? "+" : "−"}
                      {fmt(item.amount)}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setModal({ type: "edit", entry: item })}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm text-[var(--muted)] transition hover:bg-[var(--line)] hover:text-[var(--espresso)]"
                        title="Editar"
                      >
                        ✏
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ type: "delete", entry: item })}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm text-[var(--muted)] transition hover:bg-rose-50 hover:text-rose-600"
                        title="Excluir"
                      >
                        🗑
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Category chart panel */}
        <section className="card-panel p-5">
          <p className="text-sm font-semibold text-[var(--espresso)]">Gráfico por categoria</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {dateRange}
          </p>

          {/* Todas / Receitas / Despesas tabs */}
          <div className="mt-3 flex gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--cream,#fdf6ee)] p-1">
            {CHART_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setChartFilter(key)}
                className={`flex-1 rounded-[8px] py-1.5 text-xs font-semibold transition ${
                  chartFilter === key
                    ? "bg-white text-[var(--espresso)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--espresso)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Donut */}
          <div className="my-5">
            <DonutChart
              segments={breakdown.map((b) => ({ pct: b.pct, color: b.color }))}
              total={chartTotal}
            />
          </div>

          {/* Category list */}
          {breakdown.length === 0 ? (
            <p className="text-center text-xs text-[var(--muted)]">Sem dados no período.</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map(({ dir, cat, amount, pct, color }) => {
                const label =
                  cat === "SALE" ? "Vendas" : (financeCategoryLabels[cat] ?? cat);
                return (
                  <div key={`${dir}::${cat}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {label}
                      </span>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-[var(--espresso)]">{fmt(amount)}</p>
                        <p className="text-[10px] text-[var(--muted)]">{pct.toFixed(2)}%</p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct.toFixed(1)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {(modal?.type === "add" || modal?.type === "edit") && (
        <EntryModal
          storeSlug={storeSlug}
          financeCategoryLabels={financeCategoryLabels}
          defaultCategory={defaultCategory}
          suppliers={suppliers}
          entry={modal.type === "edit" ? modal.entry : undefined}
          onClose={close}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmModal title="Excluir lançamento" onClose={close}>
          <p className="mb-1 text-sm text-[var(--espresso)]">
            Deseja excluir <strong>{modal.entry.descriptionPt}</strong>?
          </p>
          <p className="mb-5 text-xs text-[var(--muted)]">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button type="button" onClick={close} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="button"
              disabled={deletePending}
              onClick={() => handleDelete(modal.entry)}
              className="flex-1 rounded-[14px] bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {deletePending ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
