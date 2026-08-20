/* Akses localStorage yang aman — tidak pernah melempar error
   (penting saat aplikasi dijalankan di iframe sandbox / mode privat) */
export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch { /* abaikan */ }
}
export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch { /* abaikan */ }
}
export function safeClearAppData(): void {
  ["saniprint-db-v3", "saniprint-session", "saniprint-setup", "sp-theme"].forEach(safeRemove);
}
