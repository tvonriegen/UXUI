import { Plus, Volume2, VolumeX } from "lucide-react";

interface MuroHeaderProps {
  muted: boolean;
  publishDisabled: boolean;
  onToggleMute: () => void;
  onPublish: () => void;
}

export default function MuroHeader({ muted, publishDisabled, onToggleMute, onPublish }: MuroHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-in-up">
      <div>
        <p className="text-sm text-sky-600 font-semibold mb-1">Comunidad</p>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">El Muro</h1>
        <p className="text-sm text-slate-500 mt-1">
          Comparte proyectos, logros y conecta con la comunidad.
        </p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={onToggleMute}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          title={muted ? "Activar sonidos" : "Silenciar sonidos"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          onClick={onPublish}
          disabled={publishDisabled}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-sky-600 text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sky-700 active:bg-sky-800 transition-colors shadow-sm btn-press disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Publicar
        </button>
      </div>
    </div>
  );
}
