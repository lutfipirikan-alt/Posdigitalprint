import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileText, Paperclip, Printer, Wallet } from "lucide-react";
import type { Order, OrderStatus, PayMethod } from "../lib/types";
import { PAY_METHOD_META, STATUS_META } from "../lib/types";
import { balanceOf, paidOf, payStateOf, useStore } from "../lib/store";
import { fmtBytes, fmtDate, fmtDateTime, fmtIDR } from "../lib/format";
import { Btn, Drawer, Field, Input, Modal, PageHead, PayPill, SearchInput, Select, StatusPill, THead, TR, TD, Textarea, useToast } from "../components/ui";
import { InvoiceModal } from "../components/Invoice";

export default function Orders() {
  const { db, nav, navigate, recordPayment, setStatus } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [stFilter, setStFilter] = useState<string>("semua");
  const [pay, setPay] = useState<string>("semua");
  const [openId, setOpenId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Order | null>(null);
  const [payModal, setPayModal] = useState(false);

  useEffect(() => { if (nav.orderId) setOpenId(nav.orderId); }, [nav.orderId]);

  const rows = useMemo(() => db.orders.filter((o) => {
    const cust = db.customers.find((c) => c.id === o.customerId);
    const matchQ = !q || (o.number + o.invoiceNo + (cust?.name || "") + (cust?.phone || "")).toLowerCase().includes(q.toLowerCase());
    const matchS = stFilter === "semua" || o.status === stFilter;
    const matchP = pay === "semua" || payStateOf(db, o) === pay;
    return matchQ && matchS && matchP;
  }), [db, q, status, pay]);

  const open = db.orders.find((o) => o.id === openId) || null;

  return (
    <div>
      <PageHead title="Pesanan" desc={`${db.orders.length} pesanan tercatat · alur: Pelanggan → Order → Produksi → Invoice`}>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nomor order / pelanggan…" className="w-64" />
        <Select value={stFilter} onChange={(e) => setStFilter(e.target.value)} className="w-48">
          <option value="semua">Semua status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={pay} onChange={(e) => setPay(e.target.value)} className="w-40">
          <option value="semua">Semua pembayaran</option>
          <option value="paid">Lunas</option><option value="partial">Sebagian</option>
          <option value="unpaid">Belum bayar</option><option value="overdue">Jatuh tempo</option>
        </Select>
      </PageHead>

      <div className="card anim-in overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <THead cols={["No. Order", "Tanggal", "Pelanggan", "Item", "Status", "Pembayaran", "Total", "Sisa", ""]} />
            <tbody>
              {rows.map((o) => {
                const cust = db.customers.find((c) => c.id === o.customerId);
                const bal = balanceOf(db, o);
                return (
                  <TR key={o.id} onClick={() => setOpenId(o.id)}>
                    <TD>
                      <p className="font-display text-[12.5px] font-bold">{o.number}</p>
                      <p className="text-[10.5px] text-faint">{o.invoiceNo}</p>
                    </TD>
                    <TD className="whitespace-nowrap text-muted">{fmtDate(o.createdAt)}</TD>
                    <TD className="max-w-[170px] truncate font-semibold">{cust?.name}</TD>
                    <TD className="max-w-[180px] truncate text-muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</TD>
                    <TD><StatusPill status={o.status} /></TD>
                    <TD><PayPill state={payStateOf(db, o)} /></TD>
                    <TD className="tabular font-bold">{fmtIDR(o.total)}</TD>
                    <TD className={`tabular font-semibold ${bal > 0 ? "text-warn" : "text-ok"}`}>{bal > 0 ? fmtIDR(bal) : "—"}</TD>
                    <TD>
                      <button onClick={(e) => { e.stopPropagation(); setInvoice(o); }} title="Lihat invoice" className="rounded-md p-1.5 text-muted hover:bg-surface2 hover:text-brand"><Printer size={15} /></button>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-14 text-center text-[13px] text-faint">Tidak ada pesanan yang cocok dengan filter.</p>}
        </div>
      </div>

      {open && (
        <Drawer open onClose={() => { setOpenId(null); navigate("orders", {}); }} width="max-w-2xl"
          title={<span className="flex items-center gap-2 font-display">{open.number} <StatusPill status={open.status} /></span>}
          footer={<>
            <Btn variant="outline" onClick={() => setInvoice(open)}><Printer size={14} /> Invoice / Cetak</Btn>
            {balanceOf(db, open) > 0 && open.status !== "cancelled" && (
              <Btn onClick={() => setPayModal(true)}><Wallet size={14} /> Catat Pembayaran</Btn>
            )}
          </>}>
          <div className="space-y-5">
            {/* header info */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info label="Pelanggan" value={db.customers.find((c) => c.id === open.customerId)?.name || "—"} sub={db.customers.find((c) => c.id === open.customerId)?.phone} />
              <Info label="Dibuat" value={fmtDateTime(open.createdAt)} sub={`oleh ${db.users.find((u) => u.id === open.userId)?.name}`} />
              <Info label="Kasir" value={db.users.find((u) => u.id === open.userId)?.name || "—"} />
              {open.deadline && <Info label="Deadline Produksi" value={fmtDate(open.deadline)} warn={open.deadline < Date.now() && open.status !== "done"} />}
              {open.dueDate && <Info label="Jatuh Tempo" value={fmtDate(open.dueDate)} warn={payStateOf(db, open) === "overdue"} />}
              <div>
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-faint">PIC Produksi</p>
                <AssignSelect order={open} />
              </div>
            </div>

            {/* status control */}
            <div className="rounded-xl border border-line bg-surface2/60 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Ubah status produksi</p>
                {open.deadline && <CalendarClock size={13} className="text-warn" />}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <button key={k} onClick={() => {
                    if (k === open.status) return;
                    setStatus(open.id, k as OrderStatus);
                    toast.push({ title: `Status → ${v.label}`, desc: open.number, kind: "ok" });
                  }}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] font-bold transition-all ${open.status === k ? "text-white" : "border-line text-muted hover:border-line2 hover:text-ink"}`}
                    style={open.status === k ? { background: v.color, borderColor: v.color } : undefined}>
                    {v.label}
                  </button>
                ))}
              </div>
              {open.status === "done" && <p className="mt-2 text-[11px] font-semibold text-ok">✓ Bahan baku (BOM) otomatis dikurangi dari inventori & HPP dicatat saat status Selesai.</p>}
            </div>

            {/* items */}
            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Item Pesanan</h4>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full">
                  <THead cols={["Produk", "Qty", "Harga", "Total"]} />
                  <tbody>
                    {open.items.map((it) => {
                      const spec = [it.width && it.height ? `${it.width}×${it.height} cm` : "", it.material || "", it.finishingIds.length ? it.finishingIds.map((f) => db.finishings.find((x) => x.id === f)?.name).join(", ") : "", it.note || ""].filter(Boolean).join(" · ");
                      return (
                        <TR key={it.id}>
                          <TD>
                            <p className="font-bold">{it.name}</p>
                            {spec && <p className="text-[11px] text-muted">{spec}</p>}
                          </TD>
                          <TD className="tabular">{it.qty} {it.width && it.height ? "" : ""}</TD>
                          <TD className="tabular">{fmtIDR(it.unitPrice)}</TD>
                          <TD className="tabular font-bold">{fmtIDR(it.total)}</TD>
                        </TR>
                      );
                    })}
                    <tr className="border-b border-line/70 last:border-0">
                      <td colSpan={3} className="px-3 py-2.5 pl-4 text-right text-[12.5px] font-semibold text-muted">Subtotal {open.discount > 0 && `· Diskon −${fmtIDR(open.discount)}`} {open.extraCharge > 0 && `· Tambahan +${fmtIDR(open.extraCharge)}`}</td>
                      <td className="tabular px-3 py-2.5 pr-4 font-display text-[15px] font-bold">{fmtIDR(open.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* payments */}
            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Pembayaran · terbayar {fmtIDR(paidOf(db, open.id))} dari {fmtIDR(open.total)}</h4>
              <div className="h-2 overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-ok transition-all duration-500" style={{ width: `${Math.min(100, (paidOf(db, open.id) / Math.max(1, open.total)) * 100)}%` }} />
              </div>
              <div className="mt-2 space-y-1.5">
                {db.payments.filter((p) => p.orderId === open.id).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[12.5px]">
                    <span className="flex items-center gap-2 text-muted"><Wallet size={13} className="text-ok" /> {fmtDateTime(p.date)} · {PAY_METHOD_META[p.method]}{p.ref ? ` · ${p.ref}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                    <span className="tabular font-bold text-ok">+{fmtIDR(p.amount)}</span>
                  </div>
                ))}
                {db.payments.filter((p) => p.orderId === open.id).length === 0 && <p className="rounded-lg border border-dashed border-line2 px-3 py-2.5 text-[12px] text-faint">Belum ada pembayaran tercatat.</p>}
              </div>
            </div>

            {/* files & notes */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-faint"><Paperclip size={12} /> File Desain ({open.files.length})</h4>
                {open.files.length === 0 ? <p className="text-[12px] text-faint">Tidak ada lampiran.</p> : (
                  <div className="space-y-1.5">
                    {open.files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-surface2 px-2.5 py-1.5 text-[12px]">
                        <FileText size={13} className="shrink-0 text-brand" />
                        <span className="min-w-0 flex-1 truncate font-semibold">{f.name}</span>
                        <span className="shrink-0 text-[10px] uppercase text-faint">{f.type} · {fmtBytes(f.size)}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-faint">Referensi file tersimpan aman — akses hanya untuk karyawan berwenang.</p>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-line p-3">
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Catatan</h4>
                <NoteBox label="Dari customer" text={open.note} onSave={(v) => { /* handled inside */ }} order={open} field="note" />
                <NoteBox label="Internal produksi" text={open.prodNote} onSave={() => void 0} order={open} field="prodNote" />
              </div>
            </div>

            {/* timeline */}
            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Riwayat Status</h4>
              <div className="space-y-0">
                {[...open.history].reverse().map((h, i) => (
                  <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-surface" style={{ background: h.to === "cancelled" ? "#d33131" : STATUS_META[h.to].color }} />
                      {i < open.history.length - 1 && <span className="w-px flex-1 bg-line" />}
                    </div>
                    <div className="min-w-0 -mt-0.5">
                      <p className="text-[12.5px] font-bold">{h.from === "-" ? "Dibuat" : `${STATUS_META[h.from].label} → `}<span style={{ color: STATUS_META[h.to].color }}>{STATUS_META[h.to].label}</span></p>
                      <p className="text-[11px] text-muted">{fmtDateTime(h.date)} · {db.users.find((u) => u.id === h.userId)?.name || "?"}{h.note ? ` · ${h.note}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {open && payModal && (
        <PayModal order={open} onClose={() => setPayModal(false)} onSave={(amount, method, ref) => {
          recordPayment(open.id, amount, method, ref);
          setPayModal(false);
          toast.push({ title: "Pembayaran tercatat", desc: `${fmtIDR(amount)} untuk ${open.number}`, kind: "ok" });
        }} />
      )}
      {invoice && <InvoiceModal order={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}

function Info({ label, value, sub, warn }: { label: string; value?: React.ReactNode; sub?: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-faint">{label}</p>
      <p className={`text-[13px] font-bold ${warn ? "text-danger" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function AssignSelect({ order }: { order: Order }) {
  const { db, updateOrder } = useStore();
  return (
    <select value={order.assigneeId || ""} onChange={(e) => updateOrder(order.id, { assigneeId: e.target.value || undefined })}
      className="h-8 w-full rounded-lg border border-line2 bg-surface px-2 text-[12.5px] font-semibold outline-none focus:border-brand">
      <option value="">— belum ditugaskan —</option>
      {db.users.filter((u) => ["production", "designer"].includes(u.role) && u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  );
}

function NoteBox({ label, text, order, field }: { label: string; text?: string; onSave: (v: string) => void; order: Order; field: "note" | "prodNote" }) {
  const { updateOrder } = useStore();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(text || "");
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold text-faint">{label}</p>
        <button onClick={() => { setV(text || ""); setEdit((x) => !x); }} className="text-[10.5px] font-bold text-brand hover:underline">{edit ? "tutup" : "edit"}</button>
      </div>
      {edit ? (
        <div className="mt-1 flex gap-1.5">
          <Textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} />
          <Btn size="sm" onClick={() => { updateOrder(order.id, { [field]: v || undefined } as Partial<Order>); setEdit(false); }}>Simpan</Btn>
        </div>
      ) : (
        <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-muted">{text || "—"}</p>
      )}
    </div>
  );
}

export function PayModal({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (amount: number, method: PayMethod, ref?: string) => void }) {
  const { db } = useStore();
  const balance = balanceOf(db, order);
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [ref, setRef] = useState("");
  return (
    <Modal open onClose={onClose} title={`Pembayaran · ${order.number}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn>
        <Btn disabled={amount <= 0 || amount > balance} onClick={() => onSave(amount, method, ref || undefined)}><Wallet size={14} /> Simpan {fmtIDR(Math.min(amount, balance))}</Btn></>}>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-warn-soft px-3 py-2.5 text-[13px] font-bold text-warn">
          <span>Sisa tagihan</span><span className="tabular">{fmtIDR(balance)}</span>
        </div>
        <Field label="Jumlah Bayar">
          <Input type="number" min={0} max={balance} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} autoFocus />
        </Field>
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
        <Field label="No. Referensi (opsional)"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="mis. no. bukti transfer" /></Field>
        {amount >= balance && <p className="rounded-lg bg-ok-soft px-3 py-2 text-[12px] font-bold text-ok">Pembayaran lunas — order otomatis masuk antrian produksi.</p>}
      </div>
    </Modal>
  );
}


