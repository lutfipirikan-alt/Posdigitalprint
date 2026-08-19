import React, { useMemo, useState } from "react";
import { Download, FileBarChart2, Printer } from "lucide-react";
import { balanceOf, orderCost, payStateOf, payableBalance, useStore } from "../lib/store";
import { dayKey, downloadCSV, fmtDate, fmtIDR, fmtIDRShort, fromDateInput, toDateInput } from "../lib/format";
import { Btn, Field, Input, Logo, PageHead, Select, useToast } from "../components/ui";
import { EXPENSE_META, PAY_METHOD_META, STATUS_META } from "../lib/types";

type RType = "salesDaily" | "salesMonthly" | "byProduct" | "byCustomer" | "byEmployee" | "pl" | "cashflow" | "expenses" | "ar" | "ap" | "inventory" | "topProducts" | "production";

const REPORTS: { id: RType; label: string; desc: string }[] = [
  { id: "salesDaily", label: "Penjualan Harian", desc: "Omzet per hari dalam rentang tanggal" },
  { id: "salesMonthly", label: "Penjualan Bulanan", desc: "Omzet & laba per bulan" },
  { id: "byProduct", label: "Penjualan per Produk", desc: "Produk terjual, qty & omzet" },
  { id: "byCustomer", label: "Penjualan per Pelanggan", desc: "Kontribusi tiap pelanggan" },
  { id: "byEmployee", label: "Penjualan per Kasir", desc: "Kinerja kasir pembuat order" },
  { id: "pl", label: "Laba Rugi", desc: "Omzet, HPP, beban, laba bersih" },
  { id: "cashflow", label: "Arus Kas", desc: "Kas masuk & keluar per hari" },
  { id: "expenses", label: "Pengeluaran", desc: "Rincian beban per kategori" },
  { id: "ar", label: "Piutang (Aging)", desc: "Invoice belum lunas & umur piutang" },
  { id: "ap", label: "Hutang Supplier", desc: "Kewajiban ke supplier" },
  { id: "inventory", label: "Nilai Inventori", desc: "Stok, harga beli & nilai bahan" },
  { id: "topProducts", label: "Produk Terlaris", desc: "Peringkat produk berdasarkan omzet" },
  { id: "production", label: "Kinerja Produksi", desc: "Waktu proses & beban per PIC" },
];

export default function Reports() {
  const { db, user } = useStore();
  const toast = useToast();
  const [type, setType] = useState<RType>("salesDaily");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return toDateInput(d.getTime()); });
  const [to, setTo] = useState(toDateInput(Date.now()));
  const [custF, setCustF] = useState("semua");
  const [prodF, setProdF] = useState("semua");

  const fromTs = fromDateInput(from);
  const toTs = fromDateInput(to) + 24 * 3600_000 - 1;

  const report = useMemo(() => build(type, { db, fromTs, toTs, custF, prodF }), [type, db, fromTs, toTs, custF, prodF]);
  const showCust = ["salesDaily", "salesMonthly", "byProduct", "pl", "topProducts"].includes(type);
  const showProd = ["byCustomer", "salesDaily", "salesMonthly", "byEmployee"].includes(type);

  const exportCsv = () => {
    downloadCSV(`saniprint-${type}-${from}-sd-${to}.csv`, [report.columns, ...report.rows]);
    toast.push({ title: "CSV diunduh", desc: `${report.rows.length} baris data`, kind: "ok" });
  };

  return (
    <div>
      <PageHead title="Laporan" desc="Semua laporan dapat difilter, dicetak, dan diekspor ke CSV/Excel" />
      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <div className="card anim-in h-fit overflow-hidden p-1.5">
          {REPORTS.map((r) => (
            <button key={r.id} onClick={() => setType(r.id)}
              className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${type === r.id ? "bg-brand-soft" : "hover:bg-surface2"}`}>
              <FileBarChart2 size={14} className={`mt-0.5 shrink-0 ${type === r.id ? "text-brand" : "text-faint"}`} />
              <span>
                <span className={`block text-[12.5px] font-bold leading-tight ${type === r.id ? "text-brand" : ""}`}>{r.label}</span>
                <span className="block text-[10.5px] leading-snug text-faint">{r.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0">
          <div className="card anim-in mb-3 flex flex-wrap items-end gap-2.5 p-3.5">
            <Field label="Dari Tanggal"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Sampai"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            {showCust && (
              <Field label="Pelanggan">
                <Select value={custF} onChange={(e) => setCustF(e.target.value)} className="w-48">
                  <option value="semua">Semua pelanggan</option>
                  {db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
            {showProd && (
              <Field label="Produk">
                <Select value={prodF} onChange={(e) => setProdF(e.target.value)} className="w-48">
                  <option value="semua">Semua produk</option>
                  {db.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            )}
            <div className="ml-auto flex gap-2">
              <Btn variant="outline" onClick={exportCsv}><Download size={14} /> CSV / Excel</Btn>
              <Btn onClick={() => window.print()}><Printer size={14} /> Cetak / PDF</Btn>
            </div>
          </div>

          <div className="card anim-in overflow-hidden">
            <div className="print-area">
              <div className="hidden items-center justify-between border-b-4 border-[#16181d] px-5 py-4 print:flex">
                <Logo size={34} />
                <div className="text-right">
                  <p className="font-display text-[16px] font-bold">{report.title}</p>
                  <p className="text-[11px] text-muted">Periode {fmtDate(fromTs)} – {fmtDate(toTs)} · dibuat oleh {user?.name}</p>
                </div>
              </div>
              <p className="border-b border-line px-4 py-2.5 font-display text-[13.5px] font-bold print:hidden">{report.title} <span className="text-faint">· {report.rows.length} baris</span></p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {report.columns.map((c, i) => (
                        <th key={i} className={`whitespace-nowrap px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-faint first:pl-4 last:pr-4 ${report.right?.includes(i) ? "text-right" : ""}`}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r, i) => (
                      <tr key={i} className="border-b border-line/60 last:border-0">
                        {r.map((cell, j) => (
                          <td key={j} className={`px-3 py-2 text-[12.5px] first:pl-4 last:pr-4 ${report.right?.includes(j) ? "tabular text-right" : ""} ${report.bold?.includes(i) ? "font-bold" : ""}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.rows.length === 0 && <p className="py-12 text-center text-[13px] text-faint">Tidak ada data pada rentang/filter ini.</p>}
              </div>
              {report.summary && (
                <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                  {report.summary.map(([k, v], i) => (
                    <span key={i} className="rounded-lg bg-surface2 px-3 py-1.5 text-[11.5px] font-semibold text-muted">{k}: <b className="tabular text-ink">{v}</b></span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- report builder ---------- */
function build(type: RType, ctx: { db: ReturnType<typeof useStore>["db"]; fromTs: number; toTs: number; custF: string; prodF: string }): {
  title: string; columns: string[]; rows: (string | number)[][]; right?: number[]; bold?: number[]; summary?: [string, string][];
} {
  const { db, fromTs, toTs, custF, prodF } = ctx;
  const inR = (ts: number) => ts >= fromTs && ts <= toTs;
  const custName = (id: string) => db.customers.find((c) => c.id === id)?.name || "—";
  const active = db.orders.filter((o) => o.status !== "cancelled");
  const orders = active.filter((o) => inR(o.createdAt) && (custF === "semua" || o.customerId === custF) && (prodF === "semua" || o.items.some((i) => i.productId === prodF)));

  switch (type) {
    case "salesDaily": {
      const map = new Map<string, { n: number; v: number; c: number }>();
      orders.forEach((o) => {
        const k = dayKey(o.createdAt);
        const e = map.get(k) || { n: 0, v: 0, c: 0 };
        e.n++; e.v += o.total; e.c += orderCost(db, o);
        map.set(k, e);
      });
      const rows = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
        .map(([k, e]) => [`${k.slice(6, 8)}/${k.slice(4, 6)}/${k.slice(0, 4)}`, e.n, fmtIDR(e.v), fmtIDR(e.c), fmtIDR(e.v - e.c)]);
      const tot = orders.reduce((a, b) => a + b.total, 0);
      return { title: "Laporan Penjualan Harian", columns: ["Tanggal", "Order", "Omzet", "HPP", "Laba Kotor"], rows, right: [1, 2, 3, 4], summary: [["Total Omzet", fmtIDR(tot)], ["Jumlah Order", String(orders.length)]] };
    }
    case "salesMonthly": {
      const map = new Map<string, { n: number; v: number; c: number; e: number }>();
      orders.forEach((o) => {
        const d = new Date(o.createdAt);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const e = map.get(k) || { n: 0, v: 0, c: 0, e: 0 };
        e.n++; e.v += o.total; e.c += orderCost(db, o);
        map.set(k, e);
      });
      db.expenses.filter((e) => inR(e.date)).forEach((e) => {
        const d = new Date(e.date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const x = map.get(k) || { n: 0, v: 0, c: 0, e: 0 };
        x.e += e.amount; map.set(k, x);
      });
      const rows = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
        .map(([k, e]) => [k, e.n, fmtIDR(e.v), fmtIDR(e.c + e.e), fmtIDR(e.v - e.c - e.e)]);
      return { title: "Laporan Penjualan Bulanan", columns: ["Bulan", "Order", "Omzet", "Biaya", "Laba Bersih"], rows, right: [1, 2, 3, 4] };
    }
    case "byProduct": case "topProducts": {
      const map = new Map<string, { qty: number; v: number; n: number }>();
      orders.forEach((o) => o.items.forEach((it) => {
        if (prodF !== "semua" && it.productId !== prodF) return;
        const e = map.get(it.productId) || { qty: 0, v: 0, n: 0 };
        e.qty += it.qty; e.v += it.total; e.n++;
        map.set(it.productId, e);
      }));
      let rows = Array.from(map.entries()).map(([pid, e]) => {
        const p = db.products.find((x) => x.id === pid);
        return [p?.sku || "?", p?.name || "Produk terhapus", e.n, `${e.qty} ${p?.unit || ""}`, fmtIDR(e.v)] as (string | number)[];
      }).sort((a, b) => Number(String(b[4]).replace(/[^\d]/g, "")) - Number(String(a[4]).replace(/[^\d]/g, "")));
      if (type === "topProducts") rows = rows.slice(0, 10).map((r, i) => [i + 1, ...r]);
      return {
        title: type === "topProducts" ? "10 Produk Terlaris" : "Penjualan per Produk",
        columns: type === "topProducts" ? ["#", "SKU", "Produk", "Order", "Qty", "Omzet"] : ["SKU", "Produk", "Order", "Qty", "Omzet"],
        rows, right: type === "topProducts" ? [0, 3, 4, 5] : [2, 3, 4],
      };
    }
    case "byCustomer": {
      const map = new Map<string, { n: number; v: number; bal: number }>();
      active.filter((o) => inR(o.createdAt)).forEach((o) => {
        const e = map.get(o.customerId) || { n: 0, v: 0, bal: 0 };
        e.n++; e.v += o.total; e.bal += Math.max(0, balanceOf(db, o));
        map.set(o.customerId, e);
      });
      const rows = Array.from(map.entries()).map(([cid, e]) => [custName(cid), e.n, fmtIDR(e.v), fmtIDR(e.bal)])
        .sort((a, b) => Number(String(b[2]).replace(/[^\d]/g, "")) - Number(String(a[2]).replace(/[^\d]/g, "")));
      return { title: "Penjualan per Pelanggan", columns: ["Pelanggan", "Order", "Omzet", "Piutang"], rows, right: [1, 2, 3] };
    }
    case "byEmployee": {
      const map = new Map<string, { n: number; v: number }>();
      orders.forEach((o) => {
        const e = map.get(o.userId) || { n: 0, v: 0 };
        e.n++; e.v += o.total; map.set(o.userId, e);
      });
      const rows = Array.from(map.entries()).map(([uid2, e]) => [db.users.find((u) => u.id === uid2)?.name || "?", e.n, fmtIDR(e.v), fmtIDR(e.v / Math.max(1, e.n))]);
      return { title: "Penjualan per Kasir", columns: ["Kasir", "Order", "Omzet", "Rata-rata/Order"], rows, right: [1, 2, 3] };
    }
    case "pl": {
      const omzet = orders.reduce((a, b) => a + b.total, 0);
      const hpp = orders.reduce((a, b) => a + orderCost(db, b), 0);
      const exp = db.expenses.filter((e) => inR(e.date));
      const expTot = exp.reduce((a, b) => a + b.amount, 0);
      const rows: (string | number)[][] = [
        ["Pendapatan (penjualan)", "", fmtIDR(omzet)],
        ["HPP bahan & produksi", "", `(${fmtIDR(hpp)})`],
        ["Laba Kotor", "", fmtIDR(omzet - hpp)],
      ];
      (Object.keys(EXPENSE_META) as (keyof typeof EXPENSE_META)[]).forEach((c) => {
        const t = exp.filter((e) => e.category === c).reduce((a, b) => a + b.amount, 0);
        if (t > 0) rows.push([`Beban ${EXPENSE_META[c].label}`, "", `(${fmtIDR(t)})`]);
      });
      rows.push(["LABA BERSIH", "", fmtIDR(omzet - hpp - expTot)]);
      return { title: "Laporan Laba Rugi", columns: ["Pos", "", "Jumlah"], rows, right: [2], bold: [rows.length - 1], summary: [["Marjin Bersih", omzet > 0 ? (((omzet - hpp - expTot) / omzet) * 100).toFixed(1) + "%" : "—"]] };
    }
    case "cashflow": {
      const map = new Map<string, { in: number; out: number }>();
      const put = (ts: number, dir: "in" | "out", amt: number) => {
        const k = dayKey(ts);
        const e = map.get(k) || { in: 0, out: 0 };
        e[dir] += amt; map.set(k, e);
      };
      db.payments.filter((p) => inR(p.date)).forEach((p) => put(p.date, "in", p.amount));
      db.expenses.filter((e) => inR(e.date)).forEach((e) => put(e.date, "out", e.amount));
      db.payables.flatMap((a) => a.payments).filter((p) => inR(p.date)).forEach((p) => put(p.date, "out", p.amount));
      const rows = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
        .map(([k, e]) => [`${k.slice(6, 8)}/${k.slice(4, 6)}`, fmtIDR(e.in), fmtIDR(e.out), fmtIDR(e.in - e.out)]);
      return { title: "Laporan Arus Kas", columns: ["Tanggal", "Kas Masuk", "Kas Keluar", "Netto"], rows, right: [1, 2, 3] };
    }
    case "expenses": {
      const rows = db.expenses.filter((e) => inR(e.date)).map((e) => [fmtDate(e.date), EXPENSE_META[e.category].label, e.desc, PAY_METHOD_META[e.method], fmtIDR(e.amount)]);
      const tot = db.expenses.filter((e) => inR(e.date)).reduce((a, b) => a + b.amount, 0);
      return { title: "Laporan Pengeluaran", columns: ["Tanggal", "Kategori", "Deskripsi", "Metode", "Jumlah"], rows, right: [4], summary: [["Total", fmtIDR(tot)]] };
    }
    case "ar": {
      const rows = active.filter((o) => balanceOf(db, o) > 0).map((o) => {
        const age = Math.max(0, Math.floor((Date.now() - o.createdAt) / 86_400_000));
        const ps = payStateOf(db, o);
        return [o.invoiceNo, custName(o.customerId), fmtDate(o.createdAt), `${age} hari`, fmtIDR(o.total), fmtIDR(balanceOf(db, o)), ps === "overdue" ? "JATUH TEMPO" : "Berjalan"];
      });
      const tot = active.filter((o) => balanceOf(db, o) > 0).reduce((a, b) => a + balanceOf(db, b), 0);
      return { title: "Laporan Piutang (Aging)", columns: ["Invoice", "Pelanggan", "Tgl", "Umur", "Total", "Sisa", "Status"], rows, right: [4, 5], summary: [["Total Piutang", fmtIDR(tot)]] };
    }
    case "ap": {
      const rows = db.payables.map((a) => [a.invoiceNo, db.suppliers.find((sp) => sp.id === a.supplierId)?.name || "?", fmtDate(a.dueDate), fmtIDR(a.amount), fmtIDR(payableBalance(a)), payableBalance(a) > 0 ? (a.dueDate < Date.now() ? "JATUH TEMPO" : "Berjalan") : "Lunas"]);
      return { title: "Laporan Hutang Supplier", columns: ["Invoice", "Supplier", "Jatuh Tempo", "Jumlah", "Sisa", "Status"], rows, right: [3, 4] };
    }
    case "inventory": {
      const rows = db.inventory.map((m) => [m.sku, m.name, `${m.stock} ${m.unit}`, m.minStock, fmtIDR(m.cost), fmtIDR(m.stock * m.cost), m.stock <= m.minStock ? "MENIPIS" : "Aman"]);
      const tot = db.inventory.reduce((a, b) => a + b.stock * b.cost, 0);
      return { title: "Laporan Nilai Inventori", columns: ["SKU", "Bahan", "Stok", "Min", "Harga Beli", "Nilai", "Status"], rows, right: [2, 3, 4, 5], summary: [["Total Nilai Stok", fmtIDR(tot)]] };
    }
    case "production": {
      const rows = db.users.filter((u) => ["production", "designer"].includes(u.role)).map((u) => {
        const assigned = active.filter((o) => o.assigneeId === u.id);
        const done = assigned.filter((o) => o.status === "done" || o.status === "shipped");
        const prog = assigned.filter((o) => ["printing", "finishing", "qc", "designing"].includes(o.status));
        return [u.name, assigned.length, prog.length, done.length, done.length > 0 ? "Aktif" : "—"] as (string | number)[];
      });
      const totalProg = active.filter((o) => ["queue", "printing", "finishing", "qc", "designing", "wait_design"].includes(o.status)).length;
      const readyC = active.filter((o) => o.status === "ready").length;
      return { title: "Kinerja Produksi per PIC", columns: ["Karyawan", "Ditugaskan", "Berjalan", "Selesai", "Keterangan"], rows, right: [1, 2, 3], summary: [["Total Dalam Proses", String(totalProg)], ["Siap Diambil", String(readyC)], ["Status Terlacak", Object.keys(STATUS_META).length + " tahap"]] };
    }
  }
}
