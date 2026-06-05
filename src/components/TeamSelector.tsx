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

  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Editorial Title */}
      <div className="text-center mb-10">
        <span className="bg-emerald-500/10 text-emerald-400 font-mono text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-emerald-500/20">
          World Cup {currentYear} Finalists
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight drop-shadow-md">
          PENALTY <span className="text-emerald-400">SHOOTOUT</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base mt-2 max-w-md mx-auto">
          Choose your striker and opponent goalkeeper to claim the virtual gold.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Choose your Striker Team */}
        <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Star className="text-yellow-400 w-4 h-4 fill-yellow-400" /> Choose Striker
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {selectedKickerIdx + 1} / {TEAMS.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 select-scrollbar mb-5">
            {TEAMS.map((team, idx) => (
              <button
                key={`kicker-${team.id}`}
                id={`btn-kicker-${team.id}`}
                onClick={() => {
                  setSelectedKickerIdx(idx);
                  if (idx === selectedKeeperIdx) {
                    setSelectedKeeperIdx((idx + 1) % TEAMS.length);
                  }
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition duration-200 border text-left text-sm ${
                  idx === selectedKickerIdx
                    ? 'bg-emerald-500/10 border-emerald-500 text-white'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {/* Visual Jersey Icon */}
                <div
                  className="w-4 h-5 rounded-sm relative flex shrink-0"
                  style={{
                    backgroundColor: team.colors.shirt,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {team.colors.pattern === 'stripes' && (
                    <div
                      className="absolute inset-0 flex justify-around"
                      style={{ opacity: 0.6 }}
                    >
                      <div className="w-[2px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                      <div className="w-[2px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                    </div>
                  )}
                  {team.colors.pattern === 'squares' && (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-50">
                      <div style={{ backgroundColor: team.colors.stripes }} />
                      <div />
                      <div />
                      <div style={{ backgroundColor: team.colors.stripes }} />
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <p className="font-bold tracking-tight">{team.name}</p>
                  <p className="text-[11px] font-mono opacity-70 truncate">{team.player}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Striker Stats Cards Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
            {/* Custom jersey decoration */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rotate-12 opacity-15" style={{ color: kickerTeam.colors.shirt }}>
              <div className="w-16 h-20 rounded-md shadow-2xl relative" style={{ backgroundColor: kickerTeam.colors.shirt }}>
                {kickerTeam.colors.pattern === 'stripes' && <div className="absolute inset-0 flex justify-around"><div className="w-2 h-full opacity-60" style={{ backgroundColor: kickerTeam.colors.stripes }} /><div className="w-2 h-full opacity-60" style={{ backgroundColor: kickerTeam.colors.stripes }} /></div>}
              </div>
            </div>

            <p className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold mb-0.5">Striker Star</p>
            <h3 className="text-xl font-black text-slate-100">{kickerTeam.player}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{kickerTeam.name.toUpperCase()} SQUAD</p>

            <div className="mt-5 space-y-3.5">
              {/* Acc slider */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-lime-400" /> ACCURACY</span>
                  <span className="text-slate-100 font-bold">{kickerTeam.accuracy}</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-lime-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${kickerTeam.accuracy}%` }}
                  />
                </div>
              </div>

              {/* Power slider */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-orange-400" /> POWER</span>
                  <span className="text-slate-100 font-bold">{kickerTeam.power}</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-orange-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${kickerTeam.power}%` }}
                  />
                </div>
              </div>

              {/* Curve Slider */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> CURVE / SPIN</span>
                  <span className="text-slate-100 font-bold">{kickerTeam.curve}</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${kickerTeam.curve}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center VS Divider and action */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-3 self-stretch min-h-[140px] lg:min-h-0">
          <div className="w-12 h-12 bg-slate-950/80 border border-slate-800 rounded-full flex items-center justify-center font-black text-emerald-400 text-lg shadow-lg relative shrink-0">
            VS
            <div className="absolute -inset-0.5 bg-emerald-500/25 blur rounded-full -z-10" />
          </div>

          <button
            id="btn-randomize-teams"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-emerald-400 transition bg-slate-950/40 hover:bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0 mt-2"
          >
            <RefreshCw className="w-3 h-3 animate-spin-hover" /> RANDOMIZE
          </button>
        </div>

        {/* Right column: Choose GK Team */}
        <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="text-amber-400 w-4 h-4" /> Opponent Goalkeeper
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {selectedKeeperIdx + 1} / {TEAMS.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 select-scrollbar mb-5">
            {TEAMS.map((team, idx) => (
              <button
                key={`keeper-${team.id}`}
                id={`btn-keeper-${team.id}`}
                disabled={idx === selectedKickerIdx}
                onClick={() => setSelectedKeeperIdx(idx)}
                className={`flex items-center gap-3 p-3 rounded-xl transition duration-200 border text-left text-sm ${
                  idx === selectedKeeperIdx
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                {/* Visual Jersey Icon */}
                <div
                  className="w-4 h-5 rounded-sm relative flex shrink-0"
                  style={{
                    backgroundColor: team.colors.shirt,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {team.colors.pattern === 'stripes' && (
                    <div
                      className="absolute inset-0 flex justify-around"
                      style={{ opacity: 0.6 }}
                    >
                      <div className="w-[2px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                      <div className="w-[2px] h-full" style={{ backgroundColor: team.colors.stripes }} />
                    </div>
                  )}
                  {team.colors.pattern === 'squares' && (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-50">
                      <div style={{ backgroundColor: team.colors.stripes }} />
                      <div />
                      <div />
                      <div style={{ backgroundColor: team.colors.stripes }} />
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <p className="font-bold tracking-tight">{team.name}</p>
                  <p className="text-[11px] font-mono opacity-70 truncate">Defensive Wall</p>
                </div>
              </button>
            ))}
          </div>

          {/* Keeper dynamic display info */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
            {/* Custom jersey decoration */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rotate-12 opacity-15" style={{ color: keeperTeam.colors.shirt }}>
              <div className="w-16 h-20 rounded-md shadow-2xl relative" style={{ backgroundColor: keeperTeam.colors.shirt }}>
                {keeperTeam.colors.pattern === 'stripes' && <div className="absolute inset-0 flex justify-around"><div className="w-2 h-full opacity-60" style={{ backgroundColor: keeperTeam.colors.stripes }} /><div className="w-2 h-full opacity-60" style={{ backgroundColor: keeperTeam.colors.stripes }} /></div>}
              </div>
            </div>

            <p className="text-[11px] font-mono uppercase tracking-widest text-amber-500 font-semibold mb-0.5">Goalkeeper Unit</p>
            <h3 className="text-xl font-black text-slate-100">{keeperTeam.name} Defense</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ADAPTIVE PATTERN AI ACTIVE</p>

            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              The {keeperTeam.name} keeper tracks your patterns. Shoots aimed repeatedly in the same sector will trigger automatic keeper anticipation! Change directions often.
            </p>
          </div>
        </div>
      </div>

      {/* Play Action Confirmation Button */}
      <div className="mt-12 flex justify-center">
        <button
          id="btn-start-match"
          onClick={() => onSelected(kickerTeam, keeperTeam)}
          className="group relative px-10 py-4 rounded-xl font-black uppercase text-sm tracking-widest bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-emerald-500/25 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            START penalty shootout <Trophy className="w-4 h-4 fill-slate-950" />
          </span>
          <div className="absolute inset-0 rounded-xl -z-10 bg-emerald-500 opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
        </button>
      </div>
    </div>
  );
}
