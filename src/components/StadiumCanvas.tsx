import React, { useRef, useEffect, useState } from 'react';
import { Team, GameState, ShotDirection, ShotHeight, ShotResult, GOALKEEPER_REGISTRY, isSweetSpot, TOURNAMENT_STAGES } from '../types';
import { audioEngine } from './AudioEngine';
import { Volume2, VolumeX, ArrowLeft, Trophy, RotateCcw, Gamepad2, Info, XCircle } from 'lucide-react';
import { FlagBadge } from './FlagBadge';

interface StadiumCanvasProps {
  playerTeam: Team;
  opponentTeam: Team;
  gameState: GameState;
  onShotComplete: (result: ShotResult) => void;
  direction: ShotDirection;
  setDirection?: React.Dispatch<React.SetStateAction<ShotDirection>>;
  height: ShotHeight;
  setHeight?: React.Dispatch<React.SetStateAction<ShotHeight>>;
  power: number;
  setPower?: React.Dispatch<React.SetStateAction<number>>;
  curve: number; // -10 to +10
  setCurve?: React.Dispatch<React.SetStateAction<number>>;
  shotCount: number;
  onAnimationTriggered: () => void;
  onShoot?: (dir: ShotDirection, h: ShotHeight, power: number, curve: number) => void;
  
  // Immersive properties
  score: number;
  opponentScore?: number;
  isOpponentTurn?: boolean;
  shotHistory: ShotResult[];
  opponentHistory?: ShotResult[];
  onExitSelection: () => void;
  onResetMatch: () => void;
  onRestartMatch: () => void;

  // Knockout tournament context
  stageIndex?: number;
  totalStages?: number;
  stageName?: string;
  nextOpponent?: Team | null;
  onAdvance?: () => void;
}

// --- Ball flight tuning (single source of truth, used by init + per-tick update) ---
// Gravity per tick. Used identically when computing the launch velocity AND when
// integrating the flight, so the ball always lands exactly on its target while
// tracing a real parabola (high shots rise and dip in).
const BALL_GRAVITY = -0.0045;
// Lateral curve acceleration per tick per unit of curve (-10..10). Compensated at
// launch so the ball still lands on target but banana-bends visibly on the way.
const CURVE_DRIFT = 0.00025;

/**
 * Converts a keeper's GUESS (a sector + a height) into the physical hand-reach
 * position it dives to. Crucially this is independent of where the ball actually
 * goes: the keeper commits to a spot limited by its `reach` stat, and whether it
 * saves is then decided by the real ball-vs-glove distance at the goal line.
 * That makes precise placement (near the post / top corner) beat even a correct
 * guess, instead of "guess right = automatic save".
 */
const computeKeeperDiveTarget = (
  dir: ShotDirection,
  height: ShotHeight,
  reach: number
): { x: number; y: number } => {
  // Horizontal stretch. Posts sit at ±4.5; the keeper's hand only reaches ~2.25..3.2
  // so the very corner stays open — that gap is the striker's reward for accuracy.
  const sideReach = 2.25 + ((reach - 85) / 14) * 1.08; // slightly more dramatic dives on strong keepers
  let x = 0;
  if (dir === 'left') x = -sideReach;
  else if (dir === 'right') x = sideReach;

  let y: number;
  if (dir === 'center') {
    y = height === 'high' ? 1.55 : 0.25; // springs up to tip vs stays grounded
  } else {
    const highReach = 1.35 + ((reach - 85) / 14) * 0.40; // ~1.35 .. ~1.75
    y = height === 'high' ? highReach : 0.38; // lower low dive target to feel more dynamic, not stiff
  }
  return { x, y };
};


export default function StadiumCanvas({
  playerTeam,
  opponentTeam,
  gameState,
  onShotComplete,
  direction,
  setDirection,
  height,
  setHeight,
  power,
  setPower,
  curve,
  setCurve,
  shotCount,
  onAnimationTriggered,
  onShoot,
  score,
  opponentScore = 0,
  isOpponentTurn = false,
  shotHistory,
  opponentHistory = [],
  onExitSelection,
  onResetMatch,
  onRestartMatch,
  stageIndex = 0,
  totalStages = 4,
  stageName = '',
  nextOpponent = null,
  onAdvance
}: StadiumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 3-Click penalty shoot state controls
  const [aimingStep, setAimingStep] = useState<0 | 1 | 2>(0); // 0 = Direction (X), 1 = Height (Y), 2 = Power
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  const [eliminatedStage, setEliminatedStage] = useState<string>(() => {
    try { return localStorage.getItem('eliminatedStage') || TOURNAMENT_STAGES[0]; } catch (e) { return TOURNAMENT_STAGES[0]; }
  });
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const [bgPlaying, setBgPlaying] = useState(false);

  // Keep a ref of aimingStep to be fully immune to stale closure bugs in fast ticks
  const aimingStepRef = useRef<0 | 1 | 2>(0);
  useEffect(() => {
    aimingStepRef.current = aimingStep;
  }, [aimingStep]);

  // Synchronize audio mute state
  useEffect(() => {
    setIsAudioMuted(audioEngine.getMuteStatus());
  }, []);

  const handleMuteToggle = () => {
    const nextMute = audioEngine.toggleMute();
    setIsAudioMuted(nextMute);
  };

  // Persist eliminatedStage selection
  useEffect(() => {
    try { localStorage.setItem('eliminatedStage', eliminatedStage); } catch (e) {}
  }, [eliminatedStage]);

  // Attempt to autoplay background music on defeat when possible
  useEffect(() => {
    const el = bgAudioRef.current;
    const isDefeat = gameState === 'MATCH_OVER' && score <= (opponentScore || 0);
    if (!isDefeat || !el) return;
    // only try when not muted
    if (audioEngine.getMuteStatus()) return;
    el.play().then(() => setBgPlaying(true)).catch(() => setBgPlaying(false));
  }, [gameState, score, opponentScore]);

  
  
  // Interactive pointer dragging states (Deactivated now in favor of click-lock, but keeping state signatures for background safety)
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const [interactiveTarget, setInteractiveTarget] = useState({ x: 0, y: 1.4 });
  
  // Direct charging action states
  const [canvasIsCharging, setCanvasIsCharging] = useState(false);
  const canvasPowerDirectionRef = useRef(1);
  const canvasPowerAnimRef = useRef<number | null>(null);

  // Animation state refs to prevent re-triggering and maintain stable React loops
  const stateRef = useRef({
    gameState,
    playerTeam,
    opponentTeam,
    direction,
    height,
    power,
    curve,
    shotCount,
    onShotComplete,
    
    // Opponent shootout parameters
    opponentScore,
    isOpponentTurn,
    opponentHistory,
    aiShotDir: 'center' as ShotDirection,
    aiShotHeight: 'low' as ShotHeight,
    aiPower: 80,
    aiCurve: 0,
    opponentShotSaved: false,

    // Sweep states
    sweepX: 0,
    sweepY: 1.4,
    sweepPower: 50,
    // Locked states
    lockedX: 0,
    lockedY: 1.4,
    
    // Final destination for the target cursor
    finalDestX: 0,
    finalDestY: 0,
    hasFinalDest: false,
    
    // Exact analog trajectory target
    aimTarget: { x: 0, y: 1.4 },
    
    // Ball physical state (nearer distance: z = -5.5 instead of -11)
    ball: { x: 0, y: 0.11, z: -5.5, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, scale: 1 },
    // Ball spin rotation speeds
    ballSpin: { x: 0, y: 0 },
    
    // Player physical state (nearer distance: z = -6.7 instead of -12.5)
    kicker: { x: -0.9, y: 0, z: -6.7, rightLegAngle: 0, leftLegAngle: 0, frame: 0 },
    
    // Goalkeeper physical state
    keeper: {
      x: 0,
      y: 0,
      z: 0,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0,
      angle: 0,
      scaleY: 1,
      diveProgress: 0,
      diveDelay: 0,
      startDiveZ: -5.5,
      hairColor: '#331a00',
      tookOff: false,
      landed: false
    },

    // Motion-blur trail of the diving keeper (projected screen positions)
    keeperTrail: [] as { x: number; y: number; scale: number; angle: number; dp: number }[],

    // Net physical simulation (grid of points at z=0 to z=0.8)
    netPoints: [] as { x: number; y: number; z: number; ox: number; oy: number; oz: number; vx: number; vy: number; vz: number }[],
    
    // Game variables
    frameIndex: 0,
    crowdTimer: 0,
    screenShake: 0,
    shotLogged: false,
    particles: [] as { x: number; y: number; z: number; vx: number; vy: number; vz: number; color: string; size: number; alpha: number; life: number }[],
    flashMessage: '',
    
    // Keeper patterns tracking
    shotHistory: [] as ShotDirection[],
  });

  // Track resizing to make it fully responsive
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

  useEffect(() => {
    // Synchronize props to ref so animation ticks always use latest user settings
    stateRef.current.gameState = gameState;
    stateRef.current.playerTeam = playerTeam;
    stateRef.current.opponentTeam = opponentTeam;
    stateRef.current.direction = direction;
    stateRef.current.height = height;
    stateRef.current.power = power;
    stateRef.current.curve = curve;
    stateRef.current.shotCount = shotCount;
    stateRef.current.isOpponentTurn = isOpponentTurn;
    stateRef.current.opponentScore = opponentScore;
    stateRef.current.opponentHistory = opponentHistory;
    stateRef.current.onShotComplete = onShotComplete;
  }, [gameState, playerTeam, opponentTeam, direction, height, power, curve, shotCount, isOpponentTurn, opponentScore, opponentHistory, onShotComplete]);

  // Synchronize interactiveTarget coordinates back to stateRef
  useEffect(() => {
    stateRef.current.aimTarget = interactiveTarget;
  }, [interactiveTarget]);

  // Map sectors back to default coordinate systems
  const getDefaultAimForSector = (dir: ShotDirection, h: ShotHeight) => {
    let tx = 0;
    if (dir === 'left') tx = -2.6;
    if (dir === 'right') tx = 2.6;
    
    let ty = 0.5;
    if (h === 'high') ty = 2.0;
    return { x: tx, y: ty };
  };

  // Sync props aim sector to interactive target if they aren't scratching/dragging
  useEffect(() => {
    if (!isDraggingTarget) {
      setInteractiveTarget(getDefaultAimForSector(direction, height));
    }
  }, [direction, height, isDraggingTarget]);

  // Dynamic canvas speed regulator for power bar charging
  const getCanvasPowerSpeed = () => {
    return 2.4 + (shotCount - 1) * 0.7;
  };

  // Charging animation timer
  useEffect(() => {
    if (!canvasIsCharging) {
      if (canvasPowerAnimRef.current) {
        cancelAnimationFrame(canvasPowerAnimRef.current);
        canvasPowerAnimRef.current = null;
      }
      return;
    }

    const updatePower = () => {
      if (setPower) {
        setPower((prev) => {
          let nextPower = prev + canvasPowerDirectionRef.current * getCanvasPowerSpeed();
          if (nextPower >= 100) {
            nextPower = 100;
            canvasPowerDirectionRef.current = -1;
          } else if (nextPower <= 0) {
            nextPower = 0;
            canvasPowerDirectionRef.current = 1;
          }
          return Math.round(nextPower);
        });
      }
      canvasPowerAnimRef.current = requestAnimationFrame(updatePower);
    };

    canvasPowerAnimRef.current = requestAnimationFrame(updatePower);
    return () => {
      if (canvasPowerAnimRef.current) {
        cancelAnimationFrame(canvasPowerAnimRef.current);
      }
    };
  }, [canvasIsCharging, shotCount, setPower]);

  // Automated 3-Click locking action
  const handleImmersiveAction = () => {
    if (gameState !== 'PRE_SHOT') return;
    if (isOpponentTurn) return; // Prevent user shooting/target-locking when playing as goalie defending opponent hits!

    audioEngine.playKick(0.25); // pleasant sound effect feedback on lock clicks!

    if (aimingStepRef.current === 0) {
      // Lock X Direction
      stateRef.current.lockedX = stateRef.current.sweepX;
      setAimingStep(1);
    } else if (aimingStepRef.current === 1) {
      // Lock Y Height
      stateRef.current.lockedY = stateRef.current.sweepY;
      setAimingStep(2);
    } else if (aimingStepRef.current === 2) {
      // Lock Power and Fire!
      const finalPower = stateRef.current.sweepPower;
      
      // Map exact analog target X and Y to direction/height sectors for visual/score consistency 
      let dir: ShotDirection = 'center';
      if (stateRef.current.lockedX < -1.5) dir = 'left';
      else if (stateRef.current.lockedX > 1.5) dir = 'right';

      let h: ShotHeight = 'low';
      if (stateRef.current.lockedY > 1.4) h = 'high';

      if (setDirection) setDirection(dir);
      if (setHeight) setHeight(h);

      stateRef.current.aimTarget = { x: stateRef.current.lockedX, y: stateRef.current.lockedY };
      
      setAimingStep(0);
      if (setPower) setPower(finalPower);

      if (onShoot) {
        onShoot(dir, h, finalPower, curve);
      }
    }
  };

  // Keybind Space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PRE_SHOT') return;
      if (isOpponentTurn) return; // Prevent target lock keystrokes when playing as Goalkeeper
      if (e.code === 'Space') {
        e.preventDefault();
        handleImmersiveAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, curve, onShoot, isOpponentTurn]);

  const handleKeeperDiveChoice = (dir: ShotDirection) => {
    if (gameState !== 'PRE_SHOT') return;

    audioEngine.playKick(0.3); // select sound SFX feedback

    // Generate opponent's AI shot direction and height
    const directions: ShotDirection[] = ['left', 'center', 'right'];
    const heights: ShotHeight[] = ['low', 'high'];

    const aiSelectedDir = directions[Math.floor(Math.random() * 3)];
    const aiSelectedHeight = heights[Math.random() < 0.65 ? 0 : 1];
    
    // Opponent player stats-based power & curve
    const oppPowerStat = opponentTeam.power;
    const aiSelectedPower = Math.round(oppPowerStat - 8 + Math.random() * 16); // centered around team stat
    const oppCurveStat = opponentTeam.curve;
    const aiSelectedCurve = Math.round((Math.random() - 0.5) * (oppCurveStat / 9));

    // Save AI variables inside stateRef
    stateRef.current.aiShotDir = aiSelectedDir;
    stateRef.current.aiShotHeight = aiSelectedHeight;
    stateRef.current.aiPower = aiSelectedPower;
    stateRef.current.aiCurve = aiSelectedCurve;

    // Trigger onShoot so App.tsx transitions to RUN_UP state
    if (onShoot) {
      onShoot(dir, aiSelectedHeight, aiSelectedPower, aiSelectedCurve);
    }
  };

  // Adjust responsive viewport size on layout change
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({ width, height });
    };

    window.addEventListener('resize', handleResize);
    // Trigger initial calculation
    handleResize();
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Net Grid
  useEffect(() => {
    const net: typeof stateRef.current.netPoints = [];
    // Standard goal is widened and heightened: 9.0m wide, 2.8m high, net depth is 0.8m
    const rows = 8;
    const cols = 15;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        // Map rows to 0..2.8 and cols to -4.5..4.5
        const x = -4.5 + (9.0 * c) / cols;
        const y = (2.8 * r) / rows;
        // Top and outer edges are tethered to solid posts; we simulate floating mesh behind it at z = 0.8
        const z = (r === rows || c === 0 || c === cols) ? 0 : 0.8;
        
        net.push({
          x,
          y,
          z,
          ox: x,
          oy: y,
          oz: z,
          vx: 0,
          vy: 0,
          vz: 0
        });
      }
    }
    stateRef.current.netPoints = net;
  }, []);

  // Set up animation loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let camera = { x: 0, y: 1.4, z: -8.1, tx: 0, ty: 1.2, tz: -5.5 }; // follow camera state target closer to penalty spot z = -5.5

    // Generate simulated stars / stadium lighting overhead
    const stadiumLights = [
      { x: -15, y: 12, z: -2 },
      { x: -5, y: 12, z: -4 },
      { x: 5, y: 12, z: -4 },
      { x: 15, y: 12, z: -2 },
    ];

    // Real-time coherent frame-wide camera shake offsets!
    let frameShakeX = 0;
    let frameShakeY = 0;

    // Helper: Projected 3D point to 2D flat coordinates
    const project = (x: number, y: number, z: number, screenShake = 0) => {
      // Perspective formula with focal distance
      const focalLength = 320;
      // Relative offset to camera
      const dx = x - camera.x;
      const dy = y - camera.y;
      const dz = z - camera.z;

      if (dz <= 1.0) {
        // Behind or close to camera clipping plane
        return { x: -999, y: -999, scale: 0, ok: false };
      }

      const scale = focalLength / dz;
      // Dynamic center offset
      const cx = dimensions.width / 2;
      const cy = dimensions.height * 0.58;

      // Add camera shake effect to projection if active (coherent frame-wide displacement)
      const shakeX = screenShake ? frameShakeX : 0;
      const shakeY = screenShake ? frameShakeY : 0;

      return {
        x: cx + dx * scale + shakeX,
        y: cy - dy * scale + shakeY,
        scale,
        ok: true
      };
    };

    // Main physical tick & render loop
    const render = () => {
      const state = stateRef.current;
      state.frameIndex++;
      state.crowdTimer += 0.04;

      // Calculate a single random displacement for the entire frame so all elements shake as a cohesive unit
      if (state.screenShake > 0) {
        frameShakeX = (Math.random() - 0.5) * state.screenShake;
        frameShakeY = (Math.random() - 0.5) * state.screenShake;
      } else {
        frameShakeX = 0;
        frameShakeY = 0;
      }

      // Clear Canvas
      ctx.fillStyle = '#0a0f1d'; // Deep night slate/stadium fallback to prevent bright green voids outside projection
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Handle Camera movement logic smoothly
      if (state.gameState === 'PRE_SHOT') {
        // Static camera behind kicker closer to penalty spot z = -5.5
        camera.x = camera.x * 0.95 + 0 * 0.05;
        camera.y = camera.y * 0.95 + 1.2 * 0.05;
        camera.z = camera.z * 0.95 + -8.1 * 0.05;

        // Pressure-based difficulty multiplier (as the shootout extends, pressure scales up speed!)
        const pressureMultiplier = Math.min(2.5, 1.0 + (state.shotCount - 1) * 0.25);

        // Sweep variables update
        if (aimingStepRef.current === 0) {
          // Phase 0: Sweep X direction (-4.4 to +4.4)
          const sweepSpeed = 0.038 * pressureMultiplier;
          state.sweepX = Math.sin(state.frameIndex * sweepSpeed) * 4.4;
          state.aimTarget = { x: state.sweepX, y: 1.4 };
        } else if (aimingStepRef.current === 1) {
          // Phase 1: Sweep Y height (0.15 to 2.7)
          const sweepSpeed = 0.048 * pressureMultiplier;
          state.sweepY = 1.4 + Math.sin(state.frameIndex * sweepSpeed) * 1.35;
          state.aimTarget = { x: state.lockedX, y: state.sweepY };
        } else if (aimingStepRef.current === 2) {
          // Phase 2: Sweep Power (10 to 100)
          const sweepSpeed = 0.16 * pressureMultiplier;
          state.sweepPower = Math.round(50 + Math.sin(state.frameIndex * sweepSpeed) * 48);

          // Highly performant direct DOM manipulation to bypass React virtual DOM lag
          const fillEl = document.getElementById('power-bar-fill');
          if (fillEl) {
            fillEl.style.width = `${state.sweepPower}%`;
            // Dynamic color updates matching sweet spot thresholds
            if (state.sweepPower >= 70 && state.sweepPower <= 86) {
              fillEl.style.backgroundColor = '#00FF87';
              fillEl.style.boxShadow = '0 0 12px #00FF87';
            } else if (state.sweepPower > 86) {
              fillEl.style.backgroundColor = '#f43f5e';
              fillEl.style.boxShadow = '0 0 12px #f43f5e';
            } else {
              fillEl.style.backgroundColor = '#fbbf24';
              fillEl.style.boxShadow = 'none';
            }
          }
          const textEl = document.getElementById('power-bar-text');
          if (textEl) {
            textEl.textContent = `SWEET SPOT: 70% - 86% (${state.sweepPower}%)`;
          }
        }
      } else if (state.gameState === 'RUN_UP' || state.gameState === 'KICK') {
        // Pull back a touch (and rise) into a classic penalty camera so the kicker
        // never fills the screen — you can see the taker, the goal AND the keeper.
        camera.x = camera.x * 0.92 + 0 * 0.08;
        camera.y = camera.y * 0.94 + 1.35 * 0.06;
        camera.z = camera.z * 0.94 + -9.1 * 0.06;
      } else if (state.gameState === 'BALL_FLIGHT' || state.gameState === 'CELEBRATION' || state.gameState === 'SAVED' || state.gameState === 'OUT_OF_BOUNDS') {
        // Broadcast tracking panning of the shot
        const targetCamX = state.ball.x * 0.45;
        const targetCamY = Math.max(1.3, state.ball.y * 0.5 + 1.0);
        const targetCamZ = -11.4 + state.ball.z * 0.25;

        camera.x = camera.x * 0.88 + targetCamX * 0.12;
        camera.y = camera.y * 0.88 + targetCamY * 0.12;
        camera.z = camera.z * 0.88 + targetCamZ * 0.12;
      }

      // 1. RENDER BACKGROUND STADIUM STANDS & CROWD
      // Draw background sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, dimensions.height * 0.4);
      skyGrad.addColorStop(0, '#0f172a'); // night sky
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height * 0.42);

      // Define standard 2.4m tall concrete barrier wall in 3D to align crowd stands seamlessly
      const wallZ = 1.8;
      const wallHeight = 2.4; 
      const wallTL = project(-100, wallHeight, wallZ, state.screenShake);
      const wallTR = project(100, wallHeight, wallZ, state.screenShake);
      const wallL = project(-100, 0, wallZ, state.screenShake);
      const wallR = project(100, 0, wallZ, state.screenShake);

      // Render seating rows and dots representing crowd
      const bannerY = (wallTL.ok ? wallTL.y : dimensions.height * 0.41 + frameShakeY);
      
      // Draw crowd stands
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0 + frameShakeX, dimensions.height * 0.22 + frameShakeY);
      ctx.lineTo(dimensions.width + frameShakeX, dimensions.height * 0.22 + frameShakeY);
      ctx.lineTo(dimensions.width + frameShakeX, bannerY);
      ctx.lineTo(0 + frameShakeX, bannerY);
      ctx.closePath();
      ctx.fill();

      // Stadium tiers highlights - softened to blend elegantly into the stands background
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.0;
      for (let j = 0; j < 4; j++) {
        const ty = dimensions.height * 0.22 + (j * (bannerY - (dimensions.height * 0.22))) / 4 + frameShakeY;
        ctx.beginPath();
        ctx.moveTo(0 + frameShakeX, ty);
        ctx.lineTo(dimensions.width + frameShakeX, ty);
        ctx.stroke();
      }

      // Draw active crowd pixels inside stands
      const crowdScale = state.gameState === 'CELEBRATION' ? 2.5 : 0.8;
      ctx.fillStyle = '#f87171'; // crowd colors
      for (let i = 0; i < dimensions.width; i += 18) {
        for (let j = dimensions.height * 0.23 + frameShakeY; j < bannerY - 6; j += 12) {
          // Micro jumping vibration
          const jump = (state.gameState === 'CELEBRATION') ? Math.sin(state.crowdTimer * 6.5 + i * 0.12) * 5.0 : Math.sin(state.crowdTimer * 1.5 + i * 0.05) * 1.2;
          const rSeed = Math.sin(i * 100 + j * 50);
          
          // Varied crowd shirts
          if (rSeed > 0.45) ctx.fillStyle = '#ef4444'; // Red
          else if (rSeed > 0.1) ctx.fillStyle = '#3b82f6'; // Blue
          else if (rSeed > -0.2) ctx.fillStyle = '#fbbf24'; // Yellow
          else if (rSeed > -0.6) ctx.fillStyle = '#10b981'; // Green
          else ctx.fillStyle = '#ffffff';

          ctx.fillRect(i + (rSeed * 6) + frameShakeX, j + jump - 2 + frameShakeY, 4, 4);
          
          // Small skin tone dots for heads
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(i + (rSeed * 6) + 1 + frameShakeX, j + jump - 5 + frameShakeY, 2, 2);
        }
      }

      // Dynamic LED boards with scroll banner text
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, bannerY - 14, dimensions.width, 14);
      
      const scrollSpeed = (state.frameIndex * 1.5) % (dimensions.width + 300);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px monospace';
      
      let bannerText = '★ FIFA WORLD CUP 2026 PENALTY SHOOTOUT ★';
      if (state.gameState === 'CELEBRATION') {
        bannerText = '★ GOOOOAAALLL!!! GOOOOALLL!!! ★ SCORING RECORD SPOTLIGHT ON ' + state.playerTeam.player.toUpperCase() + '! ★';
        ctx.fillStyle = '#facc15';
      } else if (state.gameState === 'SAVED') {
        bannerText = '★ WHIP SAVED BY THE GOALKEEPER! AMAZING REACTION! ★';
        ctx.fillStyle = '#60a5fa';
      } else if (state.gameState === 'OUT_OF_BOUNDS') {
        bannerText = '★ OVER THE BAR! OFF TARGET! ★';
        ctx.fillStyle = '#f87171';
      }
      
      ctx.fillText(bannerText, dimensions.width - scrollSpeed, bannerY - 4);

      // Spotlight beams
      ctx.save();
      for (let sl of stadiumLights) {
        const projL = project(sl.x, sl.y, sl.z, state.screenShake);
        if (projL.ok) {
          ctx.beginPath();
          ctx.arc(projL.x, projL.y, projL.scale * 0.04, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fill();

          // draw cone light beams
          const beamGrad = ctx.createLinearGradient(projL.x, projL.y, projL.x, dimensions.height);
          beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
          beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(projL.x - projL.scale * 0.04, projL.y);
          ctx.lineTo(projL.x + projL.scale * 0.04, projL.y);
          ctx.lineTo(projL.x + projL.scale * 1.5, dimensions.height);
          ctx.lineTo(projL.x - projL.scale * 1.5, dimensions.height);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();

      // 2. RENDER GRASS TEXTURED FIELD WITH PERSPECTIVE STRIPES (Seamless coverage behind camera)
      ctx.save();
      const numStripes = 20;
      for (let s = 0; s < numStripes; s++) {
        // alternating green shades
        const stripeColor = s % 2 === 0 ? '#14532d' : '#15803d'; // alternating dark and light grass
        ctx.fillStyle = stripeColor;

        const zNear = -26 + s * 1.6; // Starts deep behind the camera at -26 to avoid any bottom dark space
        const zFar = zNear + 1.6;

        // Skip drawing if the stripe is completely behind the camera clipping plane
        if (zFar <= camera.z + 1.0) {
          continue;
        }

        // Clamp the near coordinate to be safely in front of the camera, preventing projection failure
        const safeNearZ = Math.max(zNear, camera.z + 1.05);

        // Strip vertices
        const pL1 = project(-30, 0, safeNearZ, state.screenShake);
        const pR1 = project(30, 0, safeNearZ, state.screenShake);
        const pL2 = project(-30, 0, zFar, state.screenShake);
        const pR2 = project(30, 0, zFar, state.screenShake);

        if (pL1.ok && pR1.ok && pL2.ok && pR2.ok) {
          ctx.beginPath();
          ctx.moveTo(pL1.x, pL1.y);
          ctx.lineTo(pR1.x, pR1.y);
          ctx.lineTo(pR2.x, pR2.y);
          ctx.lineTo(pL2.x, pL2.y);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();

      // Render a solid modern charcoal stadium barrier wall behind the goal and under the crowd
      // to cover the green space and provide a premium textured look.
      // Top points wallTL and wallTR already defined at top of render with standard 2.4m height
      if (wallL.ok && wallR.ok && wallTL.ok && wallTR.ok) {
        ctx.fillStyle = '#111827'; // solid dark concrete grey/blue matching standard modern stadium structures
        ctx.beginPath();
        ctx.moveTo(wallL.x, wallL.y);
        ctx.lineTo(wallTL.x, wallTL.y);
        ctx.lineTo(wallTR.x, wallTR.y);
        ctx.lineTo(wallR.x, wallR.y);
        ctx.closePath();
        ctx.fill();
      }

      // Render realistic sponsor hoardings / fence boards in 3D behind the goal at Z=1.6
      // Expanded to go from X=-90m to X=90m dynamically to ensure they never cut off on camera zoom-out
      const brandTemplates = [
        { brand: 'adidas', bgColor: '#0f172a', textColor: '#ffffff' },
        { brand: 'Coca-Cola', bgColor: '#991b1b', textColor: '#ffffff' },
        { brand: 'VISA', bgColor: '#111827', textColor: '#fbbf24' },
        { brand: 'QATAR AIRWAYS', bgColor: '#4c0519', textColor: '#ffffff' },
        { brand: 'UNITED 2026', bgColor: '#022c22', textColor: '#38bdf8' },
        { brand: 'HYUNDAI', bgColor: '#1e293b', textColor: '#cbd5e1' },
        { brand: 'McDonald’s', bgColor: '#991b1b', textColor: '#fbbf24' },
        { brand: 'FIFA WORLD CUP', bgColor: '#0f172a', textColor: '#10b981' },
      ];

      const sponsorBoards: { xStart: number; xEnd: number; bgColor: string; textColor: string; brand: string }[] = [];
      const boardWidth = 6.0;
      let templateIndex = 0;
      
      for (let x = -90; x < 90; x += boardWidth) {
        const t = brandTemplates[templateIndex % brandTemplates.length];
        sponsorBoards.push({
          xStart: x,
          xEnd: x + boardWidth - 0.05,
          brand: t.brand,
          bgColor: t.bgColor,
          textColor: t.textColor
        });
        templateIndex++;
      }

      sponsorBoards.forEach(sb => {
        const pBL = project(sb.xStart, 0, 1.6, state.screenShake);
        const pTL = project(sb.xStart, 1.45, 1.6, state.screenShake); // Height increased to 1.45m for realistic tall hoarding boards
        const pTR = project(sb.xEnd, 1.45, 1.6, state.screenShake);   // Height increased to 1.45m
        const pBR = project(sb.xEnd, 0, 1.6, state.screenShake);

        if (pBL.ok && pTL.ok && pTR.ok && pBR.ok) {
          // Board Panel Base Face
          ctx.fillStyle = sb.bgColor;
          ctx.beginPath();
          ctx.moveTo(pBL.x, pBL.y);
          ctx.lineTo(pTL.x, pTL.y);
          ctx.lineTo(pTR.x, pTR.y);
          ctx.lineTo(pBR.x, pBR.y);
          ctx.closePath();
          ctx.fill();

          // Outer crisp dark border frame
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2.0;
          ctx.stroke();

          // Top highlight line to simulate fluorescent tube glare
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(pTL.x, pTL.y);
          ctx.lineTo(pTR.x, pTR.y);
          ctx.stroke();

          // Text branding in perspective - significantly larger font sizes for extreme legibility
          const midX = (pTL.x + pTR.x + pBL.x + pBR.x) / 4;
          const midY = (pTL.y + pTR.y + pBL.y + pBR.y) / 4;
          const labelSize = Math.max(16, Math.round(pTL.scale * 0.45)); // Magnified font scale for high-visibility sponsor logos

          ctx.fillStyle = sb.textColor;
          ctx.font = `black italic ${labelSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sb.brand, midX, midY);

          // Render subtle ground shadow under the hoarding banner
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.beginPath();
          ctx.moveTo(pBL.x, pBL.y);
          ctx.lineTo(pBR.x, pBR.y);
          ctx.lineTo(pBR.x, pBR.y + pBL.scale * 0.05);
          ctx.lineTo(pBL.x, pBL.y + pBL.scale * 0.05);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Draw Penalty Box lines and spot in perspective
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 2.5;

      // Draw goal line
      const goalLineL = project(-18, 0, 0, state.screenShake);
      const goalLineR = project(18, 0, 0, state.screenShake);
      if (goalLineL.ok && goalLineR.ok) {
        ctx.beginPath();
        ctx.moveTo(goalLineL.x, goalLineL.y);
        ctx.lineTo(goalLineR.x, goalLineR.y);
        ctx.stroke();
      }

      // Goal box: width = 11m (from -5.5 to 5.5), depth = 5.5m (z=-5.5)
      const gb1 = project(-5.5, 0, 0, state.screenShake);
      const gb2 = project(-5.5, 0, -5.5, state.screenShake);
      const gb3 = project(5.5, 0, -5.5, state.screenShake);
      const gb4 = project(5.5, 0, 0, state.screenShake);
      if (gb1.ok && gb2.ok && gb3.ok && gb4.ok) {
        ctx.beginPath();
        ctx.moveTo(gb1.x, gb1.y);
        ctx.lineTo(gb2.x, gb2.y);
        ctx.lineTo(gb3.x, gb3.y);
        ctx.lineTo(gb4.x, gb4.y);
        ctx.stroke();
      }

      // Penalty area box: width = 33m (from -16.5 to 16.5), depth = 16.5m (z=-16.5)
      const pa1 = project(-16.5, 0, 0, state.screenShake);
      const pa2 = project(-16.5, 0, -16.5, state.screenShake);
      const pa3 = project(16.5, 0, -16.5, state.screenShake);
      const pa4 = project(16.5, 0, 0, state.screenShake);
      if (pa1.ok && pa2.ok && pa3.ok && pa4.ok) {
        ctx.beginPath();
        ctx.moveTo(pa1.x, pa1.y);
        ctx.lineTo(pa2.x, pa2.y);
        ctx.lineTo(pa3.x, pa3.y);
        ctx.lineTo(pa4.x, pa4.y);
        ctx.stroke();
      }

      // Penalty Spot circle
      const spotProj = project(0, 0, -11, state.screenShake);
      if (spotProj.ok) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(spotProj.x, spotProj.y, spotProj.scale * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // draw arc around penalty area
        ctx.beginPath();
        // Drawing penalty arc arc at z=-16.5 centered at spot
        // We'll approximate using points in 3D
        for (let angle = -32; angle <= 32; angle += 4) {
          const rad = (angle * Math.PI) / 180;
          const arc3DX = Math.sin(rad) * 9.15; // 9.15m radius
          const arc3DZ = -11 - Math.cos(rad) * 9.15;
          if (arc3DZ < -16.5) { // draw only outside box
            const pt = project(arc3DX, 0, arc3DZ, state.screenShake);
            if (pt.ok) {
              if (angle === -32) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // 3. PHYSICAL NET UPDATE & RENDERING
      // Verlet-like integration for goal net to make it ripple elastic
      const rows = 8;
      const cols = 15;
      
      state.netPoints.forEach(p => {
        if (p.z > 0 && p.y > 0) { // floating nodes inside depth
          // Gravity pull slightly
          p.vy -= 0.0005;
          // Return force to original origin anchorage
          p.vx += (p.ox - p.x) * 0.08;
          p.vy += (p.oy - p.y) * 0.08;
          p.vz += (p.oz - p.z) * 0.08;

          // Drag
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.vz *= 0.88;

          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
        }
      });

      // Goal Frame Rendering (Z=0, posts at X=-4.5 and X=+4.5, height=2.8) - "el arco mas grande"
      const postL1 = project(-4.5, 0, 0, state.screenShake);
      const postL2 = project(-4.5, 2.8, 0, state.screenShake);
      const postR1 = project(4.5, 0, 0, state.screenShake);
      const postR2 = project(4.5, 2.8, 0, state.screenShake);

      // Back of goal frame supporters (Z=0.8, Y=0 to 2.8)
      const backL1 = project(-4.5, 0, 0.8, state.screenShake);
      const backL2 = project(-4.5, 2.8, 0.8, state.screenShake);
      const backR1 = project(4.5, 0, 0.8, state.screenShake);
      const backR2 = project(4.5, 2.8, 0.8, state.screenShake);

      // DRAW THE BACK METALLIC SUPPORT TUBES (Right before net is rendered so they lay underneath)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      if (postL1.ok && backL1.ok) { ctx.beginPath(); ctx.moveTo(postL1.x, postL1.y); ctx.lineTo(backL1.x, backL1.y); ctx.stroke(); }
      if (postL2.ok && backL2.ok) { ctx.beginPath(); ctx.moveTo(postL2.x, postL2.y); ctx.lineTo(backL2.x, backL2.y); ctx.stroke(); }
      if (postR1.ok && backR1.ok) { ctx.beginPath(); ctx.moveTo(postR1.x, postR1.y); ctx.lineTo(backR1.x, backR1.y); ctx.stroke(); }
      if (postR2.ok && backR2.ok) { ctx.beginPath(); ctx.moveTo(postR2.x, postR2.y); ctx.lineTo(backR2.x, backR2.y); ctx.stroke(); }
      if (backL2.ok && backR2.ok) { ctx.beginPath(); ctx.moveTo(backL2.x, backL2.y); ctx.lineTo(backR2.x, backR2.y); ctx.stroke(); }
      if (backL1.ok && backR1.ok) { ctx.beginPath(); ctx.moveTo(backL1.x, backL1.y); ctx.lineTo(backR1.x, backR1.y); ctx.stroke(); }

      // DRAW THE NET MESH IN PERSPECTIVE
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 0.85;

      // Draw columns of the net mesh
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          const pt = state.netPoints[r * (cols + 1) + c];
          const proj = project(pt.x, pt.y, pt.z, state.screenShake);
          if (proj.ok) {
            if (r === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.stroke();
      }

      // Draw rows of the net mesh
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const pt = state.netPoints[r * (cols + 1) + c];
          const proj = project(pt.x, pt.y, pt.z, state.screenShake);
          if (proj.ok) {
            if (c === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.stroke();
      }

      // DRAW FRONT THICK ROUND WHITE GOALPOSTS AND CROSSBAR WITH 3D CYLINDRICAL REFLECTION
      // Drawing Left Post in absolute depth
      if (postL1.ok && postL2.ok) {
        ctx.save();
        const postThickness = Math.max(5, postL1.scale * 0.07);
        
        // Draw real 3D shadow on grass under post
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(postL1.x, postL1.y, postThickness * 0.8, postThickness * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // White post base
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = postThickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(postL1.x, postL1.y);
        ctx.lineTo(postL2.x, postL2.y);
        ctx.stroke();

        // 3D cylindrical shader overlay
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = postThickness * 0.35;
        ctx.beginPath();
        ctx.moveTo(postL1.x - postThickness * 0.2, postL1.y);
        ctx.lineTo(postL2.x - postThickness * 0.2, postL2.y);
        ctx.stroke();

        ctx.restore();
      }

      // Drawing Right Post
      if (postR1.ok && postR2.ok) {
        ctx.save();
        const postThickness = Math.max(5, postR1.scale * 0.07);

        // Draw shadow under post
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(postR1.x, postR1.y, postThickness * 0.8, postThickness * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // White post base
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = postThickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(postR1.x, postR1.y);
        ctx.lineTo(postR2.x, postR2.y);
        ctx.stroke();

        // 3D cylindrical shader overlay
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = postThickness * 0.35;
        ctx.beginPath();
        ctx.moveTo(postR1.x - postThickness * 0.2, postR1.y);
        ctx.lineTo(postR2.x - postThickness * 0.2, postR2.y);
        ctx.stroke();

        ctx.restore();
      }

      // Drawing Crossbar
      if (postL2.ok && postR2.ok) {
        ctx.save();
        const postThickness = Math.max(5, postL2.scale * 0.07);

        // White crossbar base
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = postThickness;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(postL2.x - postThickness * 0.5, postL2.y);
        ctx.lineTo(postR2.x + postThickness * 0.5, postR2.y);
        ctx.stroke();

        // 3D cylindrical shader overlay
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = postThickness * 0.35;
        ctx.beginPath();
        ctx.moveTo(postL2.x, postL2.y + postThickness * 0.18);
        ctx.lineTo(postR2.x, postR2.y + postThickness * 0.18);
        ctx.stroke();

        // Draw corner brackets joining connections
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(postL2.x, postL2.y, postThickness * 0.52, 0, Math.PI * 2);
        ctx.arc(postR2.x, postR2.y, postThickness * 0.52, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. PLAYER RENDER AND KICKING ANIMATION TRIGGER
      if (state.gameState === 'RUN_UP' || state.gameState === 'PRE_SHOT' || state.gameState === 'KICK') {
        const pK = state.kicker;

        // Physical animate running
        if (state.gameState === 'RUN_UP') {
          pK.frame++;
          // run-up forward motion: ball is at z=-5.5, player runs from z=-6.7 to z=-5.95
          pK.z += 0.057; 
          
          // Smooth diagonal approach from left to clear goalkeeper line of sight
          const progress = (pK.z - (-6.7)) / (-5.95 - (-6.7));
          pK.x = -2.3 + Math.min(1.0, Math.max(0, progress)) * (2.3 - 0.15); // approaches ball diagonally from far left
          
          pK.rightLegAngle = Math.sin(pK.frame * 0.4) * 0.55;
          pK.leftLegAngle = -Math.sin(pK.frame * 0.4) * 0.55;

          // Release shot precisely on final run-up frame
          if (pK.z >= -5.95) {
            // Kick trigger! swing right leg back and execute shot calculations
            state.gameState = 'KICK';
            pK.frame = 0;
            pK.rightLegAngle = -0.8; // Cocked back kick
            pK.leftLegAngle = 0.35;
          }
        } else if (state.gameState === 'KICK') {
          pK.frame++;
          // strike phase
          pK.rightLegAngle = 0.95; // Leg swing contact
          pK.leftLegAngle = -0.2;

          if (pK.frame >= 6) {
            // Launch Ball! Play thrust kick audio SFX
             audioEngine.playKick(state.isOpponentTurn ? 0.8 : (state.power / 100));
             state.gameState = 'BALL_FLIGHT';

             let finalDestX = 0;
             let finalDestY = 0;
             let velocityZ = 0.22;

             if (!state.isOpponentTurn) {
               // USER KICKS (Normal mode - with highly-coherent shot measurements and pressure factors)
               const finalPower = state.power;
               const perfectMult = isSweetSpot(finalPower) ? 1.0 : 0.82;
               
               // Faster Z-velocity for more realistic ball flight time
               velocityZ = 0.065 + (finalPower / 100) * 0.14 * perfectMult;

               // Use exact targeted analog coordinate (the user aimed exactly here!)
               const exactX = state.aimTarget ? state.aimTarget.x : 0;
               const exactY = state.aimTarget ? state.aimTarget.y : 0.5;

               // User Accuracy Base
               const playerAccuracy = state.playerTeam.accuracy; // typically 75-95
               
               // Base error magnitude
               let errorMagnitude = 0.03; // baseline deviation
               
               if (finalPower > 86) {
                 // Excessive power -> massive ballooning upward/sideways error ("posibilidad de errar" is proportional to over-power)
                 const excess = finalPower - 86;
                 errorMagnitude = 0.08 + excess * 0.025;
               } else if (finalPower < 70) {
                 // Underpowered -> slow ball with mild drift
                 errorMagnitude = 0.045;
               } else {
                 // Sweet spot! Extremely accurate, minor physical deviation depending on team accuracy
                 errorMagnitude = (100 - playerAccuracy) * 0.001; 
               }

               // Additional pressure error from extreme corner aiming (closer to posts/top = higher risk of mistake)
               const distFromCenter = Math.sqrt(exactX * exactX + exactY * exactY);
               if (distFromCenter > 3.0) {
                 errorMagnitude += (distFromCenter - 3.0) * 0.06;
               }

               // Add psychological tension/pressure from shootout rounds ("cuanto mas lejos llegas mas dificil es")
               const roundPressureFactor = Math.min(2.5, 1.0 + (state.shotCount - 1) * 0.15);
               errorMagnitude *= roundPressureFactor;

               // Random deviation vectors
               const deviationX = (Math.random() - 0.5) * errorMagnitude * 3.5;
               const deviationY = (Math.random() - 0.5) * errorMagnitude * 2.5;

               // Overpowered shots naturally fly high
               const verticalLift = finalPower > 88 ? (finalPower - 88) * 0.09 : 0;

               // Effective swerve scales with the team's curve rating, so a side with
               // a 90 curve bends noticeably more than one with 60. Kept subtle/realistic.
               // Invert here so positive curve input bends the shot rightward on screen.
               const effCurve = -state.curve * (state.playerTeam.curve / 100);
               const curveLandingShift = effCurve * 0.045;

               finalDestX = exactX + deviationX + curveLandingShift;
               finalDestY = exactY + deviationY + verticalLift;

               // Clamp coordinates to keep it realistic but possible to miss completely
               state.finalDestX = Math.max(-6.2, Math.min(6.2, finalDestX));
               state.finalDestY = Math.max(0.1, Math.min(4.5, finalDestY));
               state.hasFinalDest = true;

               finalDestX = state.finalDestX;
               finalDestY = state.finalDestY;

               const flightTicks = Math.round(5.5 / velocityZ);
               const horizontalAirDrift = effCurve * CURVE_DRIFT;
               const totalDriftX = (horizontalAirDrift * (flightTicks + 1)) / 2;

               const totalDriftY = (BALL_GRAVITY * (flightTicks + 1)) / 2;

               state.ball.vx = (finalDestX - state.ball.x) / flightTicks - totalDriftX;
               state.ball.vy = (finalDestY - state.ball.y) / flightTicks - totalDriftY;
               state.ball.vz = velocityZ;

               // Spin velocities
               state.ballSpin.x = 0.55;
               state.ballSpin.y = effCurve * 0.086;

               // --- EXTREMELY ENHANCED COMPUTER GOALKEEPER AI DECISION ENGINE ---
               const gkStats = GOALKEEPER_REGISTRY[state.opponentTeam.id] || { name: 'Portero', reflejos: 90, alcance: 90 };
               const reflexes = gkStats.reflejos; // 85-99
               const reach = gkStats.alcance;
               
               // Strategic strategy decision: 'anticipate' (dive early) vs 'react' (wait for kick)
               let gkStrategy: 'anticipate' | 'react' | 'stay' = 'react';
               const stratRandom = Math.random() * 100;
               if (stratRandom < 22) {
                 gkStrategy = 'anticipate'; // dives before ball leaves foot
               } else if (stratRandom < 92) {
                 gkStrategy = 'react'; // waits for ball path, relies on pure reflexes
               } else {
                 gkStrategy = 'stay'; // covers central chip shots / panenkas
               }

               // The keeper guesses a SECTOR (and a height) then commits to a dive.
               // It never snaps onto the ball — the physical glove distance decides the save.
               const ballSector: ShotDirection = finalDestX < -1.2 ? 'left' : (finalDestX > 1.2 ? 'right' : 'center');
               let keeperDiveDir: ShotDirection = 'center';
               let keeperHeightLoc: ShotHeight = 'low';

               if (gkStrategy === 'anticipate') {
                 // Commits early on a blind guess: looks heroic when right, wrong-footed when wrong
                 keeperDiveDir = Math.random() < 0.5 ? 'left' : 'right';
                 keeperHeightLoc = Math.random() < 0.45 ? 'low' : 'high';
                 state.keeper.diveDelay = 0; // starts immediately
               } else if (gkStrategy === 'react') {
                 // Reads the shot; chance of picking the right side scales with reflexes
                 const diveCorrectChance = 0.4 + ((reflexes - 85) / 15) * 0.35;
                 if (Math.random() < diveCorrectChance) {
                   keeperDiveDir = ballSector;
                   keeperHeightLoc = finalDestY > 1.45 ? 'high' : 'low'; // reads height too when it reads the side
                 } else {
                   keeperDiveDir = ballSector === 'left' ? 'right' : (ballSector === 'right' ? 'left' : (Math.random() < 0.5 ? 'left' : 'right'));
                   keeperHeightLoc = Math.random() < 0.5 ? 'low' : 'high';
                 }
                 state.keeper.diveDelay = Math.max(2, Math.round(12 - (reflexes - 85) * 0.4));
               } else {
                 // Stays central to smother panenkas / low-centre shots
                 keeperDiveDir = 'center';
                 keeperHeightLoc = finalDestY > 1.6 ? 'high' : 'low';
                 state.keeper.diveDelay = 5;
               }

               // Record starting coordinates
               state.keeper.startX = state.keeper.x;
               state.keeper.startY = state.keeper.y;

               // Commit to a reach-limited hand target derived from the guess (not the ball)
               const gkDive = computeKeeperDiveTarget(keeperDiveDir, keeperHeightLoc, reach);
               state.keeper.targetX = gkDive.x;
               state.keeper.targetY = gkDive.y;

               // Dynamic trigger computation for realistic timing coherence with shot duration
               state.keeper.startDiveZ = -5.5 + state.keeper.diveDelay * velocityZ;
               state.keeper.diveProgress = 0;

             } else {
               // OPPONENT KICKS (User is goalkeeper!)
               finalDestX = state.finalDestX;
               finalDestY = state.finalDestY;
               // Wide range visual speed calculation for great tactile response and complete balance with user shots
               velocityZ = 0.065 + (state.aiPower / 100) * 0.14;

               const flightTicks = Math.round(5.5 / velocityZ);
               const horizontalAirDrift = state.aiCurve * CURVE_DRIFT;
               const totalDriftX = (horizontalAirDrift * (flightTicks + 1)) / 2;
               state.ball.vx = (finalDestX - state.ball.x) / flightTicks - totalDriftX;

               const totalDriftY = (BALL_GRAVITY * (flightTicks + 1)) / 2;
               state.ball.vy = (finalDestY - state.ball.y) / flightTicks - totalDriftY;
               state.ball.vz = velocityZ;

               state.ballSpin.x = 0.55;
               state.ballSpin.y = state.aiCurve * 0.082;

               state.keeper.startX = state.keeper.x;
               state.keeper.startY = state.keeper.y;

               // User (as keeper) only picks a SIDE. We auto-pick the height band toward
               // where the ball is heading so reading the side is rewarded, but the physical
               // glove distance still decides it — perfect corners can still beat the dive.
               const userGKStat = GOALKEEPER_REGISTRY[state.playerTeam.id] || { name: 'Portero', reflejos: 90, alcance: 90 };
               const userHeightGuess: ShotHeight = finalDestY > 1.4 ? 'high' : 'low';
               const userDive = computeKeeperDiveTarget(state.direction, userHeightGuess, userGKStat.alcance);
               state.keeper.targetX = userDive.x;
               state.keeper.targetY = userDive.y;

               state.keeper.diveDelay = Math.max(2, Math.min(6, flightTicks - 12));
               state.keeper.startDiveZ = -5.5 + state.keeper.diveDelay * velocityZ;
               state.keeper.diveProgress = 0;
             }

             // Grass kicking dust green particles
             for (let k = 0; k < 12; k++) {
               state.particles.push({
                 x: state.ball.x,
                 y: state.ball.y,
                 z: state.ball.z,
                 vx: (Math.random() - 0.5) * 1.5,
                 vy: Math.random() * 2.0,
                 vz: (Math.random() - 0.3) * 1.0,
                 color: '#86efac',
                 size: Math.random() * 3 + 2,
                 alpha: 0.9,
                 life: 1.0
               });
             }
          }
        }

        // Draw Player model in perspective
        const pKP = project(pK.x, pK.y, pK.z, state.screenShake);
        if (pKP.ok) {
          ctx.save();
          const sz = pKP.scale * 1.7; // size multiplier
          const currentKickerTeam = state.isOpponentTurn ? state.opponentTeam : state.playerTeam;

          // Player Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.beginPath();
          ctx.ellipse(pKP.x, pKP.y, pKP.scale * 0.35, pKP.scale * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();

          const colorSet = currentKickerTeam.colors;
          ctx.lineCap = 'round';

          // Body breath & tilt oscillation animation
          const bodyBreathe = Math.sin(state.frameIndex * 0.1) * sz * 0.015;
          const runTilt = state.gameState === 'RUN_UP' ? 0.08 : 0;
          ctx.translate(pKP.x, pKP.y + bodyBreathe);
          ctx.rotate(runTilt);

          // 1. Draw Leg Left (Hip to Foot)
          const leftHipX = -sz * 0.08;
          const leftHipY = -sz * 0.44;
          const leftFootX = leftHipX + Math.sin(pK.leftLegAngle) * sz * 0.22;
          const leftFootY = -sz * 0.15;

          // Shorts part of leg
          ctx.strokeStyle = colorSet.shorts;
          ctx.lineWidth = sz * 0.13;
          ctx.beginPath();
          ctx.moveTo(leftHipX, leftHipY);
          ctx.lineTo(leftHipX + (leftFootX - leftHipX) * 0.4, leftHipY + (leftFootY - leftHipY) * 0.4);
          ctx.stroke();

          // High Socks part of left leg
          ctx.strokeStyle = colorSet.socks || '#ffffff';
          ctx.lineWidth = sz * 0.095;
          ctx.beginPath();
          ctx.moveTo(leftHipX + (leftFootX - leftHipX) * 0.4, leftHipY + (leftFootY - leftHipY) * 0.4);
          ctx.lineTo(leftFootX, leftFootY);
          ctx.stroke();

          // Neon Cleats (Footwear left)
          ctx.fillStyle = '#ff007f'; // Bright neon hot rose boots!
          ctx.beginPath();
          ctx.ellipse(leftFootX, leftFootY + sz * 0.02, sz * 0.05, sz * 0.026, Math.PI / 12, 0, Math.PI * 2);
          ctx.fill();

          // 2. Draw Leg Right (Hip to Foot)
          const rightHipX = sz * 0.08;
          const rightHipY = -sz * 0.44;
          const rightFootX = rightHipX + Math.sin(pK.rightLegAngle) * sz * 0.25;
          const rightFootY = -sz * 0.15;

          // Shorts part of leg
          ctx.strokeStyle = colorSet.shorts;
          ctx.lineWidth = sz * 0.13;
          ctx.beginPath();
          ctx.moveTo(rightHipX, rightHipY);
          ctx.lineTo(rightHipX + (rightFootX - rightHipX) * 0.4, rightHipY + (rightFootY - rightHipY) * 0.4);
          ctx.stroke();

          // High Socks part of right leg
          ctx.strokeStyle = colorSet.socks || '#ffffff';
          ctx.lineWidth = sz * 0.095;
          ctx.beginPath();
          ctx.moveTo(rightHipX + (rightFootX - rightHipX) * 0.4, rightHipY + (rightFootY - rightHipY) * 0.4);
          ctx.lineTo(rightFootX, rightFootY);
          ctx.stroke();

          // Neon Cleats (Footwear right)
          ctx.fillStyle = '#ff007f';
          ctx.beginPath();
          ctx.ellipse(rightFootX, rightFootY + sz * 0.02, sz * 0.05, sz * 0.026, -Math.PI / 12, 0, Math.PI * 2);
          ctx.fill();

          // 3. Torso / Jersey (with neck trim & tiny squad number!)
          ctx.fillStyle = colorSet.shirt;
          ctx.fillRect(-sz * 0.15, -sz * 0.8, sz * 0.3, sz * 0.38);

          // Jersey patterns (stripes/checkers)
          if (colorSet.pattern === 'stripes' && colorSet.stripes) {
            ctx.fillStyle = colorSet.stripes;
            ctx.fillRect(-sz * 0.1, -sz * 0.8, sz * 0.04, sz * 0.38);
            ctx.fillRect(sz * 0.06, -sz * 0.8, sz * 0.04, sz * 0.38);
          } else if (colorSet.pattern === 'squares' && colorSet.stripes) {
            ctx.fillStyle = colorSet.stripes;
            ctx.fillRect(-sz * 0.15, -sz * 0.8, sz * 0.09, sz * 0.09);
            ctx.fillRect(sz * 0.05, -sz * 0.8, sz * 0.09, sz * 0.09);
            ctx.fillRect(-sz * 0.05, -sz * 0.71, sz * 0.09, sz * 0.09);
            ctx.fillRect(-sz * 0.15, -sz * 0.62, sz * 0.09, sz * 0.09);
            ctx.fillRect(sz * 0.05, -sz * 0.62, sz * 0.09, sz * 0.09);
          }

          // Small neck collar
          ctx.fillStyle = '#ffedd5'; // Skin tone
          ctx.beginPath();
          ctx.moveTo(-sz * 0.05, -sz * 0.8);
          ctx.lineTo(sz * 0.05, -sz * 0.8);
          ctx.lineTo(0, -sz * 0.76);
          ctx.closePath();
          ctx.fill();

          // Tiny display number 10 or 7 on chest!
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round(sz * 0.15)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(currentKickerTeam.id === 'POR' ? '7' : '10', 0, -sz * 0.61);

          // 4. Arms with dynamic physical swings
          ctx.strokeStyle = '#ffedd5'; // skin
          ctx.lineWidth = sz * 0.07;
          ctx.lineCap = 'round';
          
          let lArmX = -sz * 0.3;
          let lArmY = -sz * 0.61;
          let rArmX = sz * 0.3;
          let rArmY = -sz * 0.61;

          if (state.gameState === 'RUN_UP') {
            const armSwing = Math.sin(pK.frame * 0.45) * sz * 0.15;
            lArmX += armSwing; lArmY += Math.cos(pK.frame * 0.45) * sz * 0.08;
            rArmX -= armSwing; rArmY -= Math.cos(pK.frame * 0.45) * sz * 0.08;
          } else if (state.gameState === 'KICK') {
            lArmX = -sz * 0.42; lArmY = -sz * 0.8; // raise arms for kicking balance!
            rArmX = sz * 0.42; rArmY = -sz * 0.8;
          }

          ctx.beginPath();
          ctx.moveTo(-sz * 0.15, -sz * 0.78);
          ctx.lineTo(lArmX, lArmY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(sz * 0.15, -sz * 0.78);
          ctx.lineTo(rArmX, rArmY);
          ctx.stroke();

          // Sleeves
          ctx.strokeStyle = colorSet.shirt;
          ctx.lineWidth = sz * 0.09;
          ctx.beginPath();
          ctx.moveTo(-sz * 0.15, -sz * 0.77);
          ctx.lineTo(-sz * 0.22, -sz * 0.72);
          ctx.moveTo(sz * 0.15, -sz * 0.77);
          ctx.lineTo(sz * 0.22, -sz * 0.72);
          ctx.stroke();

          // 5. Head with determined/blinking facial expressions!
          ctx.fillStyle = '#ffedd5'; // skin
          ctx.beginPath();
          ctx.arc(0, -sz * 0.9, sz * 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Blinking determined eyes & intense eyebrows
          const isBlinking = state.frameIndex % 85 < 4;
          ctx.fillStyle = '#0f172a';
          if (!isBlinking) {
            ctx.beginPath();
            ctx.arc(-sz * 0.032, -sz * 0.90, sz * 0.014, 0, Math.PI * 2);
            ctx.arc(sz * 0.032, -sz * 0.90, sz * 0.014, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = sz * 0.008;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.05, -sz * 0.90); ctx.lineTo(-sz * 0.015, -sz * 0.90);
            ctx.moveTo(sz * 0.015, -sz * 0.90); ctx.lineTo(sz * 0.05, -sz * 0.90);
            ctx.stroke();
          }

          // Determined little eyebrows draw
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = sz * 0.008;
          ctx.beginPath();
          ctx.moveTo(-sz * 0.056, -sz * 0.935); ctx.lineTo(-sz * 0.015, -sz * 0.925);
          ctx.moveTo(sz * 0.015, -sz * 0.925); ctx.lineTo(sz * 0.056, -sz * 0.935);
          ctx.stroke();

          // 6. Hair Styles with volume
          let hairColor = '#18181b';
          if (currentKickerTeam.id === 'ARG') {
            hairColor = '#7c2d12'; // Messi chestnut cooper
            ctx.fillStyle = hairColor;
            
            // Messi cropped volume hair
            ctx.beginPath();
            ctx.arc(0, -sz * 0.95, sz * 0.105, Math.PI, 0);
            ctx.fill();
            
            // Messi neat brown beard!
            ctx.strokeStyle = '#7c2d12';
            ctx.lineWidth = sz * 0.035;
            ctx.beginPath();
            ctx.arc(0, -sz * 0.89, sz * 0.09, Math.PI*0.1, Math.PI*0.9);
            ctx.stroke();
          } 
          else if (currentKickerTeam.id === 'BRA') {
            hairColor = '#fef08a'; // Neymar platinum mohawk
            ctx.fillStyle = hairColor;
            // Spiky mohawk
            ctx.beginPath();
            ctx.moveTo(-sz * 0.035, -sz * 0.99);
            ctx.lineTo(0, -sz * 1.09);
            ctx.lineTo(sz * 0.035, -sz * 0.99);
            ctx.closePath();
            ctx.fill();
            
            // white headband
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = sz * 0.022;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.075, -sz * 0.94);
            ctx.lineTo(sz * 0.075, -sz * 0.94);
            ctx.stroke();
          } 
          else if (currentKickerTeam.id === 'POR') {
            hairColor = '#090503'; // Ronaldo gelled black
            ctx.fillStyle = hairColor;
            ctx.beginPath();
            ctx.arc(0, -sz * 0.96, sz * 0.1, Math.PI, 0);
            ctx.fill();
            // gelled high wave crest
            ctx.beginPath();
            ctx.ellipse(sz * 0.02, -sz * 1.01, sz * 0.06, sz * 0.025, Math.PI / 8, 0, Math.PI * 2);
            ctx.fill();
          } 
          else if (currentKickerTeam.id === 'CRO') {
            hairColor = '#eab308'; // Modric long blonde hair + band
            ctx.fillStyle = hairColor;
            // side hair locks down to ears
            ctx.beginPath();
            ctx.arc(-sz * 0.07, -sz * 0.9, sz * 0.05, 0, Math.PI * 2);
            ctx.arc(sz * 0.07, -sz * 0.9, sz * 0.05, 0, Math.PI * 2);
            ctx.arc(0, -sz * 0.95, sz * 0.105, Math.PI, 0);
            ctx.fill();
            // thin headband
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = sz * 0.01;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.08, -sz * 0.92);
            ctx.lineTo(sz * 0.08, -sz * 0.92);
            ctx.stroke();
          } 
          else {
            // Standard cropped styled hair
            hairColor = '#24140b';
            ctx.fillStyle = hairColor;
            ctx.beginPath();
            ctx.arc(0, -sz * 0.94, sz * 0.1, Math.PI, 0);
            ctx.fill();
          }
          
          ctx.restore();
        }
      }

      // 5. UPDATE AND RENDER GOALKEEPER AI
      const gK = state.keeper;
      
      if (state.gameState === 'BALL_FLIGHT' || state.gameState === 'SAVED' || state.gameState === 'CELEBRATION') {
        if (gK.diveDelay !== undefined && gK.diveDelay > 0) {
          gK.diveDelay--;
          // Goalkeeper remains standing alert during reaction delay frames
          gK.x = gK.startX !== undefined ? gK.startX : 0;
          gK.y = gK.startY !== undefined ? gK.startY : 0;
          gK.angle = 0;
          gK.scaleY = 1.0;
        } else {
          // Calculate physical dive progress dynamically locked to the ball's real 3D depth relative to startDiveZ
          const sZ = gK.startDiveZ !== undefined ? gK.startDiveZ : -5.5;
          let t = 0;
          if (state.ball.z >= sZ) {
            t = (state.ball.z - sZ) / (0 - sZ);
          }
          t = Math.min(1.0, Math.max(0.0, t));
          
          // Hold full posture on saves/goals to avoid any physical rewind jitter or backward rubber-banding
          if (state.gameState === 'SAVED' || state.gameState === 'CELEBRATION') {
            t = 1.0;
          } else {
            t = Math.max(gK.diveProgress || 0, t);
          }
          
          gK.diveProgress = t;

          // Explosive takeoff dust the instant the keeper launches
          if (!gK.tookOff && t > 0.03) {
            gK.tookOff = true;
            for (let k = 0; k < 10; k++) {
              state.particles.push({ x: gK.startX, y: 0.05, z: 0, vx: (Math.random() - 0.5) * 2.5, vy: Math.random() * 2.2, vz: (Math.random() - 0.3) * 1.0, color: '#cbd5e1', size: Math.random() * 3 + 2, alpha: 0.8, life: 0.9 });
            }
          }
          // Landing dust burst as the dive bottoms out
          if (!gK.landed && t > 0.9) {
            gK.landed = true;
            for (let k = 0; k < 14; k++) {
              state.particles.push({ x: gK.x, y: 0.05, z: 0, vx: (Math.random() - 0.5) * 3.0 + (gK.targetX > 0 ? 1 : -1) * 1.0, vy: Math.random() * 2.4, vz: (Math.random() - 0.3) * 1.0, color: '#e2e8f0', size: Math.random() * 3.5 + 2, alpha: 0.85, life: 1.0 });
            }
          }

          // Ultra-smooth, elegant composite blend easing curve that keeps dives in complete athletic speed coherence with the ball
          const easeT = 0.3 * t + 0.7 * (1 - Math.pow(1 - t, 2.2));
          
          const sX = gK.startX !== undefined ? gK.startX : 0;
          const sY = gK.startY !== undefined ? gK.startY : 0;
          const pathX = sX + (gK.targetX - sX) * easeT;
          const pathY = sY + (gK.targetY - sY) * easeT;

          const dDir = gK.targetX > 0.1 ? 1 : (gK.targetX < -0.1 ? -1 : 0);
          const dHigh = gK.targetY > 1.0;

          // Add a natural arc to the diving line so the keeper doesn't move in a straight rigid line.
          const diveCurve = dDir !== 0 ? Math.sin(Math.PI * easeT) * 0.14 * dDir : 0;
          const riseArc = Math.sin(Math.PI * easeT) * (dHigh ? 0.10 : 0.14);
          gK.x = pathX + diveCurve;
          gK.y = pathY + riseArc * 0.5;

          // Tilt rotation of diving body with more organic posture changes
          if (gK.targetX !== 0) {
            const diveHigh = gK.targetY > 1.0;
            const leanMax = diveHigh ? 0.48 : 0.92;
            const twist = Math.sin(Math.PI * easeT) * (dHigh ? 0.06 : 0.12);
            gK.angle = (gK.targetX > 0 ? 1 : -1) * leanMax * easeT + twist * (gK.targetX > 0 ? 1 : -1);
            gK.scaleY = 1 - (diveHigh ? 0.14 : 0.28) * easeT + Math.sin(easeT * Math.PI) * 0.03;
          } else {
            gK.angle = Math.sin(easeT * Math.PI) * 0.05;
            gK.scaleY = gK.targetY > 0.8 ? (1 - 0.12 * easeT + Math.sin(easeT * Math.PI) * 0.02) : (1.0 - 0.16 * easeT + Math.sin(easeT * Math.PI) * 0.02);
          }
        }
      } else {
        // More dynamic pre-shot readiness: shuffle, breathe and stay ready to spring
        gK.x = Math.sin(state.frameIndex * 0.14) * 0.72;
        gK.y = Math.sin(state.frameIndex * 0.22) * 0.08;
        gK.angle = Math.sin(state.frameIndex * 0.14) * 0.08;
        gK.scaleY = 1.0 + Math.sin(state.frameIndex * 0.18) * 0.055;
      }

      // ---- Pose params (computed before projection so we can add a leap arc) ----
      const gkActive = state.gameState === 'BALL_FLIGHT' || state.gameState === 'SAVED' || state.gameState === 'CELEBRATION';
      const dp = gkActive ? Math.min(1, Math.max(0, gK.diveProgress || 0)) : 0;
      const dDir = gK.targetX > 0.1 ? 1 : (gK.targetX < -0.1 ? -1 : 0);
      const dHigh = gK.targetY > 1.0;
      // The keeper LEAPS: an arc that lifts the whole body off the ground mid-dive
      const diveLift = dp > 0.02 ? Math.sin(Math.PI * dp) * (dDir !== 0 ? 0.32 : (dHigh ? 0.22 : 0.03)) : 0;

      // Ground shadow stays on the pitch and shrinks as the keeper rises
      const gkShadow = project(gK.x, 0, gK.z, state.screenShake);
      if (gkShadow.ok) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.07, 0.22 - diveLift * 0.24);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(gkShadow.x, gkShadow.y, gkShadow.scale * 0.4 * (1 - diveLift * 0.45), gkShadow.scale * 0.08 * (1 - diveLift * 0.45), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Goalkeeper in perspective (body lifted by the leap arc)
      const gKP = project(gK.x, gK.y + diveLift, gK.z, state.screenShake);
      if (gKP.ok) {
        const szG = gKP.scale * 1.8;

        ctx.save();
        const torsoSkew = gkActive && dDir !== 0 ? dDir * dp * szG * 0.02 : 0;
        ctx.translate(gKP.x + torsoSkew, gKP.y);
        ctx.rotate(gK.angle * 0.72);
        // Gentle readiness bob when idle
        const bob = gkActive ? 0 : Math.sin(state.frameIndex * 0.16) * szG * 0.012;
        const diveBend = gkActive ? Math.sin(dp * Math.PI) * szG * 0.06 : 0;

        const hipY = -szG * 0.42 + bob + diveBend * 0.72;
        const shoulderY = -szG * 0.74 + bob + diveBend * 0.42;
        const headY = -szG * 0.92 + bob + diveBend * 0.26;

        // Hand target positions (local space — the body rotation handles the lean)
        let lHand: { x: number; y: number };
        let rHand: { x: number; y: number };
        if (dp > 0.02 && dDir !== 0) {
          // Side dive: the lead arm reaches toward the target with a more controlled extension
          const reach = Math.min(szG * 0.78, szG * (0.42 + dp * 0.34 + Math.sin(Math.PI * Math.min(1, dp)) * 0.08));
          const lift = dHigh ? -szG * (0.28 + dp * 0.28) : szG * 0.02; // up for high, low dives stay more grounded
          const lead = { x: dDir * reach, y: shoulderY + lift };
          const trail = { x: -dDir * szG * 0.30, y: shoulderY + szG * 0.14 + Math.sin(state.frameIndex * 0.12) * szG * 0.02 };
          lHand = dDir < 0 ? lead : trail;
          rHand = dDir < 0 ? trail : lead;
        } else if (dp > 0.02) {
          // Central reaction: high = catch overhead, low = smother down low
          if (dHigh) {
            lHand = { x: -szG * 0.26, y: shoulderY - szG * (0.28 + dp * 0.36) };
            rHand = { x: szG * 0.26, y: shoulderY - szG * (0.28 + dp * 0.36) };
          } else {
            lHand = { x: -szG * 0.24, y: -szG * 0.08 };
            rHand = { x: szG * 0.24, y: -szG * 0.08 };
          }
        } else {
          // Idle ready stance: arms out, elbows bent, alert
          const spread = szG * (0.34 + Math.sin(state.frameIndex * 0.16) * 0.03);
          lHand = { x: -spread, y: -szG * 0.50 + bob };
          rHand = { x: spread, y: -szG * 0.50 + bob };
        }

        // ---- Legs (drive into the dive / bent-knee ready) ----
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = szG * 0.12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (dp > 0.02 && dDir !== 0) {
          const leadKneeX = dDir * szG * (0.10 + dp * 0.12);
          const leadKneeY = -szG * 0.20 + dp * 0.08;
          const leadFootX = dDir * szG * (0.20 + dp * 0.14);
          const leadFootY = -szG * 0.08 - dp * 0.05;
          const trailKneeX = -dDir * szG * 0.08;
          const trailKneeY = -szG * 0.18 + dp * 0.03;
          const trailFootX = -dDir * szG * 0.16;
          const trailFootY = -szG * 0.10 + dp * 0.02;

          ctx.moveTo(0, hipY);
          ctx.lineTo(leadKneeX, leadKneeY);
          ctx.lineTo(leadFootX, leadFootY);
          ctx.moveTo(0, hipY);
          ctx.lineTo(trailKneeX, trailKneeY);
          ctx.lineTo(trailFootX, trailFootY);
        } else {
          ctx.moveTo(-szG * 0.07, hipY);
          ctx.lineTo(-szG * 0.13, -szG * 0.02);
          ctx.moveTo(szG * 0.07, hipY);
          ctx.lineTo(szG * 0.13, -szG * 0.02);
        }
        ctx.stroke();

        // ---- Torso / keeper jersey ----
        const torsoTop = shoulderY;
        const torsoH = (hipY - shoulderY) + szG * 0.07;
        ctx.fillStyle = '#10b981'; // neon green keeper jersey
        ctx.beginPath();
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) {
          (ctx as CanvasRenderingContext2D).roundRect(-szG * 0.16, torsoTop, szG * 0.32, torsoH, szG * 0.05);
        } else {
          ctx.rect(-szG * 0.16, torsoTop, szG * 0.32, torsoH);
        }
        ctx.fill();
        ctx.fillStyle = '#065f46'; // darker flank panels
        ctx.fillRect(-szG * 0.16, torsoTop, szG * 0.045, torsoH);
        ctx.fillRect(szG * 0.115, torsoTop, szG * 0.045, torsoH);
        ctx.fillStyle = '#eab308'; // central accent stripe
        ctx.fillRect(-szG * 0.022, torsoTop, szG * 0.044, torsoH);

        // ---- Arms (shoulder -> glove, with an elbow bend) ----
        ctx.strokeStyle = '#0d9488'; // sleeves
        ctx.lineWidth = szG * 0.085;
        const drawArm = (hand: { x: number; y: number }) => {
          const s = hand.x >= 0 ? 1 : -1;
          const sx = s * szG * 0.15;
          const dx = hand.x - sx;
          const dy = hand.y - shoulderY;
          const maxReach = szG * 0.78;
          const dist = Math.hypot(dx, dy);
          const reachFactor = dist > maxReach ? maxReach / dist : 1;
          const endX = sx + dx * reachFactor;
          const endY = shoulderY + dy * reachFactor;
          const ex = (sx + endX) / 2 + s * szG * 0.02;
          const ey = (shoulderY + endY) / 2 + szG * 0.045;
          ctx.beginPath();
          ctx.moveTo(sx, shoulderY);
          ctx.quadraticCurveTo(ex, ey, endX, endY);
          ctx.stroke();
          return { x: endX, y: endY };
        };
        const leftGlovePos = drawArm(lHand);
        const rightGlovePos = drawArm(rHand);

        // ---- Gloves ----
        const gloveR = szG * (dp > 0.02 ? 0.085 : 0.07);
        ctx.fillStyle = '#fb923c'; // bright orange gloves
        ctx.beginPath();
        ctx.arc(leftGlovePos.x, leftGlovePos.y, gloveR, 0, Math.PI * 2);
        ctx.arc(rightGlovePos.x, rightGlovePos.y, gloveR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = szG * 0.012;
        ctx.beginPath();
        ctx.arc(leftGlovePos.x, leftGlovePos.y, gloveR, 0, Math.PI * 2);
        ctx.arc(rightGlovePos.x, rightGlovePos.y, gloveR, 0, Math.PI * 2);
        ctx.stroke();

        // ---- Neck + Head ----
        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = szG * 0.05;
        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        ctx.lineTo(0, headY + szG * 0.08);
        ctx.stroke();

        ctx.fillStyle = '#fed7aa'; // head
        ctx.beginPath();
        ctx.arc(0, headY, szG * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gK.hairColor; // hair
        ctx.beginPath();
        ctx.arc(0, headY - szG * 0.02, szG * 0.1, Math.PI * 1.04, Math.PI * 1.96);
        ctx.fill();
        // Focused eyes tracking the dive direction
        ctx.fillStyle = '#0f172a';
        const eyeDX = dDir * szG * 0.02;
        ctx.beginPath();
        ctx.arc(-szG * 0.035 + eyeDX, headY - szG * 0.005, szG * 0.013, 0, Math.PI * 2);
        ctx.arc(szG * 0.035 + eyeDX, headY - szG * 0.005, szG * 0.013, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 6. DYNAMIC PARTICLE UPDATE (FOR DUST, SPARKS, SPLASHES)
      state.particles = state.particles.filter(p => p.life > 0);
      state.particles.forEach(p => {
        p.x += p.vx * 0.08;
        p.y += p.vy * 0.08;
        p.z += p.vz * 0.08;
        p.vy -= 0.08; // small gravity drop
        p.life -= 0.03;
        
        const projP = project(p.x, p.y, p.z, state.screenShake);
        if (projP.ok && p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(projP.x, projP.y, projP.scale * p.size * 0.007, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      });

      // 7. BALL UPDATE & RENDERING (PHYSICS SIMULATION Ticks)
      if (state.gameState === 'BALL_FLIGHT' || state.gameState === 'SAVED' || state.gameState === 'CELEBRATION' || state.gameState === 'OUT_OF_BOUNDS') {
        const b = state.ball;
        
        // Curve bending math: Curve applies lateral air displacement over time (only during active flight)
        if (state.gameState === 'BALL_FLIGHT') {
          const currentCurve = state.isOpponentTurn ? state.aiCurve : -state.curve * (state.playerTeam.curve / 100);
          b.vx += currentCurve * CURVE_DRIFT;
        }

        // Gravity pull down over time (same constant used at launch => true parabola)
        b.vy += BALL_GRAVITY;

        // Apply velocities
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;

        // Bounce on the grass field after shots
        if (b.y < 0.11 && (state.gameState === 'SAVED' || state.gameState === 'CELEBRATION' || state.gameState === 'OUT_OF_BOUNDS')) {
          b.y = 0.11;
          b.vy = -b.vy * 0.42; // bounce up!
          b.vx *= 0.65; // friction
          b.vz *= 0.65; // friction
        }

        // Rotate ball based on curve
        b.rotX += state.ballSpin.x;
        b.rotY += state.ballSpin.y;

        // Check boundary & goal line events when passing Z = 0
        if (b.z >= 0 && state.gameState === 'BALL_FLIGHT') {
          // Analyze goalie contact coordinates vs ball coordinates
          // Analyze goalie contact coordinates vs ball coordinates Immersive Stats Check
          const activeTeamGK = state.isOpponentTurn ? state.playerTeam : state.opponentTeam;
          const gkStats = GOALKEEPER_REGISTRY[activeTeamGK.id] || { name: 'Portero', reflejos: 90, alcance: 90 };
          
          // Effective glove reach: how close the ball must pass to the keeper's hands
          // (where it actually dove to) to be reachable. Scales with reach + reflexes.
          let gloveRadius = 0.80 + ((gkStats.alcance - 85) / 14) * 0.22 + ((gkStats.reflejos - 85) / 14) * 0.12;
          // Power blasts are harder to hold on to / react to
          const shotPower = state.isOpponentTurn ? state.aiPower : state.power;
          if (shotPower > 88) gloveRadius -= 0.10;
          // Physical distance between the ball and the keeper's hands as it crosses the line.
          // Because the keeper dove to a reach-limited spot (not onto the ball), a shot tucked
          // into the corner naturally lands outside this radius => goal, even on a correct guess.
          const distToGK = Math.hypot(b.x - gK.x, b.y - gK.y);

          // Post and top bar dimensions: Goals are widened [-4.5, 4.5], Y up to 2.8
          const isBetweenPosts = b.x >= -4.5 && b.x <= 4.5;
          const isUnderBar = b.y <= 2.8 && b.y >= 0;

          // Check if it collided with woodwork specifically
          const hitsLeftPost = Math.abs(b.x - (-4.5)) < 0.16 && b.y <= 2.85 && b.y >= 0;
          const hitsRightPost = Math.abs(b.x - 4.5) < 0.16 && b.y <= 2.85 && b.y >= 0;
          const hitsCrossbar = Math.abs(b.y - 2.8) < 0.15 && b.x >= -4.56 && b.x <= 4.56;

          let result: ShotResult = {
            isGoal: false,
            isSaved: false,
            isOffTarget: false,
            hitWoodwork: false,
            keeperDived: state.direction, // matches selection
            keeperHeight: state.height,
            isPerfect: isSweetSpot(state.power),
            power: state.power,
            curve: state.curve,
            message: '',
            ballFinalPos: { x: b.x, y: b.y, z: b.z }
          };

          if (hitsLeftPost || hitsRightPost || hitsCrossbar) {
            // Woodwork thud!
            audioEngine.playWoodwork();
            state.screenShake = 16; // Major shake on woodwork hit
            result.hitWoodwork = true;
            
            // Physical bounce back trajectory
            b.vz = -b.vz * 0.45;
            b.vx = (Math.random() - 0.5) * 0.15;
            b.vy = Math.abs(b.vy) * 0.35 + 0.05;
            b.z = -0.05; // send back on pitch

            // Spark dust particles off goal frame
            for (let k = 0; k < 18; k++) {
              state.particles.push({
                x: b.x,
                y: b.y,
                z: b.z,
                vx: (Math.random() - 0.5) * 5.0,
                vy: (Math.random() - 0.2) * 5.0,
                vz: -3.0 - Math.random() * 4.0,
                color: '#ffffff',
                size: Math.random() * 4 + 2,
                alpha: 0.95,
                life: 1.2
              });
            }

            result.isGoal = false;
            result.isSaved = false;
            result.isOffTarget = true;
            result.message = '¡Tembló el caño! La pelota se fue tras pegar en el palo.';
            
            state.gameState = 'SAVED';
            if (!state.shotLogged) {
              state.shotLogged = true;
              audioEngine.playNonGoal();
              state.onShotComplete(result);
            }
          }
          // Check Goalkeeper block / Save states
          else if (distToGK < gloveRadius) {
            // SOLID CLEAN SAVE!
            audioEngine.playKick(0.38); // pop sound
            state.screenShake = 4.5;
            
            b.z = -0.12;
            b.vz = -0.055; // Bounce backwards
            b.vx = (b.x - gK.x) * 0.18 + (Math.random() - 0.5) * 0.05; 
            b.vy = Math.abs(b.vy) * 0.35 + 0.08;

            result.isSaved = true;
            result.isGoal = false;
            result.message = state.isOpponentTurn ? '¡INCREÍBLE ATAJADA SEGURA! El arquero contuvo el balón.' : '¡TIRO ATAJADO! El arquero contuvo el balón.';
            
            state.gameState = 'SAVED';
            if (!state.shotLogged) {
              state.shotLogged = true;
              audioEngine.playGKSave();
              audioEngine.playNonGoal();
              state.onShotComplete(result);
            }
          } 
          else if (distToGK < gloveRadius + 0.45) {
            // "ROZAR Y DESVIAR" (Fingertip graze deflection!)
            // The closer the keeper's hand got, the more likely the touch keeps it out.
            const closeness = Math.min(1, Math.max(0, (gloveRadius + 0.45 - distToGK) / 0.45));
            const deflectsIn = Math.random() >= (0.35 + closeness * 0.45);
            state.screenShake = 3.0;

            if (deflectsIn) {
              // Ball is tipped, slower velocity, slightly redirected, but still goes in (Goal)!
              b.vx = (b.x - gK.x) * 0.08; 
              b.vy = b.vy * 0.85;
              b.vz = b.vz * 0.95;

              result.isSaved = false;
              result.isGoal = true;
              result.message = state.isOpponentTurn ? '¡EL ARQUERO LA ROZÓ PERO TERMINÓ ADENTRO!' : '¡ROZÓ EL GUANTE DEL PORTERO Y ENTRÓ!';
              
              state.gameState = 'CELEBRATION';
              if (!state.shotLogged) {
                state.shotLogged = true;
                audioEngine.playNetSwish();
                state.netPoints.forEach(p => {
                  const dx = p.x - b.x;
                  const dy = p.y - b.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist < 1.4 && p.z >= 0.0) {
                    p.z = 1.05 + (1.4 - dist) * 0.45;
                    p.vz = 0.12;
                  }
                });
                state.onShotComplete(result);
              }
            } else {
              // Big fingertip deflection OUT of play!
              b.z = -0.1;
              b.vz = -0.035; 
              b.vx = (b.x - gK.x) * 0.38 + (Math.random() - 0.5) * 0.08; // robust sideways deflection outwards
              b.vy = Math.abs(b.vy) * 0.42 + 0.1;

              result.isSaved = true;
              result.isGoal = false;
              result.message = state.isOpponentTurn ? '¡LOGRÓ DESVIAR CON LOS DEDOS! SALVADA' : '¡PALMEO SALVADOR CON LAS UÑAS!';
              
              state.gameState = 'SAVED';
              if (!state.shotLogged) {
                state.shotLogged = true;
                audioEngine.playGKSave();
                audioEngine.playNonGoal();
                state.onShotComplete(result);
              }
            }
          } 
          // Check Goal state
          else if (isBetweenPosts && isUnderBar) {
            // GOAL!! Trigger net expansion pull and sparkles
            audioEngine.playNetSwish();

            state.screenShake = 11.5;
            result.isGoal = true;
            result.message = (Math.abs(b.x) > 3.2 && b.y > 1.55)
              ? 'Clavada en el ángulo, imposible para el arquero.'
              : (Math.abs(b.x) > 3.0
                  ? 'Pegada al palo, el arquero ni la vio.'
                  : 'Definición perfecta, adentro.');
            
            // Indent the physical net mesh points close to contact
            state.netPoints.forEach(p => {
              const dx = p.x - b.x;
              const dy = p.y - b.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 1.4 && p.z >= 0.0) {
                // push net coordinate further deep horizontally Z
                p.z = 1.05 + (1.4 - dist) * 0.45;
                p.vz = 0.12;
              }
            });

            // Spark goal particles
            for (let k = 0; k < 22; k++) {
              state.particles.push({
                x: b.x,
                y: b.y,
                z: b.z,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                vz: 2,
                color: '#facc15', // yellow glitter
                size: Math.random() * 3.5 + 2.5,
                alpha: 0.9,
                life: 1.5
              });
            }

            // decelerate and drop ball into net mesh
            b.vz = 0.023; // heavily slow speed
            b.vx *= 0.15;
            b.vy = -0.015; // sink down

            state.gameState = 'CELEBRATION';
            if (!state.shotLogged) {
              state.shotLogged = true;
              audioEngine.playGoalCrowd();
              state.onShotComplete(result);
            }
          }
          // Completely wide or over top
          else {
            result.isOffTarget = true;
            result.isGoal = false;
            result.message = b.y > 2.8 ? '¡Por encima del travesaño! Se fue a las nubes.' : '¡Desviada! Pasó al lado del palo.';
            
            state.gameState = 'OUT_OF_BOUNDS';
            if (!state.shotLogged) {
              state.shotLogged = true;
              audioEngine.playNonGoal();
              state.onShotComplete(result);
            }
          }
        }
      }

      // 8. RENDER INTERACTIVE TARGET RETICLE AND TRAJECTORY PREVIEW (only while the user is aiming a shot)
      if (state.gameState === 'PRE_SHOT' && state.aimTarget && !state.isOpponentTurn) {
        // Draw the laser sweeps based on active 3-click steps
        ctx.save();
        if (aimingStepRef.current === 0) {
          // Horizontal Sweep: Draw beautiful vertical tracking laser
          const l1 = project(state.sweepX, 0, 0, state.screenShake);
          const l2 = project(state.sweepX, 2.8, 0, state.screenShake);
          if (l1.ok && l2.ok) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'; // bright sky-blue laser
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(l1.x, l1.y);
            ctx.lineTo(l2.x, l2.y);
            ctx.stroke();

            // Glow pulses
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.lineWidth = 8;
            ctx.stroke();
          }
        } else if (aimingStepRef.current === 1) {
          // Draw faint locked X line
          const locked1 = project(state.lockedX, 0, 0, state.screenShake);
          const locked2 = project(state.lockedX, 2.8, 0, state.screenShake);
          if (locked1.ok && locked2.ok) {
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(locked1.x, locked1.y);
            ctx.lineTo(locked2.x, locked2.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Height Sweep: Draw beautiful horizontal tracking laser
          const h1 = project(-4.5, state.sweepY, 0, state.screenShake);
          const h2 = project(4.5, state.sweepY, 0, state.screenShake);
          if (h1.ok && h2.ok) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)'; // bright yellow laser
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(h1.x, h1.y);
            ctx.lineTo(h2.x, h2.y);
            ctx.stroke();

            // Glow pulses
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
            ctx.lineWidth = 8;
            ctx.stroke();
          }
        }
        ctx.restore();

        const tProj = project(state.aimTarget.x, state.aimTarget.y, 0, state.screenShake);
        if (tProj.ok) {
          ctx.save();
          
          // Draw Dotted Curved Trajectory preview line from Ball (x=0, y=0.11, z=-7.5) to Target (x, y, z=0)
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)'; // amber gold
          ctx.lineWidth = 2.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          
          const startX = 0;
          const startY = 0.11;
          const startZ = -5.5;
          const endX = state.aimTarget.x;
          const endY = state.aimTarget.y;
          const endZ = 0;
          
          for (let step = 0; step <= 20; step++) {
            const t = step / 20;
            const z = startZ + (endZ - startZ) * t;
            const spinOffset = -state.curve * 0.12 * Math.pow(t, 2);
            const x = startX + (endX - startX) * t + spinOffset;
            const arcHeight = 0.6 * Math.sin(t * Math.PI); // parabolic arc depth mapped to closer distance
            const y = startY + (endY - startY) * t + arcHeight;
            
            const p = project(x, y, z, state.screenShake);
            if (p.ok) {
              if (step === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            }
          }
          ctx.stroke();

          // Draw the target reticle as a real spinning soccer ball! (as requested)
          ctx.restore();
          ctx.save();
          ctx.translate(tProj.x, tProj.y);

          const rSize = Math.max(12, tProj.scale * 0.22); // dynamic scale targeting reticle
          const pulse = 1.0 + Math.sin(state.frameIndex * 0.12) * 0.08;
          const currentRadius = rSize * pulse;
          
          // Glowing outer targeted ring (Cyan if adjusting direction, Gold yellow if adjusting height, Gold/Rose if locked/power)
          let reticleColor = 'rgba(244, 63, 94, 0.85)'; // default rose
          if (aimingStepRef.current === 0) reticleColor = 'rgba(14, 165, 233, 0.85)'; // cyan
          else if (aimingStepRef.current === 1) reticleColor = 'rgba(234, 179, 8, 0.85)'; // gold
          
          // 1. Draw glowing outer ring
          ctx.shadowColor = reticleColor;
          ctx.shadowBlur = 10;
          ctx.strokeStyle = reticleColor; 
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, currentRadius + 2, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.shadowBlur = 0; // reset shadow for ball drawing

          // 2. Draw soccer ball sphere base
          ctx.beginPath();
          ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
          const ballGrad = ctx.createRadialGradient(-currentRadius * 0.2, -currentRadius * 0.2, currentRadius * 0.1, 0, 0, currentRadius);
          ballGrad.addColorStop(0, '#ffffff');
          ballGrad.addColorStop(0.8, '#f8fafc');
          ballGrad.addColorStop(1, '#cbd5e1');
          ctx.fillStyle = ballGrad;
          ctx.fill();

          // 3. Draw soccer ball panel lines and star/pentagon patterns matching standard classic soccer ball
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = Math.max(1, currentRadius * 0.05);
          ctx.save();
          ctx.rotate(state.frameIndex * 0.03); // subtle rotation
          
          // Draw central pentagon
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          for (let pi = 0; pi < 5; pi++) {
            const angle = (pi * Math.PI * 2) / 5;
            const px = Math.sin(angle) * currentRadius * 0.28;
            const py = Math.cos(angle) * currentRadius * 0.28;
            if (pi === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw spokes towards outer edge
          for (let pi = 0; pi < 5; pi++) {
            const angle = (pi * Math.PI * 2) / 5;
            const ix = Math.sin(angle) * currentRadius * 0.28;
            const iy = Math.cos(angle) * currentRadius * 0.28;
            const ox = Math.sin(angle) * currentRadius * 0.65;
            const oy = Math.cos(angle) * currentRadius * 0.65;
            
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ox, oy);
            ctx.stroke();

            // Draw outer partial pentagons centering points on perimeter
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(Math.sin(angle + Math.PI / 5) * currentRadius * 0.85, Math.cos(angle + Math.PI / 5) * currentRadius * 0.85, currentRadius * 0.25, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();

          // 4. Draw crisp white alignment cross hair ticks just outside the ball
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // horizontal hairs
          ctx.moveTo(-currentRadius * 1.5, 0); ctx.lineTo(-currentRadius * 1.1, 0);
          ctx.moveTo(currentRadius * 1.1, 0); ctx.lineTo(currentRadius * 1.5, 0);
          // vertical hairs
          ctx.moveTo(0, -currentRadius * 1.5); ctx.lineTo(0, -currentRadius * 1.1);
          ctx.moveTo(0, currentRadius * 1.1); ctx.lineTo(0, currentRadius * 1.5);
          ctx.stroke();

          ctx.restore();
        }
      }

      // --- TARGET MARKER: shows the ball's real destination on the goal line ---
      // Shown for BOTH the player's shots and the opponent's (once the ball is on its
      // way), and pinned to finalDest so the cursor and the ball always converge.
      if ((state.gameState === 'RUN_UP' || state.gameState === 'BALL_FLIGHT') && state.hasFinalDest) {
        const destP = project(state.finalDestX, state.finalDestY, 0, state.screenShake);
        if (destP.ok) {
          ctx.save();
          ctx.translate(destP.x, destP.y);

          const rBase = destP.scale * 0.34;
          const timePulse = Math.sin(state.frameIndex * 0.12) * 1.0;
          const finalR = rBase + timePulse;

          ctx.strokeStyle = 'rgba(0, 229, 255, 0.30)'; // cyan glow = "your target"
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, finalR + 2.0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, finalR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, destP.scale * 0.07, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-finalR - 3, 0); ctx.lineTo(-finalR + 2, 0);
          ctx.moveTo(finalR - 2, 0); ctx.lineTo(finalR + 3, 0);
          ctx.moveTo(0, -finalR - 3); ctx.lineTo(0, -finalR + 2);
          ctx.moveTo(0, finalR - 2); ctx.lineTo(0, finalR + 3);
          ctx.stroke();

          ctx.restore();
        }
      }

      // Render the Star-panel Football
      const bP = state.ball;
      const bProj = project(bP.x, bP.y, bP.z, state.screenShake);
      
      if (bProj.ok) {
        ctx.save();
        ctx.translate(bProj.x, bProj.y);

        // Ball dynamic shadow directly on grass Y=0
        const bShadowProj = project(bP.x, 0, bP.z, state.screenShake);
        if (bShadowProj.ok) {
          ctx.restore();
          ctx.save();
          // Shadow size shrinks the higher the ball flies
          const shadowSize = Math.max(0.04, 0.15 - bP.y * 0.038);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
          ctx.beginPath();
          ctx.ellipse(bShadowProj.x, bShadowProj.y, bShadowProj.scale * shadowSize, bShadowProj.scale * shadowSize * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.translate(bProj.x, bProj.y);
        }

        // Draw Soccer ball sphere (Upgraded realistic layout)
        const ballRad = bProj.scale * 0.12; 
        ctx.beginPath();
        ctx.arc(0, 0, ballRad, 0, Math.PI * 2);
        const ballGrad = ctx.createRadialGradient(-ballRad * 0.20, -ballRad * 0.20, ballRad * 0.1, 0, 0, ballRad);
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.8, '#f8fafc');
        ballGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = ballGrad;
        ctx.fill();

        // Star panels / hexagon pentagonal outline (rotating according to physics rotation)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(1, bProj.scale * 0.005);
        ctx.save();
        ctx.rotate(bP.rotY);
        const physicsOffset = bP.rotX * 0.45;

        // Draw central black pentagon
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        for (let pi = 0; pi < 5; pi++) {
          const angle = (pi * Math.PI * 2) / 5 + physicsOffset;
          const px = Math.sin(angle) * ballRad * 0.28;
          const py = Math.cos(angle) * ballRad * 0.28;
          if (pi === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw lines and outer black polygons
        for (let pi = 0; pi < 5; pi++) {
          const angle = (pi * Math.PI * 2) / 5 + physicsOffset;
          const ix = Math.sin(angle) * ballRad * 0.28;
          const iy = Math.cos(angle) * ballRad * 0.28;
          const ox = Math.sin(angle) * ballRad * 0.65;
          const oy = Math.cos(angle) * ballRad * 0.65;
          
          ctx.beginPath();
          ctx.moveTo(ix, iy);
          ctx.lineTo(ox, oy);
          ctx.stroke();

          // Outer dark shapes overlapping perimeter
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(Math.sin(angle + Math.PI / 5) * ballRad * 0.85, Math.cos(angle + Math.PI / 5) * ballRad * 0.85, ballRad * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();

        // Ball highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-ballRad * 0.25, -ballRad * 0.25, ballRad * 0.8, Math.PI, Math.PI * 1.5);
        ctx.stroke();

        ctx.restore();
      }

      // Darken the pitch behind the result overlay so the React UI reads clearly.
      // All champion glamour now lives in the lightweight React overlay — no heavy
      // canvas trophy behind the classify/defeat screens (fixes the overlap + lag).
      if (stateRef.current.gameState === 'MATCH_OVER') {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      }

      // Decelerate continuous screen shake
      if (state.screenShake > 0) {
        state.screenShake *= 0.90;
        if (state.screenShake < 0.2) state.screenShake = 0;
      }

      // Loop animation frame
      animFrameId = requestAnimationFrame(render);
    };

    // Begin looping
    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [dimensions]);

  // Hook to handle reset on game state changes:
  // Runs whenever we receive a new shot or transition to RUN_UP
  useEffect(() => {
    const state = stateRef.current;
    
    if (gameState === 'RUN_UP') {
      // (Ref whistle now fires on PRE_SHOT for the player only)
      onAnimationTriggered();
    } else if (gameState === 'PRE_SHOT') {
      // RESET Player positioning back to original spot (nearer distance)
      state.ball = { x: 0, y: 0.11, z: -5.5, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, scale: 1 };
      state.ballSpin = { x: 0, y: 0 };
      state.kicker = { x: -2.3, y: 0, z: -6.7, rightLegAngle: 0, leftLegAngle: 0, frame: 0 };
      state.keeper.x = 0;
      state.keeper.y = 0;
      state.keeper.z = 0;
      state.keeper.targetX = 0;
      state.keeper.targetY = 0;
      state.keeper.angle = 0;
      state.keeper.diveProgress = 0;
      state.keeper.diveDelay = 0;
      state.keeper.tookOff = false;
      state.keeper.landed = false;
      state.keeperTrail = [];
      state.shotLogged = false;
      state.screenShake = 0;
      state.particles = [];
      setAimingStep(0);
      if (setPower) setPower(0);

      // Pre-calculate AI kick if it is opponent's turn to shoot
      if (isOpponentTurn) {
        const directions: ShotDirection[] = ['left', 'center', 'right'];
        const heights: ShotHeight[] = ['low', 'high'];

        const aiSelectedDir = directions[Math.floor(Math.random() * 3)];
        const aiSelectedHeight = heights[Math.random() < 0.65 ? 0 : 1];
        
        // Opponent stats-based power and curve
        const oppPowerStat = opponentTeam.power;
        const aiSelectedPower = Math.round(oppPowerStat - 8 + Math.random() * 16);
        const oppCurveStat = opponentTeam.curve;
        const aiSelectedCurve = Math.round((Math.random() - 0.5) * (oppCurveStat / 9));

        state.aiShotDir = aiSelectedDir;
        state.aiShotHeight = aiSelectedHeight;
        state.aiPower = aiSelectedPower;
        state.aiCurve = aiSelectedCurve;

        const exactX = aiSelectedDir === 'left' ? -2.6 : (aiSelectedDir === 'right' ? 2.6 : 0);
        const exactY = aiSelectedHeight === 'high' ? 2.0 : 0.5;

        const spinCurve = aiSelectedCurve * 0.1;
        const oppAccuracy = opponentTeam.accuracy;
        
        let powerErrorFactor = 0.15;
        if (aiSelectedPower > 86) {
          powerErrorFactor = 0.45 + (aiSelectedPower - 86) * 0.04;
        }
        const edgeDistanceX = 4.5 - Math.abs(exactX);
        const edgeDistanceY = 2.8 - exactY;
        let edgeErrorFactor = 1.0;
        if (edgeDistanceX < 1.2) {
          edgeErrorFactor += (1.2 - edgeDistanceX) * 0.7;
        }
        if (edgeDistanceY < 0.7) {
          edgeErrorFactor += (0.7 - edgeDistanceY) * 0.9;
        }

        const errLimit = Math.max(0.04, (100 - oppAccuracy) * 0.012) * powerErrorFactor * edgeErrorFactor;
        const randomAngleX = (Math.random() - 0.5) * errLimit * 2.8;
        const randomAngleY = (Math.random() - 0.5) * errLimit * 2.3;

        const powerOverload = aiSelectedPower > 88 ? (aiSelectedPower - 86) * 0.07 : 0;

        state.finalDestX = exactX + randomAngleX + spinCurve * 0.5;
        state.finalDestY = exactY + randomAngleY + powerOverload;
        state.hasFinalDest = true;
      } else {
        state.hasFinalDest = false;
        state.finalDestX = 0;
        state.finalDestY = 0;
      }
    }
  }, [gameState, isOpponentTurn, opponentTeam]);

  const updateAimFromEvent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Map client coordinates to canvas scale dimensions
    const mx = ((clientX - rect.left) / rect.width) * dimensions.width;
    const my = ((clientY - rect.top) / rect.height) * dimensions.height;
    
    // Map to 3D goal mouth at Z = 0
    const scale = 320 / 8.1; // camera.z absolute in pre-shot state (z = -8.1 relative to goal line)
    const cx = dimensions.width / 2;
    const cy = dimensions.height * 0.58;
    
    const clickX = (mx - cx) / scale;
    const clickY = 1.2 - (my - cy) / scale; // camera.y is at 1.2 in pre-shot state of the camera view
    
    // Drag box limits
    const exactTargetX = Math.max(-4.4, Math.min(4.4, clickX));
    const exactTargetY = Math.max(-0.15, Math.min(2.7, clickY));
    
    setInteractiveTarget({ x: exactTargetX, y: exactTargetY });
    
    // Update higher sectors
    let dir: ShotDirection = 'center';
    if (exactTargetX < -1.15) dir = 'left';
    else if (exactTargetX > 1.15) dir = 'right';
    
    let h: ShotHeight = 'low';
    if (exactTargetY > 1.15) h = 'high';
    
    if (setDirection) setDirection(dir);
    if (setHeight) setHeight(h);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PRE_SHOT') return;
    if (isOpponentTurn) return; // Ignore canvas click clicks when playing as Goalkeeper
    handleImmersiveAction();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Pointer dragging is bypassed in 3-click mode
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Pointer releases are bypassed in 3-click mode
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-10 select-none bg-slate-950 flex flex-col justify-between overflow-hidden">
      {/* 1. STADIUM REAL-TIME CANVAS */}
      <canvas
        id="penalty-arena"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        className="absolute inset-0 w-full h-full object-cover z-0 cursor-pointer"
      />

      {/* 2. WORLD CUP 2026 SCOREBOARD HEADER BAR (IMMERSIVE OVERHEAD OVERLAY) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-sm md:max-w-lg w-[95%] transition-all select-none pointer-events-none drop-shadow-2xl">
        {/* Transparent scoreboard with no background card, details or border */}
        <div className="flex items-start justify-center w-full gap-3 md:gap-5 px-3 py-2 bg-transparent pointer-events-auto">
          
          {/* Left Player selection details & history */}
          <div className="flex flex-col items-end justify-start w-2/5 gap-2 pt-0.5">
            <div className="flex items-center gap-2.5 justify-end">
              <span className="text-base md:text-lg lg:text-xl font-black text-white uppercase tracking-widest block drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.65)]">
                {playerTeam.id}
              </span>
              <FlagBadge teamId={playerTeam.id} className="w-9 h-6 md:w-11 md:h-7 rounded-sm shadow-md border border-white/20" />
            </div>
            
            {/* Round Indicators for Player under flag */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.max(5, shotHistory.length) }).map((_, idx) => {
                const shot = shotHistory[idx];
                let bgCircle = "bg-white/5 border-white/10 text-white/30";
                let textSymbol = (idx + 1).toString();
                if (shot) {
                  if (shot.isGoal) {
                    bgCircle = "bg-[#00FF87] border-[#00FF87]/50 text-slate-950 font-bold shadow-[0_0_8px_rgba(0,255,135,0.65)]";
                    textSymbol = "✓";
                  } else {
                    bgCircle = "bg-rose-600 border-rose-500/50 text-white font-bold shadow-[0_0_8px_rgba(244,63,94,0.45)]";
                    textSymbol = "✗";
                  }
                } else if (idx === shotHistory.length && !isOpponentTurn && gameState === 'PRE_SHOT') {
                  bgCircle = "bg-sky-500/20 border-sky-450 text-sky-200 animate-pulse";
                }
                return (
                  <div key={idx} className={`w-4.5 h-4.5 md:w-5 md:h-5 rounded-full border flex items-center justify-center text-[10px] md:text-[11px] font-extrabold transition-all duration-200 ${bgCircle}`}>
                    {textSymbol}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Centered Large Numeric Score HUD */}
          <div className="flex items-center justify-center w-1/5 min-w-[85px] md:min-w-[105px]">
            <div className="flex items-center gap-2 font-mono">
              <div 
                className="flex items-center justify-center min-w-[42px] md:min-w-[50px] text-2xl md:text-3xl lg:text-4xl font-black bg-black/65 px-3 py-1 rounded-xl border-2 transition-colors duration-200"
                style={{ 
                  color: playerTeam.colors.shirt === '#ffffff' ? '#f1f5f9' : playerTeam.colors.shirt,
                  borderColor: playerTeam.colors.shirt,
                  textShadow: `0 0 10px ${playerTeam.colors.shirt}40`
                }}
              >
                {score}
              </div>
              
              <span className="text-xl md:text-2xl font-black text-white/75">-</span>
              
              <div 
                className="flex items-center justify-center min-w-[42px] md:min-w-[50px] text-2xl md:text-3xl lg:text-4xl font-black bg-black/65 px-3 py-1 rounded-xl border-2 transition-colors duration-200"
                style={{ 
                  color: opponentTeam.colors.shirt === '#ffffff' ? '#f1f5f9' : opponentTeam.colors.shirt,
                  borderColor: opponentTeam.colors.shirt,
                  textShadow: `0 0 10px ${opponentTeam.colors.shirt}40`
                }}
              >
                {opponentScore}
              </div>
            </div>
          </div>

          {/* Right Opponent selection details & history */}
          <div className="flex flex-col items-start justify-start w-2/5 gap-2 pt-0.5">
            <div className="flex items-center gap-2.5 justify-start">
              <FlagBadge teamId={opponentTeam.id} className="w-9 h-6 md:w-11 md:h-7 rounded-sm shadow-md border border-white/20" />
              <span className="text-base md:text-lg lg:text-xl font-black text-white uppercase tracking-widest block drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.65)]">
                {opponentTeam.id}
              </span>
            </div>
            
            {/* Round Indicators for Opponent under flag */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.max(5, opponentHistory.length) }).map((_, idx) => {
                const shot = opponentHistory[idx];
                let bgCircle = "bg-white/5 border-white/10 text-white/30";
                let textSymbol = (idx + 1).toString();
                if (shot) {
                  if (shot.isGoal) {
                    bgCircle = "bg-[#00FF87] border-[#00FF87]/50 text-slate-950 font-bold shadow-[0_0_8px_rgba(0,255,135,0.65)]";
                    textSymbol = "✓";
                  } else {
                    bgCircle = "bg-rose-600 border-rose-500/50 text-white font-bold shadow-[0_0_8px_rgba(244,63,94,0.45)]";
                    textSymbol = "✗";
                  }
                } else if (idx === opponentHistory.length && isOpponentTurn && gameState === 'PRE_SHOT') {
                  bgCircle = "bg-sky-500/20 border-sky-450 text-sky-200 animate-pulse";
                }
                return (
                  <div key={idx} className={`w-4.5 h-4.5 md:w-5 md:h-5 rounded-full border flex items-center justify-center text-[10px] md:text-[11px] font-extrabold transition-all duration-200 ${bgCircle}`}>
                    {textSymbol}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Knockout stage banner */}
        {stageName && gameState !== 'MATCH_OVER' && (
          <div className="mt-1 flex items-center gap-1.5 bg-black/50 border border-yellow-500/30 px-3 py-0.5 rounded-full pointer-events-none">
            <Trophy className="w-3 h-3 text-yellow-400" />
            <span className="text-[9px] md:text-[10px] font-mono font-black tracking-[0.25em] text-yellow-300/90 uppercase">
              {stageName}
            </span>
          </div>
        )}
      </div>

      {/* Floating Corner HUD Navigation & Audio System Triggers */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto flex items-center gap-2">
        <button 
          onClick={onExitSelection} 
          className="w-10 h-10 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-100 hover:bg-slate-900 hover:text-white transition active:scale-90 cursor-pointer shadow-lg"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setShowRestartConfirm(true)} 
          className="w-10 h-10 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-100 hover:bg-slate-900 hover:text-white transition active:scale-90 cursor-pointer shadow-lg"
          title="Reiniciar Partido"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-2">
        <button 
          onClick={handleMuteToggle} 
          className="w-10 h-10 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:bg-slate-900 hover:text-white transition active:scale-95 cursor-pointer shadow-lg"
          title="Sonido"
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#00E5FF]" />}
        </button>
      </div>

      {/* 4. ACTIVE SWEEPER PRE-SHOT INSTRUCTIONS OR TACTILE CONTROLS */}
      {gameState === 'PRE_SHOT' && (
        <div className="absolute bottom-6 inset-x-0 mx-auto w-full max-w-sm z-20 px-4 pointer-events-auto flex flex-col items-center gap-2">
          {!isOpponentTurn ? (
            // Striper's Shot lasers locked panel
            <>
              {/* Curve selector — same immersive style as the keeper dive buttons */}
              {aimingStep < 2 && (
                <div className="grid grid-cols-3 gap-6 w-[300px] md:w-[380px] mb-1 select-none text-center justify-between items-center">
                  {([
                    { dir: 'left', label: 'IZQ', val: -7 },
                    { dir: 'center', label: 'RECTO', val: 0 },
                    { dir: 'right', label: 'DER', val: 7 },
                  ] as const).map((opt) => {
                    const active = opt.val === 0 ? curve === 0 : (opt.val < 0 ? curve < 0 : curve > 0);
                    return (
                      <button
                        key={opt.val}
                        onClick={() => setCurve && setCurve(opt.val)}
                        className={`bg-transparent border-none font-sans font-black text-[11px] md:text-sm uppercase tracking-widest transition-all text-center cursor-pointer drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] flex flex-col items-center gap-1 ${
                          active ? 'text-[#00E5FF] scale-110' : 'text-white/70 hover:text-white hover:scale-105'
                        }`}
                      >
                        <span className={`text-2xl md:text-3xl ${active ? 'text-[#00E5FF]' : 'text-white/60'}`}>
                          {opt.dir === 'center' ? '↑' : opt.val < 0 ? '↖' : '↗'}
                        </span>
                        <span className={active ? 'text-[#00E5FF]' : 'text-white/70'}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
                <span className="text-[10px] font-sans font-black tracking-widest text-[#00E5FF] uppercase">
                  {aimingStep === 0 && "PASO 1: BLOQUEAR DIRECCIÓN"}
                  {aimingStep === 1 && "PASO 2: BLOQUEAR ALTURA"}
                  {aimingStep === 2 && "PASO 3: BLOQUEAR FUERZA DEL TIRO!"}
                </span>
              </div>

              {aimingStep === 2 && (
                <div className="w-52 bg-[#0d021c]/85 p-2 rounded-full border border-white/10 mt-0.5 animate-fade-in flex flex-col items-center gap-1">
                  <div className="w-full h-2 bg-black/40 rounded-full relative overflow-hidden flex items-center pr-1">
                    <div className="absolute left-[70%] w-[16%] h-full bg-[#00FF87]/30 border-x border-[#00FF87]/50" />
                    <div
                      id="power-bar-fill"
                      className={`absolute h-full transition-all duration-[6ms] rounded-full bg-amber-400`}
                      style={{ width: `${stateRef.current.sweepPower}%` }}
                    />
                  </div>
                  <span id="power-bar-text" className="text-[8px] font-mono tracking-wider text-[#00FF87] font-black uppercase">
                    PUNTO DULCE: 70% - 86% ({stateRef.current.sweepPower}%)
                  </span>
                </div>
              )}

              <p className="text-[8px] tracking-widest text-white/50 uppercase font-mono font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                TOCA LA PANTALLA O LA BARRA ESPACIADORA PARA DISPARAR
              </p>
            </>
          ) : (
            // Goalkeeper direct diving buttons (immersive in the pitch - pure typography, larger text, no background or emojis)
            <div className="grid grid-cols-3 gap-6 w-[320px] md:w-[420px] mt-2.5 select-none text-center justify-between items-center bg-transparent">
              <button
                onClick={() => handleKeeperDiveChoice('left')}
                className="bg-transparent border-none text-white hover:text-[#00FF87] font-sans font-black text-sm md:text-base uppercase tracking-widest active:scale-95 transition-all text-center cursor-pointer drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] hover:scale-110 flex flex-col items-center gap-1"
              >
                <span className="text-[#00FF87] text-xl md:text-2xl font-black animate-pulse select-none">↖</span>
                IZQUIERDA
              </button>
              <button
                onClick={() => handleKeeperDiveChoice('center')}
                className="bg-transparent border-none text-white hover:text-[#00FF87] font-sans font-black text-sm md:text-base uppercase tracking-widest active:scale-95 transition-all text-center cursor-pointer drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] hover:scale-110 flex flex-col items-center gap-1"
              >
                <span className="text-[#00FF87] text-xl md:text-2xl font-black animate-pulse select-none">↑</span>
                CENTRO
              </button>
              <button
                onClick={() => handleKeeperDiveChoice('right')}
                className="bg-transparent border-none text-white hover:text-[#00FF87] font-sans font-black text-sm md:text-base uppercase tracking-widest active:scale-95 transition-all text-center cursor-pointer drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] hover:scale-110 flex flex-col items-center gap-1"
              >
                <span className="text-[#00FF87] text-xl md:text-2xl font-black animate-pulse select-none">↗</span>
                DERECHA
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. MATCH ROUND REVISION / SUMMARY OVERLAYS CARD (only after the ball is resolved) */}
      {gameState !== 'PRE_SHOT' && gameState !== 'RUN_UP' && gameState !== 'KICK' && gameState !== 'BALL_FLIGHT' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-transparent pointer-events-auto p-6 select-none animate-fade-in">
          {gameState === 'MATCH_OVER' ? (
            <div className="flex flex-col items-center justify-center gap-6 select-none animate-scale-up max-w-sm w-full filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              {score > opponentScore ? (
                stageIndex >= totalStages - 1 ? (
                // CHAMPION — big shiny animated trophy, clean & elegant
                <div className="relative flex flex-col items-center text-center wc-pop">
                  {/* Pulsing golden glow halo */}
                  <div className="absolute -z-10 w-[440px] h-[440px] max-w-[90vw] rounded-full bg-[radial-gradient(circle,rgba(255,200,60,0.30),transparent_62%)] wc-glow" />

                  {/* Floating trophy with a sweeping shine */}
                  <div className="wc-float">
                    <div className="wc-shine-wrap inline-block rounded-xl drop-shadow-[0_10px_34px_rgba(255,190,40,0.55)]">
                      <svg viewBox="0 0 120 150" className="w-32 h-40 md:w-40 md:h-52">
                        <defs>
                          <linearGradient id="wcGold" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#fff6c8" />
                            <stop offset="0.32" stopColor="#ffd84d" />
                            <stop offset="0.62" stopColor="#f5a623" />
                            <stop offset="1" stopColor="#b8791b" />
                          </linearGradient>
                        </defs>
                        <path d="M30 18 H90 V40 Q90 80 60 92 Q30 80 30 40 Z" fill="url(#wcGold)" />
                        <path d="M30 26 Q10 28 15 50 Q20 66 35 60" fill="none" stroke="url(#wcGold)" strokeWidth="6" strokeLinecap="round" />
                        <path d="M90 26 Q110 28 105 50 Q100 66 85 60" fill="none" stroke="url(#wcGold)" strokeWidth="6" strokeLinecap="round" />
                        <rect x="54" y="92" width="12" height="20" fill="url(#wcGold)" />
                        <rect x="38" y="112" width="44" height="9" rx="3" fill="url(#wcGold)" />
                        <rect x="31" y="121" width="58" height="15" rx="4" fill="url(#wcGold)" />
                        <ellipse cx="47" cy="42" rx="5" ry="16" fill="#ffffff" opacity="0.45" />
                      </svg>
                    </div>
                  </div>

                  <span className="mt-3 text-[11px] font-mono font-black tracking-[0.3em] text-yellow-300/90 uppercase wc-fade-in">
                    Copa Mundial 2026
                  </span>
                  <h1 className="mt-1 text-4xl md:text-6xl font-display font-black uppercase tracking-wide bg-gradient-to-b from-yellow-100 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)]">
                    Campeón del Mundo
                  </h1>

                  <div className="mt-4 flex items-center gap-3 wc-rise">
                    <FlagBadge teamId={playerTeam.id} className="w-11 h-7 rounded shadow-lg border border-white/25" />
                    <span className="text-xl md:text-3xl font-display font-black text-white tracking-wide">
                      {playerTeam.name.toUpperCase()}
                    </span>
                  </div>

                  <button
                    onClick={onExitSelection}
                    className="mt-8 py-3.5 px-10 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 transition-all duration-300 font-display font-black text-xs uppercase tracking-widest rounded-full shadow-[0_6px_24px_rgba(255,190,40,0.4)] hover:shadow-[0_6px_34px_rgba(255,190,40,0.6)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer wc-rise"
                  >
                    <RotateCcw className="w-4 h-4" /> Jugar de nuevo
                  </button>
                </div>
                ) : (
                // ADVANCED — classified to the next knockout round
                <div className="relative flex flex-col items-center text-center wc-pop max-w-md px-2">
                  <div className="absolute -z-10 w-[420px] h-[420px] max-w-[90vw] rounded-full bg-[radial-gradient(circle,rgba(0,255,135,0.16),transparent_62%)] wc-glow" />

                  <span className="text-[11px] font-mono font-black tracking-[0.3em] text-[#00FF87] uppercase wc-fade-in">Clasificado</span>
                  <h1 className="mt-1 text-3xl md:text-5xl font-display font-black uppercase tracking-wide text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)]">
                    ¡A {TOURNAMENT_STAGES[Math.min(stageIndex + 1, totalStages - 1)]}!
                  </h1>

                  {/* Bracket progress */}
                  <div className="mt-5 flex items-center gap-1.5 md:gap-2.5 wc-rise">
                    {(['Octavos', 'Cuartos', 'Semi', 'Final'] as const).map((label, i) => {
                      const done = i <= stageIndex;
                      const next = i === stageIndex + 1;
                      return (
                        <React.Fragment key={label}>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-black transition ${
                              done ? 'bg-[#00FF87] border-[#00FF87] text-slate-950 shadow-[0_0_10px_rgba(0,255,135,0.5)]'
                              : next ? 'border-[#00E5FF] text-[#00E5FF] animate-pulse'
                              : 'border-white/15 text-white/30'}`}>
                              {done ? '✓' : i + 1}
                            </div>
                            <span className={`text-[8px] md:text-[9px] font-mono uppercase tracking-wider ${done ? 'text-[#00FF87]' : next ? 'text-[#00E5FF]' : 'text-white/30'}`}>{label}</span>
                          </div>
                          {i < 3 && <div className={`w-4 md:w-7 h-0.5 rounded ${i < stageIndex ? 'bg-[#00FF87]' : 'bg-white/10'}`} />}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Next opponent */}
                  {nextOpponent && (
                    <div className="mt-6 flex flex-col items-center gap-1.5 wc-rise">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Próximo rival</span>
                      <div className="flex items-center gap-3">
                        <FlagBadge teamId={nextOpponent.id} className="w-10 h-7 rounded shadow-lg border border-white/20" />
                        <span className="text-lg md:text-2xl font-display font-black text-white tracking-wide">{nextOpponent.name.toUpperCase()}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#00E5FF]">Arquero: {GOALKEEPER_REGISTRY[nextOpponent.id]?.name || 'Portero'}</span>
                    </div>
                  )}

                  <button
                    onClick={onAdvance}
                    className="mt-7 py-3.5 px-10 bg-gradient-to-r from-[#00FF87] to-[#00E5FF] hover:from-[#00E5FF] hover:to-[#00FF87] text-slate-950 transition-all duration-300 font-display font-black text-xs uppercase tracking-widest rounded-full shadow-[0_6px_24px_rgba(0,255,135,0.35)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer wc-rise"
                  >
                    Siguiente partido →
                  </button>
                </div>
                )
              ) : (
                // DEFEAT — clean text + button, no card / no background
                <div className="flex flex-col items-center text-center gap-4 wc-pop">
                  <span className="text-[11px] font-mono font-black tracking-[0.3em] text-rose-400 uppercase">Fin del torneo</span>
                  <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-wide text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
                    Quedaste eliminado
                  </h1>
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-8 justify-center">
                      <div className="flex items-center gap-3">
                        <FlagBadge teamId={playerTeam.id} className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/25" />
                        <strong className="text-white font-extrabold text-2xl">{playerTeam.name.toUpperCase()}</strong>
                      </div>

                      <span className="text-lg text-white/80">cayó ante</span>

                      <div className="flex items-center gap-3">
                        <FlagBadge teamId={opponentTeam.id} className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/25" />
                        <strong className="text-white font-extrabold text-2xl">{opponentTeam.name.toUpperCase()}</strong>
                      </div>
                    </div>

                    <div className="mt-2 text-center">
                      <span className="text-xs text-white mr-2">Eliminado en</span>
                      <span className="text-xs text-amber-300 font-bold">{eliminatedStage}</span>
                    </div>

                    <audio ref={bgAudioRef} src="/audio/background.mp3" loop preload="auto" />
                    {!bgPlaying && (
                      <button
                        onClick={() => {
                          try { audioEngine.setMute(false); } catch (e) {}
                          const el = bgAudioRef.current;
                          if (el) {
                            el.play().then(() => setBgPlaying(true)).catch(() => setBgPlaying(false));
                          }
                        }}
                        className="mt-2 text-xs text-slate-200 bg-slate-800/60 px-3 py-1 rounded-lg"
                      >Reproducir música</button>
                    )}
                  </div>

                  <button
                    onClick={onExitSelection}
                    className="mt-3 py-3.5 px-10 bg-gradient-to-r from-[#1e3a8a] to-[#00E5FF] hover:from-[#111827] hover:to-[#00FF87] text-white transition-all duration-300 font-display font-black text-xs uppercase tracking-widest rounded-full shadow-[0_4px_18px_rgba(0,229,255,0.3)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Volver a jugar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center flex flex-col items-center gap-5 animate-scale-up">
              {(() => {
                // Last resolved kick of whoever just shot — drives a context-aware headline + commentary line
                const lastShot = isOpponentTurn ? opponentHistory[opponentHistory.length - 1] : shotHistory[shotHistory.length - 1];
                const fp = lastShot?.ballFinalPos;
                const isTopBins = !!fp && Math.abs(fp.x) > 3.2 && fp.y > 1.55; // tucked into the angle
                const hitWood = !!lastShot?.hitWoodwork;

                let headline = '';
                let gradient = 'from-[#1e3a8a] to-[#00E5FF]';
                if (gameState === 'CELEBRATION') {
                  if (isOpponentTurn) { headline = `GOL DE ${opponentTeam.name.toUpperCase()}`; gradient = 'from-rose-500 to-[#1e3a8a]'; }
                  else { headline = isTopBins ? '¡GOLAZO AL ÁNGULO!' : '¡GOLAZOOO!'; gradient = 'from-[#00FF87] to-[#00E5FF]'; }
                } else if (gameState === 'SAVED') {
                  if (hitWood) { headline = '¡AL PALO!'; gradient = 'from-amber-400 to-[#00E5FF]'; }
                  else if (isOpponentTurn) { headline = '¡ATAJADÓN!'; gradient = 'from-[#00FF87] to-[#00E5FF]'; } // you saved it
                  else { headline = '¡TIRO ATAJADO!'; gradient = 'from-slate-300 to-[#1e3a8a]'; } // your shot stopped
                } else if (gameState === 'OUT_OF_BOUNDS') {
                  gradient = 'from-[#CE080E] to-[#1e3a8a]';
                  headline = isOpponentTurn ? '¡AFUERA! ERRÓ EL RIVAL' : '¡LA MANDASTE AFUERA!';
                }

                return (
                  <div className="flex flex-col items-center gap-2">
                    <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-wider drop-shadow-[0_8px_16px_rgba(0,0,0,0.95)]">
                      <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${gameState === 'CELEBRATION' ? 'animate-pulse animate-duration-1000' : ''}`}>
                        {headline}
                      </span>
                    </h1>
                    {lastShot?.message && (
                      <p className="text-sm md:text-base font-semibold text-white/85 max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        {lastShot.message}
                      </p>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={onResetMatch}
                className="py-3 px-8 bg-gradient-to-r from-[#1e3a8a] to-[#00E5FF] text-white transition-all duration-350 font-display font-black text-xs uppercase tracking-widest rounded-full shadow-[0_4px_24px_rgba(0,229,255,0.35)] hover:shadow-[0_4px_36px_rgba(0,229,255,0.55)] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-[#1e3a8a]/25 font-extrabold"
              >
                CONTINUAR TANDA DE PENALES
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. IMMERSIVE RESTART WARNING CONFIRMATION DIALOG MODAL */}
      {showRestartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6 select-none animate-fade-in pointer-events-auto">
          <div className="bg-[#0b0f19] border border-white/10 p-6 md:p-8 rounded-2xl max-w-sm md:max-w-md w-full text-center flex flex-col items-center gap-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 animate-pulse">
              <RotateCcw className="w-8 h-8" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider">
                ¿REINICIAR EL PARTIDO DESDE CERO?
              </h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-semibold">
                Esta acción cancelará la tanda de penales actual y reiniciará el marcador a 0 - 0. ¿Estás seguro de que deseas reiniciar?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="flex-1 py-3 px-5 rounded-xl border border-white/10 text-white font-sans font-bold text-xs uppercase tracking-widest hover:bg-white/5 active:scale-95 transition cursor-pointer text-center"
              >
                REGRESAR
              </button>
              <button
                onClick={() => {
                  setShowRestartConfirm(false);
                  onRestartMatch();
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-black text-xs uppercase tracking-widest active:scale-95 transition cursor-pointer text-center shadow-[0_4px_15px_rgba(245,158,11,0.3)]"
              >
                SÍ, REINICIAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
