import React, { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { ToastProvider } from "./components/ui";
import { initPWA } from "./lib/pwa";
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
  const [firstRun, setFirstRun] = useState(() => !localStorage.getItem("saniprint-setup"));
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

export default function App() {
  useEffect(() => { initPWA(); }, []);
  return (
    <StoreProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </StoreProvider>
  );
}
