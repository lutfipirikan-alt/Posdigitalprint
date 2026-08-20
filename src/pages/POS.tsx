import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote, CalendarDays, FileText, Minus, Paperclip, Plus, QrCode, ShoppingBag,
  Smartphone, Trash2, UserPlus, Wallet, Wand2, X,
} from "lucide-react";
import type { Customer, Order, OrderItem, PayMethod, Product } from "../lib/types";
import { PAY_METHOD_META } from "../lib/types";
import { useStore } from "../lib/store";
import { computeLinePrice } from "../lib/pricing";
import { fmtDate, fmtIDR, fromDateInput, toDateInput, uid } from "../lib/format";
import { Btn, Field, Input, Modal, SearchInput, Select, Textarea, Chip, useToast } from "../components/ui";
import { InvoiceModal } from "../components/Invoice";

const METHOD_ICONS: Record<PayMethod, React.ReactNode> = {
  cash: <Banknote size={13} />, transfer: <Wallet size={13} />, qr: <QrCode size={13} />,
  ewallet: <Smartphone size={13} />, other: <ShoppingBag size={13} />,
};

export default function POS() {
  const { db, nav, navigate, createOrder } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [customerId, setCustomerId] = useState(db.customers[0]?.id || "");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [specProduct, setSpecProduct] = useState<Product | null>(null);
  const [discount, setDiscount] = useState(0);
  const [extraCharge, setExtraCharge] = useState(0);
  const [note, setNote] = useState("");
  const [prodNote, setProdNote] = useState("");
  const [dp, setDp] = useState(0);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [dueDate, setDueDate] = useState(toDateInput(Date.now() + 14 * 86_400_000));
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [needDesign, setNeedDesign] = useState(false);
  const [files, setFiles] = useState<Order["files"]>([]);
  const [custModal, setCustModal] = useState(false);
  const [invoice, setInvoice] = useState<Order | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nav.tab) { setQ(nav.tab); navigate("pos", {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.tab]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const cats = useMemo(() => ["Semua", ...Array.from(new Set(db.products.filter((p) => p.active).map((p) => p.category)))], [db.products]);
  const prods = useMemo(() => db.products.filter((p) => p.active && (cat === "Semua" || p.category === cat) && (!q || (p.name + p.sku).toLowerCase().includes(q.toLowerCase()))), [db.products, cat, q]);
  const customer = db.customers.find((c) => c.id === customerId);

  const subtotal = cart.reduce((a, b) => a + b.total, 0);
  const total = Math.max(0, subtotal - discount + extraCharge);

  const addToCart = (item: OrderItem) => {
    setCart((c) => [...c, item]);
    toast.push({ title: "Ditambahkan ke order", desc: item.name, kind: "ok" });
  };

  const recompute = (it: OrderItem, qty: number): OrderItem => {
    const pr = db.products.find((p) => p.id === it.productId);
    if (!pr) return { ...it, qty };
    const fins = db.finishings.filter((f) => it.finishingIds.includes(f.id));
    const calc = computeLinePrice(pr, { qty, width: it.width, height: it.height }, fins);
    return { ...it, qty, unitPrice: Math.round(calc.unit), total: calc.total };
  };

  const save = () => {
    if (!customer) { toast.push({ title: "Pilih pelanggan dulu", kind: "warn" }); return; }
    if (cart.length === 0) { toast.push({ title: "Keranjang kosong", desc: "Pilih minimal satu produk.", kind: "warn" }); return; }
    const order = createOrder({
      customerId, items: cart, discount, extraCharge, note, prodNote,
      deadline: deadline ? fromDateInput(deadline) + 17 * 3600_000 : undefined,
      dueDate: fromDateInput(dueDate) + 17 * 3600_000,
      files, assigneeId: assigneeId || undefined, dp, method, needDesign,
    });
    setInvoice(order);
    setCart([]); setDiscount(0); setExtraCharge(0); setNote(""); setProdNote(""); setDp(0); setFiles([]); setDeadline(""); setNeedDesign(false);
    toast.push({ title: `Order ${order.number} tersimpan`, desc: `${fmtIDR(order.total)} · ${dp >= order.total ? "Lunas" : `DP ${fmtIDR(dp)}`}`, kind: "ok" });
  };

  return (
    <div className="flex h-[calc(100vh-102px)] gap-4">
      {/* ===== left: catalog ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Pelanggan</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] font-bold outline-none">
              {db.customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select>
            {customer?.type === "reseller" && <Chip color="#d81159">Reseller −15%</Chip>}
            <button onClick={() => setCustModal(true)} title="Pelanggan baru" className="rounded-md p-1.5 text-brand hover:bg-brand-soft"><UserPlus size={16} /></button>
          </div>
          <SearchInput value={q} onChange={setQ} placeholder="Cari produk / SKU…  (F2)" inputRef={searchRef} className="w-64" />
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${cat === c ? "bg-side text-white shadow-sm" : "border border-line bg-surface text-muted hover:border-line2 hover:text-ink"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto pb-2 pr-1 md:grid-cols-3 2xl:grid-cols-4">
          {prods.map((p) => (
            <button key={p.id} onClick={() => setSpecProduct(p)}
              className="card hoverable group flex flex-col p-3 text-left transition-transform active:scale-[0.98]">
              <div className="flex w-full items-start justify-between gap-2">
                <span className="kbd">{p.sku}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-faint">{p.category}</span>
              </div>
              <p className="mt-2 line-clamp-2 min-h-[34px] text-[13px] font-bold leading-snug group-hover:text-brand">{p.name}</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="tabular font-display text-[15px] font-bold">{fmtIDR(p.basePrice)}<span className="text-[10px] font-semibold text-faint">/{p.unit}</span></span>
                {p.leadDays > 0 && <span className="text-[10px] font-semibold text-muted">{p.leadDays} hr</span>}
              </div>
            </button>
          ))}
          {prods.length === 0 && (
            <div className="col-span-full py-16 text-center text-[13px] text-faint">Tidak ada produk yang cocok dengan “{q}”.</div>
          )}
        </div>
      </div>

      {/* ===== right: cart ===== */}
      <div className="flex w-[400px] shrink-0 flex-col rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-display text-[14px] font-bold">Order Baru</h3>
          <span className="rounded-md bg-brand-soft px-2 py-0.5 font-display text-[11px] font-bold text-brand">{cart.length} item</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {cart.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <ShoppingBag size={28} className="text-faint" />
              <p className="text-[12.5px] font-semibold text-muted">Keranjang kosong</p>
              <p className="max-w-[240px] text-[11.5px] text-faint">Klik produk di katalog, atur spesifikasi & qty, lalu simpan transaksi.</p>
            </div>
          )}
          {cart.map((it) => (
            <div key={it.id} className="anim-in mb-2 rounded-lg border border-line bg-surface2/60 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold">{it.name}</p>
                  <p className="text-[10.5px] text-muted">
                    {[it.width && it.height ? `${it.width}×${it.height} cm` : "", it.material || "", it.finishingIds.length ? `${it.finishingIds.length} finishing` : ""].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button onClick={() => setCart((c) => c.filter((x) => x.id !== it.id))} className="rounded p-1 text-faint hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-line2 bg-surface">
                  <button onClick={() => setCart((c) => c.map((x) => x.id === it.id ? recompute(x, Math.max(1, x.qty - 1)) : x))} className="px-2 py-1 text-muted hover:text-ink"><Minus size={12} /></button>
                  <input type="number" min={1} value={it.qty} onChange={(e) => setCart((c) => c.map((x) => x.id === it.id ? recompute(x, Math.max(1, Number(e.target.value) || 1)) : x))}
                    className="tabular w-14 bg-transparent text-center text-[12.5px] font-bold outline-none" />
                  <button onClick={() => setCart((c) => c.map((x) => x.id === it.id ? recompute(x, x.qty + 1) : x))} className="px-2 py-1 text-muted hover:text-ink"><Plus size={12} /></button>
                </div>
                <span className="text-[10.5px] font-semibold text-faint">× {fmtIDR(it.unitPrice)}</span>
                <span className="tabular ml-auto font-display text-[13.5px] font-bold">{fmtIDR(it.total)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5 border-t border-line px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Diskon (Rp)">
              <Input type="number" min={0} value={discount || ""} placeholder="0" onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
            <Field label="Biaya Tambahan">
              <Input type="number" min={0} value={extraCharge || ""} placeholder="0" onChange={(e) => setExtraCharge(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
          </div>
          {customer?.type === "reseller" && discount === 0 && (
            <button onClick={() => setDiscount(Math.round(subtotal * 0.15))} className="w-full rounded-lg border border-dashed border-magenta/50 bg-magenta/5 px-3 py-1.5 text-[11.5px] font-bold text-magenta hover:bg-magenta/10">
              Terapkan diskon reseller 15% ({fmtIDR(Math.round(subtotal * 0.15))})
            </button>
          )}
          <div className="flex items-center justify-between text-[12.5px]"><span className="text-muted">Subtotal</span><span className="tabular font-bold">{fmtIDR(subtotal)}</span></div>
          {discount > 0 && <div className="flex items-center justify-between text-[12.5px]"><span className="text-muted">Diskon</span><span className="tabular font-bold text-danger">−{fmtIDR(discount)}</span></div>}
          {extraCharge > 0 && <div className="flex items-center justify-between text-[12.5px]"><span className="text-muted">Tambahan</span><span className="tabular font-bold">{fmtIDR(extraCharge)}</span></div>}
          <div className="flex items-center justify-between rounded-lg bg-side px-3 py-2.5 text-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Total</span>
            <span className="tabular font-display text-[19px] font-bold">{fmtIDR(total)}</span>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Uang Muka / Bayar</span>
              <div className="flex gap-1">
                {[0.5, 1].map((r) => (
                  <button key={r} onClick={() => setDp(Math.round(total * r))} className="rounded bg-surface2 px-2 py-0.5 text-[10.5px] font-bold text-muted hover:bg-line hover:text-ink">{r === 1 ? "LUNAS" : "50%"}</button>
                ))}
              </div>
            </div>
            <Input type="number" min={0} value={dp || ""} placeholder="0 — bayar di belakang" onChange={(e) => setDp(Math.min(total, Math.max(0, Number(e.target.value) || 0)))} />
            <p className="mt-1 text-[11px] font-semibold text-muted">Sisa piutang: <span className={`tabular ${total - dp > 0 ? "text-warn" : "text-ok"}`}>{fmtIDR(Math.max(0, total - dp))}</span></p>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(PAY_METHOD_META) as PayMethod[]).map((mm) => (
              <button key={mm} onClick={() => setMethod(mm)} title={PAY_METHOD_META[mm]}
                className={`flex flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-all ${method === mm ? "border-brand bg-brand-soft text-brand" : "border-line text-faint hover:border-line2 hover:text-muted"}`}>
                {METHOD_ICONS[mm]}
                <span className="text-[8.5px] font-bold uppercase">{PAY_METHOD_META[mm].split(" ")[0]}</span>
              </button>
            ))}
          </div>
          <details className="group">
            <summary className="cursor-pointer list-none text-[11.5px] font-bold text-brand hover:underline">Opsi lanjutan: deadline, PIC, file desain, catatan…</summary>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Jatuh Tempo"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
                <Field label="Deadline Produksi"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="PIC Produksi">
                  <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                    <option value="">— otomatis —</option>
                    {db.users.filter((u) => u.role === "production" || u.role === "designer").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                </Field>
                <label className="mt-[22px] flex cursor-pointer items-center gap-2 text-[12px] font-semibold">
                  <input type="checkbox" checked={needDesign} onChange={(e) => setNeedDesign(e.target.checked)} className="h-4 w-4 accent-[#0e7490]" />
                  Butuh desain <Wand2 size={13} className="text-[#7c3aed]" />
                </label>
              </div>
              <Field label="Catatan Customer"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. warna jangan terlalu gelap" /></Field>
              <Field label="Catatan Produksi"><Textarea rows={2} value={prodNote} onChange={(e) => setProdNote(e.target.value)} placeholder="instruksi internal untuk tim produksi" /></Field>
              <div>
                <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.ai,.cdr,.svg,.psd,.tiff,.zip" className="hidden"
                  onChange={(e) => {
                    const fs = Array.from(e.target.files || []).map((f) => ({ name: f.name, type: f.name.split(".").pop() || "", size: f.size, addedAt: Date.now() }));
                    if (fs.length) { setFiles((p) => [...p, ...fs]); toast.push({ title: `${fs.length} file dilampirkan`, kind: "info" }); }
                  }} />
                <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line2 py-2 text-[12px] font-bold text-muted hover:border-brand hover:text-brand">
                  <Paperclip size={13} /> Lampirkan file desain ({files.length})
                </button>
                {files.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md bg-surface2 px-2 py-1 text-[11.5px]">
                        <FileText size={12} className="text-brand" /><span className="flex-1 truncate font-semibold">{f.name}</span>
                        <button onClick={() => setFiles((p) => p.filter((_, x) => x !== i))} className="text-faint hover:text-danger"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>

        <div className="border-t border-line p-3">
          <Btn size="lg" variant="accent" className="w-full" onClick={save} disabled={cart.length === 0 || !customer}>
            <ShoppingBag size={16} /> Simpan Transaksi {total > 0 && `· ${fmtIDR(total)}`}
          </Btn>
        </div>
      </div>

      {specProduct && <SpecModal product={specProduct} onClose={() => setSpecProduct(null)} onAdd={(it) => { addToCart(it); setSpecProduct(null); }} />}
      <NewCustomerModal open={custModal} onClose={() => setCustModal(false)} onSaved={(c) => { setCustomerId(c.id); setCustModal(false); }} />
      {invoice && <InvoiceModal order={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}

/* ---------- spec modal ---------- */
function SpecModal({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (it: OrderItem) => void }) {
  const { db } = useStore();
  const [qty, setQty] = useState(Math.max(1, product.moq));
  const [w, setW] = useState<number | "">(product.usesSize ? (product.id === "p7" ? 60 : 100) : "");
  const [h, setH] = useState<number | "">(product.usesSize ? (product.id === "p7" ? 160 : 100) : "");
  const [material, setMaterial] = useState(product.materials?.[0] || "");
  const [fins, setFins] = useState<string[]>([]);
  const [itNote, setItNote] = useState("");
  const [withDesign, setWithDesign] = useState(false);

  const designProduct = db.products.find((p) => p.sku === "SPC-028");
  const selFins = db.finishings.filter((f) => fins.includes(f.id));
  const calc = computeLinePrice(product, { qty, width: w === "" ? undefined : Number(w), height: h === "" ? undefined : Number(h) }, selFins);
  const area = calc.area;

  const add = () => {
    const item: OrderItem = {
      id: uid(), productId: product.id, name: product.name, sku: product.sku, qty,
      width: w === "" ? undefined : Number(w), height: h === "" ? undefined : Number(h),
      material: material || undefined, finishingIds: fins, unitPrice: Math.round(calc.unit),
      extraPrice: 0, note: itNote || undefined, total: calc.total,
    };
    onAdd(item);
    if (withDesign && designProduct) {
      onAdd({ id: uid(), productId: designProduct.id, name: designProduct.name, sku: designProduct.sku, qty: 1, finishingIds: [], unitPrice: designProduct.basePrice, extraPrice: 0, note: `Desain untuk ${product.name}`, total: designProduct.basePrice });
    }
  };

  return (
    <Modal open onClose={onClose} title={<span>{product.name} <span className="kbd ml-1">{product.sku}</span></span>}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Batal</Btn>
        <Btn onClick={add}><Plus size={14} /> Tambah · {fmtIDR(calc.total + (withDesign && designProduct ? designProduct.basePrice : 0))}</Btn>
      </>}>
      <div className="space-y-3.5">
        {product.desc && <p className="rounded-lg bg-surface2 px-3 py-2 text-[12px] text-muted">{product.desc}</p>}
        <div className="grid grid-cols-3 gap-2.5">
          <Field label={`Qty (${product.unit})`}>
            <div className="flex items-center rounded-lg border border-line2 bg-surface">
              <button onClick={() => setQty((v) => Math.max(1, v - 1))} className="px-2.5 py-2 text-muted hover:text-ink"><Minus size={13} /></button>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="tabular w-full bg-transparent text-center text-[13px] font-bold outline-none" />
              <button onClick={() => setQty((v) => v + 1)} className="px-2.5 py-2 text-muted hover:text-ink"><Plus size={13} /></button>
            </div>
          </Field>
          {product.usesSize && (
            <>
              <Field label="Lebar (cm)"><Input type="number" min={1} value={w} onChange={(e) => setW(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
              <Field label="Tinggi (cm)"><Input type="number" min={1} value={h} onChange={(e) => setH(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
            </>
          )}
        </div>
        {product.usesSize && (
          <p className="text-[11.5px] font-semibold text-muted">Luas terhitung: <span className="tabular font-bold text-brand">{area.toFixed(2)} m²</span> × {fmtIDR(product.basePrice)}/m²</p>
        )}
        {product.materials && product.materials.length > 0 && (
          <Field label="Bahan">
            <div className="flex flex-wrap gap-1.5">
              {product.materials.map((mtl) => (
                <button key={mtl} onClick={() => setMaterial(mtl)}
                  className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all ${material === mtl ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:border-line2"}`}>
                  {mtl}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label="Finishing (opsional)">
          <div className="grid grid-cols-2 gap-1.5">
            {db.finishings.map((f) => {
              const on = fins.includes(f.id);
              return (
                <button key={f.id} onClick={() => setFins((p) => on ? p.filter((x) => x !== f.id) : [...p, f.id])}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition-all ${on ? "border-brand bg-brand-soft" : "border-line hover:border-line2"}`}>
                  <span className={`text-[11.5px] font-bold ${on ? "text-brand" : "text-muted"}`}>{f.name}</span>
                  <span className="tabular text-[10.5px] text-faint">{f.priceType === "flat" ? fmtIDR(f.price) : `${fmtIDR(f.price)}/${f.priceType === "perItem" ? product.unit : "m²"}`}</span>
                </button>
              );
            })}
          </div>
        </Field>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface2/60 px-3 py-2 text-[12.5px] font-semibold">
          <input type="checkbox" checked={withDesign} onChange={(e) => setWithDesign(e.target.checked)} className="h-4 w-4 accent-[#0e7490]" />
          <Wand2 size={14} className="text-[#7c3aed]" /> Butuh jasa desain internal (+{fmtIDR(designProduct?.basePrice || 0)})
        </label>
        <Field label="Catatan item"><Textarea rows={2} value={itNote} onChange={(e) => setItNote(e.target.value)} placeholder="mis. file dari customer, jangan ubah layout" /></Field>
        <div className="flex items-center justify-between rounded-lg bg-side px-4 py-2.5 text-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Harga terhitung</span>
          <span className="tabular font-display text-[17px] font-bold">{fmtIDR(calc.total)}</span>
        </div>
        <p className="text-[10.5px] leading-relaxed text-faint">
          Metode harga: {product.method === "sqm" ? "Luas × tarif per m²" : product.method === "formula" ? "Rumus custom" : "Qty × harga satuan (bertingkat sesuai qty)"}.
          {product.tiers && product.tiers.length > 0 && ` Harga turun otomatis di qty ${product.tiers.slice(1).map((t) => t.minQty).join(", ")}.`}
        </p>
      </div>
    </Modal>
  );
}

/* ---------- quick new customer ---------- */
export function NewCustomerModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (c: Customer) => void }) {
  const { db, saveCustomer } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<Customer["type"]>("retail");
  const [address, setAddress] = useState("");
  useEffect(() => { if (open) { setName(""); setPhone(""); setType("retail"); setAddress(""); } }, [open]);

  const save = () => {
    if (!name.trim()) { toast.push({ title: "Nama wajib diisi", kind: "warn" }); return; }
    const c: Customer = {
      id: uid(), code: "C" + String(db.customers.length + 1).padStart(3, "0"),
      name: name.trim(), phone: phone.trim() || "-", wa: phone.trim() || undefined,
      type, address: address.trim() || undefined, createdAt: Date.now(),
    };
    saveCustomer(c);
    toast.push({ title: "Pelanggan tersimpan", desc: c.name, kind: "ok" });
    onSaved(c);
  };

  return (
    <Modal open={open} onClose={onClose} title="Pelanggan Baru"
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save}><UserPlus size={14} /> Simpan</Btn></>}>
      <div className="space-y-3">
        <Field label="Nama *"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama / instansi" onKeyDown={(e) => e.key === "Enter" && save()} /></Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="No. HP / WhatsApp"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812…" /></Field>
          <Field label="Tipe Pelanggan">
            <Select value={type} onChange={(e) => setType(e.target.value as Customer["type"])}>
              <option value="retail">Retail</option><option value="reseller">Reseller</option>
              <option value="corporate">Perusahaan</option><option value="school">Sekolah</option>
              <option value="government">Instansi</option><option value="regular">Pelanggan Tetap</option>
            </Select>
          </Field>
        </div>
        <Field label="Alamat"><Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <p className="text-[11px] text-faint">Tersimpan otomatis dengan kode C{String(db.customers.length + 1).padStart(3, "0")} · {fmtDate(Date.now())}</p>
      </div>
    </Modal>
  );
}
