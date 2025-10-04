import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Modes from "./pages/Modes";
import Study from "./pages/Study";
import Explorer from "./pages/Explorer";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import { AppStateProvider } from "./state/appState";

export default function App() {
  return (
    <HashRouter>
      <AppStateProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/modes" element={<Modes />} />
            <Route path="/study" element={<Study />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </AppStateProvider>
    </HashRouter>
  );
}
