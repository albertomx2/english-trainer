// src/App.tsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Modes from "./pages/Modes";
import Study from "./pages/Study";
import Explorer from "./pages/Explorer";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import AddWord from "./pages/AddWord";

import { AppStateProvider, useAppState } from "./state/appState";
import Login from "./pages/Login";
import RequireUser from "./components/RequireUser";

function ThemeApplier() {
  const { theme } = useAppState();
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <AppStateProvider>
        <ThemeApplier />
        <Routes>
          {/* Login PÚBLICO */}
          <Route path="/login" element={<Login />} />

          {/* TODO lo demás PROTEGIDO */}
          <Route
            element={
              <RequireUser>
                <Layout />
              </RequireUser>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/modes" element={<Modes />} />
            <Route path="/study" element={<Study />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/add-word" element={<AddWord />} />
          </Route>

          {/* 404 → modos */}
          <Route path="*" element={<Navigate to="/modes" replace />} />
        </Routes>
      </AppStateProvider>
    </HashRouter>
  );
}
