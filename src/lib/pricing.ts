import type { Finishing, Product } from "./types";

/* ---------- safe formula evaluator ( + - * / ( ) dan variabel ) ---------- */
type Tok = { t: "n" | "op" | "lp" | "rp" | "id"; v: string };
function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ t: "n", v: src.slice(i, j) }); i = j; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z_0-9]/.test(src[j])) j++;
      toks.push({ t: "id", v: src.slice(i, j) }); i = j; continue;
    }
    if ("+-*/".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    if (c === "(") { toks.push({ t: "lp", v: c }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp", v: c }); i++; continue; }
    throw new Error("Karakter tidak valid: " + c);
  }
  return toks;
}
export function evalFormula(src: string, vars: Record<string, number>): number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  function expr(): number {
    let v = term();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = toks[pos++].v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = factor();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = toks[pos++].v;
      const r = factor();
      v = op === "*" ? v * r : r === 0 ? 0 : v / r;
    }
    return v;
  }
  function factor(): number {
    const t = peek();
    if (!t) throw new Error("Formula tidak lengkap");
    if (t.t === "n") { pos++; return parseFloat(t.v); }
    if (t.t === "id") {
      pos++;
      if (t.v in vars) return vars[t.v];
      throw new Error("Variabel tidak dikenal: " + t.v);
    }
    if (t.t === "lp") {
      pos++;
      const v = expr();
      if (!peek() || peek().t !== "rp") throw new Error("Kurang tutup kurung");
      pos++;
      return v;
    }
    if (t.t === "op" && t.v === "-") { pos++; return -factor(); }
    throw new Error("Token tidak valid: " + t.v);
  }
  const v = expr();
  if (pos !== toks.length) throw new Error("Formula tidak valid");
  return v;
}

/* ---------- pricing engine ---------- */
export interface PriceInput {
  qty: number;
  width?: number; // cm
  height?: number; // cm
}
export function areaSqm(w?: number, h?: number, qty = 1): number {
  if (!w || !h) return 0;
  return (w * h) / 10000 * qty;
}
export function tierPrice(p: Product, qty: number): number {
  let price = p.basePrice;
  if (p.tiers?.length) {
    const sorted = [...p.tiers].sort((a, b) => b.minQty - a.minQty);
    for (const t of sorted) if (qty >= t.minQty) { price = t.price; break; }
  }
  return price;
}
export function computeLinePrice(
  p: Product,
  input: PriceInput,
  finishings: Finishing[],
  materialSurcharge = 0,
): { unit: number; area: number; finishingTotal: number; total: number } {
  const qty = Math.max(1, input.qty || 1);
  const area = areaSqm(input.width, input.height, qty);
  let unit = 0;
  if (p.method === "sqm") {
    const per = Math.max(area, 0.0001);
    unit = p.basePrice * (per / qty) + materialSurcharge;
  } else if (p.method === "formula") {
    const vars = {
      qty, p: input.width || 0, l: input.height || 0,
      luas: areaSqm(input.width, input.height, 1), area: areaSqm(input.width, input.height, 1),
      base: p.basePrice, bahan: materialSurcharge,
    };
    try {
      const total = evalFormula(p.formula || "base * qty", vars);
      return { unit: total / qty, area, finishingTotal: 0, total: Math.max(0, Math.round(total)) };
    } catch {
      unit = p.basePrice + materialSurcharge;
    }
  } else {
    unit = tierPrice(p, qty) + materialSurcharge;
  }
  const baseTotal = Math.round(unit * qty);
  const finishingTotal = Math.round(
    finishings.reduce((s, f) => {
      if (f.priceType === "flat") return s + f.price;
      if (f.priceType === "perItem") return s + f.price * qty;
      return s + f.price * Math.max(area, 0.25);
    }, 0),
  );
  return { unit, area, finishingTotal, total: baseTotal + finishingTotal };
}
export function round2(n: number): number {
  return Math.round(n / 100) * 100;
}
