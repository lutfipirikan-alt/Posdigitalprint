import React from "react";
import { Printer, X } from "lucide-react";
import type { Order } from "../lib/types";
import { PAY_METHOD_META, STATUS_META } from "../lib/types";
import { balanceOf, paidOf, payStateOf, PAYSTATE_META, useStore } from "../lib/store";
import { fmtDate, fmtDateTime, fmtIDR, fmtNum } from "../lib/format";
import { Logo } from "./ui";

export function InvoiceModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const { db } = useStore();
  if (!order) return null;
  const customer = db.customers.find((c) => c.id === order.customerId);
  const payments = db.payments.filter((p) => p.orderId === order.id);
  const paid = paidOf(db, order.id);
  const balance = balanceOf(db, order);
  const ps = payStateOf(db, order);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/55 p-4 pt-[5vh] anim-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="anim-modal w-full max-w-[720px]">
        <div className="no-print mb-2 flex items-center justify-end gap-2">
          <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-brand-hi">
            <Printer size={15} /> Cetak / Simpan PDF
          </button>
          <button onClick={onClose} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/30 px-3 text-[13px] font-bold text-white transition-colors hover:bg-white/10">
            <X size={15} /> Tutup
          </button>
        </div>

        {/* ===== print-area ===== */}
        <div className="print-area rounded-xl border border-line bg-white p-8 text-[#191c21] shadow-2xl" style={{ colorScheme: "light" }}>
          <div className="flex items-start justify-between border-b-4 border-[#16181d] pb-5">
            <div className="flex items-center gap-3">
              <Logo size={44} withText={false} />
              <div>
                <p className="font-display text-[22px] font-bold leading-tight tracking-tight">Sani Print</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a909a]">Digital Printing & Production</p>
              </div>
            </div>
            <div className="text-right text-[11px] leading-relaxed text-[#5c636d]">
              <p className="font-semibold text-[#191c21]">CV Sani Print Indonesia</p>
              <p>Jl. Melati No. 12, Gondokusuman, Yogyakarta 55225</p>
              <p>Telp/WA: 0812-2700-8899 · hallo@saniprint.id</p>
              <p>NPWP: 84.215.779.3-541.000</p>
            </div>
          </div>

          <div className="mt-5 flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a909a]">Ditagihkan kepada</p>
              <p className="mt-1 font-display text-[15px] font-bold">{customer?.name || "—"}</p>
              <p className="text-[11.5px] text-[#5c636d]">{customer?.phone}</p>
              {customer?.address && <p className="max-w-[260px] text-[11.5px] text-[#5c636d]">{customer.address}</p>}
            </div>
            <div className="text-right">
              <p className="font-display text-[20px] font-bold tracking-tight">INVOICE</p>
              <p className="tabular font-display text-[13px] font-bold text-[#0e7490]">{order.invoiceNo}</p>
              <table className="ml-auto mt-2 text-[11.5px]">
                <tbody>
                  <tr><td className="pr-4 text-[#8a909a]">No. Order</td><td className="tabular font-bold text-right">{order.number}</td></tr>
                  <tr><td className="pr-4 text-[#8a909a]">Tanggal</td><td className="text-right">{fmtDate(order.createdAt)}</td></tr>
                  {order.dueDate && <tr><td className="pr-4 text-[#8a909a]">Jatuh tempo</td><td className="text-right font-semibold">{fmtDate(order.dueDate)}</td></tr>}
                  {order.deadline && <tr><td className="pr-4 text-[#8a909a]">Target selesai</td><td className="text-right">{fmtDate(order.deadline)}</td></tr>}
                </tbody>
              </table>
              <span className="mt-2 inline-block rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: PAYSTATE_META[ps].color + "1c", color: PAYSTATE_META[ps].color }}>
                {PAYSTATE_META[ps].label}
              </span>
            </div>
          </div>

          <table className="mt-6 w-full text-[12px]">
            <thead>
              <tr className="bg-[#16181d] text-left text-white">
                <th className="rounded-l-md px-3 py-2 font-semibold">Produk / Spesifikasi</th>
                <th className="px-2 py-2 text-center font-semibold">Qty</th>
                <th className="px-2 py-2 text-right font-semibold">Harga</th>
                <th className="rounded-r-md px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => {
                const spec = [
                  it.width && it.height ? `${it.width} × ${it.height} cm` : null,
                  it.material ? `Bahan: ${it.material}` : null,
                  it.finishingIds.length ? `Finishing: ${it.finishingIds.map((f) => db.finishings.find((x) => x.id === f)?.name).filter(Boolean).join(", ")}` : null,
                  it.note || null,
                ].filter(Boolean).join(" · ");
                return (
                  <tr key={it.id} className="border-b border-dashed border-[#d8dce2] align-top">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold">{it.name}</p>
                      {spec && <p className="text-[10.5px] text-[#8a909a]">{spec}</p>}
                    </td>
                    <td className="tabular px-2 py-2.5 text-center">{fmtNum(it.qty)}</td>
                    <td className="tabular px-2 py-2.5 text-right">{fmtIDR(it.unitPrice)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-bold">{fmtIDR(it.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex justify-between gap-8">
            <div className="max-w-[300px] text-[11px] leading-relaxed text-[#5c636d]">
              <p className="font-bold text-[#191c21]">Catatan</p>
              <p>{order.note || "—"}</p>
              <p className="mt-3 text-[10px]">
                • Barang yang sudah dicetak tidak dapat ditukar/dikembalikan.<br />
                • Keterlambatan pelunasan melewati jatuh tempo dikenakan biaya penagihan.<br />
                • File desain disimpan 30 hari setelah pesanan selesai.
              </p>
            </div>
            <table className="w-[250px] text-[12.5px]">
              <tbody>
                <tr><td className="py-1 text-[#5c636d]">Subtotal</td><td className="tabular py-1 text-right font-semibold">{fmtIDR(order.subtotal)}</td></tr>
                {order.discount > 0 && <tr><td className="py-1 text-[#5c636d]">Diskon</td><td className="tabular py-1 text-right font-semibold text-[#d33131]">−{fmtIDR(order.discount)}</td></tr>}
                {order.extraCharge > 0 && <tr><td className="py-1 text-[#5c636d]">Biaya tambahan</td><td className="tabular py-1 text-right font-semibold">{fmtIDR(order.extraCharge)}</td></tr>}
                <tr className="border-t-2 border-[#16181d]"><td className="py-1.5 font-display font-bold">TOTAL</td><td className="tabular py-1.5 text-right font-display text-[15px] font-bold">{fmtIDR(order.total)}</td></tr>
                <tr><td className="py-0.5 text-[#5c636d]">Dibayar</td><td className="tabular py-0.5 text-right font-semibold text-[#178a4c]">{fmtIDR(paid)}</td></tr>
                <tr><td className="py-0.5 font-bold text-[#5c636d]">Sisa Tagihan</td><td className="tabular py-0.5 text-right font-bold" style={{ color: balance > 0 ? "#b45309" : "#178a4c" }}>{fmtIDR(balance)}</td></tr>
              </tbody>
            </table>
          </div>

          {payments.length > 0 && (
            <div className="mt-4 rounded-lg border border-[#e3e6ea] p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a909a]">Riwayat Pembayaran</p>
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between py-0.5 text-[11.5px]">
                  <span className="text-[#5c636d]">{fmtDateTime(p.date)} · {PAY_METHOD_META[p.method]}{p.note ? ` · ${p.note}` : ""}</span>
                  <span className="tabular font-bold text-[#178a4c]">{fmtIDR(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex items-end justify-between">
            <div className="text-[10.5px] text-[#8a909a]">
              <p>Status produksi: <span className="font-bold" style={{ color: STATUS_META[order.status].color }}>{STATUS_META[order.status].label}</span></p>
              <p className="mt-1">Dokumen ini dicetak otomatis oleh sistem Sani Print.</p>
            </div>
            <div className="text-center text-[11px]">
              <div className="h-14 w-36 border-b border-dashed border-[#8a909a]" />
              <p className="mt-1 text-[#5c636d]">Hormat kami, <span className="font-bold text-[#191c21]">Sani Print</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
