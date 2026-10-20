import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card, Chip } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { DragHandle, DragSortList, type HandleProps } from "@/components/common/DragSortList";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { expenseDateTimestamp, formatRupees, monthlySpendingPace } from "@/lib/expenses";
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
        "group/row relative flex items-start gap-2 rounded-[6px] border border-border bg-card py-3 pl-1.5 pr-3",
        "transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-out-soft)]",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:border-border-strong [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface",
        dragging &&
          "border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] shadow-[var(--shadow-float)]",
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
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          credit
            ? "border-success/25 bg-success/10 text-success"
            : "border-danger/25 bg-danger/10 text-danger",
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
            <div className="font-editorial truncate text-[16px] font-normal leading-tight tracking-[-0.015em] text-foreground">
              {tx.title}
            </div>
            {tx.description ? (
              <div className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {tx.description}
              </div>
            ) : null}
            {tx.tags?.length ? (
              <div className="font-numerical mt-1.5 truncate text-[8.5px] uppercase tracking-[0.1em] text-primary">
                {tx.tags.join(" / ")}
              </div>
            ) : null}
            <div className="font-numerical mt-1.5 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
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
                "font-numerical text-[13px] font-semibold tracking-[-0.04em] tabular-nums",
                credit ? "text-success" : "text-danger",
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
                "font-numerical min-h-9 rounded-[4px] border px-2.5 py-1.5 text-[9px] uppercase tracking-[0.06em] transition-colors",
                on
                  ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-primary-glow"
                  : "border-border bg-background text-muted-foreground hover:border-border-strong",
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
  const monthlyBudget = useAppStore((s) => s.expenses.monthlyBudget);
  const setMonthlyExpenseBudget = useAppStore((s) => s.setMonthlyExpenseBudget);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const setTransactionOrder = useAppStore((s) => s.setTransactionOrder);

  const [addOpen, setAddOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => toDateInput(Date.now()));
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

  const pace = monthlySpendingPace(transactions, monthlyBudget);
  const paceLabel = !pace
    ? "Set a monthly budget to see your daily pace."
    : pace.remaining < 0
      ? `${formatRupees(Math.abs(pace.remaining))} over budget this month`
      : `${formatRupees(pace.perDay)}/day remaining for the next ${pace.daysRemaining} days`;

  const saveBudget = () => {
    const value = budgetDraft.trim() === "" ? 0 : Number(budgetDraft);
    if (!Number.isFinite(value) || value < 0) {
      haptics.error();
      sound.error();
      toast.error("Enter a valid monthly budget");
      return;
    }
    setMonthlyExpenseBudget(value);
    setBudgetOpen(false);
    haptics.success();
    sound.success();
  };

  const openAdd = () => {
    // A fresh sheet should always begin on the current local calendar date.
    setExpenseDate(toDateInput(Date.now()));
    setAddOpen(true);
  };

  const submit = () => {
    if (addGuard.current) return;
    const value = Number(amount);
    const at = expenseDateTimestamp(expenseDate);
    if (!title.trim() || !value || value <= 0 || at === null) {
      haptics.error();
      sound.error();
      toast.error("Add a title, a positive amount, and an expense date");
      return;
    }
    addGuard.current = true;
    haptics.success();
    sound.coin();
    addTransaction({ title: title.trim(), amount: value, type, at });
    setTitle("");
    setAmount("");
    setExpenseDate(toDateInput(Date.now()));
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
      at: expenseDateTimestamp(form.date, editing.at) ?? editing.at,
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
      <PageHeader
        eyebrow={
          <Link to="/profile" className="page-back-link" aria-label="Back to profile">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="truncate">Money / personal ledger</span>
          </Link>
        }
        title="Expenses."
        subtitle="A clear, local record of what comes in, what goes out, and when it happened."
        right={<PrimaryAction label="Add Expense" onClick={openAdd} />}
      />

      <div className="space-y-4 px-5 pb-24 lg:px-2">
        <div className="card-surface flex items-center gap-3 border-l-primary px-4 py-3.5 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_9%,var(--surface))] text-primary-glow">
            <TrendingDown className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1" role="status" aria-live="polite">
            <div className="font-numerical text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Monthly spending pace
            </div>
            <div
              title={paceLabel}
              className={cn(
                "font-editorial mt-0.5 truncate text-[15px] tracking-[-0.015em]",
                pace && pace.remaining < 0 ? "text-danger" : "text-foreground",
              )}
            >
              {paceLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setBudgetDraft(monthlyBudget > 0 ? String(monthlyBudget) : "");
              setBudgetOpen(true);
            }}
            className="font-numerical pressable min-h-10 shrink-0 rounded-[4px] border border-border-strong px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary-glow transition-colors hover:bg-surface-2"
          >
            {monthlyBudget > 0 ? "Edit budget" : "Set budget"}
          </button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
            strokeWidth={1.75}
          />
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, description or tags"
            aria-label="Search expenses"
            className="pl-10 pr-10"
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
                "font-numerical min-h-10 shrink-0 rounded-[4px] border px-3 py-2 text-[9px] font-medium uppercase tracking-[0.08em] transition-colors",
                filter === f
                  ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-primary-glow"
                  : "border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground",
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
                <ActionButton onClick={openAdd}>
                  <Plus className="h-4 w-4" /> Add transaction
                </ActionButton>
              ) : undefined
            }
          />
        ) : null}

        {groups.map((g) => (
          <section key={g.key} className="space-y-3">
            <div className="flex items-end justify-between gap-3 border-b border-border px-1 pb-2.5">
              <div className="flex min-w-0 items-baseline gap-2.5">
                <h2 className="font-editorial truncate text-[22px] font-normal leading-none tracking-[-0.03em] text-foreground">
                  {g.label}
                </h2>
                <span className="font-numerical shrink-0 text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  {g.list.length} {g.list.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <Chip tone={g.balance >= 0 ? "success" : "danger"}>
                {g.balance >= 0 ? "+" : "−"}
                {fmtMoney(g.balance)}
              </Chip>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="grid grid-cols-3 text-center">
                <div className="border-r border-border px-2 py-3.5">
                  <div className="font-numerical text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    Credit
                  </div>
                  <div className="font-numerical mt-1.5 text-[14px] font-semibold tracking-[-0.04em] text-success">
                    {fmtMoney(g.credit)}
                  </div>
                </div>
                <div className="border-r border-border px-2 py-3.5">
                  <div className="font-numerical text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    Debit
                  </div>
                  <div className="font-numerical mt-1.5 text-[14px] font-semibold tracking-[-0.04em] text-danger">
                    {fmtMoney(g.debit)}
                  </div>
                </div>
                <div className="px-2 py-3.5">
                  <div className="font-numerical text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    Balance
                  </div>
                  <div
                    className={cn(
                      "font-numerical mt-1.5 text-[14px] font-semibold tracking-[-0.04em]",
                      g.balance >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {fmtMoney(g.balance)}
                  </div>
                </div>
              </div>
              {g.credit + g.debit > 0 ? (
                <div
                  className="flex h-1 w-full overflow-hidden bg-border"
                  role="img"
                  aria-label={`Credit ${fmtMoney(g.credit)}, debit ${fmtMoney(g.debit)}`}
                >
                  <div
                    className="h-full bg-success transition-[width] duration-700 ease-[var(--ease-out-soft)]"
                    style={{ width: `${(g.credit / (g.credit + g.debit)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-danger/80 transition-[width] duration-700 ease-[var(--ease-out-soft)]"
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
                  "font-numerical min-h-11 flex-1 rounded-[5px] border py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors " +
                  (type === tp
                    ? tp === "credit"
                      ? "border-success/35 bg-success/10 text-success"
                      : "border-danger/35 bg-danger/10 text-danger"
                    : "border-border bg-background text-muted-foreground")
                }
              >
                {tp}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Title
            </label>
            <TextField
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Groceries"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Amount
              </span>
              <TextField
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Date of expense
              </span>
              <TextField
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </label>
          </div>
          <ActionButton className="w-full" onClick={submit}>
            Save
          </ActionButton>
        </div>
      </BottomSheet>

      <BottomSheet
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Monthly spending budget"
        description="Set a monthly cap to see your safe daily pace. Set 0 to clear it."
      >
        <div className="space-y-3 pb-2">
          <label className="block space-y-1.5">
            <span className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Budget · ₹
            </span>
            <TextField
              autoFocus
              type="number"
              inputMode="decimal"
              min="0"
              value={budgetDraft}
              onChange={(event) => setBudgetDraft(event.target.value)}
              placeholder="e.g. 12000"
            />
          </label>
          <ActionButton className="w-full" onClick={saveBudget}>
            Save monthly budget
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
                  "font-numerical min-h-11 flex-1 rounded-[5px] border py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors " +
                  (form.type === tp
                    ? tp === "credit"
                      ? "border-success/35 bg-success/10 text-success"
                      : "border-danger/35 bg-danger/10 text-danger"
                    : "border-border bg-background text-muted-foreground")
                }
              >
                {tp}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Title
            </label>
            <TextField
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Train Ticket"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Description
            </label>
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Bus ticket from Salempur to Gorakhpur."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Amount
              </label>
              <TextField
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Date
              </label>
              <TextField
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Tags
            </label>
            <TagPicker value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="font-numerical pressable flex w-full items-center justify-center gap-2 rounded-[5px] border border-danger/30 bg-danger/5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-danger transition-colors hover:bg-danger/10"
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
