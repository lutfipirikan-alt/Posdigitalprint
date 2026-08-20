import React, { useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { useStore } from "../lib/store";
import { Btn, Input, Logo, Field } from "../components/ui";
import { ROLE_META } from "../lib/types";

const DEMO = [
  { u: "admin", p: "admin123", role: "admin" as const },
  { u: "manajer", p: "manajer123", role: "manager" as const },
  { u: "kasir", p: "kasir123", role: "cashier" as const },
  { u: "produksi", p: "produksi123", role: "production" as const },
  { u: "desainer", p: "desainer123", role: "designer" as const },
];

export default function Login() {
  const { login, db } = useStore();
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setErr(null);
    setTimeout(() => {
      const r = login(username, pass);
      if (r) { setErr(r); setLoading(false); }
    }, 350);
  };

  return (
    <div className="flex min-h-screen">
      {/* brand panel */}
      <div className="dotgrid-side relative hidden w-[46%] flex-col justify-between overflow-hidden bg-side p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 opacity-[0.16]">
          <svg width="420" height="420" viewBox="0 0 32 32">
            <circle cx="12" cy="12" r="8" fill="#00AEEF" />
            <circle cx="20" cy="12" r="8" fill="#EC008C" />
            <circle cx="16" cy="19" r="8" fill="#FFF200" />
          </svg>
        </div>
        <Logo size={38} dark />
        <div className="relative">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-brand-hi">Point of Sale · Percetakan</p>
          <h1 className="mt-3 font-display text-[38px] font-bold leading-[1.08] tracking-tight">
            Dari file desain<br />sampai nota lunas,<br />
            <span className="text-white/45">satu layar.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-white/55">
            Kelola pesanan custom, antrian produksi, bahan baku, piutang, dan laporan laba rugi
            Sani Print dalam satu sistem yang dirancang untuk kerja cepat di meja kasir.
          </p>
          <div className="mt-8 grid max-w-sm grid-cols-3 gap-2">
            {["13 status produksi", "Harga per m² & rumus", "Laba rugi otomatis"].map((t) => (
              <div key={t} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-semibold leading-snug text-white/70">{t}</div>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2 text-[11px] text-white/35">
          <ShieldCheck size={13} /> Kata sandi disimpan sebagai hash — tidak pernah teks polos.
        </p>
      </div>

      {/* form */}
      <div className="flex flex-1 items-center justify-center bg-bg p-6">
        <div className="anim-in w-full max-w-[400px]">
          <div className="mb-6 lg:hidden"><Logo size={34} /></div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Masuk ke sistem</p>
          <h2 className="mt-1 font-display text-[26px] font-bold tracking-tight">Selamat bertugas kembali</h2>
          <p className="mt-1 text-[13px] text-muted">Gunakan akun sesuai peran Anda. Setiap aktivitas dicatat dalam log audit.</p>

          <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
            <Field label="Username">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mis. kasir" autoFocus />
            </Field>
            <Field label="Password">
              <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
            </Field>
            {err && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger anim-fade">{err}</p>
            )}
            <Btn type="submit" size="lg" className="w-full" disabled={loading || !username || !pass}>
              {loading ? "Memeriksa…" : <>Masuk <ArrowRight size={15} /></>}
            </Btn>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-faint">
              <KeyRound size={11} /> Sesi tersimpan di perangkat ini
            </p>
          </form>

          {db.users.length > 1 ? (
            <div className="mt-5">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-faint">Akun demo — klik untuk masuk</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {DEMO.map((d) => (
                  <button key={d.u} onClick={() => { setUsername(d.u); setPass(d.p); setErr(null); setTimeout(() => { const r = login(d.u, d.p); if (r) setErr(r); }, 60); }}
                    className="group rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted transition-all hover:border-brand hover:text-brand">
                    {ROLE_META[d.role].label} <span className="text-faint group-hover:text-brand/60">@{d.u}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-faint">
              Mode data kosong aktif — masuk sebagai <b className="text-muted">admin</b> / <b className="text-muted">admin123</b>,<br />lalu tambahkan karyawan di menu Karyawan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
