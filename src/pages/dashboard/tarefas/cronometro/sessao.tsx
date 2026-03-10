"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
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
  Coffee,
} from "lucide-react";

interface Task {
  id: string;
  titulo: string;
  status: string;
}

interface Subtask {
  id: string;
  titulo: string;
  concluida: boolean | null;
}

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

function playBreakSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes    = [783.99, 659.25, 523.25];
    const durations = [0.15,   0.15,   0.4];
    let time = ctx.currentTime + 0.05;
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
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
  const { taskId, mode, minutes, breakMinutes, cycles } = router.query;

  const isPomodoro   = mode === "pomodoro";
  const workSecs     = isPomodoro ? (parseInt(minutes as string) || 25) * 60 : 0;
  const breakSecs    = isPomodoro ? (parseInt(breakMinutes as string) || 5) * 60 : 0;
  const totalCycles  = isPomodoro ? (parseInt(cycles as string) || 4) : 1;
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isBreak, setIsBreak] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const [task,     setTask]     = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading,  setLoading]  = useState(true);

  const totalSeconds = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running,   setRunning]   = useState(false);
  const [finished,  setFinished]  = useState(false);
  const [concluded, setConcluded] = useState(false);

  const [focusMode, setFocusMode]   = useState(false);
  const [startTime, setStartTime]   = useState<Date | null>(null);
  const [_sidebarOpen, setSidebarOpen] = useState(false);

  const endAtRef     = useRef<number | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!taskId || !minutes) return;
    const secs = isPomodoro ? workSecs : parseInt(minutes as string) * 60;
    totalSeconds.current = secs;
    setSecondsLeft(secs);
    loadData();
  }, [taskId, minutes, router.isReady]);

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) { router.push("/login"); return; }
    const [{ data: taskData }, { data: subsData }] = await Promise.all([
      supabase.from("tasks").select("id, titulo, status")
        .eq("id", taskId as string).eq("user_id", auth.user.id).single(),
      supabase.from("subtasks").select("*")
        .eq("task_id", taskId as string).eq("user_id", auth.user.id)
        .order("id", { ascending: true }),
    ]);
    setTask(taskData || null);
    setSubtasks(subsData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (running && !finished) {
      if (!endAtRef.current) {
        endAtRef.current = Date.now() + secondsLeft * 1000;
      }
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((endAtRef.current! - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          endAtRef.current = null;
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
      if (endAtRef.current) endAtRef.current = Date.now() + next * 1000;
      return next;
    });
  }

  function handleRestart() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    endAtRef.current = null;
    setRunning(false); setFinished(false); setConcluded(false);
    setAllDone(false); setIsBreak(false); setCurrentCycle(1);
    const secs = isPomodoro ? workSecs : parseInt(minutes as string || "0") * 60;
    totalSeconds.current = secs;
    setSecondsLeft(secs);
    setStartTime(null);
  }

  function handleEdit() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.push(`/dashboard/tarefas/cronometro?taskId=${taskId}`);
  }

  function handleBack() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.back();
  }

  async function handleConclude() {
    if (concluded) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    endAtRef.current = null;
    setRunning(false); setFinished(true); setConcluded(true);
    if (task) {
      await supabase.from("tasks").update({ status: "concluida" }).eq("id", task.id);
      setTask(t => t ? { ...t, status: "concluida" } : t);
    }
    playCelebrationSound();
    startConfetti();
  }

  async function toggleSubtask(st: Subtask) {
    const nova = !st.concluida;
    setSubtasks(prev => prev.map(x => x.id === st.id ? { ...x, concluida: nova } : x));
    await supabase.from("subtasks").update({ concluida: nova }).eq("id", st.id);
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

  const subtasksDone = subtasks.filter(s => s.concluida).length;
  const modeLabel = isPomodoro
    ? isBreak ? "POMODORO · PAUSA" : `POMODORO · FOCO ${currentCycle}/${totalCycles}`
    : (MODE_LABELS[mode as string] || "CRONÔMETRO");
  const ringColor = isBreak ? "var(--secondary-500)" : "var(--primary-500)";

  if (loading) {
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

            {isPomodoro && (
              <div className="flex items-center gap-2">
                {Array.from({ length: totalCycles }).map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${
                    i < currentCycle - 1 ? "w-4 bg-primary-500"
                    : i === currentCycle - 1 ? isBreak ? "w-6 bg-secondary-400" : "w-6 bg-primary-400"
                    : "w-4 bg-primary-800"
                  }`} />
                ))}
              </div>
            )}
            {isPomodoro && isBreak && (
              <div className="flex items-center gap-2 text-secondary-400 text-sm">
                <Coffee size={14} /><span>Hora de descansar!</span>
              </div>
            )}
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
                  stroke={ringColor}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 0.6s linear, stroke 0.5s ease", opacity: progress > 0 ? 1 : 0 }}
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
                  color: (concluded || allDone) ? "var(--third-400)" : "var(--gray-100)",
                    lineHeight: 1,
                  }}
                >
                  {mm}
                  <span style={{ color: ringColor, animation: running ? "colonBlink 1s step-end infinite" : "none" }}>:</span>
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
                disabled={concluded || isPomodoro}
                className="w-10 h-10 rounded-full border border-primary-700 bg-primary-800/50 flex items-center justify-center text-gray-300 hover:bg-primary-700 hover:text-white transition-all disabled:opacity-30"
              >
                <Minus size={15} />
              </button>

              <button
                onClick={togglePlay}
                disabled={concluded || secondsLeft === 0}
                className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all shadow-lg shadow-primary-500/30 disabled:opacity-30"
                style={{ background: isBreak ? "var(--secondary-500)" : "var(--primary-500)" }}
              >
                {running
                  ? <Pause size={24} fill="white" className="text-white" />
                  : <Play  size={24} fill="white" className="text-white ml-1" />
                }
              </button>

              <button
                onClick={() => handleAdjust(1)}
                disabled={concluded || isPomodoro}
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

              {isPomodoro && running && !isBreak && (
                <button
                  onClick={() => {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    endAtRef.current = null;
                    handlePomodoroPhaseEnd();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-secondary-700 bg-secondary-800/40 text-secondary-300 hover:bg-secondary-700 text-sm transition-all"
                >
                  <Coffee size={13} /> Pular para pausa
                </button>
              )}

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
                {concluded ? "Concluída ✓" : "Concluir"}
              </button>
            </div>

            {(concluded || allDone) && (
              <div className="text-center animate-fade-in" style={{ color: "var(--third-400)" }}>
                <div className="text-base font-semibold">
                  {allDone ? `🎉 ${totalCycles} ciclos concluídos!` : "🎉 Tarefa concluída!"}
                </div>
                <button
                  onClick={() => router.push("/dashboard/tarefas")}
                  className="mt-1.5 text-sm underline text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Voltar para tarefas
                </button>
              </div>
            )}
          </div>

          {task && (
            <div
              className="flex flex-col gap-4 pl-12 pr-4"
              style={{ minWidth: 220, maxWidth: 280 }}
            >
              <h2 className="text-sm font-semibold text-gray-100 leading-snug">
                {task.titulo}
              </h2>

              {subtasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-1 rounded-full overflow-hidden"
                    style={{ background: "var(--primary-800)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(subtasksDone / subtasks.length) * 100}%`,
                        background: "var(--primary-500)",
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {subtasksDone}/{subtasks.length}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                {subtasks.map(st => (
                  <button
                    key={st.id}
                    onClick={() => toggleSubtask(st)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors"
                    style={{
                      background: st.concluida ? "rgba(24,161,126,0.08)" : "transparent",
                    }}
                    onMouseEnter={e => {
                      if (!st.concluida)
                        (e.currentTarget as HTMLElement).style.background = "rgba(30,182,232,0.06)";
                    }}
                    onMouseLeave={e => {
                      if (!st.concluida)
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span className="grid grid-cols-2 gap-[2px] opacity-30 shrink-0">
                      {[...Array(4)].map((_, i) => (
                        <span
                          key={i}
                          className="w-[3px] h-[3px] rounded-full"
                          style={{ background: "var(--gray-400)" }}
                        />
                      ))}
                    </span>

                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: st.concluida ? "var(--third-500)" : "var(--gray-600)",
                        background:  st.concluida ? "rgba(24,161,126,0.2)" : "transparent",
                      }}
                    >
                      {st.concluida && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                          stroke="var(--third-400)" strokeWidth="3"
                          strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    <span
                      className="text-sm"
                      style={{
                        color: st.concluida ? "var(--gray-500)" : "var(--gray-200)",
                        textDecoration: st.concluida ? "line-through" : "none",
                      }}
                    >
                      {st.titulo}
                    </span>
                  </button>
                ))}

                {subtasks.length === 0 && (
                  <p className="text-sm" style={{ color: "var(--gray-500)" }}>
                    Sem subtarefas.
                  </p>
                )}
              </div>
            </div>
          )}

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
