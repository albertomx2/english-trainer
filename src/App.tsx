import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";

export default function App() {
  return (
    <HashRouter>
      <header className="w-full border-b bg-white/60 backdrop-blur sticky top-0">
        <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="font-semibold">English Trainer</Link>
          <div className="ml-auto text-sm text-gray-500">Paso 1 listo</div>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>

      <footer className="mt-16 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} · Personal use
      </footer>
    </HashRouter>
  );
}
