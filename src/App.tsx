import React, { useState } from 'react';
import { Team, GameState, ShotDirection, ShotHeight, ShotResult, TEAMS } from './types';
import TeamSelector from './components/TeamSelector';
import StadiumCanvas from './components/StadiumCanvas';
import GameUI from './components/GameUI';
import { audioEngine } from './components/AudioEngine';
import { Trophy, HelpCircle, Gamepad2, Info, Star } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TEAM_SELECT');
  const [playerTeam, setPlayerTeam] = useState<Team>(TEAMS[0]);
  const [opponentTeam, setOpponentTeam] = useState<Team>(TEAMS[1]);
  
  // Gameplay variables
  const [score, setScore] = useState(0);
  const [shotHistory, setShotHistory] = useState<ShotResult[]>([]);
  
  // Current shot settings state
  const [direction, setDirection] = useState<ShotDirection>('center');
  const [height, setHeight] = useState<ShotHeight>('low');
  const [power, setPower] = useState(0);
  const [curve, setCurve] = useState(0);

  const [currentShotNum, setCurrentShotNum] = useState(1);

  // Initialize and unlock audio context upon first meaningful user screen gesture
  const handleTeamSelected = (yourTeam: Team, defenderTeam: Team) => {
    setPlayerTeam(yourTeam);
    setOpponentTeam(defenderTeam);
    
    // Warm up Web Audio engine
    audioEngine.init();
    audioEngine.playWhistle();

    // Begin match
    setScore(0);
    setShotHistory([]);
    setCurrentShotNum(1);
    setGameState('PRE_SHOT');
  };

  const handleShoot = (selectedDir: ShotDirection, selectedHeight: ShotHeight, selectedPower: number, selectedCurve: number) => {
    if (gameState !== 'PRE_SHOT') return;

    setDirection(selectedDir);
    setHeight(selectedHeight);
    setPower(selectedPower);
    setCurve(selectedCurve);

    // Swap to run-up animation transition
    setGameState('RUN_UP');
  };

  const handleShotComplete = (result: ShotResult) => {
    setShotHistory((prev) => {
      const nextHistory = [...prev, result];
      
      // Update running core score
      if (result.isGoal) {
        setScore((s) => s + 1);
      }

      // Check match termination thresholds (5 shot limit)
      if (nextHistory.length >= 5) {
        setGameState('MATCH_OVER');
      } else {
        // Prepare next shot numbers
        setCurrentShotNum(nextHistory.length + 1);
      }

      return nextHistory;
    });

    // Update canvas screen stage
    if (result.isGoal) {
      setGameState('CELEBRATION');
    } else if (result.isSaved || result.hitWoodwork) {
      setGameState('SAVED');
    } else if (result.isOffTarget) {
      setGameState('OUT_OF_BOUNDS');
    }
  };

  const handleResetMatch = () => {
    // Reset canvas parameters for next round shot
    if (shotHistory.length >= 5) {
      // Complete replay
      setScore(0);
      setShotHistory([]);
      setCurrentShotNum(1);
    }
    setGameState('PRE_SHOT');
  };

  const handleExitSelection = () => {
    setGameState('TEAM_SELECT');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500/30 selection:text-emerald-300 overflow-x-hidden">
      {/* Dynamic Header Navbar Bar - Only show when selecting teams */}
      {gameState === 'TEAM_SELECT' && (
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase text-white leading-none">
                WORLD 2026
              </h1>
              <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                Penalty Arena Edition
              </span>
            </div>
          </div>

          {/* Global info pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full text-xs font-mono text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" /> 5-Shot Final Match
          </div>
        </header>
      )}

      {/* Main viewport Container */}
      <main className={`w-full flex flex-col justify-center ${gameState === 'TEAM_SELECT' ? 'flex-1 py-6' : 'h-screen w-screen relative overflow-hidden'}`}>
        {gameState === 'TEAM_SELECT' ? (
          <TeamSelector onSelected={handleTeamSelected} />
        ) : (
          <div className="w-full h-full relative select-none animate-fade-in">
            <StadiumCanvas
              playerTeam={playerTeam}
              opponentTeam={opponentTeam}
              gameState={gameState}
              onShotComplete={handleShotComplete}
              direction={direction}
              setDirection={setDirection}
              height={height}
              setHeight={setHeight}
              power={power}
              setPower={setPower}
              curve={curve}
              setCurve={setCurve}
              shotCount={currentShotNum}
              onAnimationTriggered={() => {}}
              onShoot={handleShoot}
              score={score}
              shotHistory={shotHistory}
              onResetMatch={handleResetMatch}
              onExitSelection={handleExitSelection}
            />
          </div>
        )}
      </main>

      {/* Footer system credit line - Only show when selecting teams */}
      {gameState === 'TEAM_SELECT' && (
        <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-mono shrink-0">
          <p>© 2026 World Cup Shootout Arena. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> Developed with standard graphics projection
          </p>
        </footer>
      )}
    </div>
  );
}
