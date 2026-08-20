import React, { useMemo, useState } from "react";
import { Paperclip, Plus, Wallet } from "lucide-react";
import type { Expense, ExpenseCat, PayMethod } from "../lib/types";
import { EXPENSE_META, PAY_METHOD_META } from "../lib/types";
import { balanceOf, paidOf, payStateOf, payableBalance, PAYSTATE_META, useStore } from "../lib/store";
import { fmtDate, fmtIDR, fmtIDRShort, isThisMonth, toDateInput, fromDateInput } from "../lib/format";
import { Btn, Chip, Field, Input, Modal, PageHead, PayPill, SearchInput, Select, THead, TR, TD, Textarea, Tabs, useToast, Empty } from "../components/ui";
import { PayModal } from "./Orders";

export default function Finance() {
  const { db, nav, recordPayment, paySupplier } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState(nav.tab || "ar");
  const [q, setQ] = useState("");
  const [payOrder, setPayOrder] = useState<string | null>(null);
  const [payAp, setPayAp] = useState<string | null>(null);
  const [expModal, setExpModal] = useState(false);

  const arRows = useMemo(() => db.orders
    .filter((o) => o.status !== "cancelled" && balanceOf(db, o) > 0)
    .filter((o) => {
      const c = db.customers.find((x) => x.id === o.customerId);
      return !q || (o.number + o.invoiceNo + (c?.name || "")).toLowerCase().includes(q.toLowerCase());
    })
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0)), [db, q]);

  const arTotal = arRows.reduce((a, b) => a + balanceOf(db, b), 0);
  const apRows = db.payables.filter((a) => payableBalance(a) > 0 || a.payments.length > 0);
  const apTotal = apRows.reduce((a, b) => a + payableBalance(b), 0);
  const expMonth = db.expenses.filter((e) => isThisMonth(e.date)).reduce((a, b) => a + b.amount, 0);

  const po = db.orders.find((o) => o.id === payOrder) || null;
  const ap = db.payables.find((a) => a.id === payAp) || null;

  return (
    <div>
      <PageHead title="Piutang, Hutang & Pengeluaran" desc="Kelola arus kewajiban dan biaya operasional">
        <Chip color="#b45309">Piutang {fmtIDRShort(arTotal)}</Chip>
        <Chip color="#d33131">Hutang {fmtIDRShort(apTotal)}</Chip>
        <Chip color="#475569">Pengeluaran bulan ini {fmtIDRShort(expMonth)}</Chip>
      </PageHead>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "ar", label: "Piutang (AR)", badge: arRows.length },
        { id: "ap", label: "Hutang (AP)", badge: apRows.filter((a) => payableBalance(a) > 0).length },
        { id: "exp", label: "Pengeluaran", badge: db.expenses.length },
      ]} />

      {tab === "ar" && (
        <div className="card anim-in overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <SearchInput value={q} onChange={setQ} placeholder="Cari invoice / pelanggan…" className="w-64" />
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <THead cols={["Invoice", "Pelanggan", "Tgl Order", "Jatuh Tempo", "Total", "Terbayar", "Sisa", "Status", ""]} />
              <tbody>
                {arRows.map((o) => {
                  const c = db.customers.find((x) => x.id === o.customerId);
                  const bal = balanceOf(db, o);
                  const ps = payStateOf(db, o);
                  return (
                    <TR key={o.id}>
                      <TD><p className="font-display text-[12.5px] font-bold">{o.invoiceNo}</p><p className="text-[10.5px] text-faint">{o.number}</p></TD>
                      <TD className="font-semibold">{c?.name}</TD>
                      <TD className="whitespace-nowrap text-muted">{fmtDate(o.createdAt)}</TD>
                      <TD className={`whitespace-nowrap font-semibold ${ps === "overdue" ? "text-danger" : "text-muted"}`}>{o.dueDate ? fmtDate(o.dueDate) : "—"}</TD>
                      <TD className="tabular font-bold">{fmtIDR(o.total)}</TD>
                      <TD className="tabular text-ok">{fmtIDR(paidOf(db, o.id))}</TD>
                      <TD className="tabular font-bold text-warn">{fmtIDR(bal)}</TD>
                      <TD><PayPill state={ps} /></TD>
                      <TD><Btn size="sm" onClick={() => setPayOrder(o.id)}><Wallet size={12} /> Bayar</Btn></TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
            {arRows.length === 0 && <Empty title="Tidak ada piutang" desc="Semua invoice sudah lunas. Kerja bagus!" />}
          </div>
        </div>
      )}

      {tab === "ap" && (
        <div className="card anim-in overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <THead cols={["Invoice Supplier", "Supplier", "No. PO", "Jatuh Tempo", "Jumlah", "Terbayar", "Sisa", "Status", ""]} />
              <tbody>
                {apRows.map((a) => {
                  const sp = db.suppliers.find((s) => s.id === a.supplierId);
                  const po2 = db.purchases.find((p) => p.id === a.purchaseId);
                  const bal = payableBalance(a);
                  const overdue = bal > 0 && a.dueDate < Date.now();
                  return (
                    <TR key={a.id}>
                      <TD className="font-display text-[12.5px] font-bold">{a.invoiceNo}</TD>
                      <TD className="font-semibold">{sp?.name}</TD>
                      <TD className="text-muted">{po2?.number || "—"}</TD>
                      <TD className={`whitespace-nowrap font-semibold ${overdue ? "text-danger" : "text-muted"}`}>{fmtDate(a.dueDate)}</TD>
                      <TD className="tabular font-bold">{fmtIDR(a.amount)}</TD>
                      <TD className="tabular text-ok">{fmtIDR(a.payments.reduce((x, y) => x + y.amount, 0))}</TD>
                      <TD className="tabular font-bold">{fmtIDR(bal)}</TD>
                      <TD>{bal <= 0 ? <Chip color="#178a4c">Lunas</Chip> : overdue ? <Chip color="#d33131" pulse>Jatuh Tempo</Chip> : a.payments.length > 0 ? <Chip color="#b45309">Sebagian</Chip> : <Chip color="#64748b">Belum Bayar</Chip>}</TD>
                      <TD>{bal > 0 && <Btn size="sm" variant="outline" onClick={() => setPayAp(a.id)}><Wallet size={12} /> Bayar</Btn>}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
            {apRows.length === 0 && <Empty title="Belum ada hutang supplier" desc="Terima PO di halaman Supplier untuk mencatat hutang." />}
          </div>
        </div>
      )}

      {tab === "exp" && <ExpenseTab onAdd={() => setExpModal(true)} />}

      {po && (
        <PayModal order={po} onClose={() => setPayOrder(null)} onSave={(amount, method, ref) => {
          recordPayment(po.id, amount, method, ref);
          setPayOrder(null);
          toast.push({ title: "Pembayaran piutang tercatat", desc: `${fmtIDR(amount)} · ${po.number}`, kind: "ok" });
        }} />
      )}
      {ap && <ApPayModal balance={payableBalance(ap)} invoice={ap.invoiceNo} onClose={() => setPayAp(null)}
        onSave={(amount, method) => {
          paySupplier(ap.id, amount, method);
          setPayAp(null);
          toast.push({ title: "Pembayaran supplier tercatat", desc: `${fmtIDR(amount)} · ${ap.invoiceNo}`, kind: "ok" });
        }} />}
      {expModal && <ExpenseModal onClose={() => setExpModal(false)} />}
    </div>
  );
}

function ApPayModal({ balance, invoice, onClose, onSave }: { balance: number; invoice: string; onClose: () => void; onSave: (amount: number, method: PayMethod) => void }) {
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState<PayMethod>("transfer");
  return (
    <Modal open onClose={onClose} title={`Bayar Supplier · ${invoice}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn>
        <Btn disabled={amount <= 0 || amount > balance} onClick={() => onSave(amount, method)}>Simpan Pembayaran</Btn></>}>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] font-bold text-danger">
          <span>Sisa hutang</span><span className="tabular">{fmtIDR(balance)}</span>
        </div>
        <Field label="Jumlah Bayar"><Input autoFocus type="number" min={0} max={balance} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></Field>
        <Field label="Metode">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PAY_METHOD_META) as PayMethod[]).map((mm) => (
              <button key={mm} onClick={() => setMethod(mm)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all ${method === mm ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:border-line2"}`}>
                {PAY_METHOD_META[mm]}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function ExpenseTab({ onAdd }: { onAdd: () => void }) {
  const { db } = useStore();
  const [cat, setCat] = useState("semua");
  const rows = db.expenses.filter((e) => cat === "semua" || e.category === cat);
  const byCat = (Object.keys(EXPENSE_META) as ExpenseCat[]).map((c) => ({
    c, total: db.expenses.filter((e) => e.category === c && isThisMonth(e.date)).reduce((a, b) => a + b.amount, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...byCat.map((x) => x.total));

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <div className="card anim-in overflow-hidden xl:col-span-2">
        <div className="flex items-center justify-between px-4 pt-3">
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-52">
            <option value="semua">Semua kategori</option>
            {Object.entries(EXPENSE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Btn onClick={onAdd}><Plus size={14} /> Catat Pengeluaran</Btn>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <THead cols={["Tanggal", "Kategori", "Deskripsi", "Metode", "Oleh", "Jumlah"]} />
            <tbody>
              {rows.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap text-muted">{fmtDate(e.date)}</TD>
                  <TD><Chip color="#475569">{EXPENSE_META[e.category].label}</Chip></TD>
                  <TD className="max-w-[220px]">
                    <span className="flex items-center gap-1.5 truncate font-semibold">{e.desc}{e.receiptName && <Paperclip size={11} className="shrink-0 text-faint" />}</span>
                  </TD>
                  <TD className="text-muted">{PAY_METHOD_META[e.method]}</TD>
                  <TD className="text-muted">{db.users.find((u) => u.id === e.userId)?.name || "—"}</TD>
                  <TD className="tabular font-bold text-danger">−{fmtIDR(e.amount)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty title="Belum ada pengeluaran" desc="Catat pengeluaran operasional pertama Anda." />}
        </div>
      </div>
      <div className="card anim-in h-fit p-4">
        <h4 className="font-display text-[14px] font-bold">Pengeluaran Bulan Ini</h4>
        <p className="mb-3 text-[11.5px] text-muted">Per kategori</p>
        <div className="space-y-2.5">
          {byCat.map(({ c, total }) => (
            <div key={c}>
              <div className="mb-1 flex justify-between text-[11.5px] font-semibold">
                <span className="text-muted">{EXPENSE_META[c].label}</span>
                <span className="tabular">{fmtIDRShort(total)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-warn transition-all duration-500" style={{ width: `${(total / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
          {byCat.length === 0 && <p className="text-[12px] text-faint">Belum ada pengeluaran bulan ini.</p>}
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({ onClose }: { onClose: () => void }) {
  const { db, addExpense, user } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [category, setCategory] = useState<ExpenseCat>("bahan");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [desc, setDesc] = useState("");
  const [receipt, setReceipt] = useState<string | undefined>(undefined);

  const save = () => {
    if (amount <= 0) { toast.push({ title: "Jumlah harus lebih dari 0", kind: "warn" }); return; }
    if (!desc.trim()) { toast.push({ title: "Deskripsi wajib diisi", kind: "warn" }); return; }
    addExpense({ date: fromDateInput(date) + 12 * 3600_000, category, amount, method, desc: desc.trim(), userId: user?.id || "u1", receiptName: receipt });
    toast.push({ title: "Pengeluaran tercatat", desc: `${EXPENSE_META[category].label} · ${fmtIDR(amount)}`, kind: "ok" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Catat Pengeluaran"
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save} variant="danger">Simpan · {fmtIDR(amount)}</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Tanggal"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Kategori">
            <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCat)}>
              {Object.entries(EXPENSE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Jumlah (Rp)"><Input autoFocus type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></Field>
          <Field label="Metode Bayar">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              {Object.entries(PAY_METHOD_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Deskripsi *"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="mis. Token listrik PLN prabayar" /></Field>
        <Field label="Bukti / Nota">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line2 py-2.5 text-[12px] font-bold text-muted hover:border-brand hover:text-brand">
            <Paperclip size={13} /> {receipt || "Lampirkan file nota (jpg/pdf)"}
            <input type="file" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0]?.name)} />
          </label>
        </Field>
        <p className="text-[11px] text-faint">Otomatis dijurnal ke akun beban {EXPENSE_META[category].acc} · dicatat atas nama {db.users.find((u) => u.id === user?.id)?.name}.</p>
      </div>
    </Modal>
  );
}
