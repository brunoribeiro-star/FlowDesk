"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Minus, Plus, Play, Pause, RotateCcw, CheckCircle2, Pencil, Focus, X, ArrowLeft, Coffee } from "lucide-react";

const MODE_LABELS: Record<string, string> = {
  pomodoro: "POMODORO",
  foco: "FOCO",
  sprint: "SPRINT",
  personalizado: "PERSONALIZADO",
};

const CONFETTI_COLORS = [
  "#1EB6E8", "#7157C5", "#18A17E",
  "#FFD700", "#FF6B6B", "#4FC5EB",
  "#A899E0", "#5ED8B7",
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  w: number; h: number;
  rotation: number; rotationSpeed: number;
  opacity: number;
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * 100,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    w: 8 + Math.random() * 10,
    h: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8,
    opacity: 1,
  }));
}

function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes    = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const durations = [0.12,   0.12,   0.12,   0.3,   0.1,    0.4];
    let time = ctx.currentTime + 0.05;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.35, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
      osc.start(time); osc.stop(time + durations[i] + 0.05);
      time += durations[i] + 0.02;
    });
  } catch (_) {}
}

function playBreakSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes    = [783.99, 659.25, 523.25];
    const durations = [0.15,   0.15,   0.4];
    let time = ctx.currentTime + 0.05;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
      osc.start(time); osc.stop(time + durations[i] + 0.05);
      time += durations[i] + 0.02;
    });
  } catch (_) {}
}

const R = 190;
const CX = 220;
const CY = 220;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function CronometroSessaoPage() {
  const router = useRouter();
  const { mode, minutes, breakMinutes, cycles } = router.query;

  const isPomodoro  = mode === "pomodoro";
  const workSecs    = isPomodoro ? (parseInt(minutes as string) || 25) * 60 : 0;
  const breakSecs   = isPomodoro ? (parseInt(breakMinutes as string) || 5) * 60 : 0;
  const totalCycles = isPomodoro ? (parseInt(cycles as string) || 4) : 1;

  const [currentCycle, setCurrentCycle] = useState(1);
  const [isBreak, setIsBreak]           = useState(false);
  const [allDone, setAllDone]           = useState(false);

  const totalSeconds  = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running,     setRunning]     = useState(false);
  const [finished,    setFinished]    = useState(false);
  const [concluded,   setConcluded]   = useState(false);
  const [focusMode,   setFocusMode]   = useState(false);
  const [startTime,   setStartTime]   = useState<Date | null>(null);
  const [ready,       setReady]       = useState(false);

  const endAtRef     = useRef<number | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!router.isReady || !minutes) return;
    const secs = isPomodoro ? workSecs : parseInt(minutes as string) * 60;
    totalSeconds.current = secs;
    setSecondsLeft(secs);
    setReady(true);
  }, [minutes, router.isReady]);

  useEffect(() => {
    if (running && !finished) {
      if (!endAtRef.current) endAtRef.current = Date.now() + secondsLeft * 1000;
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((endAtRef.current! - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          endAtRef.current    = null;
          if (isPomodoro && !allDone) {
            handlePomodoroPhaseEnd();
          } else {
            setRunning(false);
            setFinished(true);
          }
        }
      }, 500);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (!running && endAtRef.current) endAtRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, finished]);

  function handlePomodoroPhaseEnd() {
    if (isBreak) {
      const nextCycle = currentCycle + 1;
      if (nextCycle > totalCycles) {
        setAllDone(true); setRunning(false); setFinished(true);
        playCelebrationSound(); startConfetti();
      } else {
        setCurrentCycle(nextCycle); setIsBreak(false);
        totalSeconds.current = workSecs;
        setSecondsLeft(workSecs);
        endAtRef.current = Date.now() + workSecs * 1000;
      }
    } else {
      playBreakSound(); setIsBreak(true);
      totalSeconds.current = breakSecs;
      setSecondsLeft(breakSecs);
      endAtRef.current = Date.now() + breakSecs * 1000;
    }
  }

  const startConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    particlesRef.current = createParticles(180);
    function animate() {
      const ctx2d = canvas!.getContext("2d");
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, canvas!.width, canvas!.height);
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.01);
      if (particlesRef.current.length === 0) return;
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas!.height * 0.6) p.opacity -= 0.02;
        ctx2d.save();
        ctx2d.translate(p.x, p.y);
        ctx2d.rotate((p.rotation * Math.PI) / 180);
        ctx2d.globalAlpha = p.opacity;
        ctx2d.fillStyle   = p.color;
        ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx2d.restore();
      });
      animFrameRef.current = requestAnimationFrame(animate);
    }
    animate();
  }, []);

  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  function togglePlay() {
    if (finished || concluded) return;
    if (!running && startTime === null) setStartTime(new Date());
    setRunning(v => !v);
  }

  function handleAdjust(delta: number) {
    const adj = delta * 30;
    if (endAtRef.current !== null) endAtRef.current = endAtRef.current + adj * 1000;
    setSecondsLeft(prev => {
      const next = Math.max(0, prev + adj);
      if (next > totalSeconds.current) totalSeconds.current = next;
      return next;
    });
  }

  function handleRestart() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    endAtRef.current = null;
    setRunning(false); setFinished(false); setConcluded(false);
    setAllDone(false); setIsBreak(false); setCurrentCycle(1);
    const secs = isPomodoro ? workSecs : (parseInt(minutes as string) || 0) * 60;
    totalSeconds.current = secs;
    setSecondsLeft(secs);
    setStartTime(null);
  }

  function handleEdit() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.push("/dashboard/cronometro");
  }

  function handleBack() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.push("/dashboard/cronometro");
  }

  function handleConclude() {
    if (concluded) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    endAtRef.current = null;
    setRunning(false); setFinished(true); setConcluded(true);
    playCelebrationSound(); startConfetti();
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const frac       = totalSeconds.current > 0 ? secondsLeft / totalSeconds.current : 1;
  const dashOffset = CIRCUMFERENCE * (1 - frac);

  const headAngle = (-90 + 360 * frac) * (Math.PI / 180);
  const headX     = CX + R * Math.cos(headAngle);
  const headY     = CY + R * Math.sin(headAngle);

  const modeLabel = isPomodoro
    ? (isBreak ? "POMODORO · PAUSA" : `POMODORO · FOCO ${currentCycle}/${totalCycles}`)
    : (MODE_LABELS[mode as string] || "CRONÔMETRO");

  const centerLabel = isPomodoro
    ? (isBreak ? "Pausa" : "Foco")
    : (MODE_LABELS[mode as string] || "");

  const totalMM = String(Math.floor(totalSeconds.current / 60)).padStart(2, "0");
  const totalSS = String(totalSeconds.current % 60).padStart(2, "0");

  const workGradId  = "ringGradWork";
  const breakGradId = "ringGradBreak";
  const activeGrad  = isBreak ? `url(#${breakGradId})` : `url(#${workGradId})`;

  if (!ready) return (
    <div className="h-full flex items-center justify-center bg-primary-900 text-gray-500 text-sm">
      Carregando...
    </div>
  );

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50"
        style={{ display: concluded ? "block" : "none" }} />

      <div className="relative flex flex-col h-full overflow-hidden"
        style={{ background: "var(--primary-900)" }}>

        <div className="pointer-events-none absolute z-0" style={{
          width: 460, height: 460, right: 0, top: -120, borderRadius: "50%",
          filter: "blur(110px)",
          background: "radial-gradient(circle, rgba(113,87,197,0.11), transparent 70%)",
        }} />

        {focusMode && (
          <button onClick={() => setFocusMode(false)}
            className="absolute top-5 right-5 z-40 w-10 h-10 rounded-full bg-primary-800/80 border border-primary-700 flex items-center justify-center text-gray-300 hover:text-white hover:bg-primary-700 transition-all">
            <X size={18} />
          </button>
        )}

        {!focusMode && (
          <>
            <header className="relative z-10 flex items-center px-8 xl:px-11 py-6">
              <button type="button" onClick={handleBack}
                className="group flex items-center gap-4 bg-transparent border-0 p-0 cursor-pointer">
                <span className="flex items-center justify-center w-11 h-11 rounded-full border border-gray-600 text-gray-300 transition-all duration-200 group-hover:border-primary-500 group-hover:text-primary-300">
                  <ArrowLeft size={18} />
                </span>
                <span className="text-[19px] font-medium text-gray-200">Voltar</span>
              </button>
            </header>
            <div className="relative z-10 h-px" style={{
              background: "linear-gradient(90deg, transparent, rgba(148,169,173,0.18) 30%, rgba(148,169,173,0.18) 70%, transparent)",
            }} />
          </>
        )}

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-8 py-4 overflow-hidden">

          <div className="flex flex-col items-center gap-3">
            <p className="text-[13px] xl:text-[14px] font-medium tracking-[0.3em] uppercase text-gray-500">
              {isBreak
                ? <><span>Pomodoro · </span><span style={{ color: "var(--secondary-300)" }}>Pausa</span></>
                : modeLabel}
            </p>
            {isPomodoro && (
              <div className="flex gap-2.5">
                {Array.from({ length: totalCycles }).map((_, i) => (
                  <span key={i} className="h-[5px] w-10 rounded-full transition-all duration-300"
                    style={{
                      background: i < currentCycle - 1
                        ? "var(--primary-600)"
                        : i === currentCycle - 1
                          ? isBreak
                            ? "linear-gradient(90deg, var(--secondary-400), var(--secondary-500))"
                            : "linear-gradient(90deg, var(--primary-400), var(--primary-500))"
                          : "var(--gray-700)",
                      boxShadow: i === currentCycle - 1 && !isBreak
                        ? "0 0 12px -1px var(--primary-500)"
                        : i === currentCycle - 1 && isBreak
                          ? "0 0 12px -1px var(--secondary-500)"
                          : undefined,
                    }} />
                ))}
              </div>
            )}
          </div>

          <div className="relative" style={{ width: "min(420px, min(50vw, calc(100vh - 380px)))", aspectRatio: "1" }}>

            <div className="absolute pointer-events-none tt-halo"
              style={{
                inset: "30px", borderRadius: "50%",
                background: isBreak
                  ? "radial-gradient(circle, rgba(140,119,211,0.18), transparent 65%)"
                  : "radial-gradient(circle, rgba(30,182,232,0.14), transparent 65%)",
                filter: "blur(14px)",
              }} />

            <svg width="100%" height="100%" viewBox="0 0 440 440" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id={workGradId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   stopColor="var(--primary-300)" />
                  <stop offset="55%"  stopColor="var(--primary-500)" />
                  <stop offset="100%" stopColor="var(--third-400)" />
                </linearGradient>
                <linearGradient id={breakGradId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   stopColor="var(--secondary-300)" />
                  <stop offset="55%"  stopColor="var(--secondary-400)" />
                  <stop offset="100%" stopColor="var(--secondary-500)" />
                </linearGradient>
              </defs>

              <circle cx={CX} cy={CY} r={R}
                fill="none" stroke="var(--primary-700)" strokeOpacity={0.5} strokeWidth={10} />

              <circle cx={CX} cy={CY} r={R}
                fill="none"
                stroke={activeGrad}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{ filter: "drop-shadow(0 0 6px var(--primary-400))", transition: "stroke-dashoffset 0.6s linear" }}
              />

              {frac > 0.005 && frac < 0.999 && (
                <>
                  <circle cx={headX} cy={headY} r={18}
                    fill={isBreak ? "var(--secondary-300)" : "var(--primary-300)"}
                    opacity={0.45}
                    style={{ filter: "blur(8px)", transition: "cx 0.6s linear, cy 0.6s linear" }}
                  />
                  <circle cx={headX} cy={headY} r={8}
                    fill={isBreak ? "var(--secondary-200)" : "var(--primary-200)"}
                    style={{ transition: "cx 0.6s linear, cy 0.6s linear" }}
                  />
                </>
              )}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center select-none gap-1.5">
              <span className="text-[13px] font-semibold tracking-[0.28em] uppercase"
                style={{ color: isBreak ? "var(--secondary-300)" : "var(--primary-300)" }}>
                {centerLabel}
              </span>
              <div className="flex items-baseline leading-none"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}>
                <span style={{
                  fontSize: "clamp(64px, 8vw, 104px)",
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  color: (concluded || allDone) ? "var(--third-400)" : "var(--gray-100)",
                }}>
                  {mm}
                </span>
                <span className="tt-colon" style={{
                  fontSize: "clamp(64px, 8vw, 104px)",
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  color: isBreak ? "var(--secondary-400)" : "var(--primary-400)",
                  margin: "0 2px",
                  animationName: running ? "ttColonBlink" : "none",
                  animationDuration: "1.6s",
                  animationTimingFunction: "steps(1)",
                  animationIterationCount: "infinite",
                }}>:</span>
                <span style={{
                  fontSize: "clamp(64px, 8vw, 104px)",
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  color: (concluded || allDone) ? "var(--third-400)" : "var(--gray-100)",
                }}>
                  {ss}
                </span>
              </div>
              <span className="text-[13px] xl:text-[14px]" style={{ color: "var(--gray-500)" }}>
                restante de {totalMM}:{totalSS}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-7">
            <button onClick={() => handleAdjust(-1)} disabled={concluded} title="-30s"
              className="flex items-center justify-center w-[58px] h-[58px] rounded-full border border-gray-600 text-gray-200 bg-[rgba(20,40,48,0.4)] hover:border-primary-500 hover:text-primary-300 hover:scale-105 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
              <Minus size={22} />
            </button>

            <button onClick={togglePlay} disabled={concluded || secondsLeft === 0}
              className="flex items-center justify-center rounded-full cursor-pointer transition-transform duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed tt-play-glow"
              style={{
                width: 88, height: 88, border: "none",
                color: "var(--primary-900)",
                background: isBreak
                  ? "radial-gradient(120% 120% at 30% 25%, var(--secondary-300), var(--secondary-500) 70%)"
                  : "radial-gradient(120% 120% at 30% 25%, var(--primary-300), var(--primary-500) 70%)",
              }}>
              {running
                ? <Pause size={30} fill="#04141a" />
                : <Play  size={30} fill="#04141a" style={{ marginLeft: 3 }} />}
            </button>

            <button onClick={() => handleAdjust(1)} disabled={concluded} title="+30s"
              className="flex items-center justify-center w-[58px] h-[58px] rounded-full border border-gray-600 text-gray-200 bg-[rgba(20,40,48,0.4)] hover:border-primary-500 hover:text-primary-300 hover:scale-105 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
              <Plus size={22} />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {[
              { label: "Editar",    icon: <Pencil size={16} />, onClick: handleEdit,           active: false, style: {} },
              { label: "Foco",     icon: <Focus  size={16} />, onClick: () => setFocusMode(v => !v), active: focusMode, style: {} },
              { label: "Reiniciar",icon: <RotateCcw size={16} />, onClick: handleRestart,      active: false, style: {} },
            ].map(a => (
              <button key={a.label} type="button" onClick={a.onClick}
                className="flex items-center gap-2 text-[15px] font-medium rounded-full border cursor-pointer transition-all duration-200"
                style={{
                  padding: "11px 20px",
                  border: a.active ? "1px solid var(--primary-500)" : "1px solid var(--gray-700)",
                  background: a.active ? "rgba(30,182,232,0.12)" : "var(--primary-800)",
                  color: a.active ? "var(--primary-300)" : "var(--gray-200)",
                }}
                onMouseEnter={e => {
                  if (!a.active) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gray-500)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--gray-100)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-700)";
                  }
                }}
                onMouseLeave={e => {
                  if (!a.active) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gray-700)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--gray-200)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-800)";
                  }
                }}>
                {a.icon} {a.label}
              </button>
            ))}

            {isPomodoro && running && !isBreak && (
              <button type="button"
                onClick={() => {
                  clearInterval(intervalRef.current!);
                  intervalRef.current = null;
                  endAtRef.current = null;
                  handlePomodoroPhaseEnd();
                }}
                className="flex items-center gap-2 text-[15px] font-medium rounded-full border cursor-pointer transition-all duration-200"
                style={{
                  padding: "11px 20px",
                  border: "1px solid var(--secondary-600)",
                  background: "var(--primary-800)",
                  color: "var(--secondary-300)",
                }}>
                <Coffee size={16} /> Pular para pausa
              </button>
            )}

            <button type="button" onClick={handleConclude} disabled={concluded}
              className="flex items-center gap-2 text-[15px] font-medium rounded-full border cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                padding: "11px 20px",
                border: `1px solid var(--third-${concluded ? "400" : "600"})`,
                background: concluded ? "var(--third-700)" : "var(--primary-800)",
                color: "var(--third-300)",
              }}
              onMouseEnter={e => {
                if (!concluded) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--third-400)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--third-700)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 26px -10px var(--third-400)";
                }
              }}
              onMouseLeave={e => {
                if (!concluded) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--third-600)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-800)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                }
              }}>
              <CheckCircle2 size={16} />
              {concluded ? "Sessão encerrada ✓" : "Encerrar sessão"}
            </button>
          </div>

          {(concluded || allDone) && (
            <div className="text-center animate-tt-fadein" style={{ color: "var(--third-400)" }}>
              <div className="text-base font-semibold">
                {allDone ? `🎉 ${totalCycles} ciclos concluídos!` : "🎉 Sessão concluída!"}
              </div>
              <button onClick={() => router.push("/dashboard/cronometro")}
                className="mt-1.5 text-sm underline text-gray-500 hover:text-gray-200 transition-colors">
                Nova sessão
              </button>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes ttColonBlink {
          0%, 55%   { opacity: 1; }
          56%, 100% { opacity: 0.2; }
        }
        @keyframes ttHaloBreathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes ttPlayGlow {
          0%, 100% { box-shadow: 0 0 0 8px rgba(30,182,232,0.10), 0 20px 50px -14px rgba(30,182,232,0.8); }
          50%       { box-shadow: 0 0 0 14px rgba(30,182,232,0.05), 0 20px 60px -12px rgba(30,182,232,0.95); }
        }
        @keyframes ttFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tt-halo {
          animation: ttHaloBreathe 5s ease-in-out infinite;
        }
        .tt-play-glow {
          animation: ttPlayGlow 3s ease-in-out infinite;
        }
        .animate-tt-fadein {
          animation: ttFadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
