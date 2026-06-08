import React, { useState, useRef, useEffect } from 'react';
import { Team, GameState, ShotDirection, ShotHeight, ShotResult, TEAMS, TOURNAMENT_STAGES } from './types';
import TeamSelector from './components/TeamSelector';
import StadiumCanvas from './components/StadiumCanvas';
import { audioEngine } from './components/AudioEngine';
import { Trophy, HelpCircle, Gamepad2, Info, Star } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TEAM_SELECT');
  const [playerTeam, setPlayerTeam] = useState<Team>(TEAMS[0]);
  const [opponentTeam, setOpponentTeam] = useState<Team>(TEAMS[1]);
  
  // Gameplay variables
  const [score, setScore] = useState(0); // User Score
  const [opponentScore, setOpponentScore] = useState(0); // Opponent Score
  const [shotHistory, setShotHistory] = useState<ShotResult[]>([]); // User's kicks history
  const [opponentHistory, setOpponentHistory] = useState<ShotResult[]>([]); // Opponent's kicks history
  
  const [isOpponentTurn, setIsOpponentTurn] = useState(false); // Alternating penalty shooter roles

  // Current shot settings state
  const [direction, setDirection] = useState<ShotDirection>('center');
  const [height, setHeight] = useState<ShotHeight>('low');
  const [power, setPower] = useState(0);
  const [curve, setCurve] = useState(0);

  const [currentShotNum, setCurrentShotNum] = useState(1); // Standard Round: 1 to 5+

  // Knockout tournament progression (Octavos -> Cuartos -> Semi -> Final -> Champion)
  const [stageIndex, setStageIndex] = useState(0);
  const [facedIds, setFacedIds] = useState<string[]>([]);
  const [nextOpponent, setNextOpponent] = useState<Team | null>(null);
  const totalStages = TOURNAMENT_STAGES.length;

  // Pick a random team not yet faced and not the player's
  const drawOpponent = (): Team => {
    const pool = TEAMS.filter(t => t.id !== playerTeam.id && !facedIds.includes(t.id));
    const list = pool.length > 0 ? pool : TEAMS.filter(t => t.id !== playerTeam.id);
    return list[Math.floor(Math.random() * list.length)];
  };

  // A ref to store the latest values of crucial score/turn states to avoid React's stale closure problems during fast canvas ticks
  const latestStateRef = useRef({
    score,
    opponentScore,
    shotHistory,
    opponentHistory,
    currentShotNum,
    isOpponentTurn,
  });

  useEffect(() => {
    latestStateRef.current = {
      score,
      opponentScore,
      shotHistory,
      opponentHistory,
      currentShotNum,
      isOpponentTurn,
    };
  }, [score, opponentScore, shotHistory, opponentHistory, currentShotNum, isOpponentTurn]);

  // Soundtrack/ambience: intro anthem on the menu, looping stadium crowd in-match
  useEffect(() => {
    if (gameState === 'TEAM_SELECT') {
      audioEngine.init();
      audioEngine.stopMatchAmbience();
      audioEngine.playIntroMusic();
    } else if (gameState === 'MATCH_OVER') {
      audioEngine.stopMusic();
      audioEngine.stopMatchAmbience(); // victory/defeat music takes over
    } else {
      audioEngine.stopMusic();
      audioEngine.startMatchAmbience();
    }
  }, [gameState]);

  // Referee whistle the instant it is OUR turn to take a penalty (not the rival's)
  useEffect(() => {
    if (gameState === 'PRE_SHOT' && !isOpponentTurn) {
      audioEngine.playRefWhistle();
    }
  }, [gameState, isOpponentTurn]);

  // The goal roar loops through the celebration; cut it as soon as we leave it
  // (i.e. when the user presses "Continuar tanda de penales").
  useEffect(() => {
    if (gameState !== 'CELEBRATION') {
      audioEngine.stopGoalCrowd();
    }
  }, [gameState]);

  // On match completion: advance the bracket, crown a champion, or get eliminated
  useEffect(() => {
    if (gameState !== 'MATCH_OVER') return;
    const userWon = score > opponentScore;
    const isFinal = stageIndex >= totalStages - 1;

    if (userWon && !isFinal) {
      // Advance: line up the next rival (shown on the "classified" screen)
      if (!nextOpponent) setNextOpponent(drawOpponent());
      audioEngine.playCheer();
    } else if (userWon && isFinal) {
      audioEngine.playVictoryMusic();
    } else {
      audioEngine.playDefeatMusic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, score, opponentScore, stageIndex]);

  // Initialize and unlock audio context upon first meaningful user screen gesture
  const handleTeamSelected = (yourTeam: Team, defenderTeam: Team) => {
    setPlayerTeam(yourTeam);
    setOpponentTeam(defenderTeam);
    
    // Warm up the audio engine (the ref whistle fires on the PRE_SHOT effect)
    audioEngine.init();

    // Begin tournament — the chosen rival is your Round-of-16 opponent
    setStageIndex(0);
    setFacedIds([defenderTeam.id]);
    setNextOpponent(null);

    setScore(0);
    setOpponentScore(0);
    setShotHistory([]);
    setOpponentHistory([]);
    setCurrentShotNum(1);
    setIsOpponentTurn(false);
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

  const checkMatchOver = (
    userS: number,
    oppS: number,
    round: number,
    userHist: ShotResult[],
    oppHist: ShotResult[]
  ): boolean => {
    const userKicks = userHist.length;
    const oppKicks = oppHist.length;

    // 1. Regular 5-kick phase
    if (round <= 5) {
      const userRemaining = 5 - userKicks;
      const oppRemaining = 5 - oppKicks;

      // User has already mathematical impossible to catch up
      if (userS + userRemaining < oppS) return true;
      // Opponent has already mathematical impossible to catch up
      if (oppS + oppRemaining < userS) return true;

      // Both completed 5 kicks - see if tied or decided
      if (userKicks === 5 && oppKicks === 5) {
        if (userS !== oppS) return true;
      }
      return false;
    }

    // 2. Sudden Death phase (Round > 5)
    // Sudden Death matches are checked only when both have shot the same number of kicks in that round
    if (userKicks === oppKicks && userKicks === round) {
      if (userS !== oppS) return true;
    }
    return false;
  };

  const handleShotComplete = (result: ShotResult) => {
    const {
      score: currentScore,
      opponentScore: currentOpponentScore,
      shotHistory: currentShotHistory,
      opponentHistory: currentOpponentHistory,
      currentShotNum: round,
      isOpponentTurn: isOppTurn
    } = latestStateRef.current;

    // Crowd/commentary layer: OUR goal erupts; anything else gets the "salvada" sting
    if (result.isGoal && !isOppTurn) {
      audioEngine.playGoalCrowd();
    } else {
      audioEngine.playNonGoal();
    }

    if (!isOppTurn) {
      // User just shot
      const nextUserScore = result.isGoal ? currentScore + 1 : currentScore;
      const nextHistory = [...currentShotHistory, result];
      
      setScore(nextUserScore);
      setShotHistory(nextHistory);

      // Check if user's kick mathematically decided the match early
      const isEnded = checkMatchOver(nextUserScore, currentOpponentScore, round, nextHistory, currentOpponentHistory);
      if (isEnded) {
        setGameState('MATCH_OVER');
      } else {
        // Normal transition to Saved/Goal results
        if (result.isGoal) {
          setGameState('CELEBRATION');
        } else if (result.isSaved || result.hitWoodwork) {
          setGameState('SAVED');
        } else if (result.isOffTarget) {
          setGameState('OUT_OF_BOUNDS');
        }
      }
    } else {
      // Opponent just shot
      const nextOpponentScore = result.isGoal ? currentOpponentScore + 1 : currentOpponentScore;
      const nextHistory = [...currentOpponentHistory, result];

      setOpponentScore(nextOpponentScore);
      setOpponentHistory(nextHistory);

      // Check if opponent's kick decided the match
      const isEnded = checkMatchOver(currentScore, nextOpponentScore, round, currentShotHistory, nextHistory);
      if (isEnded) {
        setGameState('MATCH_OVER');
      } else {
        // Normal transition to Saved/Goal results for Opponent
        if (result.isGoal) {
          setGameState('CELEBRATION');
        } else if (result.isSaved || result.hitWoodwork) {
          setGameState('SAVED');
        } else if (result.isOffTarget) {
          setGameState('OUT_OF_BOUNDS');
        }
      }
    }
  };

  const handleNextTurn = () => {
    if (gameState === 'MATCH_OVER') {
      // Return to team select to start fully over
      setGameState('TEAM_SELECT');
      return;
    }

    // Transition between User and Opponent turns
    if (!isOpponentTurn) {
      // User shot is complete, now swap roles to let Opponent shoot!
      setIsOpponentTurn(true);
      setGameState('PRE_SHOT');
    } else {
      // Opponent turn is complete, check rounds and return to User turn
      setIsOpponentTurn(false);
      
      const nextRound = Math.max(shotHistory.length, opponentHistory.length) + 1;
      setCurrentShotNum(nextRound);
      setGameState('PRE_SHOT');
    }
  };

  // Advance to the next knockout round against a fresh opponent
  const handleAdvance = () => {
    const opp = nextOpponent || drawOpponent();
    setOpponentTeam(opp);
    setFacedIds(prev => [...prev, opp.id]);
    setNextOpponent(null);
    setStageIndex(prev => prev + 1);

    // Fresh shootout for the new tie
    setScore(0);
    setOpponentScore(0);
    setShotHistory([]);
    setOpponentHistory([]);
    setCurrentShotNum(1);
    setIsOpponentTurn(false);

    audioEngine.stopMusic();
    audioEngine.init();
    setGameState('PRE_SHOT');
  };

  const handleRestartMatch = () => {
    // Reset all gameplay variables to fully start the penalty shootout from scratch!
    setScore(0);
    setOpponentScore(0);
    setShotHistory([]);
    setOpponentHistory([]);
    setCurrentShotNum(1);
    setIsOpponentTurn(false);
    
    // Warm up audio (the ref whistle fires on the PRE_SHOT effect)
    audioEngine.init();

    // Set state back to kickoff
    setGameState('PRE_SHOT');
  };

  const handleExitSelection = () => {
    setGameState('TEAM_SELECT');
  };

  return (
    <div className="min-h-screen wc2026-bg text-slate-100 flex flex-col justify-between font-sans selection:bg-[#00FF87]/30 selection:text-[#00FF87] overflow-x-hidden">
      {/* Dynamic Header Navbar Bar - Only show when selecting teams */}
      {gameState === 'TEAM_SELECT' && (
        <header className="border-b border-white/5 bg-transparent sticky top-0 z-30 px-6 py-4 flex justify-between items-center shrink-0">
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
              opponentScore={opponentScore}
              isOpponentTurn={isOpponentTurn}
              shotHistory={shotHistory}
              opponentHistory={opponentHistory}
              onResetMatch={handleNextTurn}
              onRestartMatch={handleRestartMatch}
              onExitSelection={handleExitSelection}
              stageIndex={stageIndex}
              totalStages={totalStages}
              stageName={TOURNAMENT_STAGES[stageIndex]}
              nextOpponent={nextOpponent}
              onAdvance={handleAdvance}
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
