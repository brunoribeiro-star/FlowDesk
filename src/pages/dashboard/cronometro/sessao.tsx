"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import {
  Minus,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Pencil,
  Focus,
  X,
  ArrowLeft,
} from "lucide-react";

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
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.35, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
      osc.start(time);
      osc.stop(time + durations[i] + 0.05);
      time += durations[i] + 0.02;
    });
  } catch (_) {}
}

const R = 155;
const CX = 170;
const CY = 170;
const CIRCUMFERENCE = 2 * Math.PI * R;
export default function CronometroSessaoPage() {
  const router = useRouter();
  const { mode, minutes } = router.query;

  const totalSeconds = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running,   setRunning]   = useState(false);
  const [finished,  setFinished]  = useState(false);
  const [concluded, setConcluded] = useState(false);

  const [focusMode, setFocusMode]   = useState(false);
  const [startTime, setStartTime]   = useState<Date | null>(null);
  const [_sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const particlesRef  = useRef<Particle[]>([]);
  const animFrameRef  = useRef<number | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!minutes) return;
    const secs = parseInt(minutes as string) * 60;
    totalSeconds.current = secs;
    setSecondsLeft(secs);
    setReady(true);
  }, [minutes, router.isReady]);

  useEffect(() => {
    if (running && !finished) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, finished]);

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
        p.x  += p.vx; p.y += p.vy; p.vy += 0.08;
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
    setSecondsLeft(v => {
      const next = Math.max(0, v + delta * 60);
      if (next > totalSeconds.current) totalSeconds.current = next;
      return next;
    });
  }

  function handleRestart() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setFinished(false);
    setConcluded(false);
    setSecondsLeft(totalSeconds.current);
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
    setRunning(false);
    setFinished(true);
    setConcluded(true);
    playCelebrationSound();
    startConfetti();
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const progress = totalSeconds.current > 0
    ? 1 - secondsLeft / totalSeconds.current
    : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const endTime = startTime
    ? new Date(startTime.getTime() + totalSeconds.current * 1000)
    : null;

  const fmt = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const modeLabel = MODE_LABELS[mode as string] || "CRONÔMETRO";

  if (!ready) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden relative flex"
      style={{ background: "var(--primary-900)", fontFamily: "'DM Sans', sans-serif" }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
        style={{ display: concluded ? "block" : "none" }}
      />

      {!focusMode && (
        <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />
      )}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="absolute top-5 right-5 z-40 w-10 h-10 rounded-full bg-primary-800/80 border border-primary-700 flex items-center justify-center text-gray-300 hover:text-white hover:bg-primary-700 transition-all"
          title="Sair do modo foco"
        >
          <X size={18} />
        </button>
      )}

      <div className="flex flex-col flex-1 h-full overflow-hidden">

        {!focusMode && (
          <header className="flex items-center px-8 py-5 border-b border-primary-800 z-10 shrink-0">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 group text-gray-400 hover:text-white transition-colors"
            >
              <div className="p-2 rounded-full border border-primary-700 group-hover:bg-primary-800 transition-colors">
                <ArrowLeft size={16} />
              </div>
              <span className="text-sm font-medium">Voltar</span>
            </button>
          </header>
        )}

        <div className="flex-1 flex items-center justify-center overflow-hidden">

          <div className="flex flex-col items-center gap-6 px-10">

            <span className="text-[11px] font-semibold tracking-[0.3em] text-gray-500 uppercase">
              {modeLabel}
            </span>

            <div className="relative" style={{ width: 340, height: 340 }}>
              <svg width={340} height={340} style={{ transform: "rotate(-90deg)" }}>
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke="var(--primary-800)"
                  strokeWidth={10}
                />
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke="var(--primary-500)"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s linear", opacity: progress > 0 ? 1 : 0 }}
                />
              </svg>

              <div
                className="absolute inset-0 flex items-center justify-center select-none"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span
                  style={{
                    fontSize: "66px",
                    fontWeight: 300,
                    letterSpacing: "0.04em",
                    color: concluded ? "var(--third-400)" : "var(--gray-100)",
                    lineHeight: 1,
                  }}
                >
                  {mm}
                  <span
                    style={{
                      color: "var(--primary-500)",
                      animation: running ? "colonBlink 1s step-end infinite" : "none",
                    }}
                  >:</span>
                  {ss}
                </span>
              </div>
            </div>

            {startTime && endTime && (
              <p className="text-sm text-gray-500 tracking-wider -mt-2">
                {fmt(startTime)} – {fmt(endTime)}
              </p>
            )}

            <div className="flex items-center gap-5">
              <button
                onClick={() => handleAdjust(-1)}
                disabled={concluded}
                className="w-10 h-10 rounded-full border border-primary-700 bg-primary-800/50 flex items-center justify-center text-gray-300 hover:bg-primary-700 hover:text-white transition-all disabled:opacity-30"
              >
                <Minus size={15} />
              </button>

              <button
                onClick={togglePlay}
                disabled={concluded || secondsLeft === 0}
                className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all shadow-lg shadow-primary-500/30 disabled:opacity-30"
                style={{ background: "var(--primary-500)" }}
              >
                {running
                  ? <Pause size={24} fill="white" className="text-white" />
                  : <Play  size={24} fill="white" className="text-white ml-1" />
                }
              </button>

              <button
                onClick={() => handleAdjust(1)}
                disabled={concluded}
                className="w-10 h-10 rounded-full border border-primary-700 bg-primary-800/50 flex items-center justify-center text-gray-300 hover:bg-primary-700 hover:text-white transition-all disabled:opacity-30"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-primary-700 bg-primary-800/40 text-gray-300 hover:text-white hover:bg-primary-700 text-sm transition-all"
              >
                <Pencil size={13} /> Editar
              </button>

              <button
                onClick={() => setFocusMode(v => !v)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm transition-all ${
                  focusMode
                    ? "border-primary-500 bg-primary-500/20 text-primary-300"
                    : "border-primary-700 bg-primary-800/40 text-gray-300 hover:text-white hover:bg-primary-700"
                }`}
              >
                <Focus size={13} /> Foco
              </button>

              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-primary-700 bg-primary-800/40 text-gray-300 hover:text-white hover:bg-primary-700 text-sm transition-all"
              >
                <RotateCcw size={13} /> Reiniciar
              </button>

              <button
                onClick={handleConclude}
                disabled={concluded}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: "var(--third-500)",
                  background: concluded ? "rgba(24,161,126,0.25)" : "rgba(24,161,126,0.12)",
                  color: "var(--third-300)",
                }}
              >
                <CheckCircle2 size={13} />
                {concluded ? "Sessão encerrada ✓" : "Encerrar sessão"}
              </button>
            </div>

            {concluded && (
              <div className="text-center animate-fade-in" style={{ color: "var(--third-400)" }}>
                <div className="text-base font-semibold">🎉 Sessão concluída!</div>
                <button
                  onClick={() => router.push("/dashboard/cronometro")}
                  className="mt-1.5 text-sm underline text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Nova sessão
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes colonBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.15; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
