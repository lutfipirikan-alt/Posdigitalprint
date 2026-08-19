import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { balanceOf, cashOf, invValue, payableBalance, useStore } from "../lib/store";
import { fmtDate, fmtDateTime, fmtIDR, fmtMonthYear, fmtIDRShort } from "../lib/format";
import { Chip, PageHead, SearchInput, Tabs, THead, TR, TD, Empty } from "../components/ui";

const TYPE_LABEL: Record<string, string> = {
  asset: "Aset", liability: "Kewajiban", revenue: "Pendapatan", cogs: "HPP", expense: "Beban",
};
const TYPE_COLOR: Record<string, string> = {
  asset: "#0e7490", liability: "#d33131", revenue: "#178a4c", cogs: "#b45309", expense: "#7c3aed",
};

export default function Accounting() {
  const { db } = useStore();
  const [tab, setTab] = useState("pl");
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const inMonth = (ts: number) => { const d = new Date(ts); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth(); };

  const accBalance = useMemo(() => {
    const map = new Map<string, number>();
    db.accounts.forEach((a) => map.set(a.code, 0));
    db.journals.forEach((j) => j.lines.forEach((l) => {
      map.set(l.code, (map.get(l.code) || 0) + l.debit - l.credit);
    }));
    return map;
  }, [db]);

  const pl = useMemo(() => {
    const sum = (prefix: string) => Array.from(accBalance.entries())
      .filter(([code]) => code.startsWith(prefix) && code.length === 4)
      .reduce((a, [, v]) => a + v, 0);
    // jurnal dalam bulan tertentu: hitung ulang per akun
    const mAcc = new Map<string, number>();
    db.journals.filter((j) => inMonth(j.date)).forEach((j) => j.lines.forEach((l) => {
      mAcc.set(l.code, (mAcc.get(l.code) || 0) + l.debit - l.credit);
    }));
    const mSum = (prefix: string) => Array.from(mAcc.entries()).filter(([c]) => c.startsWith(prefix) && c.length === 4).reduce((a, [, v]) => a + v, 0);
    const rev = mSum("4");
    const cogs = mSum("5");
    const exp = mSum("6");
    const revLines = Array.from(mAcc.entries()).filter(([c]) => c.startsWith("4") && c.length === 4);
    const expLines = Array.from(mAcc.entries()).filter(([c]) => c.startsWith("6") && c.length === 4).sort((a, b) => b[1] - a[1]);
    return { rev, cogs, exp, gross: rev - cogs, net: rev - cogs - exp, revLines, expLines };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, month]);

  const arTotal = db.orders.filter((o) => o.status !== "cancelled").reduce((a, b) => a + Math.max(0, balanceOf(db, b)), 0);
  const apTotal = db.payables.reduce((a, b) => a + payableBalance(b), 0);

  const journals = db.journals.filter((j) => !q || (j.ref + j.desc).toLowerCase().includes(q.toLowerCase()));

  const shift = (n: number) => setMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() + n); return d; });

  return (
    <div>
      <PageHead title="Akuntansi" desc="Laba rugi, bagan akun, dan jurnal umum yang terisi otomatis dari transaksi">
        <Chip color="#0e7490">Kas & Bank {fmtIDRShort(cashOf(db))}</Chip>
        <Chip color="#178a4c">Persediaan {fmtIDRShort(invValue(db))}</Chip>
        <Chip color="#b45309">Piutang {fmtIDRShort(arTotal)}</Chip>
        <Chip color="#d33131">Hutang {fmtIDRShort(apTotal)}</Chip>
      </PageHead>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "pl", label: "Laba Rugi" }, { id: "coa", label: "Bagan Akun" }, { id: "journal", label: "Jurnal Umum", badge: db.journals.length },
      ]} />

      {tab === "pl" && (
        <div className="anim-in grid gap-3 xl:grid-cols-3">
          <div className="card p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[15px] font-bold">Laporan Laba Rugi</h3>
              <div className="flex items-center gap-1 rounded-lg border border-line bg-surface2 p-0.5">
                <button onClick={() => shift(-1)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-ink"><ChevronLeft size={14} /></button>
                <span className="w-36 text-center text-[12.5px] font-bold">{fmtMonthYear(month.getTime())}</span>
                <button onClick={() => shift(1)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-ink"><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="space-y-1 text-[13px]">
              <PLRow label="PENDAPATAN" bold />
              {pl.revLines.map(([c, v]) => <PLRow key={c} label={`${c} · ${db.accounts.find((a) => a.code === c)?.name || "?"}`} value={v} indent />)}
              {pl.revLines.length === 0 && <PLRow label="Tidak ada pendapatan tercatat" indent muted />}
              <PLRow label="Total Pendapatan" value={pl.rev} bold />
              <div className="my-2 border-t border-dashed border-line2" />
              <PLRow label="HARGA POKOK PENJUALAN" bold />
              <PLRow label="5100 · HPP Bahan & Produksi" value={pl.cogs} indent />
              <PLRow label="Laba Kotor" value={pl.gross} bold accent={pl.gross >= 0 ? "#178a4c" : "#d33131"} />
              <div className="my-2 border-t border-dashed border-line2" />
              <PLRow label="BEBAN OPERASIONAL" bold />
              {pl.expLines.map(([c, v]) => <PLRow key={c} label={`${c} · ${db.accounts.find((a) => a.code === c)?.name || "?"}`} value={v} indent />)}
              {pl.expLines.length === 0 && <PLRow label="Tidak ada beban tercatat" indent muted />}
              <div className="my-2 border-t border-dashed border-line2" />
              <div className="flex items-center justify-between rounded-xl px-3 py-3" style={{ background: (pl.net >= 0 ? "#178a4c" : "#d33131") + "14" }}>
                <span className="font-display text-[14px] font-bold" style={{ color: pl.net >= 0 ? "#178a4c" : "#d33131" }}>LABA BERSIH</span>
                <span className="tabular font-display text-[20px] font-bold" style={{ color: pl.net >= 0 ? "#178a4c" : "#d33131" }}>{fmtIDR(pl.net)}</span>
              </div>
              <p className="pt-2 text-[11px] text-faint">Marjin kotor {pl.rev > 0 ? ((pl.gross / pl.rev) * 100).toFixed(1) : 0}% · marjin bersih {pl.rev > 0 ? ((pl.net / pl.rev) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="card p-4">
              <h4 className="mb-3 font-display text-[14px] font-bold">Posisi Keuangan Sederhana</h4>
              {[
                ["Kas & Bank (1100+1200)", cashOf(db), "#0e7490"],
                ["Persediaan Bahan (1400)", invValue(db), "#178a4c"],
                ["Piutang Usaha (1300)", arTotal, "#b45309"],
                ["Hutang Usaha (2100)", -apTotal, "#d33131"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="flex items-center justify-between border-b border-line/70 py-2 text-[12.5px] last:border-0">
                  <span className="text-muted">{l}</span>
                  <span className="tabular font-bold" style={{ color: c as string }}>{fmtIDR(v as number)}</span>
                </div>
              ))}
            </div>
            <div className="card p-4 text-[11.5px] leading-relaxed text-muted">
              <p className="font-bold text-ink">Bagaimana jurnal terisi?</p>
              <p className="mt-1">Setiap pembayaran order menjurnal Kas/Bank → Pendapatan. Penyelesaian produksi mencatat HPP → Persediaan dan mengurangi stok BOM. Pengeluaran, penerimaan PO, dan pembayaran supplier dijurnal otomatis — tanpa input manual.</p>
            </div>
          </div>
        </div>
      )}

      {tab === "coa" && (
        <div className="card anim-in overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <THead cols={["Kode", "Nama Akun", "Tipe", "Saldo"]} />
              <tbody>
                {db.accounts.map((a) => {
                  const isParent = ["1000", "2000", "4000", "5000", "6000"].includes(a.code);
                  const bal = accBalance.get(a.code) || 0;
                  const sign = a.type === "liability" || a.type === "revenue" ? -bal : bal;
                  return (
                    <TR key={a.code} className={isParent ? "bg-surface2" : ""}>
                      <TD className={`font-display text-[12.5px] ${isParent ? "font-bold" : "text-muted"}`}>{a.code}</TD>
                      <TD className={isParent ? "font-bold" : ""}>{isParent ? a.name.toUpperCase() : a.name}</TD>
                      <TD><Chip color={TYPE_COLOR[a.type]}>{TYPE_LABEL[a.type]}</Chip></TD>
                      <TD className={`tabular font-bold ${isParent ? "text-faint" : ""}`}>{isParent ? "" : fmtIDR(sign)}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "journal" && (
        <div className="card anim-in overflow-hidden">
          <div className="px-4 pt-3"><SearchInput value={q} onChange={setQ} placeholder="Cari referensi / deskripsi jurnal…" className="w-72" /></div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <THead cols={["", "Tanggal", "Ref", "Deskripsi", "Debit", "Kredit"]} />
              <tbody>
                {journals.map((j) => {
                  const tot = j.lines.reduce((a, b) => a + b.debit, 0);
                  const open2 = expanded === j.id;
                  return (
                    <React.Fragment key={j.id}>
                      <TR onClick={() => setExpanded(open2 ? null : j.id)}>
                        <TD className="w-8"><button className="text-muted">{open2 ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></TD>
                        <TD className="whitespace-nowrap text-muted">{fmtDate(j.date)}</TD>
                        <TD className="font-display text-[12px] font-bold">{j.ref}</TD>
                        <TD className="max-w-[280px] truncate font-semibold">{j.desc}</TD>
                        <TD className="tabular font-bold">{fmtIDR(tot)}</TD>
                        <TD className="tabular font-bold">{fmtIDR(tot)}</TD>
                      </TR>
                      {open2 && (
                        <tr className="border-b border-line/70 bg-surface2/60">
                          <td colSpan={6} className="px-6 py-2.5">
                            <table className="w-full text-[12px]">
                              <tbody>
                                {j.lines.map((l, i) => (
                                  <tr key={i}>
                                    <td className="w-16 py-0.5 font-display font-bold text-muted">{l.code}</td>
                                    <td className="py-0.5 text-muted">{db.accounts.find((a) => a.code === l.code)?.name}</td>
                                    <td className="tabular w-32 py-0.5 text-right">{l.debit ? fmtIDR(l.debit) : ""}</td>
                                    <td className="tabular w-32 py-0.5 text-right">{l.credit ? fmtIDR(l.credit) : ""}</td>
                                  </tr>
                                ))}
                                <tr><td colSpan={4} className="pt-1 text-[10.5px] text-faint">Dicatat {fmtDateTime(j.date)} oleh {db.users.find((u) => u.id === j.userId)?.name || "sistem"}</td></tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {journals.length === 0 && <Empty title="Jurnal kosong" desc="Jurnal terisi otomatis saat ada transaksi." />}
          </div>
        </div>
      )}
    </div>
  );
}

function PLRow({ label, value, bold, indent, muted, accent }: { label: string; value?: number; bold?: boolean; indent?: boolean; muted?: boolean; accent?: string }) {
  return (
    <div className={`flex items-center justify-between px-3 py-1 ${indent ? "pl-7" : ""} ${bold ? "font-bold" : ""} ${muted ? "text-faint italic" : ""}`}>
      <span>{label}</span>
      {value !== undefined && <span className="tabular font-display" style={accent ? { color: accent } : undefined}>{value < 0 ? `(${fmtIDR(-value)})` : fmtIDR(value)}</span>}
    </div>
  );
}
