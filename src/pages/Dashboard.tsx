import React, { useMemo } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Factory, PackageCheck, Wallet } from "lucide-react";
import { balanceOf, cashOf, invValue, lowStock, orderCost, paidOf, payStateOf, useStore } from "../lib/store";
import { fmtDateShort, fmtIDR, fmtIDRShort, fmtMonthYear, isToday, timeAgo } from "../lib/format";
import { AreaLine, Bars, HBars } from "../components/charts";
import { Chip, PageHead, StatusPill, THead, TR, TD } from "../components/ui";
import { Avatar } from "../components/layout";
import { PAY_METHOD_META, STATUS_META } from "../lib/types";

export default function Dashboard() {
  const { db, user, navigate } = useStore();

  const m = useMemo(() => {
    const active = db.orders.filter((o) => o.status !== "cancelled");
    const today = active.filter((o) => isToday(o.createdAt));
    const todaySales = today.reduce((a, b) => a + b.total, 0);
    const todayCost = today.reduce((a, b) => a + orderCost(db, b), 0);
    const todayExp = db.expenses.filter((e) => isToday(e.date)).reduce((a, b) => a + b.amount, 0);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const ydSales = active.filter((o) => { const d = new Date(o.createdAt); return d.toDateString() === yesterday.toDateString(); }).reduce((a, b) => a + b.total, 0);
    const piutang = active.reduce((a, b) => a + Math.max(0, balanceOf(db, b)), 0);
    const overdue = active.filter((o) => payStateOf(db, o) === "overdue");
    const inProd = active.filter((o) => ["queue", "printing", "finishing", "qc"].includes(o.status));
    const ready = active.filter((o) => o.status === "ready");
    const low = lowStock(db);

    const months: { label: string; sales: number; profit: number; exp: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const inM = (ts: number) => { const x = new Date(ts); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); };
      const os = active.filter((o) => inM(o.createdAt));
      const sales = os.reduce((a, b) => a + b.total, 0);
      const cost = os.reduce((a, b) => a + orderCost(db, b), 0);
      const exp = db.expenses.filter((e) => inM(e.date)).reduce((a, b) => a + b.amount, 0);
      months.push({ label: fmtDateShort(d.getTime()), sales, profit: sales - cost - exp, exp });
    }
    return { todaySales, todayCost, todayExp, ydSales, piutang, overdue, inProd, ready, low, months };
  }, [db]);

  const delta = m.ydSales > 0 ? ((m.todaySales - m.ydSales) / m.ydSales) * 100 : m.todaySales > 0 ? 100 : 0;
  const profitToday = m.todaySales - m.todayCost - m.todayExp;

  const stat = (label: string, value: string, sub: React.ReactNode, tone = "#0e7490") => (
    <div className="card hoverable anim-in p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="tabular mt-1.5 font-display text-[24px] font-bold leading-none tracking-tight">{value}</p>
      <div className="mt-2 text-[11.5px] font-semibold" style={{ color: tone }}>{sub}</div>
    </div>
  );

  return (
    <div>
      <PageHead title={`Halo, ${user?.name.split(" ")[0]}`} desc={`Ringkasan operasional Sani Print — ${fmtMonthYear(Date.now())}`}>
        <Chip color={lowStock(db).length ? "#b45309" : "#178a4c"}>{lowStock(db).length ? `${lowStock(db).length} bahan menipis` : "Stok aman"}</Chip>
        <Chip color="#0e7490">Kas & Bank {fmtIDRShort(cashOf(db))}</Chip>
        <Chip color="#7c3aed">Nilai inventori {fmtIDRShort(invValue(db))}</Chip>
      </PageHead>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stat("Penjualan Hari Ini", fmtIDR(m.todaySales), (
          <span className="inline-flex items-center gap-1">
            {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta).toFixed(0)}% vs kemarin
          </span>
        ), delta >= 0 ? "#178a4c" : "#d33131")}
        {stat("Laba Kotor Hari Ini", fmtIDR(profitToday), <span>Marjin {m.todaySales > 0 ? ((profitToday / m.todaySales) * 100).toFixed(0) : 0}% dari omzet</span>, profitToday >= 0 ? "#178a4c" : "#d33131")}
        {stat("Pengeluaran Hari Ini", fmtIDR(m.todayExp), <span>{db.expenses.filter((e) => isToday(e.date)).length} transaksi keluar</span>, "#b45309")}
        {stat("Piutang Belum Lunas", fmtIDR(m.piutang), <span>{db.orders.filter((o) => balanceOf(db, o) > 0 && o.status !== "cancelled").length} invoice berjalan</span>, "#7c3aed")}
      </div>

      {/* Ops strip */}
      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Dalam Produksi", val: m.inProd.length, icon: <Factory size={15} />, color: "#0e7490", go: () => navigate("production") },
          { label: "Siap Diambil", val: m.ready.length, icon: <PackageCheck size={15} />, color: "#178a4c", go: () => navigate("production") },
          { label: "Pembayaran Lewat Jatuh Tempo", val: m.overdue.length, icon: <Wallet size={15} />, color: "#d33131", go: () => navigate("finance") },
          { label: "Bahan Stok Menipis", val: m.low.length, icon: <AlertTriangle size={15} />, color: "#b45309", go: () => navigate("inventory") },
        ].map((c, i) => (
          <button key={i} onClick={c.go} className="card hoverable anim-in flex items-center gap-3 p-3.5 text-left" style={{ animationDelay: `${i * 40}ms` }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: c.color + "1a", color: c.color }}>{c.icon}</span>
            <span className="min-w-0">
              <span className="tabular block font-display text-[19px] font-bold leading-none">{c.val}</span>
              <span className="mt-1 block truncate text-[11px] font-semibold text-muted">{c.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="card anim-in p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-[14.5px] font-bold">Penjualan 6 Bulan</h3>
              <p className="text-[11.5px] text-muted">Omzet vs pengeluaran bulanan</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Penjualan</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-line2" /> Pengeluaran</span>
            </div>
          </div>
          <Bars data={m.months.map((x) => ({ label: x.label, value: x.sales, value2: x.exp }))} color="#0e7490" color2="#b9c0c9" />
        </div>
        <div className="card anim-in p-4">
          <h3 className="font-display text-[14.5px] font-bold">Pipeline Produksi</h3>
          <p className="mb-3 text-[11.5px] text-muted">Pesanan aktif per status — klik untuk buka</p>
          <HBars items={(["wait_pay", "wait_design", "designing", "queue", "printing", "finishing", "qc", "ready"] as const).map((st) => ({
            label: STATUS_META[st].label,
            value: db.orders.filter((o) => o.status === st).length,
            color: STATUS_META[st].color,
            onClick: () => navigate("production"),
          }))} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="card anim-in p-4">
          <h3 className="font-display text-[14.5px] font-bold">Laba Bersih Bulanan</h3>
          <p className="mb-3 text-[11.5px] text-muted">Omzet − HPP − beban operasional</p>
          <AreaLine points={m.months.map((x) => x.profit)} labels={m.months.map((x) => x.label)} color="#178a4c" />
        </div>
        <div className="card anim-in overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="font-display text-[14.5px] font-bold">Pesanan Terbaru</h3>
            <button onClick={() => navigate("orders")} className="text-[12px] font-bold text-brand hover:underline">Lihat semua →</button>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <THead cols={["No. Order", "Pelanggan", "Status", "Total", "Sisa"]} />
              <tbody>
                {db.orders.slice(0, 6).map((o) => {
                  const bal = balanceOf(db, o);
                  return (
                    <TR key={o.id} onClick={() => navigate("orders", { orderId: o.id })}>
                      <TD className="font-display font-bold">{o.number}</TD>
                      <TD className="max-w-[160px] truncate">{db.customers.find((c) => c.id === o.customerId)?.name}</TD>
                      <TD><StatusPill status={o.status} /></TD>
                      <TD className="tabular font-bold">{fmtIDRShort(o.total)}</TD>
                      <TD className={`tabular font-semibold ${bal > 0 ? "text-warn" : "text-ok"}`}>{bal > 0 ? fmtIDRShort(bal) : "Lunas"}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="card anim-in overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="font-display text-[14.5px] font-bold">Transaksi Pembayaran Terbaru</h3>
            <button onClick={() => navigate("cashflow")} className="text-[12px] font-bold text-brand hover:underline">Arus kas →</button>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <THead cols={["Waktu", "Order", "Pelanggan", "Metode", "Jumlah"]} />
              <tbody>
                {db.payments.slice(0, 7).map((p) => {
                  const o = db.orders.find((x) => x.id === p.orderId);
                  return (
                    <TR key={p.id} onClick={() => o && navigate("orders", { orderId: o.id })}>
                      <TD className="whitespace-nowrap text-muted">{timeAgo(p.date)}</TD>
                      <TD className="font-display font-bold">{o?.number || "—"}</TD>
                      <TD className="max-w-[160px] truncate">{o && db.customers.find((c) => c.id === o.customerId)?.name}</TD>
                      <TD><Chip color="#475569">{PAY_METHOD_META[p.method]}</Chip></TD>
                      <TD className="tabular font-bold text-ok">+{fmtIDR(p.amount)}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card anim-in p-4">
          <h3 className="font-display text-[14.5px] font-bold">Aktivitas Tim</h3>
          <p className="mb-3 text-[11.5px] text-muted">Jejak audit karyawan</p>
          <div className="space-y-3">
            {db.activities.slice(0, 6).map((a) => {
              const u = db.users.find((x) => x.id === a.userId);
              return (
                <div key={a.id} className="flex items-start gap-2.5">
                  <Avatar name={u?.name || "?"} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug"><span className="font-bold">{u?.name?.split(" ")[0]}</span> · {a.action}</p>
                    <p className="truncate text-[11px] text-muted">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-faint">{timeAgo(a.date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

