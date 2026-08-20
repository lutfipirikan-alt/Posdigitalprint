# Menjadikan Sani Print POS sebagai Aplikasi Desktop (.exe)

Ada **dua cara** menjalankan aplikasi ini seperti program biasa:

---

## Cara 1 — Instal dari Browser (paling cepat, tanpa coding)

Aplikasi ini sudah dikemas sebagai aplikasi instalabel (PWA) + service worker offline.

1. Buka aplikasi di **Google Chrome** atau **Microsoft Edge** (Windows).
2. Klik tombol **“Instal Aplikasi”** di sidebar kiri bawah,
   *atau* klik ikon aplikasi kecil di ujung kanan address bar.
3. Klik **Install**.

Hasilnya:
- **“Sani Print”** masuk **Start Menu** dan bisa di-pin ke taskbar.
- Berjalan di **jendela sendiri** tanpa address bar / tab browser.
- **Bisa offline** — setelah terbuka sekali, seluruh aplikasi tersimpan di komputer.
- Data tersimpan di komputer (localStorage), sama seperti aplikasi desktop.

> Tips: buka sekali saat online agar service worker menyimpan semua aset,
> setelah itu aplikasi berjalan penuh tanpa internet.

---

## Cara 2 — Buat File `.exe` Asli (Electron)

Jika ingin file `.exe` yang bisa dipindah/di-install di komputer lain:

### Prasyarat
- [Node.js 18+](https://nodejs.org) terpasang di komputer Anda.

### Langkah
1. **Salin seluruh folder proyek ini** ke komputer Anda.

2. **Install dependensi:**
   ```bash
   npm install
   npm install --save-dev electron electron-builder
   ```

3. **Tambahkan ke `package.json`** (di level paling atas):
   ```json
   "main": "electron/main.cjs",
   "scripts": {
     "electron": "vite build --base=./ && electron .",
     "exe": "vite build --base=./ && electron-builder --win --x64"
   },
   "build": {
     "appId": "id.saniprint.pos",
     "productName": "Sani Print POS",
     "files": ["dist/**", "electron/**"],
     "directories": { "output": "release" },
     "win": { "target": ["nsis", "portable"] },
     "nsis": { "oneClick": true, "createDesktopShortcut": true }
   }
   ```

4. *(Opsional)* Unduh ikon PNG ke `public/icons/icon-512.png` agar `.exe`
   memakai logo Sani Print — tanpa ini tetap berjalan dengan ikon bawaan.

5. **Uji coba sebagai aplikasi desktop:**
   ```bash
   npm run electron
   ```

6. **Buat installer `.exe`:**
   ```bash
   npm run exe
   ```

### Hasil
Di folder **`release/`** akan muncul:
- `Sani Print POS Setup x.x.x.exe` — installer (tinggal dobel-klik di komputer mana pun).
- `Sani Print POS x.x.x.exe` — versi **portable** (langsung jalan tanpa install).

---

## Catatan Penting
- **Data** tersimpan di komputer masing-masing (localStorage). Setiap komputer
  punya datanya sendiri — cocok untuk satu komputer kasir.
- Untuk multi-komputer (kasir + produksi + admin bersamaan), arsitektur berikutnya
  adalah backend FastAPI + PostgreSQL seperti rencana awal — seluruh model data &
  logika bisnis di aplikasi ini sudah siap dipindahkan ke API.
- Versi PWA (Cara 1) dan versi `.exe` (Cara 2) memakai kode yang sama persis.
