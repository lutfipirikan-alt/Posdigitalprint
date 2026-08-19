import React, { useMemo, useState } from "react";
import { PackageCheck, Pencil, Plus, Truck } from "lucide-react";
import type { PurchaseItem, Supplier } from "../lib/types";
import { payableBalance, useStore } from "../lib/store";
import { fmtDate, fmtIDR, fmtIDRShort, uid } from "../lib/format";
import { Btn, Chip, Drawer, Field, Input, Modal, PageHead, SearchInput, Select, THead, TR, TD, Textarea, Tabs, useToast, Empty } from "../components/ui";

export default function Suppliers() {
  const { db, receivePurchase } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("sup");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [poModal, setPoModal] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => db.suppliers.filter((sp) => !q || (sp.name + (sp.contact || "") + (sp.phone || "")).toLowerCase().includes(q.toLowerCase())), [db.suppliers, q]);
  const open = db.suppliers.find((s) => s.id === openId) || null;

  const supStats = (id: string) => {
    const pos = db.purchases.filter((p) => p.supplierId === id);
    const aps = db.payables.filter((a) => a.supplierId === id);
    return { count: pos.length, total: pos.reduce((a, b) => a + b.total, 0), owed: aps.reduce((a, b) => a + payableBalance(b), 0) };
  };

  return (
    <div>
      <PageHead title="Supplier & Pembelian" desc="Pemasok bahan baku, purchase order, dan penerimaan barang">
        <SearchInput value={q} onChange={setQ} placeholder="Cari supplier…" className="w-56" />
        <Btn variant="outline" onClick={() => setPoModal(true)}><Truck size={14} /> Buat PO</Btn>
        <Btn onClick={() => setCreating(true)}><Plus size={14} /> Supplier Baru</Btn>
      </PageHead>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "sup", label: "Supplier", badge: db.suppliers.length },
        { id: "po", label: "Purchase Order", badge: db.purchases.filter((p) => !p.received).length },
      ]} />

      {tab === "sup" && (
        <div className="card anim-in overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <THead cols={["Nama", "Kontak", "Telepon", "Alamat", "PO", "Total Beli", "Hutang Berjalan"]} />
              <tbody>
                {rows.map((sp) => {
                  const st = supStats(sp.id);
                  return (
                    <TR key={sp.id} onClick={() => setOpenId(sp.id)}>
                      <TD className="font-bold">{sp.name}</TD>
                      <TD className="text-muted">{sp.contact || "—"}</TD>
                      <TD className="text-muted">{sp.phone || "—"}</TD>
                      <TD className="max-w-[200px] truncate text-muted">{sp.address || "—"}</TD>
                      <TD className="tabular">{st.count}</TD>
                      <TD className="tabular font-bold">{fmtIDRShort(st.total)}</TD>
                      <TD>{st.owed > 0 ? <Chip color="#d33131">{fmtIDRShort(st.owed)}</Chip> : <Chip color="#178a4c">Lunas</Chip>}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <Empty title="Supplier tidak ditemukan" />}
          </div>
        </div>
      )}

      {tab === "po" && (
        <div className="card anim-in overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <THead cols={["No. PO", "Supplier", "Tanggal", "Item", "Total", "Jatuh Tempo", "Status", ""]} />
              <tbody>
                {db.purchases.map((p) => {
                  const sp = db.suppliers.find((s) => s.id === p.supplierId);
                  return (
                    <TR key={p.id}>
                      <TD className="font-display text-[12.5px] font-bold">{p.number}</TD>
                      <TD className="font-semibold">{sp?.name}</TD>
                      <TD className="whitespace-nowrap text-muted">{fmtDate(p.date)}</TD>
                      <TD className="max-w-[240px] truncate text-muted">{p.items.map((it) => `${it.qty}× ${db.inventory.find((m) => m.id === it.itemId)?.name || "?"}`).join(", ")}</TD>
                      <TD className="tabular font-bold">{fmtIDR(p.total)}</TD>
                      <TD className="whitespace-nowrap text-muted">{p.dueDate ? fmtDate(p.dueDate) : "—"}</TD>
                      <TD>{p.received ? <Chip color="#178a4c">Diterima {p.receivedAt ? fmtDate(p.receivedAt) : ""}</Chip> : <Chip color="#b45309" pulse>Menunggu Barang</Chip>}</TD>
                      <TD>{!p.received && (
                        <Btn size="sm" variant="ok" onClick={() => { receivePurchase(p.id); toast.push({ title: `${p.number} diterima`, desc: "Stok masuk & hutang supplier tercatat", kind: "ok" }); }}>
                          <PackageCheck size={12} /> Terima
                        </Btn>
                      )}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(creating || edit) && <SupplierModal initial={edit} onClose={() => { setCreating(false); setEdit(null); }} />}
      {poModal && <POModal onClose={() => setPoModal(false)} />}

      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.name}
          footer={<Btn variant="outline" onClick={() => setEdit(open)}><Pencil size={13} /> Edit</Btn>}>
          {(() => {
            const st = supStats(open.id);
            const pos = db.purchases.filter((p) => p.supplierId === open.id);
            const aps = db.payables.filter((a) => a.supplierId === open.id);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-line p-3"><p className="text-[10px] font-bold uppercase text-faint">Total Beli</p><p className="tabular mt-1 font-display text-[16px] font-bold">{fmtIDRShort(st.total)}</p></div>
                  <div className="rounded-xl border border-line p-3"><p className="text-[10px] font-bold uppercase text-faint">Hutang</p><p className={`tabular mt-1 font-display text-[16px] font-bold ${st.owed > 0 ? "text-danger" : "text-ok"}`}>{fmtIDRShort(st.owed)}</p></div>
                  <div className="rounded-xl border border-line p-3"><p className="text-[10px] font-bold uppercase text-faint">Jumlah PO</p><p className="tabular mt-1 font-display text-[16px] font-bold">{st.count}</p></div>
                </div>
                <div className="space-y-1.5 rounded-xl border border-line p-3 text-[12.5px]">
                  <p><b>Kontak:</b> {open.contact || "—"} · {open.phone || "—"} {open.wa ? `· WA ${open.wa}` : ""}</p>
                  <p className="text-muted">{open.address}</p>
                  {open.notes && <p className="rounded-lg bg-surface2 px-2.5 py-1.5 text-[11.5px] text-muted">{open.notes}</p>}
                </div>
                <div>
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Riwayat PO</h4>
                  <div className="space-y-1.5">
                    {pos.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[12.5px]">
                        <span className="font-display font-bold">{p.number}</span>
                        <span className="text-muted">{fmtDate(p.date)}</span>
                        <span className="tabular font-bold">{fmtIDR(p.total)}</span>
                        {p.received ? <Chip color="#178a4c">Diterima</Chip> : <Chip color="#b45309">Proses</Chip>}
                      </div>
                    ))}
                    {pos.length === 0 && <p className="text-[12px] text-faint">Belum ada PO.</p>}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Hutang (Account Payable)</h4>
                  <div className="space-y-1.5">
                    {aps.map((a) => {
                      const bal = payableBalance(a);
                      return (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[12.5px]">
                          <span className="font-bold">{a.invoiceNo}</span>
                          <span className="text-muted">JT {fmtDate(a.dueDate)}</span>
                          <span className="tabular font-bold">{fmtIDR(a.amount)}</span>
                          {bal > 0 ? <Chip color="#d33131">sisa {fmtIDRShort(bal)}</Chip> : <Chip color="#178a4c">Lunas</Chip>}
                        </div>
                      );
                    })}
                    {aps.length === 0 && <p className="text-[12px] text-faint">Tidak ada hutang.</p>}
                  </div>
                </div>
              </div>
            );
          })()}
        </Drawer>
      )}
    </div>
  );
}

function SupplierModal({ initial, onClose }: { initial: Supplier | null; onClose: () => void }) {
  const { saveSupplier } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Supplier>(initial || { id: uid(), name: "", createdAt: Date.now() });
  const set = (p: Partial<Supplier>) => setF((x) => ({ ...x, ...p }));
  const save = () => {
    if (!f.name.trim()) { toast.push({ title: "Nama supplier wajib diisi", kind: "warn" }); return; }
    saveSupplier({ ...f, name: f.name.trim() });
    toast.push({ title: "Supplier tersimpan", desc: f.name, kind: "ok" });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={initial ? "Edit Supplier" : "Supplier Baru"}
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save}>Simpan</Btn></>}>
      <div className="space-y-3">
        <Field label="Nama Supplier *"><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Nama Kontak"><Input value={f.contact || ""} onChange={(e) => set({ contact: e.target.value })} /></Field>
          <Field label="Telepon"><Input value={f.phone || ""} onChange={(e) => set({ phone: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="WhatsApp"><Input value={f.wa || ""} onChange={(e) => set({ wa: e.target.value })} /></Field>
          <Field label="Alamat"><Input value={f.address || ""} onChange={(e) => set({ address: e.target.value })} /></Field>
        </div>
        <Field label="Catatan"><Textarea rows={2} value={f.notes || ""} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function POModal({ onClose }: { onClose: () => void }) {
  const { db, createPurchase } = useStore();
  const toast = useToast();
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id || "");
  const [items, setItems] = useState<PurchaseItem[]>([{ itemId: db.inventory[0]?.id || "", qty: 1, cost: db.inventory[0]?.cost || 0 }]);
  const [due, setDue] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); });
  const [note, setNote] = useState("");
  const total = items.reduce((a, b) => a + b.qty * b.cost, 0);

  const save = () => {
    if (!supplierId || items.length === 0 || items.some((i) => i.qty <= 0 || i.cost < 0)) { toast.push({ title: "Periksa kembali item PO", kind: "warn" }); return; }
    createPurchase(supplierId, items, new Date(due + "T17:00:00").getTime(), note || undefined);
    toast.push({ title: "PO dibuat", desc: `Total ${fmtIDR(total)} — terima barang di tab Purchase Order`, kind: "ok" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} width="max-w-xl" title="Purchase Order Baru"
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save}><Truck size={14} /> Buat PO · {fmtIDR(total)}</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Jatuh Tempo"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <Field label="Item Pembelian">
          <div className="space-y-1.5">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select className="flex-1" value={it.itemId} onChange={(e) => {
                  const mat = db.inventory.find((m) => m.id === e.target.value);
                  setItems(items.map((x, xi) => xi === i ? { ...x, itemId: e.target.value, cost: mat?.cost || x.cost } : x));
                }}>
                  {db.inventory.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </Select>
                <Input type="number" min={1} className="w-20" value={it.qty || ""} onChange={(e) => setItems(items.map((x, xi) => xi === i ? { ...x, qty: Number(e.target.value) || 0 } : x))} />
                <Input type="number" min={0} className="w-28" value={it.cost || ""} onChange={(e) => setItems(items.map((x, xi) => xi === i ? { ...x, cost: Number(e.target.value) || 0 } : x))} />
                <button onClick={() => setItems(items.filter((_, xi) => xi !== i))} className="rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger" disabled={items.length === 1}>✕</button>
              </div>
            ))}
            <Btn size="sm" variant="outline" onClick={() => setItems([...items, { itemId: db.inventory[0]?.id || "", qty: 1, cost: db.inventory[0]?.cost || 0 }])}><Plus size={12} /> Tambah Item</Btn>
          </div>
        </Field>
        <Field label="Catatan"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opsional" /></Field>
        <p className="rounded-lg bg-surface2 px-3 py-2 text-[11.5px] text-muted">Saat barang diterima, stok otomatis bertambah dan hutang supplier (AP) tercatat di jurnal.</p>
      </div>
    </Modal>
  );
}
