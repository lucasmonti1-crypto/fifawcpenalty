import React from 'react';
import { Team } from '../types';
import { Trophy, Share2 } from 'lucide-react';

interface Props {
  team: Team;
  onReplay: () => void;
  onExit: () => void;
}

export default function ChampionOverlay({ team, onReplay, onExit }: Props) {
  const handleShare = async () => {
    const text = `¡Soy campeón con ${team.name}! #WorldCup2026`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: '¡Campeón!', text });
      } catch (_) {
        // ignore
      }
    } else {
      // fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        alert('Texto copiado: ' + text);
      } catch (_) {
        prompt('Comparte este texto:', text);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* confetti layer */}
      <div className="pointer-events-none w-full h-full">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className={`confetti confetti-${i % 6}`} aria-hidden />
        ))}
      </div>

      <div className="relative bg-gradient-to-b from-emerald-600 to-yellow-400 rounded-3xl p-6 w-[92%] max-w-2xl text-center shadow-2xl wc-shine-wrap animate-scale-up">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">¡CAMPEÓN!</h2>
        <p className="mt-2 text-sm text-white/90 font-semibold">Has ganado con <span className="underline">{team.name}</span></p>

        <div className="mt-4 flex gap-3 justify-center">
          <button onClick={handleShare} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md font-bold flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Compartir
          </button>

          <button onClick={onReplay} className="bg-white text-slate-900 px-4 py-2 rounded-md font-bold">Repetir</button>

          <button onClick={onExit} className="bg-slate-900/80 text-white px-4 py-2 rounded-md font-bold">Equipos</button>
        </div>
      </div>
    </div>
  );
}
