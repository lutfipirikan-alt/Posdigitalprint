import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import type { InventoryItem, InvTx } from "../lib/types";
import { INV_CAT_META } from "../lib/types";
import { invValue, lowStock, useStore } from "../lib/store";
import { fmtDateTime, fmtIDR, fmtIDRShort, fmtNum } from "../lib/format";
import { Btn, Chip, Drawer, Field, Input, Modal, PageHead, SearchInput, Select, THead, TR, TD, Textarea, Tabs, useToast, Empty } from "../components/ui";

export default function Inventory() {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("semua");
  const [lowOnly, setLowOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [move, setMove] = useState<{ item: InventoryItem; type: "in" | "out" | "adj" } | null>(null);

  const rows = useMemo(() => db.inventory.filter((m) =>
    (cat === "semua" || m.category === cat) &&
    (!lowOnly || m.stock <= m.minStock) &&
    (!q || (m.name + m.sku).toLowerCase().includes(q.toLowerCase()))
  ), [db.inventory, q, cat, lowOnly]);

  const open = db.inventory.find((m) => m.id === openId) || null;
  const low = lowStock(db);

  return (
    <div>
      <PageHead title="Inventori Bahan Baku" desc="Kertas, vinyl, tinta, akrilik & bahan habis pakai lainnya">
        <Chip color="#0e7490">Nilai stok {fmtIDRShort(invValue(db))}</Chip>
        <Chip color={low.length ? "#b45309" : "#178a4c"}>{low.length ? `${low.length} di bawah minimum` : "Semua di atas minimum"}</Chip>
      </PageHead>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Cari bahan / SKU…" className="w-60" />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44">
          <option value="semua">Semua kategori</option>
          {Object.entries(INV_CAT_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <button onClick={() => setLowOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-bold transition-all ${lowOnly ? "border-warn bg-warn-soft text-warn" : "border-line bg-surface text-muted hover:border-line2"}`}>
          <AlertTriangle size={13} /> Hanya stok menipis ({low.length})
        </button>
      </div>

      <div className="card anim-in overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <THead cols={["SKU", "Bahan", "Kategori", "Stok", "Min", "Harga Beli", "Nilai", "Supplier", "Status", ""]} />
            <tbody>
              {rows.map((m) => {
                const isLow = m.stock <= m.minStock;
                const sup = db.suppliers.find((sp) => sp.id === m.supplierId);
                return (
                  <TR key={m.id} onClick={() => setOpenId(m.id)}>
                    <TD className="font-display text-[12px] font-bold text-muted">{m.sku}</TD>
                    <TD className="font-bold">{m.name}</TD>
                    <TD className="text-muted">{INV_CAT_META[m.category]}</TD>
                    <TD className="tabular font-bold">{fmtNum(m.stock)} <span className="text-[10.5px] font-semibold text-faint">{m.unit}</span></TD>
                    <TD className="tabular text-muted">{m.minStock}</TD>
                    <TD className="tabular text-muted">{fmtIDR(m.cost)}</TD>
                    <TD className="tabular font-semibold">{fmtIDR(m.stock * m.cost)}</TD>
                    <TD className="max-w-[150px] truncate text-muted">{sup?.name || "—"}</TD>
                    <TD>{isLow ? <Chip color="#d33131" pulse>Stok Menipis</Chip> : m.stock <= m.minStock * 1.5 ? <Chip color="#b45309">Hampir Habis</Chip> : <Chip color="#178a4c">Aman</Chip>}</TD>
                    <TD>
                      <div className="flex gap-1">
                        <button title="Stok masuk" onClick={(e) => { e.stopPropagation(); setMove({ item: m, type: "in" }); }} className="rounded-md p-1.5 text-muted hover:bg-ok-soft hover:text-ok"><ArrowDownToLine size={14} /></button>
                        <button title="Stok keluar" onClick={(e) => { e.stopPropagation(); setMove({ item: m, type: "out" }); }} className="rounded-md p-1.5 text-muted hover:bg-warn-soft hover:text-warn"><ArrowUpFromLine size={14} /></button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <Empty title="Tidak ada bahan" desc="Ubah filter untuk melihat bahan lain." />}
        </div>
      </div>

      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={<span>{open.name} <span className="kbd ml-1">{open.sku}</span></span>}
          footer={<>
            <Btn variant="outline" onClick={() => setMove({ item: open, type: "adj" })}><SlidersHorizontal size={13} /> Penyesuaian</Btn>
            <Btn variant="outline" onClick={() => setMove({ item: open, type: "out" })}><ArrowUpFromLine size={13} /> Keluar</Btn>
            <Btn onClick={() => setMove({ item: open, type: "in" })}><ArrowDownToLine size={13} /> Masuk</Btn>
          </>}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line p-3"><p className="text-[10px] font-bold uppercase text-faint">Stok</p><p className="tabular mt-1 font-display text-[18px] font-bold">{fmtNum(open.stock)} {open.unit}</p></div>
              <div className="rounded-xl border border-line p-3"><p className="text-[10px] font-bold uppercase text-faint">Minimum</p><p className="tabular mt-1 font-display text-[18px] font-bold">{open.minStock}</p></div>
              <div className="rounded-xl border border-line p-3"><p className="text-[10px] font-bold uppercase text-faint">Nilai</p><p className="tabular mt-1 font-display text-[18px] font-bold">{fmtIDRShort(open.stock * open.cost)}</p></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {db.products.filter((p) => p.bom.some((b) => b.materialId === open.id)).map((p) => (
                <Chip key={p.id} color="#475569">Dipakai: {p.name}</Chip>
              ))}
            </div>
            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Riwayat Pergerakan</h4>
              <div className="space-y-1.5">
                {db.invTx.filter((t) => t.itemId === open.id).slice(0, 25).map((t) => <TxRow key={t.id} t={t} />)}
                {db.invTx.filter((t) => t.itemId === open.id).length === 0 && <p className="rounded-lg border border-dashed border-line2 px-3 py-3 text-center text-[12px] text-faint">Belum ada pergerakan tercatat.</p>}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {move && <MoveModal item={move.item} type={move.type} onClose={() => setMove(null)} />}
    </div>
  );
}

function TxRow({ t }: { t: InvTx }) {
  const { db } = useStore();
  const color = t.type === "in" ? "#178a4c" : t.type === "out" ? "#d33131" : "#b45309";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-[12px]">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: color + "18", color }}>
        {t.type === "in" ? <ArrowDownToLine size={12} /> : t.type === "out" ? <ArrowUpFromLine size={12} /> : <SlidersHorizontal size={12} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t.type === "in" ? "Stok Masuk" : t.type === "out" ? "Stok Keluar" : "Penyesuaian"}{t.ref ? ` · ${t.ref}` : ""}</p>
        <p className="truncate text-[11px] text-muted">{t.note || "—"} · oleh {db.users.find((u) => u.id === t.userId)?.name || "?"}</p>
      </div>
      <div className="text-right">
        <p className="tabular font-bold" style={{ color }}>{t.type === "in" ? "+" : "−"}{fmtNum(t.qty)}</p>
        <p className="text-[10px] text-faint">{fmtDateTime(t.date)}</p>
      </div>
    </div>
  );
}

function MoveModal({ item, type, onClose }: { item: InventoryItem; type: "in" | "out" | "adj"; onClose: () => void }) {
  const { stockMove } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState(type);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const save = () => {
    if (!qty || (mode !== "adj" && qty <= 0)) { toast.push({ title: "Jumlah tidak valid", kind: "warn" }); return; }
    stockMove(item.id, mode, mode === "adj" ? qty : qty, note || (mode === "in" ? "Stok masuk manual" : mode === "out" ? "Stok keluar manual" : "Penyesuaian stok"));
    toast.push({ title: `Stok ${item.name} diperbarui`, desc: `${mode === "in" ? "+" : mode === "out" ? "−" : "±"}${fmtNum(qty)} ${item.unit}`, kind: "ok" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Pergerakan Stok · ${item.name}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save} variant={mode === "out" ? "danger" : mode === "adj" ? "outline" : "ok"}>Simpan Pergerakan</Btn></>}>
      <div className="space-y-3">
        <Tabs value={mode} onChange={(v) => setMode(v as "in" | "out" | "adj")} tabs={[
          { id: "in", label: "Masuk" }, { id: "out", label: "Keluar" }, { id: "adj", label: "Penyesuaian (±)" },
        ]} />
        <p className="rounded-lg bg-surface2 px-3 py-2 text-[12px] text-muted">Stok saat ini: <b className="tabular">{fmtNum(item.stock)} {item.unit}</b> · minimum {item.minStock}</p>
        <Field label={`Jumlah (${item.unit})`}>
          <Input autoFocus type="number" step="0.01" value={qty || ""} onChange={(e) => setQty(Number(e.target.value))} />
        </Field>
        <Field label="Keterangan"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. penerimaan tanpa PO, bahan rusak, stock opname…" /></Field>
      </div>
    </Modal>
  );
}
