import React, { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cashOf, useStore } from "../lib/store";
import { fmtDateShort, fmtIDR, fmtIDRShort, fmtDateTime } from "../lib/format";
import { Bars } from "../components/charts";
import { Chip, PageHead, THead, TR, TD, Tabs } from "../components/ui";
import { PAY_METHOD_META } from "../lib/types";

type Range = "daily" | "weekly" | "monthly";

export default function CashFlow() {
  const { db } = useStore();
  const [range, setRange] = useState<Range>("daily");

  const buckets = useMemo(() => {
    const n = range === "daily" ? 14 : range === "weekly" ? 8 : 6;
    const step = range === "daily" ? 1 : range === "weekly" ? 7 : 30;
    const out: { label: string; in: number; out: number }[] = [];
    const now = Date.now();
    for (let i = n - 1; i >= 0; i--) {
      const end = now - i * step * 86_400_000;
      const start = end - step * 86_400_000;
      const inc = db.payments.filter((p) => p.date > start && p.date <= end).reduce((a, b) => a + b.amount, 0);
      const exp = db.expenses.filter((e) => e.date > start && e.date <= end).reduce((a, b) => a + b.amount, 0);
      const sup = db.payables.flatMap((a) => a.payments).filter((p) => p.date > start && p.date <= end).reduce((a, b) => a + b.amount, 0);
      out.push({ label: fmtDateShort(end), in: inc, out: exp + sup });
    }
    return out;
  }, [db, range]);

  const periodIn = buckets.reduce((a, b) => a + b.in, 0);
  const periodOut = buckets.reduce((a, b) => a + b.out, 0);

  const movements = useMemo(() => {
    const ins = db.payments.map((p) => ({ id: p.id, date: p.date, dir: "in" as const, label: `Pembayaran order ${db.orders.find((o) => o.id === p.orderId)?.number || ""}`, method: PAY_METHOD_META[p.method], amount: p.amount }));
    const exps = db.expenses.map((e) => ({ id: e.id, date: e.date, dir: "out" as const, label: e.desc, method: PAY_METHOD_META[e.method], amount: e.amount }));
    const sups = db.payables.flatMap((a) => a.payments.map((p) => ({ id: a.id + p.date, date: p.date, dir: "out" as const, label: `Bayar supplier ${a.invoiceNo}`, method: PAY_METHOD_META[p.method], amount: p.amount })));
    return [...ins, ...exps, ...sups].sort((a, b) => b.date - a.date).slice(0, 18);
  }, [db]);

  return (
    <div>
      <PageHead title="Arus Kas" desc="Uang masuk dari penjualan & uang keluar untuk operasional dan supplier">
        <Chip color="#0e7490">Saldo Kas & Bank {fmtIDR(cashOf(db))}</Chip>
        <Chip color="#178a4c">Masuk ({buckets.length} periode) {fmtIDRShort(periodIn)}</Chip>
        <Chip color="#d33131">Keluar {fmtIDRShort(periodOut)}</Chip>
        <Chip color={periodIn - periodOut >= 0 ? "#178a4c" : "#d33131"}>Netto {fmtIDRShort(periodIn - periodOut)}</Chip>
      </PageHead>

      <Tabs value={range} onChange={(v) => setRange(v as Range)} tabs={[
        { id: "daily", label: "Harian · 14 hari" }, { id: "weekly", label: "Mingguan · 8 minggu" }, { id: "monthly", label: "Bulanan · 6 bulan" },
      ]} />

      <div className="card anim-in p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[14.5px] font-bold">Kas Masuk vs Keluar</h3>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ok" /> Masuk</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Keluar</span>
          </div>
        </div>
        <Bars data={buckets.map((b) => ({ label: b.label, value: b.in, value2: b.out }))} color="#178a4c" color2="#d33131" height={200} />
      </div>

      <div className="card anim-in mt-3 overflow-hidden">
        <h3 className="px-4 pt-4 font-display text-[14.5px] font-bold">Pergerakan Terbaru</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <THead cols={["Waktu", "Keterangan", "Metode", "Masuk", "Keluar"]} />
            <tbody>
              {movements.map((mv) => (
                <TR key={mv.id + mv.date}>
                  <TD className="whitespace-nowrap text-muted">{fmtDateTime(mv.date)}</TD>
                  <TD className="max-w-[300px]">
                    <span className="flex items-center gap-2 truncate font-semibold">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${mv.dir === "in" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                        {mv.dir === "in" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                      </span>
                      <span className="truncate">{mv.label}</span>
                    </span>
                  </TD>
                  <TD className="text-muted">{mv.method}</TD>
                  <TD className="tabular font-bold text-ok">{mv.dir === "in" ? "+" + fmtIDR(mv.amount) : ""}</TD>
                  <TD className="tabular font-bold text-danger">{mv.dir === "out" ? "−" + fmtIDR(mv.amount) : ""}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
