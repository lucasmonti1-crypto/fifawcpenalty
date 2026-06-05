import React, { useState, useEffect, useRef } from 'react';
import { Team, ShotDirection, ShotHeight, ShotResult, GameState } from '../types';
import { audioEngine } from './AudioEngine';
import { Target, RotateCcw, Volume2, VolumeX, ArrowLeft, Space, Activity, Info } from 'lucide-react';

interface GameUIProps {
  playerTeam: Team;
  opponentTeam: Team;
  gameState: GameState;
  score: number;
  shotHistory: ShotResult[];
  onShoot: (dir: ShotDirection, h: ShotHeight, power: number, curve: number) => void;
  onResetMatch: () => void;
  onExitSelection: () => void;
  currentShotNum: number;
}

export default function GameUI({
  playerTeam,
  opponentTeam,
  gameState,
  score,
  shotHistory,
  onShoot,
  onResetMatch,
  onExitSelection,
  currentShotNum
}: GameUIProps) {
  const [selectedDir, setSelectedDir] = useState<ShotDirection>('center');
  const [selectedHeight, setSelectedHeight] = useState<ShotHeight>('low');
  const [curve, setCurve] = useState<number>(0);
  const [isCharging, setIsCharging] = useState(false);
  const [power, setPower] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const powerDirectionRef = useRef(1); // 1 for up, -1 for down
  const powerAnimRef = useRef<number | null>(null);

  // Synchronize audio mute state
  useEffect(() => {
    setIsAudioMuted(audioEngine.getMuteStatus());
  }, []);

  const handleMuteToggle = () => {
    const nextMute = audioEngine.toggleMute();
    setIsAudioMuted(nextMute);
  };

  // Speed up power meter depending on current shot count (increasing difficulty)
  // Shot 1: multiplier 2.4, Shot 5: multiplier 5.2
  const getPowerMeterSpeed = () => {
    return 2.4 + (currentShotNum - 1) * 0.7;
  };

  // Power bar animation loop
  useEffect(() => {
    if (!isCharging) {
      if (powerAnimRef.current) {
        cancelAnimationFrame(powerAnimRef.current);
        powerAnimRef.current = null;
      }
      return;
    }

    const updatePower = () => {
      setPower((prevPower) => {
        let nextPower = prevPower + powerDirectionRef.current * getPowerMeterSpeed();
        if (nextPower >= 100) {
          nextPower = 100;
          powerDirectionRef.current = -1;
        } else if (nextPower <= 0) {
          nextPower = 0;
          powerDirectionRef.current = 1;
        }
        return nextPower;
      });
      powerAnimRef.current = requestAnimationFrame(updatePower);
    };

    powerAnimRef.current = requestAnimationFrame(updatePower);

    return () => {
      if (powerAnimRef.current) {
        cancelAnimationFrame(powerAnimRef.current);
      }
    };
  }, [isCharging, currentShotNum]);

  // Keyboard controls listener (Spacebar triggers shoot charge / kick kick)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PRE_SHOT') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isCharging) {
          // Initialize charging
          setPower(0);
          powerDirectionRef.current = 1;
          setIsCharging(true);
          audioEngine.playWhistle(); // quick whistle blow
        } else {
          // Shoot!
          setIsCharging(false);
          onShoot(selectedDir, selectedHeight, Math.round(power), curve);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isCharging, selectedDir, selectedHeight, power, curve, onShoot]);

  const handlePowerAction = () => {
    if (gameState !== 'PRE_SHOT') return;

    if (!isCharging) {
      setPower(0);
      powerDirectionRef.current = 1;
      setIsCharging(true);
    } else {
      setIsCharging(false);
      onShoot(selectedDir, selectedHeight, Math.round(power), curve);
    }
  };

  // Quick reset parameters between shots
  useEffect(() => {
    if (gameState === 'PRE_SHOT') {
      setPower(0);
      setIsCharging(false);
    }
  }, [gameState]);

  // Evaluate perfect shot zones color guides
  const getPowerColor = (p: number) => {
    if (p >= 72 && p <= 88) return 'bg-emerald-500 shadow-[0_0_12px_#10b981]'; // perfect zone
    if (p > 88) return 'bg-red-500 shadow-[0_0_12px_#ef4444]'; // overpowered balloon risk
    return 'bg-amber-400'; // underpowered
  };

  const getPowerZoneLabel = (p: number) => {
    if (p === 0) return 'READY FOR SHOOT';
    if (p >= 72 && p <= 88) return '★ PERFECT SHOT POWER ★';
    if (p > 88) return '⚠️ WARNING: OVERPOWERED!';
    return 'CONTROLLED FOCUS SHOT';
  };

  // Get active targets indicators
  const isTargetSelected = (d: ShotDirection, h: ShotHeight) => {
    return selectedDir === d && selectedHeight === h;
  };

  // Total goals scored out of shots
  const goalsCount = shotHistory.filter(s => s.isGoal).length;
  const matchOver = shotHistory.length >= 5;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 px-4 pb-8 select-none">
      {/* 1. SCOREBOARD HEADER */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        {/* Left side: Back & Mute controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <button
            id="btn-back-to-team"
            onClick={onExitSelection}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition bg-slate-950/50 hover:bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> TEAMS
          </button>

          <button
            id="btn-toggle-sound"
            onClick={handleMuteToggle}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition bg-slate-950/50 hover:bg-slate-950 border border-slate-800 p-2 rounded-lg"
            title="Toggle Sound Effects"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Center score marquee */}
        <div className="flex items-center gap-5 justify-center md:flex-1">
          {/* Striker team badge */}
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-mono font-bold">{playerTeam.player.split(' ').pop()}</p>
            <p className="text-sm font-black text-slate-100">{playerTeam.name}</p>
          </div>

          {/* Core Match Goal Count display */}
          <div className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-xl font-mono flex items-center gap-3">
            <span className="text-3xl font-black text-emerald-400">{goalsCount}</span>
            <span className="text-slate-600 font-bold">:</span>
            <span className="text-slate-500 font-bold">{shotHistory.length - goalsCount}</span>
          </div>

          {/* Keeper team badge */}
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-mono font-bold">GK WALL</p>
            <p className="text-sm font-black text-slate-100">{opponentTeam.name}</p>
          </div>
        </div>

        {/* Right side: 5 shot sequence trackers dots */}
        <div className="flex items-center gap-1.5 bg-slate-950/50 border border-slate-800/40 p-2.5 rounded-xl w-full md:w-auto justify-center">
          {Array.from({ length: 5 }).map((_, idx) => {
            const shot = shotHistory[idx];
            let dotBg = 'border-slate-700 bg-slate-950/60';
            let dotContent = (idx + 1).toString();

            if (shot) {
              if (shot.isGoal) {
                dotBg = 'border-emerald-500 bg-emerald-500/20 text-emerald-400';
                dotContent = '✓';
              } else {
                dotBg = 'border-red-500 bg-red-500/20 text-red-400';
                dotContent = '✗';
              }
            } else if (idx === shotHistory.length && gameState === 'PRE_SHOT') {
              // pulsating highlight current goal slot
              dotBg = 'border-amber-400 bg-amber-400/10 text-amber-400 animate-pulse';
            }

            return (
              <div
                key={`shot-slot-${idx}`}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono font-black text-xs transition duration-300 ${dotBg}`}
              >
                {dotContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. DYNAMIC BROADCAST FEEDBACK BOX */}
      {gameState !== 'PRE_SHOT' && gameState !== 'RUN_UP' && (
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-center shadow-lg animate-fade-in">
          <p className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-semibold mb-1">
            Replay Center Live
          </p>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {gameState === 'KICK' && 'RUN-UP START!'}
            {gameState === 'BALL_FLIGHT' && 'SHOT FIRED! BALL IN THE AIR...'}
            {gameState === 'CELEBRATION' && '⚽ GOOOOALLLL!!! IMPACT NET SWISH!'}
            {gameState === 'SAVED' && (shotHistory[shotHistory.length - 1]?.hitWoodwork ? '💥 HIT THE FRAME! WOODWORK CLANG!' : '🛡️ SPECTACULAR KEEPER SAVE!')}
            {gameState === 'OUT_OF_BOUNDS' && '⚠️ BALL SAILS COMPLETELY OFF TARGET!'}
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 italic">
            {shotHistory[shotHistory.length - 1]?.message || 'Keep eyes glued to the trajectory path.'}
          </p>
        </div>
      )}

      {/* 3. SHOOTING INTERFACES OVERLAYS (Shown only in preparation state) */}
      {gameState === 'PRE_SHOT' && !matchOver && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Column A: Aiming Matrix grid (Left/Center/Right x High/Low) */}
          <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" /> Sector Aim Selection
            </h3>

            {/* Simulated interactive target board goal */}
            <div className="aspect-[2.3/1] bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden p-2 flex flex-col justify-between">
              {/* Goalposts border shape */}
              <div className="absolute top-0 bottom-0 left-8 right-8 border-t-4 border-x-4 border-dashed border-slate-700/60 flex flex-col justify-end">
                {/* Horizontal nets line */}
                <div className="h-1/2 border-b border-dashed border-slate-800/40 w-full" />
              </div>

              {/* Grid selectors quadrants */}
              <div className="grid grid-cols-3 grid-rows-2 gap-2 relative h-full w-full z-10">
                {/* HIGH SHOOTS ROW */}
                <button
                  id="target-left-high"
                  onClick={() => { setSelectedDir('left'); setSelectedHeight('high'); }}
                  className={`border rounded-lg flex items-center justify-center text-xs font-mono font-bold transition duration-200 ${
                    isTargetSelected('left', 'high')
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'border-slate-800/40 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  Top Left
                </button>
                <button
                  id="target-center-high"
                  onClick={() => { setSelectedDir('center'); setSelectedHeight('high'); }}
                  className={`border rounded-lg flex items-center justify-center text-xs font-mono font-bold transition duration-200 ${
                    isTargetSelected('center', 'high')
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'border-slate-800/40 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  Under Bar
                </button>
                <button
                  id="target-right-high"
                  onClick={() => { setSelectedDir('right'); setSelectedHeight('high'); }}
                  className={`border rounded-lg flex items-center justify-center text-xs font-mono font-bold transition duration-200 ${
                    isTargetSelected('right', 'high')
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'border-slate-800/40 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  Top Right
                </button>

                {/* LOW SHOOTS ROW */}
                <button
                  id="target-left-low"
                  onClick={() => { setSelectedDir('left'); setSelectedHeight('low'); }}
                  className={`border rounded-lg flex items-center justify-center text-xs font-mono font-bold transition duration-200 ${
                    isTargetSelected('left', 'low')
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-slate-800/40 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  Bottom Left
                </button>
                <button
                  id="target-center-low"
                  onClick={() => { setSelectedDir('center'); setSelectedHeight('low'); }}
                  className={`border rounded-lg flex items-center justify-center text-xs font-mono font-bold transition duration-200 ${
                    isTargetSelected('center', 'low')
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-slate-800/40 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  Bottom Center
                </button>
                <button
                  id="target-right-low"
                  onClick={() => { setSelectedDir('right'); setSelectedHeight('low'); }}
                  className={`border rounded-lg flex items-center justify-center text-xs font-mono font-bold transition duration-200 ${
                    isTargetSelected('right', 'low')
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-slate-800/40 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  Bottom Right
                </button>
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-500 mt-2.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> High shots fly near the top bin, making them hard to save, but carry a risk of going over the bar!
            </p>
          </div>

          {/* Column B: Ball Curve & Power Kick Action */}
          <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl">
            {/* Swerving spin slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse" /> Swerve Spin Curve
                </h3>
                <span className="text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                  {curve === 0 ? 'Straight' : (curve > 0 ? `+${curve} Right Hook` : `${curve} Left Hook`)}
                </span>
              </div>
              
              <input
                id="curve_slider"
                type="range"
                min="-10"
                max="10"
                step="1"
                value={curve}
                onChange={(e) => setCurve(parseInt(e.target.value))}
                disabled={isCharging}
                className="w-full accent-cyan-400 h-2 bg-slate-950 rounded-lg cursor-pointer disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>Left Curl</span>
                <span>Dead Center</span>
                <span>Right Curl</span>
              </div>
            </div>

            {/* Timing power click bar */}
            <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
                <span>POWER BAR</span>
                <span className="font-bold text-slate-250 truncate">{getPowerZoneLabel(power)}</span>
                <span className="font-bold text-slate-200">{Math.round(power)}%</span>
              </div>

              {/* Progress track */}
              <div className="w-full h-8 bg-slate-900 rounded-lg relative overflow-hidden border border-slate-800 flex items-center">
                {/* Weaker area */}
                <div className="absolute left-0 w-[72%] h-full bg-slate-800/30" />
                
                {/* PERFECT ZONE (72% to 88%) */}
                <div className="absolute left-[72%] w-[16%] h-full bg-emerald-500/10 border-x border-emerald-500/50 flex items-center justify-center" title="Perfect Zone">
                  <span className="text-[9px] text-emerald-400 font-bold tracking-widest font-mono">SWEET</span>
                </div>
                
                {/* Overpowered Warning area */}
                <div className="absolute left-[88%] w-[12%] h-full bg-red-950/20" />

                {/* Pulsating Indicator bar representing dynamic charging point */}
                <div
                  className={`absolute h-full transition-all duration-[16ms] ${getPowerColor(power)}`}
                  style={{ width: `${power}%` }}
                />
              </div>

              {/* Timing hint */}
              <p className="text-[10px] text-slate-500 font-mono mt-1.5 text-center">
                Stopping the meter in the <span className="text-emerald-400">Sweet Spot (72% - 88%)</span> triggers a high-velocity curve shot!
              </p>
            </div>

            {/* Main Trigger shoot clicker button */}
            <button
              id="btn-shoot-action"
              onClick={handlePowerAction}
              className={`w-full py-3 px-5 rounded-xl font-mono uppercase text-sm tracking-widest font-extrabold flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95 ${
                isCharging
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950'
              }`}
            >
              <Space className="w-4 h-4 shrink-0" />
              {isCharging ? 'KICK! (TAP OR SPACEBAR)' : 'CHARGE SHOOT (TAP OR SPACEBAR)'}
            </button>
          </div>
        </div>
      )}

      {/* 4. POST-SHOT CONSOLE ACTIONS & SUMMARY */}
      {gameState !== 'PRE_SHOT' && gameState !== 'RUN_UP' && gameState !== 'BALL_FLIGHT' && (
        <div className="flex justify-center mt-3 animate-fade-in">
          {matchOver ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-yellow-400 to-cyan-500" />
              
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold mb-1">Session Complete</p>
              <h3 className="text-2xl font-black text-slate-500 tracking-tight">MATCH RESULTS</h3>
              
              <div className="bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-800 my-4">
                <p className="text-5xl font-black text-white">{goalsCount} / 5</p>
                <p className="text-xs text-slate-400 mt-2 font-mono">GOALS RECORDED</p>
                
                <p className="text-xs text-slate-500 mt-4 italic font-sans">
                  {goalsCount === 5 && '👑 UNSTOPPABLE HERO! Absolute masterclass of timing!'}
                  {goalsCount === 4 && '🔥 OUTSTANDING! Top-tier football shooting technique!'}
                  {goalsCount === 3 && '👍 SOLID WORK! Great accuracy under penalty pressure.'}
                  {goalsCount === 2 && '⚽ KEEP PRACTICING! Spend more time in the Sweet power zone.'}
                  {goalsCount <= 1 && '🧤 BLOCKED OUT! Goalkeeper AI had reading hacks active.'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  id="btn-play-again"
                  onClick={onResetMatch}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold uppercase text-xs tracking-widest py-3 px-6 rounded-xl shadow-lg shadow-emerald-950/20 cursor-pointer text-center"
                >
                  REPLAY SHOOTOUT
                </button>
                <button
                  id="btn-exit-to-teams"
                  onClick={onExitSelection}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold uppercase text-xs tracking-widest py-3 px-6 rounded-xl cursor-pointer text-center"
                >
                  SELECT OUT TEAMS
                </button>
              </div>
            </div>
          ) : (
            <button
              id="btn-next-shot"
              onClick={onResetMatch}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold uppercase text-xs tracking-widest py-3.5 px-8 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-1"
            >
              POSITION SHOT {currentShotNum} <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
