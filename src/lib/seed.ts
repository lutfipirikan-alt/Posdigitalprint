import type {
  Account, Customer, DB, Expense, Finishing, InventoryItem, InvTx, Journal, JournalLine,
  Order, OrderItem, OrderStatus, PayMethod, Payment, Product, Purchase, StatusEvent, Supplier, User,
} from "./types";
import { EXPENSE_META } from "./types";
import { computeLinePrice, round2 } from "./pricing";
import { hashPass, uid, dayKey } from "./format";

/* deterministic RNG */
let s = 20260815;
function rnd(): number {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
}
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const daysAgo = (n: number, h = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, ri(0, 55), 0, 0);
  return d.getTime();
};

const CHAINS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  new: ["new"],
  wait_pay: ["new", "wait_pay"],
  wait_design: ["new", "wait_design"],
  designing: ["new", "wait_design", "designing"],
  design_ok: ["new", "wait_design", "designing", "design_ok"],
  queue: ["new", "queue"],
  printing: ["new", "queue", "printing"],
  finishing: ["new", "queue", "printing", "finishing"],
  qc: ["new", "queue", "printing", "finishing", "qc"],
  ready: ["new", "queue", "printing", "finishing", "qc", "ready"],
  shipped: ["new", "queue", "printing", "finishing", "qc", "ready", "shipped"],
  done: ["new", "queue", "printing", "finishing", "qc", "ready", "done"],
  cancelled: ["new", "queue", "cancelled"],
};

export function buildSeed(): DB {
  const now = Date.now();
  const users: User[] = [
    { id: "u1", name: "Budi Santoso", username: "admin", passHash: hashPass("admin123"), role: "admin", phone: "0812-3456-7801", active: true, createdAt: daysAgo(400) },
    { id: "u2", name: "Rina Wijaya", username: "manajer", passHash: hashPass("manajer123"), role: "manager", phone: "0812-3456-7802", active: true, createdAt: daysAgo(380) },
    { id: "u3", name: "Dewi Lestari", username: "kasir", passHash: hashPass("kasir123"), role: "cashier", phone: "0812-3456-7803", active: true, createdAt: daysAgo(350) },
    { id: "u4", name: "Agus Prasetyo", username: "produksi", passHash: hashPass("produksi123"), role: "production", phone: "0812-3456-7804", active: true, createdAt: daysAgo(320) },
    { id: "u5", name: "Sari Rahma", username: "desainer", passHash: hashPass("desainer123"), role: "designer", phone: "0812-3456-7805", active: true, createdAt: daysAgo(300) },
    { id: "u6", name: "Joko Susilo", username: "joko", passHash: hashPass("joko123"), role: "production", phone: "0812-3456-7806", active: true, createdAt: daysAgo(200) },
  ];

  const custSeed: [string, Customer["type"], string][] = [
    ["CV Maju Jaya", "corporate", "Jl. Sudirman No. 45, Yogyakarta"],
    ["SD Negeri 05 Melati", "school", "Jl. Kenanga 12, Sleman"],
    ["PT Graha Media", "corporate", "Jl. Ringroad Utara 88, Yogyakarta"],
    ["Nadia Putri", "retail", "Perum Green Hills B-7, Bantul"],
    ["Hendra Gunawan", "regular", "Jl. Malioboro 21, Yogyakarta"],
    ["Kantor Kelurahan Sukamaju", "government", "Jl. Kabupaten Km 5, Sleman"],
    ["Komunitas Fotografi Yogya", "regular", "Jl. Prawirotaman 30, Yogyakarta"],
    ["Rina & Dodi (Wedding)", "retail", "Jl. Godean Km 4, Sleman"],
    ["Toko Berkah Sembako", "retail", "Pasar Beringharjo Los 12, Yogyakarta"],
    ["RS Harapan Sehat", "corporate", "Jl. Wonosari Km 9, Bantul"],
    ["SMP Negeri 2 Yogyakarta", "school", "Jl. Panembahan Senopati 28-30"],
    ["Kafe Kopi Senja", "regular", "Jl. Tirtodipuran 3, Yogyakarta"],
    ["EO Prima Event", "corporate", "Jl. Seturan Raya 15, Sleman"],
    ["Bappeda Kota Yogyakarta", "government", "Komplek Balaikota, Timoho"],
    ["Andi Offset (Reseller)", "reseller", "Jl. Imogiri Timur 7, Bantul"],
    ["Percetakan Kita (Reseller)", "reseller", "Jl. Magelang Km 8, Sleman"],
    ["Studio Musik Nada", "retail", "Jl. Colombo 9, Yogyakarta"],
    ["Masjid Al-Ikhlas", "regular", "Jl. Kaliurang Km 6, Sleman"],
    ["Yayasan Peduli Anak", "regular", "Jl. Affandi 22, Sleman"],
    ["Fitri Handayani", "retail", "Jl. Wates Km 5, Bantul"],
  ];
  const customers: Customer[] = custSeed.map(([name, type, address], i) => ({
    id: "c" + (i + 1), code: "C" + String(i + 1).padStart(3, "0"), name, type, address,
    phone: "0813-" + String(1000 + i * 37).slice(0, 4) + "-" + String(2000 + i * 53).slice(0, 4),
    wa: "0813-" + String(1000 + i * 37).slice(0, 4) + "-" + String(2000 + i * 53).slice(0, 4),
    email: name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/(^\.|\.$)/g, "") + "@mail.com",
    notes: i === 14 || i === 15 ? "Harga reseller (diskon 15%)" : undefined,
    createdAt: daysAgo(ri(60, 300)),
  }));

  const suppliers: Supplier[] = [
    { id: "s1", name: "PT Pabrik Kertas Nusantara", contact: "Hartono", phone: "0274-555101", wa: "0811-2201-01", address: "Kawasan Industri Prambanan", createdAt: daysAgo(400) },
    { id: "s2", name: "CV Sinar Vinyl", contact: "Lina", phone: "0274-555102", wa: "0811-2201-02", address: "Jl. Raya Solo Km 12", createdAt: daysAgo(380) },
    { id: "s3", name: "PT Tinta Prima Indonesia", contact: "Wawan", phone: "021-883012", wa: "0811-3301-03", address: "Jakarta Timur", createdAt: daysAgo(360) },
    { id: "s4", name: "CV Akrilik Jaya", contact: "Bambang", phone: "0274-555104", wa: "0811-2201-04", address: "Jl. Magelang Km 9", createdAt: daysAgo(340) },
    { id: "s5", name: "Toko Sparepart Mesin Print", contact: "Yanto", phone: "0274-555105", wa: "0811-2201-05", address: "Jl. Hos Cokroaminoto", createdAt: daysAgo(300) },
    { id: "s6", name: "CV Kemasan Indah", contact: "Maya", phone: "0274-555106", wa: "0811-2201-06", address: "Jl. Bantul Km 6", createdAt: daysAgo(280) },
    { id: "s7", name: "PT Media Digital Indo", contact: "Rudi", phone: "021-772345", wa: "0811-3301-07", address: "Jakarta Selatan", createdAt: daysAgo(250) },
    { id: "s8", name: "CV Kayu Lestari", contact: "Slamet", phone: "0274-555108", wa: "0811-2201-08", address: "Jl. Wates Km 11", createdAt: daysAgo(220) },
    { id: "s9", name: "PT Stiker Nusantara", contact: "Citra", phone: "031-998877", wa: "0811-4401-09", address: "Surabaya", createdAt: daysAgo(180) },
    { id: "s10", name: "CV Logistik Cepat", contact: "Dodi", phone: "0274-555110", wa: "0811-2201-10", address: "Jl. Ringroad Selatan", createdAt: daysAgo(150) },
  ];

  const invSeed: [string, InventoryItem["category"], string, number, number, number, string][] = [
    ["Art Paper 150gr (A3+)", "paper", "rim", 24, 10, 62000, "s1"],
    ["Art Carton 260gr (A3+)", "paper", "rim", 16, 8, 95000, "s1"],
    ["HVS 70gr A4", "paper", "rim", 42, 15, 48000, "s1"],
    ["Kertas Foto Glossy 230gr", "paper", "pack", 18, 6, 35000, "s1"],
    ["Stiker Vinyl Putih", "vinyl", "roll", 5, 3, 425000, "s2"],
    ["Stiker Transparan", "vinyl", "roll", 2, 3, 460000, "s2"],
    ["Flexi Banner 280gr", "vinyl", "roll", 3, 2, 850000, "s2"],
    ["PVC ID Card 0,76mm", "board", "pack", 12, 5, 145000, "s7"],
    ["Akrilik 2mm Bening", "board", "lembar", 6, 4, 85000, "s4"],
    ["Akrilik 3mm Bening", "board", "lembar", 3, 4, 120000, "s4"],
    ["MDF Board 4mm", "board", "lembar", 9, 5, 55000, "s8"],
    ["Karet Stempel 2mm", "board", "lembar", 7, 3, 40000, "s7"],
    ["Tinta Epson 664 Set", "ink", "set", 4, 2, 320000, "s3"],
    ["Tinta Solvent 1L (CMYK)", "ink", "set", 6, 3, 550000, "s3"],
    ["Toner HP 107A Black", "ink", "pcs", 2, 3, 780000, "s5"],
    ["Film Laminasi Glossy", "film", "roll", 5, 2, 275000, "s9"],
    ["Film Laminasi Doff", "film", "roll", 4, 2, 285000, "s9"],
    ["Box Kemasan Custom 20x15", "packaging", "pcs", 120, 100, 2800, "s6"],
  ];
  const inventory: InventoryItem[] = invSeed.map(([name, category, unit, stock, minStock, cost, supplierId], i) => ({
    id: "m" + (i + 1), sku: "MAT-" + String(i + 1).padStart(3, "0"), name, category, unit, stock, minStock, cost, supplierId,
  }));

  const finishings: Finishing[] = [
    { id: "f1", name: "Laminasi Glossy", priceType: "perSqm", price: 15000 },
    { id: "f2", name: "Laminasi Doff", priceType: "perSqm", price: 15000 },
    { id: "f3", name: "Potong / Trimming", priceType: "perItem", price: 200 },
    { id: "f4", name: "Kiss Cut", priceType: "perSqm", price: 25000 },
    { id: "f5", name: "Die Cut / Pon", priceType: "perItem", price: 500 },
    { id: "f6", name: "UV Spot", priceType: "perSqm", price: 45000 },
    { id: "f7", name: "Ring Mata Ayam (Grommet)", priceType: "perItem", price: 2500 },
    { id: "f8", name: "Jilid Spiral", priceType: "perItem", price: 8000 },
    { id: "f9", name: "Hard Cover", priceType: "perItem", price: 25000 },
    { id: "f10", name: "Lipat / Pons Lipat", priceType: "perItem", price: 300 },
    { id: "f11", name: "Emboss", priceType: "perItem", price: 750 },
    { id: "f12", name: "Magnet Tempel", priceType: "perItem", price: 3000 },
  ];

  const P = (
    id: string, sku: string, name: string, category: string, method: Product["method"], unit: string,
    basePrice: number, costPrice: number, o: Partial<Product> = {},
  ): Product => ({
    id, sku, name, category, method, unit, basePrice, costPrice,
    moq: 1, leadDays: 2, bom: [], active: true, usesSize: false, ...o,
  });
  const products: Product[] = [
    P("p1", "SPC-001", "Kartu Nama Art Carton 260gr", "Kartu & ID", "piece", "pcs", 850, 320, { tiers: [{ minQty: 1, price: 850 }, { minQty: 200, price: 700 }, { minQty: 500, price: 600 }, { minQty: 1000, price: 500 }], bom: [{ materialId: "m2", qtyPer: 0.05 }], desc: "Cetak full color 2 sisi" }),
    P("p2", "SPC-002", "ID Card PVC + Lanyard", "Kartu & ID", "piece", "pcs", 12000, 6500, { bom: [{ materialId: "m8", qtyPer: 0.1 }] }),
    P("p3", "SPC-003", "Member Card PVC", "Kartu & ID", "piece", "pcs", 10000, 5800, { bom: [{ materialId: "m8", qtyPer: 0.1 }] }),
    P("p4", "SPC-004", "Stiker Vinyl Custom", "Stiker & Label", "sqm", "m²", 95000, 52000, { usesSize: true, bom: [{ materialId: "m5", qtyPer: 0.12 }], materials: ["Vinyl Putih", "Vinyl Transparan"], desc: "Outdoor, tahan air & UV" }),
    P("p5", "SPC-005", "Stiker Transparan", "Stiker & Label", "sqm", "m²", 110000, 60000, { usesSize: true, bom: [{ materialId: "m6", qtyPer: 0.12 }] }),
    P("p6", "SPC-006", "Label Produk Roll", "Stiker & Label", "piece", "pcs", 350, 140, { tiers: [{ minQty: 1, price: 350 }, { minQty: 1000, price: 250 }, { minQty: 5000, price: 180 }], moq: 100 }),
    P("p7", "SPC-007", "X-Banner 60×160 cm", "Outdoor", "piece", "pcs", 95000, 58000, { materials: ["Flexi 280gr", "Flexi Korea 400gr"], bom: [{ materialId: "m7", qtyPer: 1.1 }], leadDays: 1 }),
    P("p8", "SPC-008", "Spanduk Flexi Custom", "Outdoor", "sqm", "m²", 32000, 18000, { usesSize: true, materials: ["Flexi 280gr", "Flexi 400gr"], bom: [{ materialId: "m7", qtyPer: 1.05 }], leadDays: 1 }),
    P("p9", "SPC-009", "One Way Vision", "Outdoor", "sqm", "m²", 85000, 52000, { usesSize: true, bom: [{ materialId: "m5", qtyPer: 1.05 }] }),
    P("p10", "SPC-010", "Sertifikat Art Carton 230gr", "Dokumen", "piece", "pcs", 4500, 1800, { tiers: [{ minQty: 1, price: 4500 }, { minQty: 100, price: 3500 }, { minQty: 500, price: 2800 }], bom: [{ materialId: "m2", qtyPer: 0.05 }] }),
    P("p11", "SPC-011", "Undangan Soft Cover", "Undangan", "piece", "pcs", 6500, 3200, { tiers: [{ minQty: 1, price: 6500 }, { minQty: 200, price: 5500 }, { minQty: 500, price: 4800 }], bom: [{ materialId: "m1", qtyPer: 0.2 }] }),
    P("p12", "SPC-012", "Undangan Hard Cover", "Undangan", "piece", "pcs", 15000, 8500, { bom: [{ materialId: "m1", qtyPer: 0.3 }] }),
    P("p13", "SPC-013", "Paper Bag Kraft Custom", "Kemasan", "piece", "pcs", 5500, 2900, { tiers: [{ minQty: 1, price: 5500 }, { minQty: 100, price: 4500 }, { minQty: 500, price: 3800 }], moq: 50 }),
    P("p14", "SPC-014", "Box Kemasan Custom", "Kemasan", "formula", "pcs", 8000, 4200, { formula: "qty * (base + luas * 120000)", usesSize: true, bom: [{ materialId: "m18", qtyPer: 1 }] }),
    P("p15", "SPC-015", "Gantungan Kunci Akrilik", "Merchandise", "piece", "pcs", 7500, 3500, { tiers: [{ minQty: 1, price: 7500 }, { minQty: 50, price: 6000 }, { minQty: 100, price: 5000 }], bom: [{ materialId: "m9", qtyPer: 0.02 }] }),
    P("p16", "SPC-016", "Plakat Akrilik Custom", "Merchandise", "formula", "pcs", 45000, 22000, { formula: "qty * (base + luas * 350000)", usesSize: true, bom: [{ materialId: "m10", qtyPer: 0.25 }] }),
    P("p17", "SPC-017", "Gravir Kayu Custom", "Merchandise", "formula", "pcs", 35000, 15000, { formula: "qty * (base + luas * 280000)", usesSize: true, bom: [{ materialId: "m11", qtyPer: 0.2 }] }),
    P("p18", "SPC-018", "Stempel Flash", "Merchandise", "piece", "pcs", 85000, 48000, { bom: [{ materialId: "m12", qtyPer: 0.15 }] }),
    P("p19", "SPC-019", "Kaos DTF Print", "Merchandise", "piece", "pcs", 65000, 38000, { materials: ["Cotton Combed 24s", "Cotton Combed 30s"], leadDays: 3 }),
    P("p20", "SPC-020", "Tote Bag Sablon", "Merchandise", "piece", "pcs", 28000, 16000, { moq: 12 }),
    P("p21", "SPC-021", "Mug Print Custom", "Merchandise", "piece", "pcs", 25000, 14500, { moq: 6 }),
    P("p22", "SPC-022", "Fotocopy A4 Hitam Putih", "Cetak Digital", "sheet", "lembar", 300, 90, { tiers: [{ minQty: 1, price: 300 }, { minQty: 100, price: 250 }, { minQty: 500, price: 200 }, { minQty: 1000, price: 150 }], bom: [{ materialId: "m3", qtyPer: 0.002 }], leadDays: 0 }),
    P("p23", "SPC-023", "Fotocopy A4 Warna", "Cetak Digital", "sheet", "lembar", 1000, 400, { bom: [{ materialId: "m3", qtyPer: 0.002 }], leadDays: 0 }),
    P("p24", "SPC-024", "Print Warna A4 (Art Paper)", "Cetak Digital", "sheet", "lembar", 2500, 1100, { bom: [{ materialId: "m1", qtyPer: 0.005 }], leadDays: 0 }),
    P("p25", "SPC-025", "Cetak Foto 10R", "Cetak Digital", "piece", "pcs", 5000, 1800, { tiers: [{ minQty: 1, price: 5000 }, { minQty: 50, price: 3500 }], bom: [{ materialId: "m4", qtyPer: 0.05 }], leadDays: 0 }),
    P("p26", "SPC-026", "Buku Yasin / Kenduri Custom", "Cetak Digital", "formula", "pcs", 12000, 6000, { formula: "qty * (base + p * 150)", bom: [{ materialId: "m1", qtyPer: 0.5 }] }),
    P("p27", "SPC-027", "Kalender Dinding A3", "Cetak Digital", "piece", "pcs", 18000, 9000, { tiers: [{ minQty: 1, price: 18000 }, { minQty: 100, price: 14000 }], bom: [{ materialId: "m1", qtyPer: 0.25 }] }),
    P("p28", "SPC-028", "Jasa Desain Grafis", "Jasa", "piece", "layanan", 150000, 40000, { desc: "Desain oleh tim internal, revisi 2×" }),
    P("p29", "SPC-029", "Jasa Tracing Vector", "Jasa", "piece", "layanan", 100000, 25000, {}),
    P("p30", "SPC-030", "Laser Cutting / Engraving", "Jasa", "formula", "jam", 50000, 15000, { formula: "base * qty + luas * 120000", usesSize: true, unit: "jam" }),
  ];

  const accounts: Account[] = [
    { code: "1000", name: "Aset", type: "asset" },
    { code: "1100", name: "Kas", type: "asset" },
    { code: "1200", name: "Bank", type: "asset" },
    { code: "1300", name: "Piutang Usaha", type: "asset" },
    { code: "1400", name: "Persediaan Bahan", type: "asset" },
    { code: "2000", name: "Kewajiban", type: "liability" },
    { code: "2100", name: "Hutang Usaha", type: "liability" },
    { code: "4000", name: "Pendapatan", type: "revenue" },
    { code: "4100", name: "Penjualan Cetak", type: "revenue" },
    { code: "4200", name: "Pendapatan Jasa Desain", type: "revenue" },
    { code: "5000", name: "HPP", type: "cogs" },
    { code: "5100", name: "HPP Bahan & Produksi", type: "cogs" },
    { code: "6000", name: "Beban Operasional", type: "expense" },
    { code: "6100", name: "Beban Listrik", type: "expense" },
    { code: "6150", name: "Beban Bahan Baku", type: "expense" },
    { code: "6200", name: "Beban Internet", type: "expense" },
    { code: "6300", name: "Beban Gaji", type: "expense" },
    { code: "6400", name: "Beban BBM", type: "expense" },
    { code: "6500", name: "Beban Pemasaran", type: "expense" },
    { code: "6600", name: "Beban Sewa", type: "expense" },
    { code: "6700", name: "Beban Perawatan Mesin", type: "expense" },
    { code: "6800", name: "Beban Kirim & Ongkos", type: "expense" },
    { code: "6850", name: "Beban Perlengkapan", type: "expense" },
    { code: "6900", name: "Beban Lain-lain", type: "expense" },
  ];

  /* ---------- orders ---------- */
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const journals: Journal[] = [];
  const invTx: InvTx[] = [];
  let orderSeq = 0;

  function nextNumber(date: number): { number: string; invoiceNo: string } {
    orderSeq++;
    const d = dayKey(date);
    return { number: `SP-${d}-${String(orderSeq).padStart(4, "0")}`, invoiceNo: `INV-${d}-${String(orderSeq).padStart(4, "0")}` };
  }
  function salesAcc(order: Order): string {
    const jasa = order.items.every((it) => it.sku.startsWith("SPC-028") || it.sku.startsWith("SPC-029") || it.sku.startsWith("SPC-030"));
    return jasa ? "4200" : "4100";
  }
  function pushJournal(date: number, ref: string, desc: string, lines: JournalLine[], userId: string) {
    journals.push({ id: uid(), date, ref, desc, lines, userId });
  }
  function addPayment(o: Order, amount: number, date: number, method: PayMethod, userId: string) {
    date = Math.min(date, Date.now() - 60_000);
    payments.push({ id: uid(), orderId: o.id, date, amount, method, ref: "TRX-" + ri(1000, 9999), userId });
    const acc = method === "cash" ? "1100" : "1200";
    pushJournal(date, o.number, `Pembayaran ${o.number} — ${o.invoiceNo}`, [
      { code: acc, debit: amount, credit: 0 },
      { code: salesAcc(o), debit: 0, credit: amount },
    ], userId);
  }
  function hppFor(o: Order): number {
    return o.items.reduce((sm, it) => {
      const pr = products.find((p) => p.id === it.productId);
      return sm + (pr ? pr.costPrice * it.qty : 0);
    }, 0);
  }

  const plans: { pi: number; qty: number; w?: number; h?: number; fin?: string[]; mat?: string }[][] = [
    [{ pi: 0, qty: 200, fin: ["f2"] }, { pi: 27, qty: 1 }],
    [{ pi: 7, qty: 1, w: 300, h: 100, fin: ["f7"], mat: "Flexi 280gr" }],
    [{ pi: 3, qty: 1, w: 10, h: 15, fin: ["f4"], mat: "Vinyl Putih" }],
    [{ pi: 21, qty: 500 }],
    [{ pi: 10, qty: 300, fin: ["f10"] }],
    [{ pi: 1, qty: 25 }],
    [{ pi: 18, qty: 24, mat: "Cotton Combed 30s" }],
    [{ pi: 12, qty: 150 }],
    [{ pi: 6, qty: 2, mat: "Flexi 280gr", fin: ["f7"] }],
    [{ pi: 24, qty: 20 }],
    [{ pi: 4, qty: 1, w: 20, h: 30, fin: ["f4"] }],
    [{ pi: 9, qty: 400 }],
    [{ pi: 15, qty: 2, w: 15, h: 20 }],
    [{ pi: 2, qty: 100 }],
    [{ pi: 5, qty: 2000 }],
    [{ pi: 16, qty: 10, w: 20, h: 30 }],
    [{ pi: 8, qty: 1, w: 200, h: 150 }],
    [{ pi: 13, qty: 100 }],
    [{ pi: 19, qty: 50 }],
    [{ pi: 26, qty: 1 }],
    [{ pi: 22, qty: 120 }],
    [{ pi: 25, qty: 30 }],
    [{ pi: 14, qty: 40 }],
    [{ pi: 20, qty: 20 }],
  ];
  const statusPlan: OrderStatus[] = [
    "printing", "queue", "ready", "done", "done", "finishing", "printing", "done", "qc", "done",
    "designing", "shipped", "wait_pay", "done", "wait_pay", "new", "done", "ready", "done", "cancelled",
    "wait_design", "new", "done", "done",
  ];
  const daySpread = [0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 21, 25, 30, 36];

  plans.forEach((plan, idx) => {
    const status = statusPlan[idx];
    const date = daysAgo(daySpread[idx], ri(8, 17));
    const customer = customers[ri(0, customers.length - 1)];
    const cashier = pick(["u3", "u3", "u1", "u6"]);
    const items: OrderItem[] = plan.map((pl) => {
      const pr = products[pl.pi];
      const fins = finishings.filter((f) => (pl.fin || []).includes(f.id));
      const calc = computeLinePrice(pr, { qty: pl.qty, width: pl.w, height: pl.h }, fins);
      return {
        id: uid(), productId: pr.id, name: pr.name, sku: pr.sku, qty: pl.qty,
        width: pl.w, height: pl.h, material: pl.mat, finishingIds: fins.map((f) => f.id),
        unitPrice: Math.round(calc.unit), extraPrice: 0, total: calc.total,
      };
    });
    const subtotal = items.reduce((a, b) => a + b.total, 0);
    const discount = customer.type === "reseller" ? round2(subtotal * 0.15) : subtotal > 400000 && rnd() > 0.6 ? round2(subtotal * 0.05) : 0;
    const extraCharge = 0;
    const total = subtotal - discount + extraCharge;
    const { number, invoiceNo } = nextNumber(date);
    const chain = CHAINS[status]!;
    const hist: StatusEvent[] = chain.map((st, i) => ({
      date: date + i * 3600_000 * ri(3, 20), from: i === 0 ? "-" : chain[i - 1], to: st,
      userId: st === "designing" || st === "design_ok" || st === "wait_design" ? "u5" : pick(["u4", "u6", "u3"]),
    }));
    const order: Order = {
      id: "o" + (idx + 1), number, invoiceNo, customerId: customer.id, userId: cashier,
      assigneeId: status === "designing" || status === "wait_design" ? "u5" : pick(["u4", "u6"]),
      createdAt: date, items, discount, extraCharge, subtotal, total,
      dueDate: total > 0 ? date + 14 * 86_400_000 : undefined,
      deadline: ["printing", "finishing", "qc", "queue", "designing"].includes(status) ? daysAgo(0, 18) + ri(-1, 4) * 86_400_000 : undefined,
      note: idx === 2 ? "File dari customer, jangan ubah layout" : idx === 7 ? "Warna jangan terlalu gelap" : undefined,
      prodNote: status === "printing" ? "Mesin A2, bahan sudah disiapkan" : undefined,
      files: rnd() > 0.45 ? [{ name: "desain-" + number.toLowerCase() + pick([".ai", ".cdr", ".pdf", ".psd"]), type: "design", size: ri(400, 9000) * 1024, addedAt: date }] : [],
      status, history: hist,
    };
    orders.push(order);

    const doneLike = ["done", "shipped", "ready"].includes(status);
    if (status === "cancelled") return;
    if (doneLike) {
      if (rnd() > 0.5) {
        const dp = round2(total * 0.5);
        addPayment(order, dp, date + 1800_000, "cash", cashier);
        addPayment(order, total - dp, date + ri(1, 3) * 86_400_000, pick(["transfer", "qr", "cash"]) as PayMethod, "u3");
      } else {
        addPayment(order, total, date + 1800_000, pick(["cash", "qr", "transfer", "ewallet"]) as PayMethod, cashier);
      }
      if (status === "done" || status === "shipped") {
        const hpp = hppFor(order);
        if (hpp > 0) pushJournal(Math.min(date + 5 * 86_400_000, Date.now() - 30_000), number, `HPP ${number}`, [
          { code: "5100", debit: hpp, credit: 0 }, { code: "1400", debit: 0, credit: hpp },
        ], "u4");
      }
    } else if (["printing", "finishing", "qc", "queue", "ready"].includes(status) && rnd() > 0.5) {
      addPayment(order, round2(total * (rnd() * 0.3 + 0.4)), date + 3600_000, pick(["cash", "transfer", "qr"]) as PayMethod, cashier);
    }
  });

  /* ---------- purchases, payables, inventory tx ---------- */
  const purchases: Purchase[] = [
    { id: "po1", number: "PO-2026-0019", supplierId: "s1", date: daysAgo(22), items: [{ itemId: "m1", qty: 10, cost: 60000 }, { itemId: "m2", qty: 8, cost: 92000 }, { itemId: "m3", qty: 20, cost: 46000 }], total: 2256000, received: true, receivedAt: daysAgo(20), dueDate: daysAgo(22) + 30 * 86_400_000, note: "Restock rutin kertas" },
    { id: "po2", number: "PO-2026-0020", supplierId: "s3", date: daysAgo(12), items: [{ itemId: "m13", qty: 2, cost: 315000 }, { itemId: "m14", qty: 3, cost: 540000 }], total: 2250000, received: true, receivedAt: daysAgo(10), dueDate: daysAgo(12) + 30 * 86_400_000 },
    { id: "po3", number: "PO-2026-0021", supplierId: "s2", date: daysAgo(6), items: [{ itemId: "m5", qty: 4, cost: 415000 }, { itemId: "m7", qty: 2, cost: 830000 }], total: 3320000, received: true, receivedAt: daysAgo(4), dueDate: daysAgo(6) + 14 * 86_400_000 },
    { id: "po4", number: "PO-2026-0022", supplierId: "s4", date: daysAgo(2), items: [{ itemId: "m9", qty: 10, cost: 82000 }, { itemId: "m10", qty: 8, cost: 117000 }], total: 1756000, received: true, receivedAt: daysAgo(1), dueDate: daysAgo(2) + 14 * 86_400_000 },
    { id: "po5", number: "PO-2026-0023", supplierId: "s9", date: daysAgo(0, 8), items: [{ itemId: "m16", qty: 4, cost: 268000 }, { itemId: "m17", qty: 4, cost: 278000 }], total: 2184000, received: false, dueDate: daysAgo(0) + 14 * 86_400_000 },
  ];
  const payables = purchases.filter((p) => p.received).map((p) => ({
    id: "ap" + p.id, purchaseId: p.id, supplierId: p.supplierId, invoiceNo: "TAG/" + p.number.slice(-2) + "/" + ri(100, 999),
    date: p.receivedAt!, dueDate: p.dueDate!, amount: p.total,
    payments: p.id === "po1" ? [{ date: daysAgo(15), amount: p.total, method: "transfer" as PayMethod, userId: "u2" }] : [],
  }));
  purchases.filter((p) => p.received).forEach((p) => {
    pushJournal(p.receivedAt!, p.number, `Pembelian bahan ${p.number}`, [
      { code: "1400", debit: p.total, credit: 0 }, { code: "2100", debit: 0, credit: p.total },
    ], "u2");
    p.items.forEach((it) => {
      invTx.push({ id: uid(), itemId: it.itemId, type: "in", qty: it.qty, date: p.receivedAt!, ref: p.number, note: "Penerimaan barang", userId: "u4" });
    });
  });
  payables.filter((ap) => ap.payments.length > 0).forEach((ap) => {
    ap.payments.forEach((pm) => {
      pushJournal(pm.date, ap.invoiceNo, `Pembayaran supplier ${ap.invoiceNo}`, [
        { code: "2100", debit: pm.amount, credit: 0 }, { code: "1200", debit: 0, credit: pm.amount },
      ], "u2");
    });
  });
  // manual stock movements
  invTx.push(
    { id: uid(), itemId: "m3", type: "out", qty: 6, date: daysAgo(9), ref: "ADJ", note: "Dipakai order fotocopy sekolah", userId: "u4" },
    { id: uid(), itemId: "m15", type: "out", qty: 1, date: daysAgo(8), ref: "ADJ", note: "Toner habis saat produksi", userId: "u6" },
    { id: uid(), itemId: "m18", type: "adj", qty: -6, date: daysAgo(5), ref: "ADJ", note: "Box rusak saat penyimpanan", userId: "u2" },
    { id: uid(), itemId: "m12", type: "in", qty: 2, date: daysAgo(3), ref: "MANUAL", note: "Pembelian langsung toko", userId: "u2" },
  );

  /* ---------- expenses ---------- */
  const E = (n: number, category: Expense["category"], amount: number, desc: string, method: PayMethod = "transfer"): Expense => ({
    id: uid(), date: daysAgo(n, ri(8, 15)), category, amount, method, desc, userId: "u2",
  });
  const expenses: Expense[] = [
    E(1, "listrik", 860000, "Token listrik PLN prabayar"),
    E(2, "internet", 495000, "IndiHome paket bisnis"),
    E(3, "bbm", 150000, "Bensin antar order customer", "cash"),
    E(4, "perawatan", 350000, "Servis head printer Epson L1800"),
    E(6, "gaji", 5600000, "Gaji mingguan staf produksi & kasir"),
    E(7, "pemasaran", 400000, "Instagram Ads — promo banner"),
    E(9, "atk", 120000, "Alat tulis & plastik packing", "cash"),
    E(11, "kirim", 85000, "GoSend order plakat Bantul", "ewallet"),
    E(13, "gaji", 5600000, "Gaji mingguan staf produksi & kasir"),
    E(16, "bahan", 750000, "Beli tinta eceran (urgent)", "cash"),
    E(20, "gaji", 5600000, "Gaji mingguan staf produksi & kasir"),
    E(24, "sewa", 3500000, "Sewa ruko bulan ini"),
    E(27, "gaji", 5600000, "Gaji mingguan staf produksi & kasir"),
    E(30, "listrik", 845000, "Token listrik PLN prabayar"),
    E(32, "internet", 495000, "IndiHome paket bisnis"),
    E(34, "gaji", 5600000, "Gaji mingguan staf produksi & kasir"),
    E(37, "pemasaran", 300000, "Brosur promo disebar kampus"),
    E(40, "perawatan", 275000, "Ganti blade mesin cutting"),
    E(44, "sewa", 3500000, "Sewa ruko bulan lalu"),
    E(48, "gaji", 5400000, "Gaji mingguan staf"),
    E(55, "listrik", 820000, "Token listrik PLN prabayar"),
    E(58, "gaji", 5400000, "Gaji mingguan staf"),
  ];
  expenses.forEach((e) => {
    const acc = e.method === "cash" ? "1100" : "1200";
    pushJournal(e.date, "BKK-" + e.id.slice(0, 4).toUpperCase(), `Pengeluaran: ${e.desc}`, [
      { code: EXPENSE_META[e.category].acc, debit: e.amount, credit: 0 }, { code: acc, debit: 0, credit: e.amount },
    ], "u2");
  });

  return {
    version: 3,
    startCash: 12_500_000,
    users, customers, suppliers, products, finishings, inventory, invTx,
    orders: orders.sort((a, b) => b.createdAt - a.createdAt),
    payments: payments.sort((a, b) => b.date - a.date),
    expenses, purchases, payables, accounts,
    journals: journals.sort((a, b) => b.date - a.date),
    activities: [
      { id: uid(), date: now - 3600_000, userId: "u3", action: "Transaksi POS", detail: "Membuat pesanan baru" },
      { id: uid(), date: now - 7200_000, userId: "u4", action: "Update Status", detail: "Pesanan dipindah ke Sedang Dicetak" },
      { id: uid(), date: now - 10_800_000, userId: "u2", action: "Pengeluaran", detail: "Mencatat pengeluaran operasional" },
    ],
    seq: { order: orderSeq + 120, inv: orderSeq + 120, po: 24 },
    readNotifs: [],
  };
}
