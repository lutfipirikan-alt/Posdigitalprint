import React, { useEffect, useMemo, useState } from "react";
import { Building2, Mail, MapPin, Pencil, Phone, UserPlus, Wallet } from "lucide-react";
import type { Customer } from "../lib/types";
import { CUSTOMER_TYPE_META } from "../lib/types";
import { balanceOf, customerStats, useStore } from "../lib/store";
import { fmtDate, fmtIDR, fmtIDRShort, uid } from "../lib/format";
import { Btn, Drawer, Field, Input, Modal, PageHead, SearchInput, Select, StatusPill, THead, TR, TD, Textarea, useToast, Empty } from "../components/ui";

export default function Customers() {
  const { db, nav, navigate } = useStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState("semua");
  const [edit, setEdit] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { if (nav.customerId) setOpenId(nav.customerId); }, [nav.customerId]);

  const rows = useMemo(() => db.customers.filter((c) => {
    const mq = !q || (c.name + c.phone + (c.wa || "") + (c.email || "")).toLowerCase().includes(q.toLowerCase());
    return mq && (type === "semua" || c.type === type);
  }), [db.customers, q, type]);

  const open = db.customers.find((c) => c.id === openId) || null;
  const typeColor: Record<string, string> = { retail: "#0e7490", reseller: "#d81159", corporate: "#2563eb", school: "#65a30d", government: "#7c3aed", regular: "#178a4c" };

  return (
    <div>
      <PageHead title="Pelanggan" desc={`${db.customers.length} pelanggan terdaftar beserta riwayat transaksi & piutang`}>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / telepon…" className="w-60" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-44">
          <option value="semua">Semua tipe</option>
          {Object.entries(CUSTOMER_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Btn onClick={() => setCreating(true)}><UserPlus size={14} /> Pelanggan Baru</Btn>
      </PageHead>

      <div className="card anim-in overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <THead cols={["Kode", "Nama", "Tipe", "Kontak", "Order", "Total Belanja", "Piutang", "Sejak"]} />
            <tbody>
              {rows.map((c) => {
                const st = customerStats(db, c.id);
                return (
                  <TR key={c.id} onClick={() => setOpenId(c.id)}>
                    <TD className="font-display text-[12px] font-bold text-muted">{c.code}</TD>
                    <TD className="font-bold">{c.name}</TD>
                    <TD><span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: (typeColor[c.type] || "#64748b") + "1a", color: typeColor[c.type] || "#64748b" }}>{CUSTOMER_TYPE_META[c.type]}</span></TD>
                    <TD className="text-muted">{c.phone}</TD>
                    <TD className="tabular">{st.count}</TD>
                    <TD className="tabular font-bold">{fmtIDRShort(st.totalBeli)}</TD>
                    <TD className={`tabular font-semibold ${st.sisa > 0 ? "text-warn" : "text-faint"}`}>{st.sisa > 0 ? fmtIDRShort(st.sisa) : "—"}</TD>
                    <TD className="whitespace-nowrap text-muted">{fmtDate(c.createdAt)}</TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <Empty title="Tidak ada pelanggan" desc="Ubah filter atau tambahkan pelanggan baru." />}
        </div>
      </div>

      {(creating || edit) && (
        <CustomerModal initial={edit} onClose={() => { setCreating(false); setEdit(null); }} />
      )}

      {open && (
        <Drawer open onClose={() => { setOpenId(null); navigate("customers", {}); }} width="max-w-xl"
          title={<span className="flex items-center gap-2"><Building2 size={16} className="text-brand" /> {open.name}</span>}
          footer={<Btn variant="outline" onClick={() => { setEdit(open); }}><Pencil size={13} /> Edit Pelanggan</Btn>}>
          {(() => {
            const st = customerStats(db, open.id);
            const orders = db.orders.filter((o) => o.customerId === open.id).sort((a, b) => b.createdAt - a.createdAt);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="Total Belanja" value={fmtIDR(st.totalBeli)} color="#0e7490" />
                  <StatBox label="Piutang Berjalan" value={fmtIDR(st.sisa)} color={st.sisa > 0 ? "#b45309" : "#178a4c"} />
                  <StatBox label="Jumlah Order" value={String(st.count)} color="#7c3aed" />
                </div>
                <div className="space-y-2 rounded-xl border border-line p-3 text-[12.5px]">
                  <p className="flex items-center gap-2"><Phone size={13} className="text-faint" /> {open.phone} {open.wa && open.wa !== open.phone ? ` · WA ${open.wa}` : ""}</p>
                  {open.email && <p className="flex items-center gap-2"><Mail size={13} className="text-faint" /> {open.email}</p>}
                  {open.address && <p className="flex items-start gap-2"><MapPin size={13} className="mt-0.5 shrink-0 text-faint" /> {open.address}</p>}
                  <p className="flex items-center gap-2"><Wallet size={13} className="text-faint" /> Tipe: <b>{CUSTOMER_TYPE_META[open.type]}</b></p>
                  {open.notes && <p className="rounded-lg bg-surface2 px-2.5 py-1.5 text-[11.5px] text-muted">{open.notes}</p>}
                </div>
                <div>
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Riwayat Order ({orders.length})</h4>
                  {orders.length === 0 && <p className="rounded-lg border border-dashed border-line2 px-3 py-3 text-center text-[12px] text-faint">Belum ada pesanan.</p>}
                  <div className="space-y-1.5">
                    {orders.map((o) => {
                      const bal = balanceOf(db, o);
                      return (
                        <button key={o.id} onClick={() => navigate("orders", { orderId: o.id })} className="flex w-full items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-brand/50 hover:bg-surface2">
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-[12px] font-bold">{o.number}</p>
                            <p className="truncate text-[11px] text-muted">{o.items.map((i) => i.name).join(", ")}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="tabular text-[12px] font-bold">{fmtIDRShort(o.total)}</span>
                            {bal > 0 ? <span className="tabular text-[10.5px] font-semibold text-warn">sisa {fmtIDRShort(bal)}</span> : <StatusPill status={o.status} />}
                          </div>
                        </button>
                      );
                    })}
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

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-faint">{label}</p>
      <p className="tabular mt-1 font-display text-[16px] font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export function CustomerModal({ initial, onClose }: { initial: Customer | null; onClose: () => void }) {
  const { db, saveCustomer } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Customer>(initial || {
    id: uid(), code: "C" + String(db.customers.length + 1).padStart(3, "0"), name: "", phone: "",
    type: "retail", createdAt: Date.now(),
  });
  const set = (patch: Partial<Customer>) => setF((p) => ({ ...p, ...patch }));

  const save = () => {
    if (!f.name.trim()) { toast.push({ title: "Nama wajib diisi", kind: "warn" }); return; }
    saveCustomer({ ...f, name: f.name.trim() });
    toast.push({ title: initial ? "Pelanggan diperbarui" : "Pelanggan ditambahkan", desc: f.name, kind: "ok" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? `Edit Pelanggan · ${initial.code}` : "Pelanggan Baru"}
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save}>{initial ? "Simpan Perubahan" : "Tambah Pelanggan"}</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Nama *"><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Tipe">
            <Select value={f.type} onChange={(e) => set({ type: e.target.value as Customer["type"] })}>
              {Object.entries(CUSTOMER_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Telepon"><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={f.wa || ""} onChange={(e) => set({ wa: e.target.value })} /></Field>
        </div>
        <Field label="Email"><Input value={f.email || ""} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Alamat"><Textarea rows={2} value={f.address || ""} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field label="Catatan" hint="mis. harga khusus reseller, NPWP, dll"><Textarea rows={2} value={f.notes || ""} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
