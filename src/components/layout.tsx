import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote, BarChart3, Bell, Box, Calculator, ClipboardList, Factory, LayoutDashboard,
  LogOut, MonitorDown, Moon, PackageSearch, Printer, RotateCcw, Search, Sun, UserRound, Users, Wallet, X,
} from "lucide-react";
import { ACCESS, notifsOf, useStore } from "../lib/store";
import { canInstall, isStandalone, onInstallChange, promptInstall } from "../lib/pwa";
import type { NavState, Page } from "../lib/types";
import { ROLE_META } from "../lib/types";
import { fmtDate, timeAgo } from "../lib/format";
import { Btn, Chip, Field, Input, Logo, Modal, useToast } from "./ui";
import { AlertTriangle, FlaskConical, Database } from "lucide-react";

const NAV: { group: string; items: { page: Page; label: string; icon: React.ReactNode }[] }[] = [
  {
    group: "Operasional",
    items: [
      { page: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { page: "pos", label: "Kasir (POS)", icon: <Printer size={16} /> },
      { page: "orders", label: "Pesanan", icon: <ClipboardList size={16} /> },
      { page: "production", label: "Produksi", icon: <Factory size={16} /> },
    ],
  },
  {
    group: "Master Data",
    items: [
      { page: "customers", label: "Pelanggan", icon: <Users size={16} /> },
      { page: "products", label: "Produk & Jasa", icon: <Box size={16} /> },
      { page: "inventory", label: "Inventori Bahan", icon: <PackageSearch size={16} /> },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { page: "finance", label: "Piutang & Hutang", icon: <Wallet size={16} /> },
      { page: "cashflow", label: "Arus Kas", icon: <Banknote size={16} /> },
      { page: "accounting", label: "Akuntansi", icon: <Calculator size={16} /> },
    ],
  },
  {
    group: "Analisis & Tim",
    items: [
      { page: "reports", label: "Laporan", icon: <BarChart3 size={16} /> },
      { page: "people", label: "Karyawan", icon: <UserRound size={16} /> },
    ],
  },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, nav, navigate, theme, setTheme, logout, resetDemo, initData, db, markNotifs } = useStore();
  const toast = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [resetModal, setResetModal] = useState<null | "demo" | "empty">(null);
  const [resetCash, setResetCash] = useState(0);
  const [installReady, setInstallReady] = useState(canInstall());
  const [standalone, setStandalone] = useState(isStandalone());

  useEffect(() => onInstallChange(() => {
    setInstallReady(canInstall());
    setStandalone(isStandalone());
  }), []);

  const handleInstall = async () => {
    if (installReady) {
      const r = await promptInstall();
      if (r === "accepted") toast.push({ title: "Aplikasi terpasang!", desc: "Buka \"Sani Print\" dari Start Menu — berjalan tanpa browser & bisa offline.", kind: "ok" });
      else toast.push({ title: "Instalasi dibatalkan", desc: "Anda bisa pasang lagi kapan saja dari tombol ini.", kind: "info" });
    } else {
      toast.push({
        title: "Cara pasang di perangkat ini",
        desc: "Klik ikon aplikasi di address bar, atau menu browser (⋮) → \"Install Sani Print…\". Di Windows otomatis masuk Start Menu.",
        kind: "info",
      });
    }
  };

  const allowed = user ? ACCESS[user.role] : [];
  useEffect(() => {
    if (!allowed.includes(nav.page)) navigate("dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.page, user]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen((v) => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const notifs = useMemo(() => notifsOf(db), [db]);
  const unread = notifs.filter((n) => !db.readNotifs.includes(n.id));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---------- Sidebar ---------- */}
      <aside className={`flex shrink-0 flex-col border-r border-black/40 bg-side text-white transition-all duration-200 ${collapsed ? "w-[64px]" : "w-[228px]"}`}>
        <div className="dotgrid-side">
          <div className={`flex items-center gap-2 px-4 py-4 ${collapsed ? "justify-center px-2" : ""}`}>
            <Logo size={30} withText={!collapsed} dark />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
          {NAV.map((g) => {
            const items = g.items.filter((i) => allowed.includes(i.page));
            if (!items.length) return null;
            return (
              <div key={g.group} className="mt-3">
                {!collapsed && <p className="mb-1 px-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/30">{g.group}</p>}
                {items.map((it) => {
                  const active = nav.page === it.page;
                  return (
                    <button key={it.page} onClick={() => navigate(it.page)}
                      title={collapsed ? it.label : undefined}
                      className={`group relative mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors ${collapsed ? "justify-center" : ""} ${active ? "bg-side2 text-white" : "text-white/55 hover:bg-side2/60 hover:text-white"}`}>
                      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-hi" />}
                      <span className={active ? "text-brand-hi" : ""}>{it.icon}</span>
                      {!collapsed && it.label}
                      {it.page === "pos" && !collapsed && <span className="ml-auto rounded bg-brand/25 px-1.5 py-0.5 font-display text-[9px] font-bold text-brand-hi">F2</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          {!standalone && (
            <button onClick={handleInstall} title={collapsed ? "Instal Aplikasi" : undefined}
              className={`mb-2.5 flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-brand/15 px-2.5 py-2 text-[12.5px] font-bold text-brand-hi transition-all hover:border-brand/40 hover:bg-brand/25 active:scale-[0.98] ${collapsed ? "justify-center" : ""}`}>
              <MonitorDown size={15} className="shrink-0" />
              {!collapsed && <span>Instal Aplikasi</span>}
              {!collapsed && installReady && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-brand-hi" />}
            </button>
          )}
          {user && (
            <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
              <Avatar name={user.name} size={32} />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold leading-tight">{user.name}</p>
                  <p className="text-[10.5px] text-white/40">{ROLE_META[user.role].label}</p>
                </div>
              )}
              <button onClick={logout} title="Keluar" className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"><LogOut size={15} /></button>
            </div>
          )}
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[54px] shrink-0 items-center gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur">
          <button onClick={() => setCollapsed((v) => !v)} className="rounded-md p-1.5 text-muted hover:bg-surface2 hover:text-ink" title="Ciutkan menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <button onClick={() => setSearchOpen(true)}
            className="flex h-8 w-64 max-w-[40vw] items-center gap-2 rounded-lg border border-line bg-surface2 px-3 text-[12.5px] text-faint transition-colors hover:border-line2 hover:text-muted">
            <Search size={13} />
            <span className="flex-1 text-left">Cari order, pelanggan, produk…</span>
            <span className="kbd">Ctrl K</span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            {db.mode === "live" ? (
              <span title="Data operasional: 0 transaksi awal, semua yang tercatat adalah input Anda."
                className="hidden items-center gap-1.5 rounded-full border border-ok/30 bg-ok-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ok sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Operasional
              </span>
            ) : (
              <button title="Data contoh aktif — klik untuk beralih ke data kosong / operasional."
                onClick={() => user?.role === "admin" ? setResetModal("empty") : toast.push({ title: "Data contoh aktif", desc: "Minta Administrator untuk beralih ke mode operasional.", kind: "info" })}
                className="hidden items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warn transition-transform hover:scale-[1.03] sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warn" /> Data Contoh
              </button>
            )}
            <span className="mr-1 hidden text-[12px] font-semibold text-muted md:block">{fmtDate(Date.now())}</span>
            {/* notifications */}
            <div className="relative">
              <button onClick={() => { setBellOpen((v) => !v); setMenuOpen(false); }} className="relative rounded-md p-2 text-muted transition-colors hover:bg-surface2 hover:text-ink">
                <Bell size={16} />
                {unread.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-magenta px-1 font-display text-[9px] font-bold text-white">{unread.length}</span>
                )}
              </button>
              {bellOpen && (
                <div className="anim-modal absolute right-0 top-11 z-40 w-[360px] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <p className="font-display text-[13px] font-bold">Notifikasi <span className="text-faint">({unread.length} baru)</span></p>
                    <div className="flex gap-1">
                      {unread.length > 0 && (
                        <button onClick={() => { markNotifs(unread.map((n) => n.id)); toast.push({ title: "Semua notifikasi ditandai dibaca", kind: "ok" }); }}
                          className="rounded-md px-2 py-1 text-[11px] font-bold text-brand hover:bg-brand-soft">Tandai dibaca</button>
                      )}
                      <button onClick={() => setBellOpen(false)} className="rounded-md p-1 text-muted hover:bg-surface2"><X size={13} /></button>
                    </div>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {notifs.length === 0 && <p className="px-4 py-8 text-center text-[12px] text-faint">Tidak ada notifikasi — semua aman.</p>}
                    {notifs.map((n) => {
                      const read = db.readNotifs.includes(n.id);
                      const color = n.kind === "danger" ? "#d33131" : n.kind === "warn" ? "#b45309" : n.kind === "ok" ? "#178a4c" : "#0e7490";
                      return (
                        <button key={n.id} onClick={() => { markNotifs([n.id]); setBellOpen(false); navigate(n.page, { orderId: n.page === "orders" ? n.refId : undefined }); }}
                          className={`flex w-full items-start gap-2.5 border-b border-line/60 px-4 py-2.5 text-left transition-colors hover:bg-surface2 ${read ? "opacity-50" : ""}`}>
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-bold leading-tight">{n.title}</span>
                            <span className="block truncate text-[11.5px] text-muted">{n.body}</span>
                            <span className="block text-[10px] text-faint">{timeAgo(n.ts)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-md p-2 text-muted transition-colors hover:bg-surface2 hover:text-ink" title="Ganti tema">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* user menu */}
            <div className="relative">
              <button onClick={() => { setMenuOpen((v) => !v); setBellOpen(false); }} className="ml-1 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface2">
                {user && <Avatar name={user.name} size={28} />}
              </button>
              {menuOpen && (
                <div className="anim-modal absolute right-0 top-11 z-40 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
                  <div className="border-b border-line px-4 py-3">
                    <p className="text-[13px] font-bold">{user?.name}</p>
                    <p className="text-[11px] text-muted">@{user?.username} · {user && ROLE_META[user.role].label}</p>
                  </div>
                  {user?.role === "admin" && (
                    <>
                      <button onClick={() => { setResetModal("empty"); setMenuOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-semibold text-muted transition-colors hover:bg-surface2 hover:text-ink">
                        <FlaskConical size={14} /> Kosongkan semua data
                      </button>
                      <button onClick={() => { setResetModal("demo"); setMenuOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-semibold text-muted transition-colors hover:bg-surface2 hover:text-ink">
                        <RotateCcw size={14} /> Muat ulang data contoh
                      </button>
                    </>
                  )}
                  <button onClick={logout} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger-soft">
                    <LogOut size={14} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="dotgrid relative flex-1 overflow-y-auto" onClick={() => { setBellOpen(false); setMenuOpen(false); }}>
          <div className="mx-auto max-w-[1400px] p-4 md:p-6">{children}</div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ---------- modal reset data ---------- */}
      {resetModal && (
        <Modal open onClose={() => setResetModal(null)}
          title={resetModal === "empty" ? "Kosongkan Semua Data" : "Muat Ulang Data Contoh"}
          footer={<>
            <Btn variant="ghost" onClick={() => setResetModal(null)}>Batal</Btn>
            {resetModal === "empty" ? (
              <Btn variant="danger" onClick={() => { initData("empty", resetCash); setResetModal(null); toast.push({ title: "Data dikosongkan", desc: "0 transaksi, 0 pelanggan. Silakan login ulang (admin / admin123).", kind: "warn" }); }}>
                Ya, Kosongkan Semua
              </Btn>
            ) : (
              <Btn onClick={() => { resetDemo(); setResetModal(null); toast.push({ title: "Data contoh dimuat ulang", desc: "Seluruh data dikembalikan ke contoh awal.", kind: "info" }); }}>
                Ya, Muat Data Contoh
              </Btn>
            )}
          </>}>
          {resetModal === "empty" ? (
            <div className="space-y-3.5">
              <p className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12.5px] font-semibold text-danger">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                Seluruh pesanan, pelanggan, pembayaran, pengeluaran, stok, dan jurnal akan dihapus permanen dari perangkat ini. Tindakan ini tidak bisa dibatalkan.
              </p>
              <p className="text-[12.5px] leading-relaxed text-muted">
                Yang tetap tersedia: katalog 30 produk & jasa, daftar bahan baku (stok 0), bagan akun, dan akun <b>admin</b>.
              </p>
              <Field label="Saldo kas awal (opsional)">
                <Input type="number" min={0} step={50000} value={resetCash || ""} placeholder="0" onChange={(e) => setResetCash(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
            </div>
          ) : (
            <div className="space-y-3.5">
              <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface2 px-3 py-2.5 text-[12.5px] text-muted">
                <Database size={16} className="mt-0.5 shrink-0 text-brand" />
                Data saat ini akan diganti dengan data contoh: 20 pelanggan, 24 pesanan, pembayaran, pengeluaran, dan jurnal 6 bulan terakhir.
              </p>
              <p className="text-[12.5px] text-muted">Akun demo (admin, kasir, produksi, desainer) akan tersedia kembali. Anda akan keluar dan login ulang.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${(hue + 40) % 360} 50% 30%))` }}>
      {initials}
    </span>
  );
}

/* ---------- Global search ---------- */
function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, navigate } = useStore();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => ref.current?.focus(), 30); } }, [open]);
  if (!open) return null;

  const ql = q.trim().toLowerCase();
  const res = {
    orders: ql ? db.orders.filter((o) => (o.number + o.invoiceNo).toLowerCase().includes(ql)).slice(0, 6) : [],
    customers: ql ? db.customers.filter((c) => (c.name + c.phone + (c.wa || "")).toLowerCase().includes(ql)).slice(0, 5) : [],
    products: ql ? db.products.filter((p) => (p.name + p.sku + p.category).toLowerCase().includes(ql)).slice(0, 5) : [],
    employees: ql ? db.users.filter((u) => u.name.toLowerCase().includes(ql)).slice(0, 3) : [],
  };
  const go = (page: Page, params?: Partial<NavState>) => { navigate(page, params); onClose(); };
  const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-faint">{label}</p>
      {children}
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh] anim-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="anim-modal w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="text-faint" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            placeholder="Cari nomor order, invoice, pelanggan, telepon, produk, SKU, karyawan…"
            className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint" />
          <span className="kbd">Esc</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {!ql && <p className="px-4 py-6 text-center text-[12.5px] text-faint">Ketik minimal 2 karakter untuk mencari di semua modul.</p>}
          {ql && res.orders.length + res.customers.length + res.products.length + res.employees.length === 0 && (
            <p className="px-4 py-6 text-center text-[12.5px] text-faint">Tidak ada hasil untuk “{q}”.</p>
          )}
          {res.orders.length > 0 && (
            <Group label="Pesanan">
              {res.orders.map((o) => (
                <button key={o.id} onClick={() => go("orders", { orderId: o.id })} className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-surface2">
                  <span><span className="font-display text-[12.5px] font-bold">{o.number}</span><span className="ml-2 text-[12px] text-muted">{db.customers.find((c) => c.id === o.customerId)?.name}</span></span>
                  <Chip color={o.status === "cancelled" ? "#d33131" : "#0e7490"}>{o.invoiceNo}</Chip>
                </button>
              ))}
            </Group>
          )}
          {res.customers.length > 0 && (
            <Group label="Pelanggan">
              {res.customers.map((c) => (
                <button key={c.id} onClick={() => go("customers", { customerId: c.id })} className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-surface2">
                  <span className="text-[13px] font-semibold">{c.name}</span>
                  <span className="text-[11.5px] text-muted">{c.phone}</span>
                </button>
              ))}
            </Group>
          )}
          {res.products.length > 0 && (
            <Group label="Produk">
              {res.products.map((p) => (
                <button key={p.id} onClick={() => go("pos", { tab: p.name })} className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-surface2">
                  <span className="text-[13px] font-semibold">{p.name}</span>
                  <span className="kbd">{p.sku}</span>
                </button>
              ))}
            </Group>
          )}
          {res.employees.length > 0 && (
            <Group label="Karyawan">
              {res.employees.map((u) => (
                <button key={u.id} onClick={() => go("people")} className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-surface2">
                  <span className="text-[13px] font-semibold">{u.name}</span>
                  <span className="text-[11.5px] text-muted">{ROLE_META[u.role].label}</span>
                </button>
              ))}
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}
