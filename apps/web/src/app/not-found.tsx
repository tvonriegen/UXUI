import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cl-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 primary-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white font-black text-2xl">404</span>
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Página no encontrada</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          La página que buscas no existe o fue movida a otro lugar.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/"
            className="flex items-center gap-2 bg-cyan-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-cyan-700 transition-colors btn-press"
          >
            <Home size={16} /> Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
