import React, { useState } from "react";
import { ArrowRight, Check, Database, FlaskConical, HardDrive, Lock } from "lucide-react";
import { useStore } from "../lib/store";
import { Btn, Field, Input, Logo } from "../components/ui";
import { fmtIDR } from "../lib/format";

export default function Setup({ onDone }: { onDone: () => void }) {
  const { initData } = useStore();
  const [mode, setMode] = useState<"empty" | "demo">("empty");
  const [cash, setCash] = useState(0);
  const [busy, setBusy] = useState(false);

  const start = () => {
    setBusy(true);
    setTimeout(() => {
      initData(mode, cash);
      onDone();
    }, 450);
  };

  return (
    <div className="flex min-h-screen">
      {/* kiri: brand */}
      <div className="dotgrid-side relative hidden w-[42%] flex-col justify-between overflow-hidden bg-side p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -left-20 -bottom-20 opacity-[0.14]">
          <svg width="380" height="380" viewBox="0 0 32 32">
            <circle cx="12" cy="12" r="8" fill="#00AEEF" />
            <circle cx="20" cy="12" r="8" fill="#EC008C" />
            <circle cx="16" cy="19" r="8" fill="#FFF200" />
          </svg>
        </div>
        <Logo size={38} dark />
        <div className="relative">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-brand-hi">Persiapan Awal</p>
          <h1 className="mt-3 font-display text-[36px] font-bold leading-[1.08] tracking-tight">
            Kasir Anda,<br />aturan Anda.
          </h1>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-white/55">
            Pilih cara memulai. Apa pun pilihan Anda, sistem sudah siap:
            katalog produk percetakan, mesin harga per m² & rumus, alur produksi
            13 status, dan pembukuan otomatis.
          </p>
          <div className="mt-8 max-w-sm space-y-2.5">
            {[
              ["HardDrive", "Seluruh data tersimpan di perangkat ini — tetap ada walau browser ditutup"],
              ["Lock", "Login per peran: admin, kasir, produksi, desainer"],
              ["Database", "Bisa dikosongkan atau dimuat ulang kapan saja dari menu admin"],
            ].map(([icon, t]) => (
              <p key={t} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-white/65">
                <span className="mt-0.5 text-brand-hi">
                  {icon === "HardDrive" ? <HardDrive size={14} /> : icon === "Lock" ? <Lock size={14} /> : <Database size={14} />}
                </span>
                {t}
              </p>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/35">Sani Print POS · versi siap produksi</p>
      </div>

      {/* kanan: pilihan mode */}
      <div className="flex flex-1 items-center justify-center bg-bg p-6">
        <div className="anim-in w-full max-w-[520px]">
          <div className="mb-6 lg:hidden"><Logo size={34} /></div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Langkah 1 dari 1</p>
          <h2 className="mt-1 font-display text-[26px] font-bold tracking-tight">Bagaimana Anda ingin memulai?</h2>
          <p className="mt-1 text-[13px] text-muted">Tenang — pilihan ini bisa diubah kapan saja oleh Administrator.</p>

          <div className="mt-6 grid gap-3">
            {/* mulai dari nol */}
            <button onClick={() => setMode("empty")}
              className={`group relative rounded-xl border-2 p-4 text-left transition-all ${mode === "empty" ? "border-brand bg-brand-soft/60 shadow-sm" : "border-line bg-surface hover:border-line2"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 font-display text-[15.5px] font-bold">
                    <FlaskConical size={16} className={mode === "empty" ? "text-brand" : "text-faint"} />
                    Mulai dari Nol
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                    <b className="text-ink">0 transaksi · 0 pelanggan · 0 penjualan.</b> Anda input data usaha Anda sendiri.
                    Katalog 30 produk & jasa percetakan, bahan baku, dan bagan akun sudah siap dipakai.
                  </p>
                </div>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${mode === "empty" ? "border-brand bg-brand text-white" : "border-line2"}`}>
                  {mode === "empty" && <Check size={12} />}
                </span>
              </div>
              <span className="absolute -top-2.5 left-4 rounded bg-brand px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">Disarankan untuk operasional nyata</span>
            </button>

            {/* demo */}
            <button onClick={() => setMode("demo")}
              className={`group relative rounded-xl border-2 p-4 text-left transition-all ${mode === "demo" ? "border-brand bg-brand-soft/60 shadow-sm" : "border-line bg-surface hover:border-line2"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 font-display text-[15.5px] font-bold">
                    <Database size={16} className={mode === "demo" ? "text-brand" : "text-faint"} />
                    Pakai Data Contoh
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                    20 pelanggan, 24 pesanan di berbagai tahap produksi, pembayaran DP, pengeluaran, dan laporan 6 bulan —
                    untuk menjelajahi dashboard & laporan dulu.
                  </p>
                </div>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${mode === "demo" ? "border-brand bg-brand text-white" : "border-line2"}`}>
                  {mode === "demo" && <Check size={12} />}
                </span>
              </div>
            </button>
          </div>

          {mode === "empty" && (
            <div className="anim-in card mt-3 p-4">
              <Field label="Saldo kas awal usaha (opsional)" hint="Dicatat sebagai kas & bank pembuka di akuntansi.">
                <Input type="number" min={0} step={50000} value={cash || ""} placeholder="0"
                  onChange={(e) => setCash(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              {cash > 0 && <p className="mt-1.5 text-[12px] font-semibold text-ok">Kas pembuka: {fmtIDR(cash)}</p>}
            </div>
          )}

          <Btn size="lg" className="mt-5 w-full" onClick={start} disabled={busy}>
            {busy ? "Menyiapkan sistem…" : mode === "empty" ? "Mulai dari Nol" : "Muat Data Contoh"} {!busy && <ArrowRight size={15} />}
          </Btn>

          <p className="mt-3 text-center text-[11.5px] text-faint">
            Setelah ini Anda masuk sebagai <b className="text-muted">admin</b> · password <b className="text-muted">admin123</b> — segera ganti di menu Karyawan.
          </p>
        </div>
      </div>
    </div>
  );
}
