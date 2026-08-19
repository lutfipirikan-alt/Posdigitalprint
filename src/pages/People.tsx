import React, { useState } from "react";
import { Pencil, ShieldCheck, UserPlus } from "lucide-react";
import type { Role, User } from "../lib/types";
import { ROLE_META } from "../lib/types";
import { useStore } from "../lib/store";
import { fmtDateTime, timeAgo, uid } from "../lib/format";
import { Btn, Chip, Field, Input, Modal, PageHead, Select, THead, TR, TD, useToast } from "../components/ui";
import { Avatar } from "../components/layout";

export default function People() {
  const { db, user, saveUser } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [logUser, setLogUser] = useState("semua");
  const canManage = user?.role === "admin";

  const logs = db.activities.filter((a) => logUser === "semua" || a.userId === logUser);

  return (
    <div>
      <PageHead title="Karyawan & Audit" desc="Akun per peran dengan akses berbeda — setiap aksi penting tercatat">
        {canManage && <Btn onClick={() => setCreating(true)}><UserPlus size={14} /> Karyawan Baru</Btn>}
      </PageHead>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="card anim-in overflow-hidden xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <THead cols={["", "Nama", "Username", "Peran", "Kontak", "Status", canManage ? "" : ""]} />
              <tbody>
                {db.users.map((u) => (
                  <TR key={u.id} className={!u.active ? "opacity-45" : ""}>
                    <TD><Avatar name={u.name} size={30} /></TD>
                    <TD className="font-bold">{u.name}{u.id === user?.id && <span className="ml-1.5 text-[10px] font-bold text-brand">(Anda)</span>}</TD>
                    <TD className="font-display text-[12px] text-muted">@{u.username}</TD>
                    <TD><Chip color={ROLE_META[u.role].color}>{ROLE_META[u.role].label}</Chip></TD>
                    <TD className="text-muted">{u.phone || "—"}</TD>
                    <TD>{u.active ? <Chip color="#178a4c">Aktif</Chip> : <Chip color="#64748b">Nonaktif</Chip>}</TD>
                    {canManage && <TD><button onClick={() => setEdit(u)} className="rounded-md p-1.5 text-muted hover:bg-surface2 hover:text-brand"><Pencil size={14} /></button></TD>}
                  </TR>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card anim-in h-fit p-4">
          <h4 className="mb-3 flex items-center gap-1.5 font-display text-[14px] font-bold"><ShieldCheck size={15} className="text-brand" /> Hak Akses per Peran</h4>
          <div className="space-y-2.5">
            {(Object.keys(ROLE_META) as Role[]).map((r) => (
              <div key={r} className="rounded-lg border border-line p-2.5">
                <p className="text-[12.5px] font-bold" style={{ color: ROLE_META[r].color }}>{ROLE_META[r].label}</p>
                <p className="text-[11.5px] text-muted">{ROLE_META[r].desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card anim-in mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <h3 className="font-display text-[14.5px] font-bold">Log Aktivitas (Audit Trail)</h3>
          <Select value={logUser} onChange={(e) => setLogUser(e.target.value)} className="w-48">
            <option value="semua">Semua karyawan</option>
            {db.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <THead cols={["Waktu", "Karyawan", "Aksi", "Detail"]} />
            <tbody>
              {logs.slice(0, 30).map((a) => {
                const u = db.users.find((x) => x.id === a.userId);
                return (
                  <TR key={a.id}>
                    <TD className="whitespace-nowrap text-muted" >
                      <span title={fmtDateTime(a.date)}>{timeAgo(a.date)}</span>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-2"><Avatar name={u?.name || "?"} size={22} /><span className="font-semibold">{u?.name || "Sistem"}</span></span>
                    </TD>
                    <TD><Chip color="#0e7490">{a.action}</Chip></TD>
                    <TD className="max-w-[320px] truncate text-muted">{a.detail}</TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
          {logs.length === 0 && <p className="py-10 text-center text-[12.5px] text-faint">Belum ada aktivitas.</p>}
        </div>
      </div>

      {(creating || edit) && <UserModal initial={edit} onClose={() => { setCreating(false); setEdit(null); }} onSave={(u, pass) => {
        saveUser(u, pass || undefined);
        toast.push({ title: edit ? "Karyawan diperbarui" : "Karyawan ditambahkan", desc: u.name, kind: "ok" });
        setCreating(false); setEdit(null);
      }} />}
    </div>
  );
}

function UserModal({ initial, onClose, onSave }: { initial: User | null; onClose: () => void; onSave: (u: User, pass?: string) => void }) {
  const toast = useToast();
  const [f, setF] = useState<User>(initial || { id: uid(), name: "", username: "", passHash: "", role: "cashier", active: true, createdAt: Date.now() });
  const [pass, setPass] = useState("");
  const set = (p: Partial<User>) => setF((x) => ({ ...x, ...p }));

  const save = () => {
    if (!f.name.trim() || !f.username.trim()) { toast.push({ title: "Nama & username wajib diisi", kind: "warn" }); return; }
    if (!initial && pass.length < 6) { toast.push({ title: "Password minimal 6 karakter", kind: "warn" }); return; }
    onSave({ ...f, username: f.username.toLowerCase().trim() }, pass || undefined);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? `Edit Karyawan · @${initial.username}` : "Karyawan Baru"}
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn onClick={save}>Simpan</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Nama Lengkap *"><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Username *"><Input value={f.username} onChange={(e) => set({ username: e.target.value })} placeholder="tanpa spasi" /></Field>
        </div>
        <Field label={initial ? "Password Baru (kosongkan jika tidak diubah)" : "Password * (min. 6 karakter)"} hint="Disimpan sebagai hash — tidak pernah teks polos.">
          <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Peran">
            <Select value={f.role} onChange={(e) => set({ role: e.target.value as Role })}>
              {(Object.keys(ROLE_META) as Role[]).map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </Select>
          </Field>
          <Field label="No. HP"><Input value={f.phone || ""} onChange={(e) => set({ phone: e.target.value })} /></Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold">
          <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-[#0e7490]" />
          Akun aktif (bisa login)
        </label>
        <p className="rounded-lg bg-surface2 px-3 py-2 text-[11.5px] text-muted">{ROLE_META[f.role].desc}.</p>
      </div>
    </Modal>
  );
}
