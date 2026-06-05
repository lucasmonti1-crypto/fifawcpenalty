import React, { useState } from 'react';
import { TEAMS, Team } from '../types';
import { Trophy, Star, ShieldAlert, Zap, Compass, RefreshCw } from 'lucide-react';

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
    <div className="w-full max-w-2xl mx-auto px-4 py-2 animate-fade-in text-slate-100 flex flex-col justify-center">
      {/* Immersive Micro WC 26 Branding */}
      <div className="flex flex-col items-center text-center mb-3 relative select-none">
        <span className="bg-[#00FF87] text-[#002f23] font-mono text-[8px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full shadow-sm">
          🏆 COPA MUNDIAL {currentYear} 🏆
        </span>
        
        <h1 className="text-xl md:text-2xl font-display font-black mt-1 tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          PENALTY <span className="colors-shine bg-gradient-to-r from-[#00FF87] to-[#00E5FF] bg-clip-text text-transparent">ARENA</span>
        </h1>
        
        <p className="text-slate-400 text-[9px] mt-0.5 font-sans">
          Elegí tu delantero y preparate para patear y atajar en la tanda final.
        </p>
      </div>

      <div className="flex flex-col gap-3.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-2xl">
        
        {/* SECTION 1: CHOOSE STRIKER */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-[10px] font-display font-black uppercase text-white flex items-center gap-1 tracking-wider">
              <Star className="text-[#00FF87] w-3 h-3 fill-[#00FF87]" /> DELANTERO (PATEAR)
            </h2>
            <span className="text-[8px] font-mono text-[#00FF87] bg-[#00FF87]/15 px-1 rounded uppercase font-bold">
              Pateador: {kickerTeam.id}
            </span>
          </div>

          {/* Súper compacto flag grid */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
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
                  className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-150 border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#00FF87]/15 to-[#00E5FF]/20 border-[#00FF87] text-white shadow-[0_0_8px_rgba(0,255,135,0.2)] scale-102'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                  }`}
                  title={`${team.name} - ${team.player}`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-sm relative flex shrink-0 shadow-sm"
                    style={{
                      backgroundColor: team.colors.shirt,
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    {team.colors.pattern === 'stripes' && (
                      <div className="absolute inset-0 flex justify-around opacity-60">
                        <div className="w-[1px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                        <div className="w-[1px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] font-mono font-bold mt-1">{team.id}</span>
                </button>
              );
            })}
          </div>

          {/* Pequeño panel de estadísticas por debajo del Pateador */}
          <div className="mt-1.5 bg-white/5 border border-white/5 rounded-lg p-2 flex flex-row items-center justify-between gap-2.5 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase text-white font-display tracking-wide">{kickerTeam.player}</span>
              <span className="text-[8px] font-mono text-slate-400">({kickerTeam.name})</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-slate-400 flex items-center gap-0.5"><Compass className="w-2 h-2 text-[#00FF87]" /> PREC</span>
                <span className="text-[9px] font-mono text-white font-bold">{kickerTeam.accuracy}%</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-slate-400 flex items-center gap-0.5"><Zap className="w-2 h-2 text-[#00E5FF]" /> FUERZA</span>
                <span className="text-[9px] font-mono text-white font-bold">{kickerTeam.power}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* INTERMEDIATE SHUFFLE BAR */}
        <div className="flex justify-center -my-1 select-none">
          <button
            id="btn-randomize-teams"
            onClick={handleRandomize}
            className="flex items-center gap-1 text-[8px] font-mono text-slate-400 hover:text-[#00FF87] hover:border-[#00FF87]/30 transition bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full cursor-pointer shadow-md"
          >
            <RefreshCw className="w-2 h-2 animate-spin-slow" /> MEZCLAR SELECCIONES
          </button>
        </div>

        {/* SECTION 2: CHOOSE KEEPER */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-[10px] font-display font-black uppercase text-white flex items-center gap-1 tracking-wider">
              <ShieldAlert className="text-[#00E5FF] w-3 h-3" /> ARQUERO OPONENTE (ATAJAR)
            </h2>
            <span className="text-[8px] font-mono text-[#00E5FF] bg-[#00E5FF]/15 px-1 rounded uppercase font-bold">
              Rival: {keeperTeam.id}
            </span>
          </div>

          {/* Súper compacto flag grid */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
            {TEAMS.map((team, idx) => {
              const isSelected = idx === selectedKeeperIdx;
              const isKicker = idx === selectedKickerIdx;
              return (
                <button
                  key={`keeper-${team.id}`}
                  id={`btn-keeper-${team.id}`}
                  disabled={isKicker}
                  onClick={() => setSelectedKeeperIdx(idx)}
                  className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-150 border cursor-pointer disabled:opacity-10 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#00E5FF]/15 to-[#00FF87]/20 border-[#00E5FF] text-white shadow-[0_0_8px_rgba(0,229,255,0.25)] scale-102'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                  }`}
                  title={`${team.name} Goalkeeper`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-sm relative flex shrink-0 shadow-sm"
                    style={{
                      backgroundColor: team.colors.shirt,
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    {team.colors.pattern === 'stripes' && (
                      <div className="absolute inset-0 flex justify-around opacity-60">
                        <div className="w-[1px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                        <div className="w-[1px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] font-mono font-bold mt-1">{team.id}</span>
                </button>
              );
            })}
          </div>

          {/* Pequeño panel de estadísticas por debajo del Arquero */}
          <div className="mt-1.5 bg-white/5 border border-white/5 rounded-lg p-2 flex flex-row items-center justify-between gap-2.5 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase text-white font-display tracking-wide">{keeperTeam.player}</span>
              <span className="text-[8px] font-mono text-slate-400">({keeperTeam.name})</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 rounded font-black">
                  IA INTELIGENTE
                </span>
                <span className="text-[9px] font-mono text-slate-400">Atajador Adaptativo</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Action validation confirmation bar */}
      <div className="mt-4 flex justify-center">
        <button
          id="btn-start-match"
          onClick={() => onSelected(kickerTeam, keeperTeam)}
          className="group relative px-8 py-2.5 rounded-full font-display font-black uppercase text-[10px] tracking-wider bg-gradient-to-r from-[#00FF87] to-[#00E5FF] text-[#002f23] shadow-lg hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] transition-all duration-200 hover:scale-103 active:scale-97 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            INICIAR PENALES <Trophy className="w-3 h-3 fill-[#002f23]" />
          </span>
        </button>
      </div>
    </div>
  );
}
