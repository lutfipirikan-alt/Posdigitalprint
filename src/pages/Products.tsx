import React, { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { PriceTier, Product } from "../lib/types";
import { PRICING_META, UNITS } from "../lib/types";
import { useStore } from "../lib/store";
import { evalFormula } from "../lib/pricing";
import { fmtIDR, uid } from "../lib/format";
import { Btn, Chip, Field, Input, Modal, PageHead, SearchInput, Select, THead, TR, TD, Textarea, useToast, Empty } from "../components/ui";

export default function Products() {
  const { db, user } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("semua");
  const [edit, setEdit] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const canEdit = user && ["admin", "manager"].includes(user.role);

  const cats = useMemo(() => Array.from(new Set(db.products.map((p) => p.category))), [db.products]);
  const rows = useMemo(() => db.products.filter((p) =>
    (cat === "semua" || p.category === cat) && (!q || (p.name + p.sku + p.category).toLowerCase().includes(q.toLowerCase()))
  ), [db.products, q, cat]);

  return (
    <div>
      <PageHead title="Produk & Jasa" desc="30+ produk dengan metode harga fleksibel: per pcs, lembar, m², hingga rumus custom">
        <SearchInput value={q} onChange={setQ} placeholder="Cari produk / SKU…" className="w-60" />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44">
          <option value="semua">Semua kategori</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        {canEdit && <Btn onClick={() => setCreating(true)}><Plus size={14} /> Produk Baru</Btn>}
      </PageHead>

      <div className="card anim-in overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <THead cols={["SKU", "Produk", "Kategori", "Metode Harga", "Harga Jual", "HPP", "Marjin", "MOQ", "Lead", "Status", canEdit ? "" : ""]} />
            <tbody>
              {rows.map((p) => {
                const margin = p.basePrice > 0 ? ((p.basePrice - p.costPrice) / p.basePrice) * 100 : 0;
                return (
                  <TR key={p.id} onClick={canEdit ? () => setEdit(p) : undefined} className={!p.active ? "opacity-45" : ""}>
                    <TD className="font-display text-[12px] font-bold text-muted">{p.sku}</TD>
                    <TD>
                      <p className="font-bold">{p.name}</p>
                      {p.bom.length > 0 && <p className="text-[10.5px] text-faint">BOM: {p.bom.length} bahan baku</p>}
                    </TD>
                    <TD className="text-muted">{p.category}</TD>
                    <TD><Chip color={p.method === "formula" ? "#7c3aed" : p.method === "sqm" ? "#0e7490" : "#475569"}>{PRICING_META[p.method].label}{p.tiers && p.tiers.length > 1 ? " · bertingkat" : ""}</Chip></TD>
                    <TD className="tabular font-bold">{fmtIDR(p.basePrice)}<span className="text-[10px] text-faint">/{p.unit}</span></TD>
                    <TD className="tabular text-muted">{fmtIDR(p.costPrice)}</TD>
                    <TD className={`tabular font-semibold ${margin > 30 ? "text-ok" : margin > 0 ? "text-warn" : "text-danger"}`}>{margin.toFixed(0)}%</TD>
                    <TD className="tabular">{p.moq}</TD>
                    <TD className="tabular">{p.leadDays} hr</TD>
                    <TD>{p.active ? <Chip color="#178a4c">Aktif</Chip> : <Chip color="#64748b">Nonaktif</Chip>}</TD>
                    {canEdit && <TD><button onClick={(e) => { e.stopPropagation(); setEdit(p); }} className="rounded-md p-1.5 text-muted hover:bg-surface2 hover:text-brand"><Pencil size={14} /></button></TD>}
                  </TR>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <Empty title="Produk tidak ditemukan" desc="Coba kata kunci lain atau tambah produk baru." />}
        </div>
      </div>

      {(creating || edit) && <ProductModal initial={edit} onClose={() => { setCreating(false); setEdit(null); }} />}
    </div>
  );
}

function ProductModal({ initial, onClose }: { initial: Product | null; onClose: () => void }) {
  const { db, saveProduct } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Product>(initial || {
    id: uid(), sku: "SPC-" + String(db.products.length + 1).padStart(3, "0"), name: "", category: "Cetak Digital",
    method: "piece", unit: "pcs", basePrice: 0, costPrice: 0, moq: 1, leadDays: 1, bom: [], active: true, usesSize: false,
  });
  const set = (p: Partial<Product>) => setF((x) => ({ ...x, ...p }));

  const [testQty, setTestQty] = useState(100);
  const testVars = { qty: testQty, p: 10, l: 10, luas: 0.01, area: 0.01, base: f.basePrice, bahan: 0 };
  let testResult: number | null = null;
  let testErr: string | null = null;
  if (f.method === "formula") {
    try { testResult = Math.round(evalFormula(f.formula || "base * qty", testVars)); }
    catch (e) { testErr = (e as Error).message; }
  }

  const save = () => {
    if (!f.name.trim()) { toast.push({ title: "Nama produk wajib diisi", kind: "warn" }); return; }
    if (f.basePrice <= 0 && f.method !== "formula") { toast.push({ title: "Harga dasar wajib diisi", kind: "warn" }); return; }
    if (f.method === "formula" && !f.formula?.trim()) { toast.push({ title: "Rumus wajib diisi", kind: "warn" }); return; }
    saveProduct({ ...f, name: f.name.trim(), tiers: f.tiers?.filter((t) => t.price > 0) });
    toast.push({ title: initial ? "Produk diperbarui" : "Produk ditambahkan", desc: f.name, kind: "ok" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} width="max-w-2xl" title={initial ? `Edit Produk · ${f.sku}` : "Produk Baru"}
      footer={<>
        <label className="mr-auto flex cursor-pointer items-center gap-2 text-[12.5px] font-bold text-muted">
          <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-[#0e7490]" /> Aktif dijual
        </label>
        <Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save}>Simpan Produk</Btn>
      </>}>
      <div className="space-y-3.5">
        <div className="grid grid-cols-3 gap-2.5">
          <Field label="Nama Produk *" className="col-span-2"><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="SKU"><Input value={f.sku} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <Field label="Kategori">
            <Input list="cats" value={f.category} onChange={(e) => set({ category: e.target.value })} />
            <datalist id="cats">{Array.from(new Set(db.products.map((p) => p.category))).map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Deskripsi" className="col-span-2"><Input value={f.desc || ""} onChange={(e) => set({ desc: e.target.value })} placeholder="opsional" /></Field>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          <Field label="Metode Harga">
            <Select value={f.method} onChange={(e) => set({ method: e.target.value as Product["method"] })}>
              {Object.entries(PRICING_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Satuan">
            <Select value={f.unit} onChange={(e) => set({ unit: e.target.value })}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</Select>
          </Field>
          <Field label="MOQ"><Input type="number" min={1} value={f.moq} onChange={(e) => set({ moq: Math.max(1, Number(e.target.value) || 1) })} /></Field>
          <Field label="Lead (hari)"><Input type="number" min={0} value={f.leadDays} onChange={(e) => set({ leadDays: Math.max(0, Number(e.target.value) || 0) })} /></Field>
        </div>
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-[11.5px] font-semibold text-brand">{PRICING_META[f.method].hint}</p>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label={f.method === "sqm" ? "Harga per m² (Rp)" : "Harga Dasar (Rp)"}><Input type="number" min={0} value={f.basePrice || ""} onChange={(e) => set({ basePrice: Number(e.target.value) || 0 })} /></Field>
          <Field label="Harga Pokok / HPP (Rp)"><Input type="number" min={0} value={f.costPrice || ""} onChange={(e) => set({ costPrice: Number(e.target.value) || 0 })} /></Field>
        </div>

        {(f.method === "piece" || f.method === "sheet") && (
          <Field label="Harga Bertingkat (qty ≥ … maka harga …)" hint="Kosongkan jika harga flat untuk semua qty.">
            <div className="space-y-1.5">
              {(f.tiers || []).map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold text-faint">≥</span>
                  <Input type="number" min={1} className="w-28" value={t.minQty} onChange={(e) => set({ tiers: (f.tiers || []).map((x, xi) => xi === i ? { ...x, minQty: Number(e.target.value) || 1 } : x) })} />
                  <span className="text-[11.5px] font-bold text-faint">→ Rp</span>
                  <Input type="number" min={0} value={t.price} onChange={(e) => set({ tiers: (f.tiers || []).map((x, xi) => xi === i ? { ...x, price: Number(e.target.value) || 0 } : x) })} />
                  <button onClick={() => set({ tiers: (f.tiers || []).filter((_, xi) => xi !== i) })} className="rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
                </div>
              ))}
              <Btn size="sm" variant="outline" onClick={() => set({ tiers: [...(f.tiers || []), { minQty: (f.tiers?.length ? Math.max(...f.tiers.map((t) => t.minQty)) * 2 : 100), price: Math.round(f.basePrice * 0.85) }] })}>
                <Plus size={12} /> Tambah Tier
              </Btn>
            </div>
          </Field>
        )}

        {f.method === "formula" && (
          <Field label="Rumus Harga" hint="Variabel: qty, p (lebar cm), l (tinggi cm), luas (m² per pcs), base (harga dasar), bahan (surcharge bahan)">
            <Input value={f.formula || ""} onChange={(e) => set({ formula: e.target.value })} placeholder="mis. qty * (base + luas * 120000)" className="font-mono text-[12.5px]" />
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[11px] font-bold text-faint">Uji (qty {testQty}):</span>
              <input type="range" min={1} max={500} value={testQty} onChange={(e) => setTestQty(Number(e.target.value))} className="w-32 accent-[#0e7490]" />
              {testErr ? <span className="text-[11.5px] font-bold text-danger">{testErr}</span>
                : <span className="tabular rounded-md bg-ok-soft px-2 py-0.5 text-[12px] font-bold text-ok">= {fmtIDR(testResult || 0)}</span>}
            </div>
          </Field>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold">
          <input type="checkbox" checked={f.usesSize} onChange={(e) => set({ usesSize: e.target.checked })} className="h-4 w-4 accent-[#0e7490]" />
          Order membutuhkan input ukuran Lebar × Tinggi (cm)
        </label>

        <Field label="Pilihan Bahan (pisahkan koma)" hint="Ditampilkan sebagai pilihan spesifikasi saat kasir membuat order.">
          <Input value={(f.materials || []).join(", ")} onChange={(e) => set({ materials: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined })} placeholder="mis. Vinyl Putih, Vinyl Transparan" />
        </Field>

        <Field label="Kebutuhan Bahan Baku (BOM)" hint="Otomatis dikurangi dari inventori saat order selesai diproduksi.">
          <div className="space-y-1.5">
            {(f.bom || []).map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select className="flex-1" value={b.materialId} onChange={(e) => set({ bom: f.bom.map((x, xi) => xi === i ? { ...x, materialId: e.target.value } : x) })}>
                  {db.inventory.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </Select>
                <span className="text-[11px] font-bold text-faint">×</span>
                <Input type="number" step="0.01" min={0} className="w-24" value={b.qtyPer} onChange={(e) => set({ bom: f.bom.map((x, xi) => xi === i ? { ...x, qtyPer: Number(e.target.value) || 0 } : x) })} />
                <span className="w-14 text-[10.5px] font-semibold text-faint">/{f.unit}</span>
                <button onClick={() => set({ bom: f.bom.filter((_, xi) => xi !== i) })} className="rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
              </div>
            ))}
            <Btn size="sm" variant="outline" onClick={() => set({ bom: [...(f.bom || []), { materialId: db.inventory[0]?.id || "", qtyPer: 0.1 }] })}>
              <Plus size={12} /> Tambah Bahan
            </Btn>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
