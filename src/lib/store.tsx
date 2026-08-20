import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  Customer, DB, Expense, InventoryItem, NavState, Notif, Order, OrderItem, OrderStatus,
  Page, PayMethod, Product, Purchase, PurchaseItem, Supplier, User,
} from "./types";
import { STATUS_META } from "./types";
import { buildSeed, buildEmpty } from "./seed";
import { hashPass, uid, dayKey } from "./format";
import { safeGet, safeSet, safeRemove } from "./storage";

const DB_KEY = "saniprint-db-v3";
const SES_KEY = "saniprint-session";

function loadDB(): DB {
  try {
    const raw = safeGet(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === 3) {
        safeSet("saniprint-setup", "1"); // pengguna lama: lewati onboarding
        return parsed;
      }
    }
  } catch { /* seed ulang */ }
  return buildSeed();
}

/* ---------- derivations ---------- */
export function paidOf(db: DB, orderId: string): number {
  return db.payments.filter((p) => p.orderId === orderId).reduce((a, b) => a + b.amount, 0);
}
export function balanceOf(db: DB, o: Order): number {
  return o.total - paidOf(db, o.id);
}
export type PayState = "paid" | "partial" | "unpaid" | "overdue";
export function payStateOf(db: DB, o: Order): PayState {
  if (o.status === "cancelled") return "paid";
  const bal = balanceOf(db, o);
  if (bal <= 0) return "paid";
  if (o.dueDate && o.dueDate < Date.now()) return "overdue";
  if (paidOf(db, o.id) > 0) return "partial";
  return "unpaid";
}
export const PAYSTATE_META: Record<PayState, { label: string; color: string }> = {
  paid: { label: "Lunas", color: "#178a4c" },
  partial: { label: "Sebagian", color: "#b45309" },
  unpaid: { label: "Belum Bayar", color: "#64748b" },
  overdue: { label: "Jatuh Tempo", color: "#d33131" },
};
export function orderCost(db: DB, o: Order): number {
  return o.items.reduce((sm, it) => {
    const pr = db.products.find((p) => p.id === it.productId);
    return sm + (pr ? pr.costPrice * it.qty : 0);
  }, 0);
}
export function cashOf(db: DB): number {
  return db.startCash + db.journals.reduce((s, j) => {
    let d = 0;
    j.lines.forEach((l) => {
      if (l.code === "1100" || l.code === "1200") d += l.debit - l.credit;
    });
    return s + d;
  }, 0);
}
export function notifsOf(db: DB): Notif[] {
  const out: Notif[] = [];
  const now = Date.now();
  db.orders.forEach((o) => {
    if (o.status === "cancelled" || o.status === "done") return;
    const bal = balanceOf(db, o);
    const cust = db.customers.find((c) => c.id === o.customerId);
    if (bal > 0 && o.dueDate && o.dueDate < now) {
      out.push({ id: "pay-" + o.id, kind: "danger", title: "Pembayaran jatuh tempo", body: `${o.number} · ${cust?.name || "?"} · sisa ${Intl.NumberFormat("id-ID").format(bal)}`, page: "orders", refId: o.id, ts: o.dueDate });
    } else if (bal > 0 && o.dueDate && o.dueDate - now < 2 * 86_400_000) {
      out.push({ id: "due-" + o.id, kind: "warn", title: "Pelunasan hampir jatuh tempo", body: `${o.number} · ${cust?.name || "?"}`, page: "orders", refId: o.id, ts: o.dueDate });
    }
    if (o.deadline && o.deadline - now < 86_400_000 && ["queue", "printing", "finishing", "qc", "designing", "wait_design"].includes(o.status)) {
      out.push({ id: "dl-" + o.id, kind: o.deadline < now ? "danger" : "warn", title: o.deadline < now ? "Lewat deadline produksi" : "Deadline produksi mendekat", body: `${o.number} · target ${new Date(o.deadline).toLocaleDateString("id-ID")}`, page: "production", refId: o.id, ts: o.deadline });
    }
    if (o.status === "ready") {
      out.push({ id: "rd-" + o.id, kind: "ok", title: "Pesanan siap diambil", body: `${o.number} · ${cust?.name || "?"}`, page: "orders", refId: o.id, ts: o.history[o.history.length - 1]?.date || now });
    }
    if (o.status === "wait_pay") {
      out.push({ id: "wp-" + o.id, kind: "info", title: "Menunggu pembayaran", body: `${o.number} · ${cust?.name || "?"}`, page: "orders", refId: o.id, ts: o.createdAt });
    }
  });
  db.inventory.forEach((m) => {
    if (m.minStock > 0 && m.stock <= m.minStock) {
      out.push({ id: "low-" + m.id, kind: "warn", title: "Stok bahan menipis", body: `${m.name} · sisa ${m.stock} ${m.unit} (min ${m.minStock})`, page: "inventory", refId: m.id, ts: now });
    }
  });
  return out.sort((a, b) => b.ts - a.ts);
}

export const ACCESS: Record<User["role"], Page[]> = {
  admin: ["dashboard", "pos", "orders", "production", "customers", "products", "inventory", "suppliers", "finance", "cashflow", "accounting", "reports", "people"],
  manager: ["dashboard", "pos", "orders", "production", "customers", "products", "inventory", "suppliers", "finance", "cashflow", "accounting", "reports", "people"],
  cashier: ["dashboard", "pos", "orders", "customers"],
  production: ["dashboard", "production", "orders", "inventory"],
  designer: ["dashboard", "production", "orders"],
};

/* ---------- context ---------- */
interface StoreCtx {
  db: DB;
  user: User | null;
  nav: NavState;
  theme: "light" | "dark";
  navigate: (page: Page, params?: Partial<NavState>) => void;
  setTheme: (t: "light" | "dark") => void;
  login: (username: string, pass: string) => string | null;
  logout: () => void;
  resetDemo: () => void;
  initData: (mode: "demo" | "empty", startCash?: number) => void;
  createOrder: (input: CreateOrderInput) => Order;
  recordPayment: (orderId: string, amount: number, method: PayMethod, ref?: string) => void;
  setStatus: (orderId: string, to: OrderStatus, note?: string) => void;
  updateOrder: (orderId: string, patch: Partial<Order>) => void;
  saveCustomer: (c: Customer) => void;
  saveProduct: (p: Product) => void;
  saveSupplier: (sp: Supplier) => void;
  saveUser: (u: User, newPass?: string) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  createPurchase: (supplierId: string, items: PurchaseItem[], dueDate: number, note?: string) => void;
  receivePurchase: (purchaseId: string) => void;
  paySupplier: (payableId: string, amount: number, method: PayMethod) => void;
  stockMove: (itemId: string, type: "in" | "out" | "adj", qty: number, note: string) => void;
  markNotifs: (ids: string[]) => void;
}
export interface CreateOrderInput {
  customerId: string;
  items: OrderItem[];
  discount: number;
  extraCharge: number;
  note?: string;
  prodNote?: string;
  deadline?: number;
  dueDate?: number;
  files: Order["files"];
  assigneeId?: string;
  dp: number;
  method: PayMethod;
  needDesign: boolean;
}

const Ctx = createContext<StoreCtx | null>(null);
export function useStore(): StoreCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}

function log(d: DB, userId: string, action: string, detail: string) {
  d.activities.unshift({ id: uid(), date: Date.now(), userId, action, detail });
  if (d.activities.length > 300) d.activities.length = 300;
}
function salesAccOf(d: DB, o: Order): string {
  const jasa = o.items.every((it) => d.products.find((p) => p.id === it.productId)?.category === "Jasa");
  return jasa ? "4200" : "4100";
}
function pushPayJournal(d: DB, o: Order, amount: number, method: PayMethod, date: number, userId: string, label: string) {
  d.journals.unshift({
    id: uid(), date, ref: o.number, desc: `${label} ${o.number} · ${o.invoiceNo}`,
    lines: [
      { code: method === "cash" ? "1100" : "1200", debit: amount, credit: 0 },
      { code: salesAccOf(d, o), debit: 0, credit: amount },
    ], userId,
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const [userId, setUserId] = useState<string | null>(() => safeGet(SES_KEY));
  const [nav, setNav] = useState<NavState>({ page: "dashboard" });
  const [theme, setThemeState] = useState<"light" | "dark">(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));
  const ref = useRef(db);
  ref.current = db;

  useEffect(() => {
    safeSet(DB_KEY, JSON.stringify(db));
  }, [db]);

  const mutate = (fn: (d: DB) => void) => {
    setDb((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  };

  const user = useMemo(() => db.users.find((u) => u.id === userId && u.active) || null, [db.users, userId]);

  const value: StoreCtx = {
    db, user, nav, theme,
    navigate: (page, params) => setNav({ page, ...params }),
    setTheme: (t) => {
      setThemeState(t);
      document.documentElement.classList.toggle("dark", t === "dark");
      safeSet("sp-theme", t);
    },
    login: (username, pass) => {
      const u = ref.current.users.find((x) => x.username === username.toLowerCase().trim());
      if (!u) return "Username tidak ditemukan";
      if (!u.active) return "Akun dinonaktifkan";
      if (u.passHash !== hashPass(pass)) return "Password salah";
      setUserId(u.id);
      safeSet(SES_KEY, u.id);
      setNav({ page: "dashboard" });
      mutate((d) => log(d, u.id, "Login", `${u.name} masuk ke sistem`));
      return null;
    },
    logout: () => { setUserId(null); safeRemove(SES_KEY); },
    resetDemo: () => { setDb(buildSeed()); setNav({ page: "dashboard" }); },
    initData: (mode, startCash) => {
      setDb(mode === "demo" ? buildSeed() : buildEmpty(startCash ?? 0));
      safeSet("saniprint-setup", "1");
      setUserId(null);
      safeRemove(SES_KEY);
      setNav({ page: "dashboard" });
    },

    createOrder: (input) => {
      const d = ref.current;
      const nowTs = Date.now();
      const seq = d.seq.order + 1;
      const dk = dayKey(nowTs);
      const subtotal = input.items.reduce((a, b) => a + b.total, 0);
      const total = Math.max(0, subtotal - input.discount + input.extraCharge);
      const dp = Math.min(input.dp, total);
      let status: OrderStatus = input.needDesign ? "wait_design" : dp >= total ? "queue" : "wait_pay";
      if (input.items.every((it) => d.products.find((p) => p.id === it.productId)?.category === "Jasa") && dp >= total) status = "done";
      const order: Order = {
        id: uid(), number: `SP-${dk}-${String(seq).padStart(4, "0")}`,
        invoiceNo: `INV-${dk}-${String(seq).padStart(4, "0")}`,
        customerId: input.customerId, userId: userId || "u1", assigneeId: input.assigneeId,
        createdAt: nowTs, dueDate: input.dueDate, deadline: input.deadline,
        items: input.items, discount: input.discount, extraCharge: input.extraCharge,
        subtotal, total, note: input.note, prodNote: input.prodNote, files: input.files,
        status, history: [{ date: nowTs, from: "-", to: status, userId: userId || "u1", note: "Dibuat dari POS" }],
      };
      mutate((dd) => {
        dd.seq.order = seq;
        dd.seq.inv = d.seq.inv + 1;
        dd.orders.unshift(order);
        if (dp > 0) {
          dd.payments.unshift({ id: uid(), orderId: order.id, date: nowTs, amount: dp, method: input.method, ref: "POS-" + String(seq).padStart(4, "0"), userId: userId || "u1", note: dp >= total ? "Pembayaran penuh" : "Uang muka (DP)" });
          pushPayJournal(dd, order, dp, input.method, nowTs, userId || "u1", dp >= total ? "Pembayaran" : "Uang muka");
        }
        log(dd, userId || "u1", "Transaksi POS", `Pesanan ${order.number} · Rp${total}`);
      });
      return order;
    },

    recordPayment: (orderId, amount, method, refNo) => {
      mutate((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (!o || amount <= 0) return;
        d.payments.unshift({ id: uid(), orderId, date: Date.now(), amount, method, ref: refNo || "TRX-" + Math.floor(1000 + Math.random() * 9000), userId: userId || "u1" });
        pushPayJournal(d, o, amount, method, Date.now(), userId || "u1", "Pelunasan");
        const newBal = o.total - d.payments.filter((p) => p.orderId === orderId).reduce((a, b) => a + b.amount, 0);
        if (newBal <= 0 && (o.status === "wait_pay" || o.status === "new")) {
          o.history.push({ date: Date.now(), from: o.status, to: "queue", userId: userId || "u1", note: "Lunas — masuk antrian produksi" });
          o.status = "queue";
        }
        log(d, userId || "u1", "Pembayaran", `${o.number} · Rp${amount}`);
      });
    },

    setStatus: (orderId, to, note) => {
      mutate((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (!o || o.status === to) return;
        o.history.push({ date: Date.now(), from: o.status, to, userId: userId || "u1", note });
        o.status = to;
        if (to === "done") {
          // kurangi bahan baku sesuai BOM
          o.items.forEach((it) => {
            const pr = d.products.find((p) => p.id === it.productId);
            pr?.bom.forEach((b) => {
              const mat = d.inventory.find((m) => m.id === b.materialId);
              if (!mat) return;
              const need = b.qtyPer * it.qty;
              mat.stock = Math.round((mat.stock - need) * 100) / 100;
              d.invTx.unshift({ id: uid(), itemId: mat.id, type: "out", qty: need, date: Date.now(), ref: o.number, note: "BOM produksi", userId: userId || "u1" });
            });
          });
          const hpp = orderCost(d, o);
          if (hpp > 0) d.journals.unshift({ id: uid(), date: Date.now(), ref: o.number, desc: `HPP produksi ${o.number}`, lines: [{ code: "5100", debit: hpp, credit: 0 }, { code: "1400", debit: 0, credit: hpp }], userId: userId || "u1" });
        }
        const ev = o.history[o.history.length - 1];
        const fromLabel = ev.from === "-" ? "—" : STATUS_META[ev.from].label;
        log(d, userId || "u1", "Update Status", `${o.number}: ${fromLabel} → ${STATUS_META[to].label}`);
      });
    },

    updateOrder: (orderId, patch) => {
      mutate((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (!o) return;
        Object.assign(o, patch);
        log(d, userId || "u1", "Edit Pesanan", `${o.number} diperbarui`);
      });
    },

    saveCustomer: (c) => mutate((d) => {
      const i = d.customers.findIndex((x) => x.id === c.id);
      if (i >= 0) d.customers[i] = c;
      else { d.customers.unshift(c); log(d, userId || "u1", "Pelanggan Baru", c.name); }
    }),
    saveProduct: (p) => mutate((d) => {
      const i = d.products.findIndex((x) => x.id === p.id);
      if (i >= 0) d.products[i] = p;
      else { d.products.unshift(p); log(d, userId || "u1", "Produk Baru", p.name); }
    }),
    saveSupplier: (sp) => mutate((d) => {
      const i = d.suppliers.findIndex((x) => x.id === sp.id);
      if (i >= 0) d.suppliers[i] = sp;
      else { d.suppliers.unshift(sp); log(d, userId || "u1", "Supplier Baru", sp.name); }
    }),
    saveUser: (u, newPass) => mutate((d) => {
      const nu = { ...u, passHash: newPass ? hashPass(newPass) : u.passHash };
      const i = d.users.findIndex((x) => x.id === u.id);
      if (i >= 0) d.users[i] = nu;
      else { d.users.push(nu); log(d, userId || "u1", "Karyawan Baru", u.name); }
    }),

    addExpense: (e) => mutate((d) => {
      const ex: Expense = { ...e, id: uid() };
      d.expenses.unshift(ex);
      const accMap: Record<string, string> = { listrik: "6100", internet: "6200", sewa: "6600", bbm: "6400", gaji: "6300", perawatan: "6700", bahan: "6150", kirim: "6800", pemasaran: "6500", atk: "6850", lain: "6900" };
      d.journals.unshift({
        id: uid(), date: ex.date, ref: "BKK-" + ex.id.slice(0, 4).toUpperCase(), desc: `Pengeluaran: ${ex.desc}`,
        lines: [
          { code: accMap[ex.category] || "6900", debit: ex.amount, credit: 0 },
          { code: ex.method === "cash" ? "1100" : "1200", debit: 0, credit: ex.amount },
        ], userId: userId || "u1",
      });
      log(d, userId || "u1", "Pengeluaran", `${ex.desc} · Rp${ex.amount}`);
    }),

    createPurchase: (supplierId, items, dueDate, note) => mutate((d) => {
      const seq = d.seq.po + 1;
      d.seq.po = seq;
      const po: Purchase = {
        id: uid(), number: `PO-2026-${String(seq).padStart(4, "0")}`, supplierId, date: Date.now(),
        items, total: items.reduce((a, b) => a + b.qty * b.cost, 0), received: false, dueDate, note,
      };
      d.purchases.unshift(po);
      log(d, userId || "u1", "Pembelian", `${po.number} dibuat`);
    }),
    receivePurchase: (purchaseId) => mutate((d) => {
      const po = d.purchases.find((p) => p.id === purchaseId);
      if (!po || po.received) return;
      po.received = true;
      po.receivedAt = Date.now();
      po.items.forEach((it) => {
        const mat = d.inventory.find((m) => m.id === it.itemId);
        if (!mat) return;
        mat.stock = Math.round((mat.stock + it.qty) * 100) / 100;
        mat.cost = it.cost;
        d.invTx.unshift({ id: uid(), itemId: it.itemId, type: "in", qty: it.qty, date: Date.now(), ref: po.number, note: "Penerimaan PO", userId: userId || "u1" });
      });
      d.payables.unshift({ id: uid(), purchaseId: po.id, supplierId: po.supplierId, invoiceNo: "TAG/" + po.number.slice(-2) + "/" + Math.floor(100 + Math.random() * 900), date: Date.now(), dueDate: po.dueDate || Date.now() + 14 * 86_400_000, amount: po.total, payments: [] });
      d.journals.unshift({ id: uid(), date: Date.now(), ref: po.number, desc: `Pembelian bahan ${po.number}`, lines: [{ code: "1400", debit: po.total, credit: 0 }, { code: "2100", debit: 0, credit: po.total }], userId: userId || "u1" });
      log(d, userId || "u1", "Penerimaan Barang", `${po.number} masuk gudang`);
    }),
    paySupplier: (payableId, amount, method) => mutate((d) => {
      const ap = d.payables.find((x) => x.id === payableId);
      if (!ap || amount <= 0) return;
      ap.payments.push({ date: Date.now(), amount, method, userId: userId || "u1" });
      d.journals.unshift({ id: uid(), date: Date.now(), ref: ap.invoiceNo, desc: `Pembayaran supplier ${ap.invoiceNo}`, lines: [{ code: "2100", debit: amount, credit: 0 }, { code: method === "cash" ? "1100" : "1200", debit: 0, credit: amount }], userId: userId || "u1" });
      log(d, userId || "u1", "Bayar Supplier", `${ap.invoiceNo} · Rp${amount}`);
    }),

    stockMove: (itemId, type, qty, note) => mutate((d) => {
      const mat = d.inventory.find((m) => m.id === itemId);
      if (!mat || qty === 0) return;
      if (type === "in") mat.stock = Math.round((mat.stock + qty) * 100) / 100;
      else if (type === "out") mat.stock = Math.round((mat.stock - qty) * 100) / 100;
      else mat.stock = Math.round((mat.stock + qty) * 100) / 100; // adj bisa negatif
      d.invTx.unshift({ id: uid(), itemId, type, qty: Math.abs(type === "adj" ? qty : qty), date: Date.now(), ref: type === "adj" ? "ADJ" : "MANUAL", note, userId: userId || "u1" });
      log(d, userId || "u1", "Stok " + (type === "in" ? "Masuk" : type === "out" ? "Keluar" : "Penyesuaian"), `${mat.name} · ${qty} ${mat.unit}`);
    }),

    markNotifs: (ids) => mutate((d) => {
      d.readNotifs = Array.from(new Set([...d.readNotifs, ...ids]));
    }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- small shared helpers used by pages ---------- */
export function invValue(db: DB): number {
  return db.inventory.reduce((a, m) => a + m.stock * m.cost, 0);
}
export function lowStock(db: DB): InventoryItem[] {
  return db.inventory.filter((m) => m.minStock > 0 && m.stock <= m.minStock);
}
export function payableBalance(ap: { amount: number; payments: { amount: number }[] }): number {
  return ap.amount - ap.payments.reduce((a, b) => a + b.amount, 0);
}
export function customerStats(db: DB, customerId: string) {
  const orders = db.orders.filter((o) => o.customerId === customerId && o.status !== "cancelled");
  const totalBeli = orders.reduce((a, b) => a + b.total, 0);
  const sisa = orders.reduce((a, b) => a + balanceOf(db, b), 0);
  return { count: orders.length, totalBeli, sisa };
}
