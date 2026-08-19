export type ID = string;

/* ---------- Auth & people ---------- */
export type Role = "admin" | "manager" | "cashier" | "production" | "designer";
export interface User {
  id: ID;
  name: string;
  username: string;
  passHash: string;
  role: Role;
  phone?: string;
  active: boolean;
  createdAt: number;
}
export const ROLE_META: Record<Role, { label: string; color: string; desc: string }> = {
  admin: { label: "Administrator", color: "#d81159", desc: "Akses penuh seluruh modul" },
  manager: { label: "Manajer", color: "#0e7490", desc: "Laporan, pesanan, inventori, keuangan" },
  cashier: { label: "Kasir", color: "#b45309", desc: "POS, pelanggan, transaksi" },
  production: { label: "Staf Produksi", color: "#178a4c", desc: "Order produksi & update status" },
  designer: { label: "Desainer", color: "#7c3aed", desc: "Order terkait desain" },
};

/* ---------- Master data ---------- */
export type CustomerType = "retail" | "reseller" | "corporate" | "school" | "government" | "regular";
export const CUSTOMER_TYPE_META: Record<CustomerType, string> = {
  retail: "Retail",
  reseller: "Reseller",
  corporate: "Perusahaan",
  school: "Sekolah",
  government: "Instansi",
  regular: "Pelanggan Tetap",
};
export interface Customer {
  id: ID;
  code: string;
  name: string;
  phone: string;
  wa?: string;
  email?: string;
  address?: string;
  type: CustomerType;
  notes?: string;
  createdAt: number;
}

export type PricingMethod = "piece" | "sheet" | "sqm" | "formula";
export const PRICING_META: Record<PricingMethod, { label: string; hint: string }> = {
  piece: { label: "Per Pcs", hint: "Qty × harga satuan" },
  sheet: { label: "Per Lembar", hint: "Lembar × harga lembar" },
  sqm: { label: "Per m²", hint: "P × L × harga per m² × qty" },
  formula: { label: "Rumus Custom", hint: "Formula: qty, p, l, luas, base" },
};
export const UNITS = ["pcs", "lembar", "m", "m²", "box", "pack", "jam", "layanan", "rim", "roll", "set"];

export interface PriceTier { minQty: number; price: number }
export interface BomLine { materialId: ID; qtyPer: number }
export interface Product {
  id: ID;
  sku: string;
  name: string;
  category: string;
  desc?: string;
  method: PricingMethod;
  unit: string;
  basePrice: number;
  costPrice: number;
  tiers?: PriceTier[];
  formula?: string;
  moq: number;
  leadDays: number;
  materials?: string[]; // pilihan bahan (spesifikasi order)
  bom: BomLine[];
  active: boolean;
  usesSize: boolean; // butuh input P × L
}
export interface Finishing {
  id: ID;
  name: string;
  priceType: "flat" | "perItem" | "perSqm";
  price: number;
}

/* ---------- Inventory ---------- */
export type InvCategory = "paper" | "vinyl" | "ink" | "film" | "board" | "consumable" | "packaging" | "other";
export const INV_CAT_META: Record<InvCategory, string> = {
  paper: "Kertas", vinyl: "Vinyl & Stiker", ink: "Tinta & Toner", film: "Laminasi",
  board: "Papan & Akrilik", consumable: "Bahan Habis", packaging: "Kemasan", other: "Lainnya",
};
export interface InventoryItem {
  id: ID; sku: string; name: string; category: InvCategory; unit: string;
  stock: number; minStock: number; cost: number; supplierId?: ID;
}
export interface InvTx {
  id: ID; itemId: ID; type: "in" | "out" | "adj"; qty: number; date: number;
  ref?: string; note?: string; userId: ID;
}

export interface Supplier {
  id: ID; name: string; contact?: string; phone?: string; wa?: string;
  address?: string; notes?: string; createdAt: number;
}

/* ---------- Orders ---------- */
export type OrderStatus =
  | "new" | "wait_pay" | "wait_design" | "designing" | "design_ok"
  | "queue" | "printing" | "finishing" | "qc" | "ready" | "shipped" | "done" | "cancelled";

export const STATUS_FLOW: OrderStatus[] = [
  "new", "wait_pay", "wait_design", "designing", "design_ok",
  "queue", "printing", "finishing", "qc", "ready", "shipped", "done", "cancelled",
];
export const STATUS_META: Record<OrderStatus, { label: string; color: string; group: "baru" | "desain" | "produksi" | "selesai" }> = {
  new: { label: "Pesanan Baru", color: "#0f766e", group: "baru" },
  wait_pay: { label: "Menunggu Pembayaran", color: "#b45309", group: "baru" },
  wait_design: { label: "Menunggu Desain", color: "#7c3aed", group: "desain" },
  designing: { label: "Proses Desain", color: "#c026d3", group: "desain" },
  design_ok: { label: "Desain Disetujui", color: "#2563eb", group: "desain" },
  queue: { label: "Antri Produksi", color: "#0284c7", group: "produksi" },
  printing: { label: "Sedang Dicetak", color: "#0e7490", group: "produksi" },
  finishing: { label: "Finishing", color: "#db2777", group: "produksi" },
  qc: { label: "Quality Control", color: "#65a30d", group: "produksi" },
  ready: { label: "Siap Diambil", color: "#178a4c", group: "selesai" },
  shipped: { label: "Dikirim", color: "#475569", group: "selesai" },
  done: { label: "Selesai", color: "#334155", group: "selesai" },
  cancelled: { label: "Dibatalkan", color: "#d33131", group: "selesai" },
};
export const PRODUCTION_COLS: OrderStatus[] = [
  "new", "wait_pay", "wait_design", "designing", "design_ok", "queue",
  "printing", "finishing", "qc", "ready", "shipped", "done",
];

export interface OrderItem {
  id: ID;
  productId: ID;
  name: string;
  sku: string;
  qty: number;
  width?: number; // cm
  height?: number; // cm
  material?: string;
  finishingIds: ID[];
  unitPrice: number;
  extraPrice: number; // biaya tambahan per baris (mis. jasa desain)
  note?: string;
  total: number;
}
export interface OrderFile { name: string; type: string; size: number; addedAt: number }
export interface StatusEvent { date: number; from: OrderStatus | "-"; to: OrderStatus; userId: ID; note?: string }

export interface Order {
  id: ID;
  number: string;
  invoiceNo: string;
  customerId: ID;
  userId: ID; // kasir pembuat
  assigneeId?: ID;
  createdAt: number;
  dueDate?: number; // jatuh tempo pelunasan
  deadline?: number; // target selesai produksi
  items: OrderItem[];
  discount: number;
  extraCharge: number;
  subtotal: number;
  total: number;
  note?: string;
  prodNote?: string;
  files: OrderFile[];
  status: OrderStatus;
  history: StatusEvent[];
}

export type PayMethod = "cash" | "transfer" | "qr" | "ewallet" | "other";
export const PAY_METHOD_META: Record<PayMethod, string> = {
  cash: "Tunai", transfer: "Transfer Bank", qr: "QRIS", ewallet: "E-Wallet", other: "Lainnya",
};
export interface Payment {
  id: ID; orderId: ID; date: number; amount: number; method: PayMethod;
  ref?: string; note?: string; userId: ID;
}

/* ---------- Finance ---------- */
export type ExpenseCat = "listrik" | "internet" | "sewa" | "bbm" | "gaji" | "perawatan" | "bahan" | "kirim" | "pemasaran" | "atk" | "lain";
export const EXPENSE_META: Record<ExpenseCat, { label: string; acc: string }> = {
  listrik: { label: "Listrik", acc: "6100" },
  internet: { label: "Internet", acc: "6200" },
  sewa: { label: "Sewa Tempat", acc: "6600" },
  bbm: { label: "Bahan Bakar", acc: "6400" },
  gaji: { label: "Gaji", acc: "6300" },
  perawatan: { label: "Perawatan Mesin", acc: "6700" },
  bahan: { label: "Bahan Baku", acc: "6150" },
  kirim: { label: "Ongkos Kirim", acc: "6800" },
  pemasaran: { label: "Pemasaran", acc: "6500" },
  atk: { label: "Perlengkapan Kantor", acc: "6850" },
  lain: { label: "Lain-lain", acc: "6900" },
};
export interface Expense {
  id: ID; date: number; category: ExpenseCat; amount: number; method: PayMethod;
  desc: string; userId: ID; receiptName?: string;
}
export interface PurchaseItem { itemId: ID; qty: number; cost: number }
export interface Purchase {
  id: ID; number: string; supplierId: ID; date: number; items: PurchaseItem[];
  total: number; received: boolean; receivedAt?: number; dueDate?: number; note?: string;
}
export interface ApPayment { date: number; amount: number; method: PayMethod; userId: ID }
export interface Payable {
  id: ID; purchaseId: ID; supplierId: ID; invoiceNo: string; date: number; dueDate: number;
  amount: number; payments: ApPayment[];
}
export interface Account { code: string; name: string; type: "asset" | "liability" | "revenue" | "cogs" | "expense" }
export interface JournalLine { code: string; debit: number; credit: number }
export interface Journal {
  id: ID; date: number; ref: string; desc: string; lines: JournalLine[]; userId: ID;
}
export interface Activity { id: ID; date: number; userId: ID; action: string; detail: string }

/* ---------- DB root ---------- */
export interface DB {
  version: number;
  startCash: number;
  users: User[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  finishings: Finishing[];
  inventory: InventoryItem[];
  invTx: InvTx[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  purchases: Purchase[];
  payables: Payable[];
  accounts: Account[];
  journals: Journal[];
  activities: Activity[];
  seq: { order: number; inv: number; po: number };
  readNotifs: string[];
}

export type Page =
  | "dashboard" | "pos" | "orders" | "production" | "customers" | "products"
  | "inventory" | "suppliers" | "finance" | "cashflow" | "accounting"
  | "reports" | "people";
export interface NavState { page: Page; orderId?: ID; customerId?: ID; tab?: string }

export interface Notif {
  id: string; kind: "info" | "warn" | "danger" | "ok";
  title: string; body: string; page: Page; refId?: ID; ts: number;
}
