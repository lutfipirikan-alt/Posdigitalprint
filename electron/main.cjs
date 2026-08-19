/* Sani Print POS — Electron main process
   Menjalankan aplikasi sebagai program desktop Windows (.exe).
   Jalankan:  npm run electron   (uji coba)
              npm run exe       (buat installer .exe — lihat CARA-JADI-EXE.md) */
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const iconPath = path.join(__dirname, "..", "public", "icons", "icon-512.png");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#15181d",
    autoHideMenuBar: true,
    show: false,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Muat hasil build Vite (dist/index.html)
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  win.once("ready-to-show", () => win.show());

  // Link eksternal dibuka di browser, bukan di dalam aplikasi
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Matikan menu bawaan agar terasa seperti aplikasi kasir
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
