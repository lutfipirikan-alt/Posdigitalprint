import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/* Sembunyikan layar pembuka begitu React siap dirender */
function hideSplash() {
  const el = document.getElementById("boot-splash");
  if (!el) return;
  el.classList.add("hide");
  setTimeout(() => el.remove(), 400);
}

try {
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(<App />);
  hideSplash();
} catch (err) {
  /* Gagal boot — tampilkan panel diagnostik HTML */
  (window as unknown as { __bootErrors: string[] }).__bootErrors?.push(
    "React boot: " + String((err as Error)?.message || err)
  );
  const splash = document.getElementById("boot-splash");
  if (splash) splash.style.display = "none";
  const box = document.getElementById("boot-error");
  if (box) box.style.display = "flex";
  const detail = document.getElementById("boot-error-detail");
  if (detail) detail.textContent = String((err as Error)?.message || err);
}

/* Daftarkan service worker — aplikasi bisa dibuka offline setelah kunjungan pertama.
   Hanya pada konteks aman (http/https) agar tidak mengganggu preview sandbox. */
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* abaikan */ });
  });
}
