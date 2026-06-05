import React, { useRef, useEffect, useState } from 'react';
import { Team, GameState, ShotDirection, ShotHeight, ShotResult } from '../types';
import { audioEngine } from './AudioEngine';
import { Volume2, VolumeX, ArrowLeft, Trophy, RotateCcw, Gamepad2, Info, XCircle } from 'lucide-react';

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
  shotCount: number; // 1 to 5 to regulate difficulty
  onAnimationTriggered: () => void;
  onShoot?: (dir: ShotDirection, h: ShotHeight, power: number, curve: number) => void;
  
  // Immersive properties
  score: number;
  shotHistory: ShotResult[];
  onExitSelection: () => void;
  onResetMatch: () => void;
}

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
  shotHistory,
  onExitSelection,
  onResetMatch
}: StadiumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 3-Click penalty shoot state controls
  const [aimingStep, setAimingStep] = useState<0 | 1 | 2>(0); // 0 = Direction (X), 1 = Height (Y), 2 = Power
  const [isAudioMuted, setIsAudioMuted] = useState(false);

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
    
    // Sweep states
    sweepX: 0,
    sweepY: 1.4,
    sweepPower: 50,
    // Locked states
    lockedX: 0,
    lockedY: 1.4,
    
    // Exact analog trajectory target
    aimTarget: { x: 0, y: 1.4 },
    
    // Ball physical state (nearer distance: z = -7.5 instead of -11)
    ball: { x: 0, y: 0.11, z: -7.5, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, scale: 1 },
    // Ball spin rotation speeds
    ballSpin: { x: 0, y: 0 },
    
    // Player physical state (nearer distance: z = -8.7 instead of -12.5)
    kicker: { x: -0.9, y: 0, z: -8.7, rightLegAngle: 0, leftLegAngle: 0, frame: 0 },
    
    // Goalkeeper physical state
    keeper: {
      x: 0,
      y: 0,
      z: 0,
      targetX: 0,
      targetY: 0,
      angle: 0,
      scaleY: 1,
      diveProgress: 0,
      hairColor: '#331a00'
    },
    
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
  }, [gameState, playerTeam, opponentTeam, direction, height, power, curve, shotCount]);

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

  // Keyboard space keybind
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PRE_SHOT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleImmersiveAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, curve, onShoot]);

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
    let camera = { x: 0, y: 1.6, z: -10.5, tx: 0, ty: 1.2, tz: -7.5 }; // follow camera state target closer to penalty spot z = -7.5

    // Generate simulated stars / stadium lighting overhead
    const stadiumLights = [
      { x: -15, y: 12, z: -2 },
      { x: -5, y: 12, z: -4 },
      { x: 5, y: 12, z: -4 },
      { x: 15, y: 12, z: -2 },
    ];

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

      // Add camera shake effect to projection if active
      const shakeX = screenShake ? (Math.random() - 0.5) * screenShake : 0;
      const shakeY = screenShake ? (Math.random() - 0.5) * screenShake : 0;

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

      // Clear Canvas
      ctx.fillStyle = '#064e3b'; // Fallback solid green stadium lawn
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Handle Camera movement logic smoothly
      if (state.gameState === 'PRE_SHOT') {
        // Static camera behind kicker closer to penalty spot z = -7.5
        camera.x = camera.x * 0.95 + 0 * 0.05;
        camera.y = camera.y * 0.95 + 1.25 * 0.05;
        camera.z = camera.z * 0.95 + -10.5 * 0.05;

        // Sweep variables update
        if (aimingStepRef.current === 0) {
          // Phase 0: Sweep X direction (-4.4 to +4.4)
          const sweepSpeed = 0.038 + (state.shotCount - 1) * 0.005;
          state.sweepX = Math.sin(state.frameIndex * sweepSpeed) * 4.4;
          state.aimTarget = { x: state.sweepX, y: 1.4 };
        } else if (aimingStepRef.current === 1) {
          // Phase 1: Sweep Y height (0.15 to 2.7)
          const sweepSpeed = 0.048 + (state.shotCount - 1) * 0.005;
          state.sweepY = 1.4 + Math.sin(state.frameIndex * sweepSpeed) * 1.35;
          state.aimTarget = { x: state.lockedX, y: state.sweepY };
        } else if (aimingStepRef.current === 2) {
          // Phase 2: Sweep Power (10 to 100)
          const sweepSpeed = 0.11 + (state.shotCount - 1) * 0.012;
          state.sweepPower = Math.round(50 + Math.sin(state.frameIndex * sweepSpeed) * 48);
          if (setPower) {
            setPower(state.sweepPower);
          }
        }
      } else if (state.gameState === 'RUN_UP' || state.gameState === 'KICK') {
        // Slight forward tilt on approach
        camera.y = camera.y * 0.95 + 1.2 * 0.05;
        camera.z = camera.z * 0.95 + -10.1 * 0.05;
      } else if (state.gameState === 'BALL_FLIGHT' || state.gameState === 'CELEBRATION' || state.gameState === 'SAVED' || state.gameState === 'OUT_OF_BOUNDS') {
        // Broadcast tracking panning of the shot
        const targetCamX = state.ball.x * 0.45;
        const targetCamY = Math.max(1.3, state.ball.y * 0.5 + 1.0);
        const targetCamZ = -13.4 + state.ball.z * 0.25;

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

      // Render seating rows and dots representing crowd
      const bannerY = dimensions.height * 0.41;
      
      // Draw crowd stands
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, dimensions.height * 0.22);
      ctx.lineTo(dimensions.width, dimensions.height * 0.22);
      ctx.lineTo(dimensions.width, bannerY);
      ctx.lineTo(0, bannerY);
      ctx.closePath();
      ctx.fill();

      // Stadium tiers highlights
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      for (let j = 0; j < 4; j++) {
        const ty = dimensions.height * 0.22 + (j * (bannerY - dimensions.height * 0.22)) / 4;
        ctx.beginPath();
        ctx.moveTo(0, ty);
        ctx.lineTo(dimensions.width, ty);
        ctx.stroke();
      }

      // Draw active crowd pixels inside stands
      const crowdScale = state.gameState === 'CELEBRATION' ? 2.5 : 0.8;
      ctx.fillStyle = '#f87171'; // crowd colors
      for (let i = 0; i < dimensions.width; i += 18) {
        for (let j = dimensions.height * 0.23; j < bannerY; j += 12) {
          // Micro jumping vibration
          const jump = (state.gameState === 'CELEBRATION') ? Math.sin(state.crowdTimer * 6.5 + i * 0.12) * 5.0 : Math.sin(state.crowdTimer * 1.5 + i * 0.05) * 1.2;
          const rSeed = Math.sin(i * 100 + j * 50);
          
          // Varied crowd shirts
          if (rSeed > 0.45) ctx.fillStyle = '#ef4444'; // Red
          else if (rSeed > 0.1) ctx.fillStyle = '#3b82f6'; // Blue
          else if (rSeed > -0.2) ctx.fillStyle = '#fbbf24'; // Yellow
          else if (rSeed > -0.6) ctx.fillStyle = '#10b981'; // Green
          else ctx.fillStyle = '#ffffff';

          ctx.fillRect(i + (rSeed * 6), j + jump - 2, 4, 4);
          
          // Small skin tone dots for heads
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(i + (rSeed * 6) + 1, j + jump - 5, 2, 2);
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

      // 2. RENDER GRASS TEXTURED FIELD WITH PERSPECTIVE STRIPES
      ctx.save();
      const numStripes = 16;
      for (let s = 0; s < numStripes; s++) {
        // alternating green shades
        const stripeColor = s % 2 === 0 ? '#14532d' : '#15803d'; // alternating dark and light grass
        ctx.fillStyle = stripeColor;

        const zNear = -15 + s * 1.1;
        const zFar = zNear + 1.1;

        // Strip vertices
        const pL1 = project(-30, 0, zNear, state.screenShake);
        const pR1 = project(30, 0, zNear, state.screenShake);
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

      // Render realistic sponsor hoardings / fence boards in 3D behind the goal at Z=1.6
      const sponsorBoards = [
        { xStart: -20, xEnd: -15, bgColor: '#0f172a', textColor: '#ffffff', brand: 'adidas' },
        { xStart: -15, xEnd: -10, bgColor: '#991b1b', textColor: '#ffffff', brand: 'Coca-Cola' },
        { xStart: -10, xEnd: -5,  bgColor: '#1e3a8a', textColor: '#fbbf24', brand: 'VISA' },
        { xStart: -5,  xEnd: 0,   bgColor: '#4c0519', textColor: '#ffffff', brand: 'QATAR' },
        { xStart: 0,   xEnd: 5,   bgColor: '#065f46', textColor: '#38bdf8', brand: 'UNITED 2026' },
        { xStart: 5,   xEnd: 10,  bgColor: '#1e293b', textColor: '#cbd5e1', brand: 'HYUNDAI' },
        { xStart: 10,  xEnd: 15,  bgColor: '#991b1b', textColor: '#fbbf24', brand: 'McDonald’s' },
        { xStart: 15,  xEnd: 20,  bgColor: '#0f172a', textColor: '#10b981', brand: 'FIFA' },
      ];

      sponsorBoards.forEach(sb => {
        const pBL = project(sb.xStart, 0, 1.6, state.screenShake);
        const pTL = project(sb.xStart, 0.95, 1.6, state.screenShake);
        const pTR = project(sb.xEnd, 0.95, 1.6, state.screenShake);
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

          // Text branding in perspective
          const midX = (pTL.x + pTR.x + pBL.x + pBR.x) / 4;
          const midY = (pTL.y + pTR.y + pBL.y + pBR.y) / 4;
          const labelSize = Math.max(7, Math.round(pTL.scale * 0.12));

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
          // run-up forward motion: ball is at z=-11, player runs from z=-12.5 to z=-11.45
          pK.z += 0.057; 
          
          // Smooth diagonal approach from left to clear goalkeeper line of sight
          const progress = (pK.z - (-12.5)) / (-11.45 - (-12.5));
          pK.x = -1.2 + Math.min(1.0, Math.max(0, progress)) * (1.2 - 0.15); // approaches ball diagonally
          
          pK.rightLegAngle = Math.sin(pK.frame * 0.4) * 0.55;
          pK.leftLegAngle = -Math.sin(pK.frame * 0.4) * 0.55;

          // Release shot precisely on final run-up frame
          if (pK.z >= -11.45) {
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
            audioEngine.playKick(state.power / 100);
            state.gameState = 'BALL_FLIGHT';

            // Calculate precise initial physical vector from setup variables
            // Standard speed scaling with power stat and stopped slider value
            const finalPower = state.power;
            const perfectMult = (finalPower >= 72 && finalPower <= 88) ? 1.05 : 0.88;
            const velocityZ = 0.15 + (finalPower / 100) * 0.16 * perfectMult; 

            // Use exact targeted analog coordinate if dragging target is set, falling back to sectors (closer penalty spot bounds)
            const exactX = state.aimTarget ? state.aimTarget.x : (state.direction === 'left' ? -3.2 : (state.direction === 'right' ? 3.2 : 0));
            const exactY = state.aimTarget ? state.aimTarget.y : (state.height === 'high' ? 2.2 : 0.3);

            // Apply spin curving
            // e.g. -10 is left spin, accelerates x to the left mid flight.
            const spinCurve = state.curve * 0.12;

            // Accuracy & randomness dispersion based on team stats
            const playerAccuracy = state.playerTeam.accuracy;
            const errLimit = Math.max(0.1, (100 - playerAccuracy) * 0.02); // tighter spread for manual aiming reward
            const randomAngleX = (Math.random() - 0.5) * errLimit;
            const randomAngleY = (Math.random() - 0.5) * errLimit;

            // Over-power adds ballooning dispersion
            const powerOverload = finalPower > 88 ? (finalPower - 85) * 0.05 : 0;

            // Final destination at Z = 0 (using the new larger goal limits)
            const finalDestX = exactX + randomAngleX * 2.5 + spinCurve * 1.2;
            const finalDestY = exactY + randomAngleY * 2.0 + powerOverload;

            // Number of flight ticks is derived from closer distance / speed
            const flightTicks = Math.round(7.5 / velocityZ);

            state.ball.vx = (finalDestX - state.ball.x) / flightTicks;
            state.ball.vy = (finalDestY - state.ball.y) / flightTicks + 0.038; // add high pitch gravity compensation arc
            state.ball.vz = velocityZ;

            // Spin velocities
            state.ballSpin.x = 0.55;
            state.ballSpin.y = state.curve * 0.086;

            // Trigger Goalkeeper AI Dive decision based on patterns
            // Let's bias keeper to dive left/right of player history
            const history = state.shotHistory;
            let keeperDiveDir: ShotDirection = 'center';
            let keeperHeight: ShotHeight = 'low';

            // Decide direction with biased patterns
            const rand = Math.random();
            const leftCount = history.filter(d => d === 'left').length;
            const rightCount = history.filter(d => d === 'right').length;

            if (history.length >= 2 && (leftCount / history.length) > 0.6) {
              // Bias keeper to slide left 60% of times
              keeperDiveDir = rand < 0.6 ? 'left' : (rand < 0.85 ? 'right' : 'center');
            } else if (history.length >= 2 && (rightCount / history.length) > 0.6) {
              keeperDiveDir = rand < 0.6 ? 'right' : (rand < 0.85 ? 'left' : 'center');
            } else {
              // Standard equal chance keeper logic
              if (rand < 0.36) keeperDiveDir = 'left';
              else if (rand < 0.72) keeperDiveDir = 'right';
              else keeperDiveDir = 'center';
            }

            // High or low keeper action match
            keeperHeight = Math.random() < 0.5 ? 'low' : 'high';

            // Log current direction to shot history
            state.shotHistory.push(state.direction);

            // Goalkeeper diving physical target coordinates (scaled wider and taller for the larger goal sizes!)
            state.keeper.targetX = keeperDiveDir === 'left' ? -3.4 : (keeperDiveDir === 'right' ? 3.4 : 0);
            state.keeper.targetY = keeperHeight === 'high' ? 1.8 : 0.45;
            state.keeper.diveProgress = 0;

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

          // Player Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.beginPath();
          ctx.ellipse(pKP.x, pKP.y, pKP.scale * 0.35, pKP.scale * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();

          // Leg Left (drawn relative to player position)
          const colorSet = state.playerTeam.colors;
          ctx.strokeStyle = colorSet.shorts;
          ctx.lineWidth = sz * 0.12;
          ctx.lineCap = 'round';
          
          // Draw left leg hinging on pelvis
          const leftHipX = pKP.x - sz * 0.08;
          const leftHipY = pKP.y - sz * 0.44;
          const leftFootX = leftHipX + Math.sin(pK.leftLegAngle) * sz * 0.18;
          const leftFootY = pKP.y - sz * 0.2;
          ctx.beginPath();
          ctx.moveTo(leftHipX, leftHipY);
          ctx.lineTo(leftFootX, leftFootY);
          ctx.stroke();

          // Leg Right
          const rightHipX = pKP.x + sz * 0.08;
          const rightHipY = pKP.y - sz * 0.44;
          const rightFootX = rightHipX + Math.sin(pK.rightLegAngle) * sz * 0.22;
          const rightFootY = pKP.y - sz * 0.2;
          ctx.strokeStyle = colorSet.shorts;
          ctx.beginPath();
          ctx.moveTo(rightHipX, rightHipY);
          ctx.lineTo(rightFootX, rightFootY);
          ctx.stroke();

          // Torso / Jersey (stripy or plain)
          ctx.fillStyle = colorSet.shirt;
          ctx.fillRect(pKP.x - sz * 0.15, pKP.y - sz * 0.8, sz * 0.3, sz * 0.38);

          if (colorSet.pattern === 'stripes' && colorSet.stripes) {
            ctx.fillStyle = colorSet.stripes;
            ctx.fillRect(pKP.x - sz * 0.1, pKP.y - sz * 0.8, sz * 0.04, sz * 0.38);
            ctx.fillRect(pKP.x + sz * 0.06, pKP.y - sz * 0.8, sz * 0.04, sz * 0.38);
          } else if (colorSet.pattern === 'squares' && colorSet.stripes) {
            // Croatia checkers checker-squares
            ctx.fillStyle = colorSet.stripes;
            ctx.fillRect(pKP.x - sz * 0.15, pKP.y - sz * 0.8, sz * 0.1, sz * 0.1);
            ctx.fillRect(pKP.x + sz * 0.05, pKP.y - sz * 0.8, sz * 0.1, sz * 0.1);
            ctx.fillRect(pKP.x - sz * 0.05, pKP.y - sz * 0.7, sz * 0.1, sz * 0.1);
            ctx.fillRect(pKP.x - sz * 0.15, pKP.y - sz * 0.6, sz * 0.1, sz * 0.1);
            ctx.fillRect(pKP.x + sz * 0.05, pKP.y - sz * 0.6, sz * 0.1, sz * 0.1);
          }

          // Arms extending out
          ctx.strokeStyle = '#fbcfe8';
          ctx.lineWidth = sz * 0.07;
          ctx.beginPath();
          // left arm
          ctx.moveTo(pKP.x - sz * 0.16, pKP.y - sz * 0.75);
          ctx.lineTo(pKP.x - sz * 0.32, pKP.y - sz * 0.62);
          // right arm
          ctx.moveTo(pKP.x + sz * 0.16, pKP.y - sz * 0.75);
          ctx.lineTo(pKP.x + sz * 0.32, pKP.y - sz * 0.62);
          ctx.stroke();

          // Head with customized hair
          ctx.fillStyle = '#fbcfe8'; // Skin
          ctx.beginPath();
          ctx.arc(pKP.x, pKP.y - sz * 0.9, sz * 0.09, 0, Math.PI * 2);
          ctx.fill();

          // Hair based on players (Messi: auburn #a855f7, Mbappe: short dark, Ronaldo: black #18181b, Modric: blond #fef08a)
          let hairColor = '#18181b';
          if (state.playerTeam.id === 'ARG') hairColor = '#854d0e'; // auburn/brown
          else if (state.playerTeam.id === 'CRO') hairColor = '#eab308'; // blonde
          else if (state.playerTeam.id === 'ESP') hairColor = '#451a03';
          else if (state.playerTeam.id === 'GER') hairColor = '#ca8a04';
          else if (state.playerTeam.id === 'NED') hairColor = '#78350f';
          
          ctx.fillStyle = hairColor;
          ctx.beginPath();
          // Draw hair helmet shape
          ctx.arc(pKP.x, pKP.y - sz * 0.94, sz * 0.09, Math.PI, 0);
          ctx.fill();
          
          ctx.restore();
        }
      }

      // 5. UPDATE AND RENDER GOALKEEPER AI
      const gK = state.keeper;
      
      if (state.gameState === 'BALL_FLIGHT' || state.gameState === 'SAVED' || state.gameState === 'CELEBRATION') {
        // Diving animation in progress
        gK.diveProgress = Math.min(1.0, gK.diveProgress + 0.06);
        gK.x = gK.x * 0.8 + gK.targetX * gK.diveProgress * 0.2;
        gK.y = gK.y * 0.8 + gK.targetY * gK.diveProgress * 0.2;
        
        // Tilt rotation of diving body
        if (gK.targetX !== 0) {
          gK.angle = (gK.targetX > 0 ? 1 : -1) * 0.92 * gK.diveProgress;
          gK.scaleY = 0.55;
        } else {
          // Centered reaction
          gK.angle = 0;
          gK.scaleY = gK.targetY > 0.8 ? 0.8 : 1.0;
        }
      } else {
        // Gentle breathing bounce / shuffle left-right pre-shot
        gK.x = Math.sin(state.frameIndex * 0.12) * 0.52;
        gK.y = 0;
        gK.angle = Math.sin(state.frameIndex * 0.12) * 0.04;
        gK.scaleY = 1.0 + Math.sin(state.frameIndex * 0.16) * 0.03;
      }

      // Render Goalkeeper in perspective
      const gKP = project(gK.x, gK.y, gK.z, state.screenShake);
      if (gKP.ok) {
        ctx.save();
        ctx.translate(gKP.x, gKP.y);
        ctx.rotate(gK.angle);

        const szG = gKP.scale * 1.8;

        // Goalkeeper Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.ellipse(0, 0, gKP.scale * 0.4, gKP.scale * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.strokeStyle = '#1e293b'; // black shorts
        ctx.lineWidth = szG * 0.12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-szG * 0.08, -szG * 0.44);
        ctx.lineTo(-szG * 0.12, -szG * 0.05);

        ctx.moveTo(szG * 0.08, -szG * 0.44);
        ctx.lineTo(szG * 0.12, -szG * 0.05);
        ctx.stroke();

        // Goalkeeper shirt: Custom neon jersey colors (contrast of opposing kits)
        ctx.fillStyle = '#10b981'; // Neon Emerald/Lime Green goalie jersey
        ctx.fillRect(-szG * 0.16, -szG * 0.8, szG * 0.32, szG * 0.38 * gK.scaleY);

        // Bright goalkeeper yellow highlights
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-szG * 0.04, -szG * 0.8, szG * 0.08, szG * 0.38 * gK.scaleY);

        // Arms stretched out or diving reaching
        ctx.strokeStyle = '#22d3ee'; // Sleeves
        ctx.lineWidth = szG * 0.09;
        ctx.beginPath();
        if (state.gameState === 'BALL_FLIGHT' || state.gameState === 'SAVED') {
          // block reach hands outstretched
          ctx.moveTo(-szG * 0.16, -szG * 0.72);
          ctx.lineTo(-szG * 0.48 * (1 + gK.diveProgress * 0.2), -szG * 0.82);

          ctx.moveTo(szG * 0.16, -szG * 0.72);
          ctx.lineTo(szG * 0.48 * (1 + gK.diveProgress * 0.2), -szG * 0.82);
        } else {
          // relaxed goalie pose
          ctx.moveTo(-szG * 0.16, -szG * 0.72);
          ctx.lineTo(-szG * 0.38, -szG * 0.52);

          ctx.moveTo(szG * 0.16, -szG * 0.72);
          ctx.lineTo(szG * 0.38, -szG * 0.52);
        }
        ctx.stroke();

        // Big Goalie Gloves!
        ctx.fillStyle = '#fb923c'; // Orange bright gloves
        ctx.beginPath();
        if (state.gameState === 'BALL_FLIGHT' || state.gameState === 'SAVED') {
          ctx.arc(-szG * 0.48, -szG * 0.82, szG * 0.065, 0, Math.PI * 2);
          ctx.arc(szG * 0.48, -szG * 0.82, szG * 0.065, 0, Math.PI * 2);
        } else {
          ctx.arc(-szG * 0.38, -szG * 0.52, szG * 0.06, 0, Math.PI * 2);
          ctx.arc(szG * 0.38, -szG * 0.52, szG * 0.06, 0, Math.PI * 2);
        }
        ctx.fill();

        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, -szG * 0.88, szG * 0.095, 0, Math.PI * 2);
        ctx.fill();

        // Cap or dark hair
        ctx.fillStyle = gK.hairColor;
        ctx.beginPath();
        ctx.arc(0, -szG * 0.92, szG * 0.095, Math.PI, 0);
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
      if (state.gameState === 'BALL_FLIGHT') {
        const b = state.ball;
        
        // Curve bending math: Curve applies lateral air displacement over time
        const horizontalAirDrift = state.curve * 0.0022; // subtle continuous lateral slice
        b.vx += horizontalAirDrift;

        // Gravity pull down over time
        const realGravityTick = -0.0025; 
        b.vy += realGravityTick;

        // Apply velocities
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;

        // Rotate ball based on curve
        b.rotX += state.ballSpin.x;
        b.rotY += state.ballSpin.y;

        // Check boundary & goal line events when passing Z = 0
        if (b.z >= 0) {
          // Analyze goalie contact coordinates vs ball coordinates
          const goalieGloveSpan = 1.25; // radius of grab
          const distToGK = Math.sqrt(Math.pow(b.x - gK.x, 2) + Math.pow(b.y - gK.y, 2));

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
            isPerfect: state.power >= 72 && state.power <= 88,
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
            result.message = 'WOODWORK! Frame clattered!';
            
            state.gameState = 'SAVED';
            if (!state.shotLogged) {
              state.shotLogged = true;
              audioEngine.playGasp();
              onShotComplete(result);
            }
          } 
          // Check Goalkeeper block / save state
          else if (distToGK < goalieGloveSpan) {
            // Save!
            audioEngine.playKick(0.35); // pop sound
            state.screenShake = 4.0;
            
            // Deflect ball high or side
            b.z = -0.1;
            b.vz = -b.vz * 0.3;
            b.vx = (b.x - gK.x) * 0.08 + (Math.random() - 0.5) * 0.05;
            b.vy = Math.abs(b.vy) * 0.3 + 0.06;

            result.isSaved = true;
            result.isGoal = false;
            result.message = 'SUPER SAVE! Pulled out of the air!';
            
            state.gameState = 'SAVED';
            if (!state.shotLogged) {
              state.shotLogged = true;
              audioEngine.playGasp();
              onShotComplete(result);
            }
          } 
          // Check Goal state
          else if (isBetweenPosts && isUnderBar) {
            // GOAL!! Trigger net expansion pull and sparkles
            audioEngine.playNetSwish();
            audioEngine.playCheer();
            
            state.screenShake = 11.5;
            result.isGoal = true;
            result.message = 'GOOOAAALLL!!! Pristine shot!';
            
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
              // Whistle also blows
              audioEngine.playWhistle();
              onShotComplete(result);
            }
          } 
          // Completely wide or over top
          else {
            result.isOffTarget = true;
            result.isGoal = false;
            result.message = b.y > 2.8 ? 'OUT OF BOUNDS! Over the crossbar!' : 'MISS! Wide of the goalpost!';
            
            state.gameState = 'OUT_OF_BOUNDS';
            if (!state.shotLogged) {
              state.shotLogged = true;
              audioEngine.playGasp();
              onShotComplete(result);
            }
          }
        }
      }

      // 8. RENDER INTERACTIVE TARGET RETICLE AND TRAJECTORY PREVIEW (Only in PRE_SHOT)
      if (state.gameState === 'PRE_SHOT' && state.aimTarget) {
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
          const startZ = -7.5;
          const endX = state.aimTarget.x;
          const endY = state.aimTarget.y;
          const endZ = 0;
          
          for (let step = 0; step <= 20; step++) {
            const t = step / 20;
            const z = startZ + (endZ - startZ) * t;
            const spinOffset = state.curve * 0.12 * Math.pow(t, 2);
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

          // Draw the Crosshair reticle target
          ctx.restore();
          ctx.save();
          ctx.translate(tProj.x, tProj.y);

          const rSize = Math.max(10, tProj.scale * 0.22); // dynamic scale targeting reticle
          const pulse = 1.0 + Math.sin(state.frameIndex * 0.12) * 0.08;
          
          // Glowing outer targeted ring (Cyan if adjusting direction, Gold yellow if adjusting height, Gold/Rose if locked/power)
          let reticleColor = 'rgba(244, 63, 94, 0.85)'; // default rose
          if (aimingStepRef.current === 0) reticleColor = 'rgba(14, 165, 233, 0.85)'; // cyan
          else if (aimingStepRef.current === 1) reticleColor = 'rgba(234, 179, 8, 0.85)'; // gold
          
          ctx.strokeStyle = reticleColor; 
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, rSize * pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Inner center bullet point
          ctx.fillStyle = reticleColor;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          // Standard reticle hair ticks
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // horizontal hairs
          ctx.moveTo(-rSize * 1.3, 0); ctx.lineTo(-rSize * 0.5, 0);
          ctx.moveTo(rSize * 0.5, 0); ctx.lineTo(rSize * 1.3, 0);
          // vertical hairs
          ctx.moveTo(0, -rSize * 1.3); ctx.lineTo(0, -rSize * 0.5);
          ctx.moveTo(0, rSize * 0.5); ctx.lineTo(0, rSize * 1.3);
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

        // Draw Soccer ball sphere
        const ballRad = bProj.scale * 0.12; 
        ctx.beginPath();
        ctx.arc(0, 0, ballRad, 0, Math.PI * 2);
        const ballGrad = ctx.createRadialGradient(-ballRad * 0.3, -ballRad * 0.3, ballRad * 0.1, 0, 0, ballRad);
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.85, '#e2e8f0');
        ballGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = ballGrad;
        ctx.fill();

        // Star panels (rotating according to physics rotation)
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = Math.max(1, bProj.scale * 0.008);
        ctx.save();
        ctx.rotate(bP.rotY);

        // Drawing black pentagonal lines for realism
        for (let star = 0; star < 5; star++) {
          const sAngle = (star * Math.PI * 2) / 5 + bP.rotX * 0.45;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.sin(sAngle) * ballRad, Math.cos(sAngle) * ballRad);
          ctx.stroke();

          // small dark stars on perimeter
          ctx.fillStyle = '#0f171c';
          ctx.beginPath();
          ctx.arc(Math.sin(sAngle) * ballRad * 0.72, Math.cos(sAngle) * ballRad * 0.72, ballRad * 0.28, 0, Math.PI * 2);
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
      // Whistle blow upon kickoff
      audioEngine.playWhistle();
      onAnimationTriggered();
    } else if (gameState === 'PRE_SHOT') {
      // RESET Player positioning back to original spot (nearer distance)
      state.ball = { x: 0, y: 0.11, z: -7.5, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, scale: 1 };
      state.ballSpin = { x: 0, y: 0 };
      state.kicker = { x: -0.9, y: 0, z: -8.7, rightLegAngle: 0, leftLegAngle: 0, frame: 0 };
      state.keeper.x = 0;
      state.keeper.y = 0;
      state.keeper.z = 0;
      state.keeper.targetX = 0;
      state.keeper.targetY = 0;
      state.keeper.angle = 0;
      state.keeper.diveProgress = 0;
      state.shotLogged = false;
      state.screenShake = 0;
      state.particles = [];
      setAimingStep(0);
      if (setPower) setPower(0);
    }
  }, [gameState]);

  const updateAimFromEvent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Map client coordinates to canvas scale dimensions
    const mx = ((clientX - rect.left) / rect.width) * dimensions.width;
    const my = ((clientY - rect.top) / rect.height) * dimensions.height;
    
    // Map to 3D goal mouth at Z = 0
    const scale = 320 / 14.2; // camera.z absolute in pre-shot state
    const cx = dimensions.width / 2;
    const cy = dimensions.height * 0.58;
    
    const clickX = (mx - cx) / scale;
    const clickY = 1.5 - (my - cy) / scale;
    
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

      {/* 2. WORLD CUP 2026 SCOREBOARD HEADER BAR */}
      <div className="absolute top-0 inset-x-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <button 
            onClick={onExitSelection} 
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Exit to Selection"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-widest hidden sm:inline truncate max-w-[150px]">
              {playerTeam.player}
            </span>
          </div>
        </div>

        {/* Center Live Goal Score banner */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800/80 px-4.5 py-2 rounded-xl shadow-lg">
            <div className="text-right">
              <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider block">STRIKER</span>
              <span className="text-xs font-black text-white">{playerTeam.id}</span>
            </div>
            
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-lg font-black bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-3 py-0.5 rounded-lg shadow-inner">
                {score}
              </span>
              <span className="text-xs text-slate-600 font-bold">:</span>
              <span className="text-lg font-black bg-slate-950/60 border border-slate-800/40 text-slate-400 px-3 py-0.5 rounded-lg">
                {(shotCount - 1) - score}
              </span>
            </div>
            
            <div className="text-left">
              <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider block">KEEPER</span>
              <span className="text-xs font-black text-slate-300">{opponentTeam.id}</span>
            </div>
          </div>

          {/* 5 Round penalty visual light circles */}
          <div className="flex items-center gap-1.5 mt-2">
            {Array.from({ length: 5 }).map((_, idx) => {
              const shot = shotHistory[idx];
              let circleClass = "bg-slate-800 border-slate-700 text-slate-500";
              if (shot) {
                if (shot.isGoal) {
                  circleClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                } else {
                  circleClass = "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
                }
              } else if (idx === shotCount - 1 && gameState === 'PRE_SHOT') {
                circleClass = "bg-sky-500/20 border-sky-400 text-sky-400 animate-pulse";
              }

              return (
                <div 
                  key={idx} 
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 text-[8px] font-black ${circleClass}`}
                  title={`Round ${idx + 1}`}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-Right Toggles */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleMuteToggle} 
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Toggle SFX Mute"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button 
            onClick={onResetMatch} 
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Rematch / Refresh Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. ACTIVE STRIKER BENTO PANEL */}
      {gameState === 'PRE_SHOT' && (
        <div className="absolute top-24 left-6 z-20 flex flex-col gap-1 w-44 bg-slate-950/80 border border-slate-900/60 backdrop-blur-md p-3.5 rounded-xl shadow-2xl pointer-events-none transition duration-300">
          <span className="text-[8px] font-mono tracking-widest text-[#74acdf] font-bold uppercase mb-0.5">
            ⚽ ACTIVE STRIKER
          </span>
          <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">
            {playerTeam.player}
          </h4>
          <p className="text-[9px] font-mono text-slate-500 capitalize mb-2">
            {playerTeam.name}
          </p>
          
          <div className="flex flex-col gap-1.5 text-[8px] font-mono">
            {/* Accuracy */}
            <div>
              <div className="flex justify-between text-slate-400">
                <span>ACCURACY</span>
                <span className="text-emerald-400 font-bold">{playerTeam.accuracy}%</span>
              </div>
              <div className="w-full h-0.5 bg-slate-900 rounded overflow-hidden">
                <div className="bg-emerald-400 h-full" style={{ width: `${playerTeam.accuracy}%` }} />
              </div>
            </div>

            {/* Power */}
            <div>
              <div className="flex justify-between text-slate-400">
                <span>POWER BAR</span>
                <span className="text-emerald-400 font-bold">{playerTeam.power}%</span>
              </div>
              <div className="w-full h-0.5 bg-slate-900 rounded overflow-hidden">
                <div className="bg-emerald-400 h-full" style={{ width: `${playerTeam.power}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTIVE SWEEPER STATUS / CONTROLS PANEL */}
      {gameState === 'PRE_SHOT' && (
        <div className="absolute bottom-6 inset-x-0 mx-auto w-full max-w-sm z-20 px-4 pointer-events-auto flex flex-col gap-3">
          <div className="bg-slate-950/90 border border-slate-900/60 backdrop-blur-md p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-center">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-mono font-extrabold tracking-wider text-slate-300">
                {aimingStep === 0 && "STEP 1: LOCK KICK WIDTH (TAP TO FREEZE)"}
                {aimingStep === 1 && "STEP 2: LOCK KICK HEIGHT (TAP TO FREEZE)"}
                {aimingStep === 2 && "STEP 3: TAP ON GREEN SWEETSPOT TO KICK!"}
              </span>
            </div>

            {/* Three logical phase steps indicators */}
            <div className="flex items-center gap-2 w-full justify-center mt-0.5">
              <div className={`px-2 py-0.5 rounded-md text-[8px] font-mono font-bold ${aimingStep === 0 ? "bg-sky-500 text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.3)] animate-pulse" : "bg-slate-900 text-slate-600"}`}>
                1. AIM SIDE
              </div>
              <span className="text-slate-800 text-[8px]">▶</span>
              <div className={`px-2 py-0.5 rounded-md text-[8px] font-mono font-bold ${aimingStep === 1 ? "bg-yellow-500 text-slate-950 shadow-[0_0_8px_rgba(234,179,8,0.3)] animate-pulse" : "bg-slate-900 text-slate-600"}`}>
                2. AIM HEIGHT
              </div>
              <span className="text-slate-800 text-[8px]">▶</span>
              <div className={`px-2 py-0.5 rounded-md text-[8px] font-mono font-bold ${aimingStep === 2 ? "bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" : "bg-slate-900 text-slate-600"}`}>
                3. FIRE BALL
              </div>
            </div>

            {/* Sweeping velocity Timing Bar inside step 3 */}
            {aimingStep === 2 && (
              <div className="w-full bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 mt-1 animate-fade-in text-left">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-300 mb-1">
                  <span>STRIKE VELOCITY:</span>
                  <span className="font-extrabold text-amber-400">{stateRef.current.sweepPower}%</span>
                </div>
                
                <div className="w-full h-3.5 bg-slate-950 rounded-md border border-slate-850 relative overflow-hidden flex items-center">
                  <div className="absolute left-[70%] w-[16%] h-full bg-emerald-500/20 border-x border-emerald-500/30" />
                  <div
                    className={`absolute h-full transition-all duration-[6ms] ${
                      stateRef.current.sweepPower >= 70 && stateRef.current.sweepPower <= 86
                        ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]'
                        : (stateRef.current.sweepPower > 86 ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-amber-400')
                    }`}
                    style={{ width: `${stateRef.current.sweepPower}%` }}
                  />
                </div>
                <p className="text-[7.5px] font-mono text-slate-500 text-center mt-1 uppercase">
                  ⚡ SWEET SPOT: <span className="text-emerald-400 font-semibold">70% - 86%</span>
                </p>
              </div>
            )}

            <button 
              onClick={handleImmersiveAction}
              className="w-full py-2 bg-slate-900 hover:bg-slate-850 active:scale-95 transition border border-slate-800 rounded-lg text-[10px] font-mono font-extrabold text-white uppercase text-center cursor-pointer mt-1"
            >
              🎯 TAP TOUCH SCREEN / PRESS SPACEBAR
            </button>
          </div>
        </div>
      )}

      {/* 5. MATCH ROUND REVISION / SUMMARY OVERLAYS CARD */}
      {gameState !== 'PRE_SHOT' && gameState !== 'RUN_UP' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-auto p-6 animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-2xl text-center flex flex-col gap-4">
            <div>
              {gameState === 'CELEBRATION' && (
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6" />
                </div>
              )}
              {gameState === 'SAVED' && (
                <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Info className="w-6 h-6" />
                </div>
              )}
              {gameState === 'OUT_OF_BOUNDS' && (
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <XCircle className="w-6 h-6" />
                </div>
              )}

              <h3 className="text-base font-black text-white uppercase tracking-wider">
                {gameState === 'CELEBRATION' && "⚽ GOOOOALLL!!! ⚽"}
                {gameState === 'SAVED' && "🛡️ SAVED! GOALIE STOPPED IT!"}
                {gameState === 'OUT_OF_BOUNDS' && "⚠️ OUT OF BOUNDS / MISS!"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 italic">
                {gameState === 'CELEBRATION' && "A majestic shot with precise placement!"}
                {gameState === 'SAVED' && "The goalkeeper read and caught your ball!"}
                {gameState === 'OUT_OF_BOUNDS' && "The shot flew outside the larger goal posts!"}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">KICK VELOCITY:</span>
                <span className={`font-bold ${power >= 70 && power <= 86 ? "text-emerald-400" : "text-amber-400"}`}>{power}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PENALTY ROUND:</span>
                <span className="text-[#74acdf] font-bold">{shotCount} of 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MATCH SCORE:</span>
                <span className="text-white font-bold">{score} goals scored</span>
              </div>
            </div>

            {/* Play Again or advance next penalty button */}
            <button
              onClick={onResetMatch}
              className="w-full py-3.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition font-black text-xs font-mono uppercase tracking-widest rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {shotCount >= 5 ? (
                <>
                  <RotateCcw className="w-4.5 h-4.5" /> REMATCH / PLAY AGAIN
                </>
              ) : (
                <>
                  ⚽ NEXT PENALTY SHOT ⚽
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
