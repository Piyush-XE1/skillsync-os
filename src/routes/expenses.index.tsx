import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card, Chip } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { DragHandle, DragSortList, type HandleProps } from "@/components/common/DragSortList";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea, NO_AUTOFILL_PROPS } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/schema";

export const Route = createFileRoute("/expenses/")({
  head: () => ({
    meta: [
      { title: "Expenses — SkillSync" },
      {
        name: "description",
        content: "Log credits and debits with descriptions, tags, search and manual ordering.",
      },
      { property: "og:title", content: "Expenses — SkillSync" },
      { property: "og:description", content: "Track money in and out, month by month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpensesPage,
});

const PRESET_TAGS = [
  "Travel",
  "Food",
  "Medical",
  "Education",
  "Bills",
  "Shopping",
  "Entertainment",
  "Personal",
  "Emergency",
  "Other",
];

const FILTERS = [
  "All",
  "Travel",
  "Food",
  "Medical",
  "Education",
  "Bills",
  "Shopping",
  "Entertainment",
  "Other",
];

function fmtMoney(n: number) {
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `₹${abs}`;
}

function monthKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function toDateInput(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fromDateInput(value: string, fallback: number) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return fallback;
  const prev = new Date(fallback);
  return new Date(y, m - 1, d, prev.getHours(), prev.getMinutes()).getTime();
}

function matchesFilter(t: Transaction, filter: string) {
  if (filter === "All") return true;
  const tags = (t.tags ?? []).map((x) => x.toLowerCase());
  if (filter === "Other") {
    return !tags.some((x) => FILTERS.slice(1, -1).some((f) => f.toLowerCase() === x));
  }
  return tags.includes(filter.toLowerCase());
}

function matchesQuery(t: Transaction, q: string) {
  if (!q) return true;
  const hay = [t.title, t.description ?? "", ...(t.tags ?? [])].join(" ").toLowerCase();
  return hay.includes(q);
}

/* ---------------------------------- Row ---------------------------------- */

type RowChrome = {
  dragging: boolean;
  sorting: boolean;
  setNodeRef: (el: HTMLDivElement | null) => void;
  rowProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    "data-sort-row": string;
  };
  handleProps: HandleProps;
};

function ExpenseRow({
  tx,
  onEdit,
  chrome,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  chrome: RowChrome;
}) {
  const credit = tx.type === "credit";
  const { dragging, sorting, setNodeRef, rowProps, handleProps } = chrome;
  return (
    <div
      ref={setNodeRef}
      {...rowProps}
      style={{
        // Declared up front so activating a drag never waits on a React render:
        // vertical panning stays available until the lift sets `touch-action`.
        touchAction: "pan-y",
      }}
      className={cn(
        "group/row relative flex items-start gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] py-3 pl-1.5 pr-3",
        "shadow-[0_1px_0_0_oklch(1_0_0/0.04)_inset] transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-out-soft)]",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:border-white/[0.1] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/[0.04]",
        dragging &&
          "border-[color-mix(in_oklab,var(--primary)_45%,transparent)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] shadow-[0_26px_50px_-22px_oklch(0_0_0/0.9)] ring-1 ring-[color-mix(in_oklab,var(--primary)_30%,transparent)]",
        sorting && !dragging && "opacity-80",
      )}
    >
      <DragHandle
        {...handleProps}
        active={dragging}
        className="mt-0.5 opacity-70 md:opacity-0 md:transition-opacity md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100"
      />

      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          credit
            ? "bg-emerald-400/15 text-emerald-300"
            : "bg-[var(--danger)]/15 text-[var(--danger)]",
        )}
        aria-hidden
      >
        {credit ? (
          <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <TrendingDown className="h-4 w-4" strokeWidth={1.75} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium">{tx.title}</div>
            {tx.description ? (
              <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
                {tx.description}
              </div>
            ) : null}
            {tx.tags?.length ? (
              <div className="mt-1 truncate text-[10.5px] uppercase tracking-[0.1em] text-primary/70">
                {tx.tags.join(" • ")}
              </div>
            ) : null}
            <div className="mt-1 text-[11px] text-muted-foreground">
              {new Date(tx.at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div
              className={cn(
                "text-[14px] font-semibold tabular-nums",
                credit ? "text-emerald-300" : "text-[var(--danger)]",
              )}
            >
              {credit ? "+" : "−"}
              {fmtMoney(tx.amount)}
            </div>
            <IconButton
              size="sm"
              aria-label={`Edit ${tx.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tx);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Drag list ------------------------------- */

/**
 * One month of transactions, reorderable.
 *
 * All of the pointer/keyboard/scroll machinery lives in `DragSortList`; this
 * wrapper only decides how a row looks and how a finished order is persisted.
 */
function TransactionList({
  items,
  onEdit,
  onReorder,
}: {
  items: Transaction[];
  onEdit: (tx: Transaction) => void;
  onReorder: (ids: string[]) => void;
}) {
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  return (
    <DragSortList
      items={items}
      className="gap-1.5"
      itemLabel={(tx) => tx.title}
      onReorder={(ids) => onReorderRef.current(ids)}
      renderItem={({ item, dragging, sorting, setNodeRef, rowProps, handleProps }) => (
        <ExpenseRow
          tx={item}
          onEdit={onEdit}
          chrome={{ dragging, sorting, setNodeRef, rowProps, handleProps }}
        />
      )}
    />
  );
}
/* -------------------------------- Tag input ------------------------------ */

function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [custom, setCustom] = useState("");
  const toggle = (tag: string) =>
    onChange(
      value.some((t) => t.toLowerCase() === tag.toLowerCase())
        ? value.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...value, tag],
    );
  const addCustom = () => {
    const tag = custom.trim();
    if (!tag) return;
    if (!value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setCustom("");
  };
  const extras = value.filter((t) => !PRESET_TAGS.some((p) => p.toLowerCase() === t.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {[...PRESET_TAGS, ...extras].map((tag) => {
          const on = value.some((t) => t.toLowerCase() === tag.toLowerCase());
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                on
                  ? "border-primary/40 bg-primary/15 text-foreground"
                  : "border-white/[0.07] bg-white/[0.02] text-muted-foreground",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <TextField
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Custom tag e.g. Hostel"
        />
        <ActionButton variant="outline" onClick={addCustom}>
          Add
        </ActionButton>
      </div>
    </div>
  );
}

/* ---------------------------------- Page --------------------------------- */

function ExpensesPage() {
  const hydrated = useHydrated();
  const enabled = useAppStore((s) => s.preferences.modules.expenses);
  const transactions = useAppStore((s) => s.expenses.transactions);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const setTransactionOrder = useAppStore((s) => s.setTransactionOrder);

  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("debit");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  /** Re-entrancy guard: rapid double taps must not create duplicate entries. */
  const addGuard = useRef(false);
  useEffect(() => {
    if (addOpen) addGuard.current = false;
  }, [addOpen]);

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    date: "",
    type: "debit" as "credit" | "debit",
    tags: [] as string[],
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  /**
   * Reordering is scoped: the dragged rows swap the positions they already own,
   * so a filtered month never scrambles the transactions hidden by the search.
   * The previous order is kept for a one-tap Undo.
   */
  const undoRef = useRef<string[] | null>(null);
  const handleReorder = useCallback(
    (group: Transaction[], ids: string[]) => {
      undoRef.current = group.map((t) => t.id);
      setTransactionOrder(ids);
      toast("Order updated", {
        description: "Drag the grip to rearrange — or focus it and use the arrow keys.",
        duration: 4200,
        action: {
          label: "Undo",
          onClick: () => {
            if (undoRef.current) {
              setTransactionOrder(undoRef.current);
              undoRef.current = null;
              haptics.selection();
              sound.select();
            }
          },
        },
      });
    },
    [setTransactionOrder],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = transactions.filter((t) => matchesQuery(t, q) && matchesFilter(t, filter));
    const byMonth = new Map<string, Transaction[]>();
    for (const t of visible) {
      const k = monthKey(t.at);
      const arr = byMonth.get(k) ?? [];
      arr.push(t);
      byMonth.set(k, arr);
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, list]) => {
        list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || b.at - a.at);
        let credit = 0;
        let debit = 0;
        for (const t of list) {
          if (t.type === "credit") credit += t.amount;
          else debit += t.amount;
        }
        return { key, label: monthLabel(key), list, credit, debit, balance: credit - debit };
      });
  }, [transactions, query, filter]);

  const submit = () => {
    if (addGuard.current) return;
    const value = Number(amount);
    if (!title.trim() || !value || value <= 0) {
      haptics.error();
      sound.error();
      toast.error("Add a title and a positive amount");
      return;
    }
    addGuard.current = true;
    haptics.success();
    sound.coin();
    addTransaction({ title: title.trim(), amount: value, type });
    setTitle("");
    setAmount("");
    setType("debit");
    setAddOpen(false);
  };

  const openEditor = useCallback((tx: Transaction) => {
    setEditing(tx);
    setForm({
      title: tx.title,
      description: tx.description ?? "",
      amount: String(tx.amount),
      date: toDateInput(tx.at),
      type: tx.type,
      tags: tx.tags ?? [],
    });
  }, []);

  const saveEdit = () => {
    if (!editing) return;
    const value = Number(form.amount);
    if (!form.title.trim() || !value || value <= 0) {
      haptics.error();
      sound.error();
      toast.error("Add a title and a positive amount");
      return;
    }
    updateTransaction(editing.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      amount: value,
      type: form.type,
      tags: form.tags,
      at: fromDateInput(form.date, editing.at),
    });
    setEditing(null);
    haptics.success();
    sound.success();
    toast.success("Expense updated");
  };

  if (hydrated && !enabled) {
    return <Navigate to="/profile/modules" />;
  }

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 lg:px-2 pt-1">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Money</div>
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">
            Expenses.
          </h1>
        </div>
        <PrimaryAction label="Add Expense" onClick={() => setAddOpen(true)} />
      </header>

      <div className="space-y-4 px-5 lg:px-2 pb-24">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
            strokeWidth={1.75}
          />
          <input
            {...NO_AUTOFILL_PROPS}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, description or tags"
            className="h-11 w-full rounded-[14px] border border-border bg-white/[0.03] pl-10 pr-10 text-[13.5px] outline-none placeholder:text-muted-foreground/60 focus:border-[color-mix(in_oklab,var(--primary)_45%,transparent)]"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => {
                if (filter !== f) {
                  haptics.selection();
                  sound.select();
                }
                setFilter(f);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
                filter === f
                  ? "border-primary/40 bg-primary/15 text-foreground"
                  : "border-white/[0.07] bg-white/[0.02] text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {hydrated && groups.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title={transactions.length === 0 ? "No transactions yet" : "No expenses found."}
            hint={
              transactions.length === 0
                ? "Log a credit or debit to start tracking."
                : "Try a different search or filter."
            }
            action={
              transactions.length === 0 ? (
                <ActionButton onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> Add transaction
                </ActionButton>
              ) : undefined
            }
          />
        ) : null}

        {groups.map((g) => (
          <section key={g.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 items-baseline gap-2">
                <h2 className="truncate text-[13px] font-semibold tracking-tight">{g.label}</h2>
                <span className="shrink-0 text-[11px] text-muted-foreground/70">
                  {g.list.length} {g.list.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <Chip tone={g.balance >= 0 ? "success" : "danger"}>
                {g.balance >= 0 ? "+" : "−"}
                {fmtMoney(g.balance)}
              </Chip>
            </div>
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Credit
                  </div>
                  <div className="mt-1 text-[15px] font-semibold tabular-nums text-emerald-300">
                    {fmtMoney(g.credit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Debit
                  </div>
                  <div className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--danger)]">
                    {fmtMoney(g.debit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Balance
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-[15px] font-semibold tabular-nums",
                      g.balance >= 0 ? "text-emerald-300" : "text-[var(--danger)]",
                    )}
                  >
                    {fmtMoney(g.balance)}
                  </div>
                </div>
              </div>
              {g.credit + g.debit > 0 ? (
                <div
                  className="mt-3.5 flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                  role="img"
                  aria-label={`Credit ${fmtMoney(g.credit)}, debit ${fmtMoney(g.debit)}`}
                >
                  <div
                    className="h-full rounded-l-full bg-emerald-400/80 transition-[width] duration-700 ease-[var(--ease-out-soft)]"
                    style={{ width: `${(g.credit / (g.credit + g.debit)) * 100}%` }}
                  />
                  <div
                    className="h-full rounded-r-full bg-[var(--danger)]/70 transition-[width] duration-700 ease-[var(--ease-out-soft)]"
                    style={{ width: `${(g.debit / (g.credit + g.debit)) * 100}%` }}
                  />
                </div>
              ) : null}
            </Card>
            <TransactionList
              items={g.list}
              onEdit={openEditor}
              onReorder={(ids) => handleReorder(g.list, ids)}
            />
          </section>
        ))}
      </div>

      {/* Add */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="New transaction">
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["debit", "credit"] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => setType(tp)}
                className={
                  "flex-1 rounded-xl border py-2.5 text-[13px] font-medium capitalize transition-colors " +
                  (type === tp
                    ? tp === "credit"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground")
                }
              >
                {tp}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Title</label>
            <TextField
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Groceries"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Amount</label>
            <TextField
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <ActionButton className="w-full" onClick={submit}>
            Save
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Edit */}
      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Expense"
        footer={
          <div className="flex gap-2">
            <ActionButton variant="outline" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </ActionButton>
            <ActionButton className="flex-1" onClick={saveEdit}>
              Save changes
            </ActionButton>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="flex gap-2">
            {(["debit", "credit"] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => setForm((f) => ({ ...f, type: tp }))}
                className={
                  "flex-1 rounded-xl border py-2.5 text-[13px] font-medium capitalize transition-colors " +
                  (form.type === tp
                    ? tp === "credit"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground")
                }
              >
                {tp}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Title</label>
            <TextField
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Train Ticket"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Description</label>
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Bus ticket from Salempur to Gorakhpur."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Amount</label>
              <TextField
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Date</label>
              <TextField
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Tags</label>
            <TagPicker value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-danger/25 py-3 text-[13px] font-medium text-danger"
          >
            <Trash2 className="h-4 w-4" /> Delete expense
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) {
            deleteTransaction(editing.id);
            haptics.impact();
            sound.trash();
            toast.success("Expense deleted");
          }
          setEditing(null);
        }}
        title="Delete this expense?"
        description="This removes the transaction from your local records."
      />
    </AppShell>
  );
}
