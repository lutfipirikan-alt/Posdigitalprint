import React, { useMemo, useState } from "react";
import { CalendarClock, GripVertical } from "lucide-react";
import type { Order, OrderStatus } from "../lib/types";
import { PRODUCTION_COLS, STATUS_META } from "../lib/types";
import { useStore } from "../lib/store";
import { daysUntil, fmtDateShort, fmtIDRShort } from "../lib/format";
import { PageHead, SearchInput, Tabs, useToast } from "../components/ui";
import { Avatar } from "../components/layout";

const GROUPS = [
  { id: "semua", label: "Semua Kolom", cols: PRODUCTION_COLS },
  { id: "baru", label: "Baru & Pembayaran", cols: PRODUCTION_COLS.filter((c) => STATUS_META[c].group === "baru") },
  { id: "desain", label: "Desain", cols: PRODUCTION_COLS.filter((c) => STATUS_META[c].group === "desain") },
  { id: "produksi", label: "Produksi", cols: PRODUCTION_COLS.filter((c) => STATUS_META[c].group === "produksi") },
  { id: "selesai", label: "Selesai", cols: PRODUCTION_COLS.filter((c) => STATUS_META[c].group === "selesai") },
];

export default function Production() {
  const { db, setStatus, navigate, user } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("semua");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<OrderStatus | null>(null);

  const cols = GROUPS.find((g) => g.id === group)?.cols || PRODUCTION_COLS;
  const active = useMemo(() => db.orders.filter((o) => o.status !== "cancelled"), [db.orders]);
  const visible = useMemo(
    () => active.filter((o) => !q || (o.number + (db.customers.find((c) => c.id === o.customerId)?.name || "") + o.items.map((i) => i.name).join(" ")).toLowerCase().includes(q.toLowerCase())),
    [active, q, db.customers],
  );

  const canMove = user && ["admin", "manager", "production", "designer"].includes(user.role);

  const drop = (st: OrderStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverCol(null);
    const id = e.dataTransfer.getData("text/plain");
    const o = db.orders.find((x) => x.id === id);
    if (!o || o.status === st || !canMove) return;
    setStatus(id, st);
    toast.push({ title: `${o.number} → ${STATUS_META[st].label}`, desc: st === "done" ? "BOM dikurangi & HPP dicatat otomatis" : undefined, kind: "ok" });
  };

  return (
    <div className="flex h-[calc(100vh-102px)] flex-col">
      <PageHead title="Alur Produksi" desc="Seret kartu antar kolom untuk mengubah status — setiap perpindahan dicatat (waktu, karyawan, status asal).">
        <SearchInput value={q} onChange={setQ} placeholder="Cari order / pelanggan…" className="w-60" />
      </PageHead>
      <Tabs tabs={GROUPS.map((g) => ({ id: g.id, label: g.label }))} value={group} onChange={setGroup} />

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {cols.map((st) => {
          const meta = STATUS_META[st];
          const cards = visible.filter((o) => o.status === st);
          return (
            <div key={st}
              onDragOver={(e) => { e.preventDefault(); setOverCol(st); }}
              onDragLeave={() => setOverCol((c) => (c === st ? null : c))}
              onDrop={drop(st)}
              className={`flex h-full w-[268px] shrink-0 flex-col rounded-xl border transition-colors ${overCol === st ? "border-brand bg-brand-soft/40" : "border-line bg-surface2/50"}`}>
              <div className="flex items-center gap-2 rounded-t-xl border-b border-line px-3 py-2.5" style={{ boxShadow: `inset 0 3px 0 ${meta.color}` }}>
                <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                <p className="flex-1 truncate text-[12px] font-bold">{meta.label}</p>
                <span className="tabular rounded-md bg-surface px-1.5 py-0.5 font-display text-[11px] font-bold text-muted">{cards.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {cards.map((o) => <Card key={o.id} o={o} onOpen={() => navigate("orders", { orderId: o.id })} draggable={!!canMove} onDragStart={(e) => { e.dataTransfer.setData("text/plain", o.id); setDragId(o.id); }} onDragEnd={() => setDragId(null)} dragging={dragId === o.id} />)}
                {cards.length === 0 && (
                  <div className={`rounded-lg border border-dashed px-3 py-6 text-center text-[11px] font-semibold ${overCol === st ? "border-brand text-brand" : "border-line2 text-faint"}`}>
                    {overCol === st ? "Lepaskan di sini" : "Kosong"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ o, onOpen, draggable, onDragStart, onDragEnd, dragging }: {
  o: Order; onOpen: () => void; draggable: boolean;
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void; dragging: boolean;
}) {
  const { db } = useStore();
  const cust = db.customers.find((c) => c.id === o.customerId);
  const assignee = db.users.find((u) => u.id === o.assigneeId);
  const dleft = o.deadline ? daysUntil(o.deadline) : null;
  const overdue = dleft !== null && dleft < 0;
  const soon = dleft !== null && dleft >= 0 && dleft <= 1;
  const totalQty = o.items.reduce((a, b) => a + b.qty, 0);
  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen}
      className={`card hoverable group cursor-pointer p-2.5 transition-opacity ${dragging ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-1.5">
        {draggable && <GripVertical size={13} className="mt-0.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[12px] font-bold">{o.number.slice(-9)}</p>
            {dleft !== null && (
              <span className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold ${overdue ? "bg-danger-soft text-danger" : soon ? "bg-warn-soft text-warn" : "bg-surface2 text-muted"}`}>
                <CalendarClock size={10} /> {overdue ? `lewat ${-dleft} hr` : dleft === 0 ? "hari ini" : `${dleft} hr lagi`}
              </span>
            )}
          </div>
          <p className="truncate text-[11.5px] font-semibold text-muted">{cust?.name}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">
            {o.items.map((i) => `${i.qty}× ${i.name}${i.width && i.height ? ` ${i.width}×${i.height}cm` : ""}`).join(" · ")}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="tabular text-[11px] font-bold text-brand">{fmtIDRShort(o.total)}</span>
            <div className="flex items-center gap-1.5">
              {o.files.length > 0 && <span className="rounded bg-surface2 px-1 py-0.5 text-[9px] font-bold uppercase text-muted">{o.files.length} file</span>}
              {assignee ? <Avatar name={assignee.name} size={20} /> : <span className="text-[9.5px] font-semibold text-faint">belum ada PIC</span>}
            </div>
          </div>
          {o.deadline && <p className="mt-1 text-[9.5px] font-semibold text-faint">Target {fmtDateShort(o.deadline)} · {totalQty} unit</p>}
        </div>
      </div>
    </div>
  );
}
