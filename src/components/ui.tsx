import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { OrderStatus } from "../lib/types";
import { STATUS_META } from "../lib/types";
import type { PayState } from "../lib/store";
import { PAYSTATE_META } from "../lib/store";

/* ---------- Button ---------- */
type BtnVariant = "primary" | "accent" | "outline" | "ghost" | "danger" | "ok";
export function Btn({ variant = "primary", size = "md", className = "", children, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-brand text-white hover:bg-brand-hi shadow-sm",
    accent: "bg-magenta text-white hover:brightness-110 shadow-sm",
    outline: "border border-line2 bg-surface text-ink hover:bg-surface2",
    ghost: "text-muted hover:bg-surface2 hover:text-ink",
    danger: "bg-danger text-white hover:brightness-110",
    ok: "bg-ok text-white hover:brightness-110",
  };
  const sz = { sm: "h-7 px-2.5 text-[12px] gap-1.5", md: "h-9 px-3.5 text-[13px] gap-2", lg: "h-11 px-5 text-[14px] gap-2" }[size];
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100 ${v[variant]} ${sz} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */
export function Field({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-faint">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}
const ctlBase = "w-full h-9 rounded-lg border border-line2 bg-surface px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${ctlBase} ${props.className || ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${ctlBase} appearance-none pr-8 bg-no-repeat bg-[right_10px_center] ${props.className || ""}`}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-line2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15 ${props.className || ""}`} />;
}
export function SearchInput({ value, onChange, placeholder, inputRef, className = "" }:
  { value: string; onChange: (v: string) => void; placeholder?: string; inputRef?: React.Ref<HTMLInputElement>; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${ctlBase} pl-9`} />
    </div>
  );
}

/* ---------- Chips / pills ---------- */
export function Chip({ color, children, pulse }: { color: string; children: React.ReactNode; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap" style={{ background: color + "1f", color }}>
      <span className={`h-1.5 w-1.5 rounded-full ${pulse ? "animate-[pulseDot_1.6s_infinite]" : ""}`} style={{ background: color, color }} />
      {children}
    </span>
  );
}
export function StatusPill({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return <Chip color={m.color} pulse={status === "printing" || status === "ready"}>{m.label}</Chip>;
}
export function PayPill({ state }: { state: PayState }) {
  const m = PAYSTATE_META[state];
  return <Chip color={m.color}>{m.label}</Chip>;
}

/* ---------- Modal & Drawer ---------- */
export function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }:
  { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-[8vh] anim-fade no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${width} anim-modal rounded-xl border border-line bg-surface shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="font-display text-[15px] font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2 hover:text-ink"><X size={16} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({ open, onClose, title, children, width = "max-w-xl", footer }:
  { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; width?: string; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/45 anim-fade no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`absolute right-0 top-0 flex h-full w-full ${width} flex-col border-l border-line bg-surface shadow-2xl`} style={{ animation: "slideRight 0.26s cubic-bezier(0.2,0.7,0.3,1) both" }}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="font-display text-[15px] font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2 hover:text-ink"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="dotgrid flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-surface2">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-faint"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" /></svg>
      </div>
      <p className="font-display text-[14px] font-bold">{title}</p>
      {desc && <p className="max-w-xs text-[12px] text-muted">{desc}</p>}
      {action}
    </div>
  );
}

/* ---------- Toast ---------- */
interface ToastItem { id: number; title: string; desc?: string; kind: "ok" | "warn" | "danger" | "info" }
const ToastCtx = createContext<{ push: (t: Omit<ToastItem, "id">) => void } | null>(null);
export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error("toast");
  return v;
}
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);
  const push = (t: Omit<ToastItem, "id">) => {
    const id = idRef.current++;
    setItems((p) => [...p, { ...t, id }].slice(-4));
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 3800);
  };
  const color = { ok: "#178a4c", warn: "#b45309", danger: "#d33131", info: "#0e7490" };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[80] flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="anim-toast pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-lg">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color[t.kind] }}>
              {t.kind === "ok" ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"><path d="m4 12 6 6L20 6" /></svg>
                : t.kind === "danger" || t.kind === "warn" ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v9" /><circle cx="12" cy="18.4" r="0.6" fill="currentColor" /></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="5" r="0.6" fill="currentColor" /><path d="M12 9v10" /></svg>}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight">{t.title}</p>
              {t.desc && <p className="mt-0.5 text-[12px] leading-snug text-muted">{t.desc}</p>}
            </div>
            <button onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} className="ml-auto text-faint hover:text-ink"><X size={13} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Page header ---------- */
export function PageHead({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="anim-in mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight">{title}</h1>
        {desc && <p className="mt-0.5 text-[12.5px] text-muted">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------- Table helpers ---------- */
export function THead({ cols }: { cols: (string | React.ReactNode)[] }) {
  return (
    <thead>
      <tr className="border-b border-line text-left">
        {cols.map((c, i) => (
          <th key={i} className="whitespace-nowrap px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-faint first:pl-4 last:pr-4">{c}</th>
        ))}
      </tr>
    </thead>
  );
}
export function TR({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr onClick={onClick} className={`border-b border-line/70 transition-colors last:border-0 ${onClick ? "cursor-pointer hover:bg-surface2" : ""} ${className}`}>
      {children}
    </tr>
  );
}
export const TD = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2.5 text-[13px] first:pl-4 last:pr-4 ${className}`}>{children}</td>
);

/* ---------- Tabs ---------- */
export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; badge?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-surface2 p-1 w-fit">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-all ${value === t.id ? "bg-surface text-ink shadow-sm border border-line" : "text-muted hover:text-ink"}`}>
          {t.label}
          {t.badge !== undefined && t.badge > 0 && (
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${value === t.id ? "bg-brand text-white" : "bg-line text-muted"}`}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Logo ---------- */
export function Logo({ size = 30, withText = true, dark = false }: { size?: number; withText?: boolean; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32">
        <circle cx="12" cy="12" r="8" fill="#00AEEF" fillOpacity="0.92" />
        <circle cx="20" cy="12" r="8" fill="#EC008C" fillOpacity="0.8" />
        <circle cx="16" cy="19" r="8" fill="#FFF200" fillOpacity="0.8" />
        <circle cx="16" cy="14" r="3.4" fill={dark ? "#e8eaee" : "#16181d"} />
      </svg>
      {withText && (
        <span className="font-display leading-none">
          <span className={`block text-[15px] font-bold tracking-tight ${dark ? "text-white" : "text-ink"}`}>Sani Print</span>
          <span className={`block text-[9px] font-semibold uppercase tracking-[0.18em] ${dark ? "text-white/40" : "text-faint"}`}>Digital Printing</span>
        </span>
      )}
    </span>
  );
}
