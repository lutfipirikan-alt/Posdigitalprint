import React, { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { ToastProvider } from "./components/ui";
import { initPWA } from "./lib/pwa";
import { safeGet, safeClearAppData } from "./lib/storage";
import Setup from "./pages/Setup";
import { Shell } from "./components/layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Production from "./pages/Production";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Suppliers from "./pages/Suppliers";
import Finance from "./pages/Finance";
import CashFlow from "./pages/CashFlow";
import Accounting from "./pages/Accounting";
import Reports from "./pages/Reports";
import People from "./pages/People";

function Router() {
  const { user, nav } = useStore();
  const [firstRun, setFirstRun] = useState(() => !safeGet("saniprint-setup"));
  if (firstRun) return <Setup onDone={() => setFirstRun(false)} />;
  if (!user) return <Login />;
  const page = (() => {
    switch (nav.page) {
      case "pos": return <POS />;
      case "orders": return <Orders />;
      case "production": return <Production />;
      case "customers": return <Customers />;
      case "products": return <Products />;
      case "inventory": return <Inventory />;
      case "suppliers": return <Suppliers />;
      case "finance": return <Finance />;
      case "cashflow": return <CashFlow />;
      case "accounting": return <Accounting />;
      case "reports": return <Reports />;
      case "people": return <People />;
      default: return <Dashboard />;
    }
  })();
  return <Shell key={nav.page}>{page}</Shell>;
}

/* Error boundary — menjamin tidak pernah ada layar putih tanpa penjelasan */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e1013] p-6 font-[Manrope,sans-serif]">
        <div className="w-full max-w-md rounded-2xl border border-[#262b33] bg-[#16191e] p-6 text-[#e8eaee]">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00AEEF]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#EC008C]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFF200]" />
            </span>
            <p className="font-[Space_Grotesk,sans-serif] text-sm font-bold tracking-tight">Sani Print POS</p>
          </div>
          <h1 className="font-[Space_Grotesk,sans-serif] text-lg font-bold">Terjadi kesalahan saat memuat</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#98a1ad]">
            Aplikasi gagal dirender di lingkungan ini. Coba muat ulang — jika masih gagal, reset data lokal
            (data contoh akan dimuat ulang, aman).
          </p>
          <p className="mt-3 max-h-28 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-[#f0a8a8]">
            {String(this.state.err?.message || this.state.err)}
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => location.reload()}
              className="flex-1 rounded-lg bg-[#0e7490] px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-[#1293b6]">
              Muat Ulang
            </button>
            <button onClick={() => { safeClearAppData(); location.reload(); }}
              className="flex-1 rounded-lg border border-[#333a44] px-4 py-2.5 text-[12.5px] font-bold text-[#e8eaee] transition-colors hover:bg-[#1b1f25]">
              Reset Data Lokal
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  useEffect(() => { initPWA(); }, []);
  return (
    <ErrorBoundary>
      <StoreProvider>
        <ToastProvider>
          <Router />
        </ToastProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
