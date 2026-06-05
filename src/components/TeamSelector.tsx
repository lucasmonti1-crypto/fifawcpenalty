import React, { useState } from 'react';
import { TEAMS, Team, GOALKEEPER_REGISTRY } from '../types';
import { Trophy, Star, ShieldAlert, Zap, Compass, RefreshCw } from 'lucide-react';
import { FlagBadge } from './FlagBadge';

interface TeamSelectorProps {
  onSelected: (yourTeam: Team, opponentTeam: Team) => void;
}

export default function TeamSelector({ onSelected }: TeamSelectorProps) {
  const [selectedKickerIdx, setSelectedKickerIdx] = useState(0);
  const [selectedKeeperIdx, setSelectedKeeperIdx] = useState(1);

  const kickerTeam = TEAMS[selectedKickerIdx];
  const keeperTeam = TEAMS[selectedKeeperIdx];

  const handleRandomize = () => {
    const kIdx = Math.floor(Math.random() * TEAMS.length);
    let oIdx = Math.floor(Math.random() * TEAMS.length);
    while (oIdx === kIdx) {
      oIdx = Math.floor(Math.random() * TEAMS.length);
    }
    setSelectedKickerIdx(kIdx);
    setSelectedKeeperIdx(oIdx);
  };

  const currentYear = 2026;

  return (
    <div className="relative w-full max-w-5xl mx-auto px-6 py-6 animate-fade-in text-slate-100 flex flex-col justify-center min-h-[620px] gap-5">
      
      {/* IMMERSIVE SMOOTH BACKGROUND LIGHTING PATTERNS */}
      <div className="absolute inset-x-0 -top-6 -bottom-10 -z-10 overflow-hidden pointer-events-none rounded-3xl opacity-20">
        {/* Stadium spotlight glow patterns coming from corners */}
        <div className="absolute -top-12 -left-12 w-80 h-80 bg-gradient-to-br from-white/20 via-emerald-500/5 to-transparent rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-gradient-to-bl from-white/20 via-[#00E5FF]/5 to-transparent rounded-full filter blur-3xl animate-pulse" />
      </div>

      {/* Immersive Micro WC 26 Branding */}
      <div className="flex flex-col items-center text-center mb-5 relative select-none">
        <span className="text-[#ffd700] border border-[#ffd700]/30 bg-slate-950/70 backdrop-blur-md px-3.5 py-1 rounded-full font-mono text-xs uppercase tracking-wider font-bold shadow-md">
          🏆 COPA MUNDIAL {currentYear} 🏆
        </span>
        
        <h1 className="text-3xl md:text-5xl font-display font-black mt-2 tracking-wide uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]">
          PENALTY <span className="colors-shine bg-gradient-to-r from-[#00FF87] to-[#00E5FF] bg-clip-text text-transparent">ARENA</span>
        </h1>
        
        <p className="text-slate-300 text-sm md:text-base mt-2 font-semibold">
          Elegí tu delantero y preparate para patear y atajar en la tanda final.
        </p>
      </div>

      <div className="flex flex-col gap-6 bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-2xl">
        
        {/* SECTION 1: CHOOSE TU SELECCIÓN */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h2 className="text-xs md:text-sm font-display font-black uppercase text-white flex items-center gap-1.5 tracking-wider">
              <Star className="text-[#00FF87] w-4 h-4 fill-[#00FF87]" /> TU SELECCIÓN (PATEADOR Y ARQUERO)
            </h2>
            <span className="text-xs font-mono text-[#00FF87] bg-[#00FF87]/15 px-2 py-0.5 rounded uppercase font-black">
              Cód: {kickerTeam.id}
            </span>
          </div>

          {/* Súper compacto flag grid con botones agrandados */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {TEAMS.map((team, idx) => {
              const isSelected = idx === selectedKickerIdx;
              return (
                <button
                  key={`kicker-${team.id}`}
                  id={`btn-kicker-${team.id}`}
                  onClick={() => {
                    setSelectedKickerIdx(idx);
                    if (idx === selectedKeeperIdx) {
                      setSelectedKeeperIdx((idx + 1) % TEAMS.length);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg transition-all duration-150 border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#00FF87]/25 to-[#00E5FF]/25 border-[#00FF87] text-white shadow-[0_0_12px_rgba(0,255,135,0.35)] scale-103'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                  }`}
                  title={`${team.name} - ${team.player}`}
                >
                  <FlagBadge teamId={team.id} className="w-9 h-6 md:w-11 md:h-7 shadow-md rounded" />
                  <span className="text-[10px] md:text-xs font-mono font-bold mt-1.5">{team.id}</span>
                </button>
              );
            })}
          </div>

          {/* Panel de estadísticas agrandado por debajo del Pateador */}
          <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-row items-center justify-between gap-3 animate-fade-in shadow-inner">
            <div className="flex items-center gap-2.5">
              <FlagBadge teamId={kickerTeam.id} className="w-8 h-5.5 rounded" />
              <div className="flex flex-col text-left">
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5">
                  <span className="text-xs md:text-sm font-black uppercase text-white font-display tracking-wide">Delantero: {kickerTeam.player}</span>
                  <span className="text-[10px] font-mono text-slate-400">({kickerTeam.name})</span>
                </div>
                <span className="text-[11px] font-mono text-[#00E5FF] font-bold mt-0.5">
                  Arquero: {GOALKEEPER_REGISTRY[kickerTeam.id]?.name || 'Portero'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 uppercase">PREC</span>
                <span className="text-xs font-mono text-white font-extrabold">{kickerTeam.accuracy}%</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 uppercase">FUERZA</span>
                <span className="text-xs font-mono text-white font-extrabold">{kickerTeam.power}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* INTERMEDIATE SHUFFLE BAR */}
        <div className="flex justify-center -my-1 select-none">
          <button
            id="btn-randomize-teams"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-[#00FF87] hover:border-[#00FF87]/40 transition bg-white/5 border border-white/10 px-4 py-1.5 rounded-full cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> MEZCLAR SELECCIONES
          </button>
        </div>

        {/* SECTION 2: CHOOSE SELECCIÓN RIVAL */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h2 className="text-xs md:text-sm font-display font-black uppercase text-white flex items-center gap-1.5 tracking-wider">
              <ShieldAlert className="text-[#00E5FF] w-4 h-4" /> SELECCIÓN RIVAL (PATEADOR Y ARQUERO)
            </h2>
            <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/15 px-2 py-0.5 rounded uppercase font-black">
              Rival: {keeperTeam.id}
            </span>
          </div>

          {/* Súper compacto flag grid con botones agrandados */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {TEAMS.map((team, idx) => {
              const isSelected = idx === selectedKeeperIdx;
              const isKicker = idx === selectedKickerIdx;
              return (
                <button
                  key={`keeper-${team.id}`}
                  id={`btn-keeper-${team.id}`}
                  disabled={isKicker}
                  onClick={() => setSelectedKeeperIdx(idx)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg transition-all duration-150 border cursor-pointer disabled:opacity-10 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#00E5FF]/25 to-[#00FF87]/25 border-[#00E5FF] text-white shadow-[0_0_12px_rgba(0,229,255,0.35)] scale-103'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                  }`}
                  title={`${team.name} Goalkeeper`}
                >
                  <FlagBadge teamId={team.id} className="w-9 h-6 md:w-11 md:h-7 shadow-md rounded" />
                  <span className="text-[10px] md:text-xs font-mono font-bold mt-1.5">{team.id}</span>
                </button>
              );
            })}
          </div>

          {/* Panel de estadísticas agrandado por debajo del Arquero */}
          <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-row items-center justify-between gap-3 animate-fade-in shadow-inner">
            <div className="flex items-center gap-2.5">
              <FlagBadge teamId={keeperTeam.id} className="w-8 h-5.5 rounded" />
              <div className="flex flex-col text-left">
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5">
                  <span className="text-xs md:text-sm font-black uppercase text-white font-display tracking-wide">Delantero: {keeperTeam.player}</span>
                  <span className="text-[10px] font-mono text-slate-400">({keeperTeam.name})</span>
                </div>
                <span className="text-[11px] font-mono text-[#00FF87] font-bold mt-0.5">
                  Arquero: {GOALKEEPER_REGISTRY[keeperTeam.id]?.name || 'Portero'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-1 rounded font-black uppercase">
                Dificultad adaptativa IA
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Action validation confirmation bar agrandado */}
      <div className="mt-6 flex justify-center">
        <button
          id="btn-start-match"
          onClick={() => onSelected(kickerTeam, keeperTeam)}
          className="group relative px-12 py-4 rounded-full font-display font-black uppercase text-xs md:text-sm tracking-widest bg-gradient-to-r from-[#00FF87] to-[#00E5FF] text-[#002f23] shadow-xl hover:shadow-[0_0_25px_rgba(0,229,255,0.65)] transition-all duration-200 hover:scale-104 active:scale-96 cursor-pointer font-extrabold"
        >
          <span className="flex items-center gap-2">
            INICIAR PENALES <Trophy className="w-4.5 h-4.5 fill-[#002f23]" />
          </span>
        </button>
      </div>
    </div>
  );
}
