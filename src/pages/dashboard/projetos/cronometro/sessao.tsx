"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { addTimeEntry } from "@/lib/supabaseQueries/timeEntries";
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
  task_id: string;
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

const R = 128;
const CX = 148;
const CY = 148;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function ProjetoCronometroSessaoPage() {
  const router = useRouter();
  const { projeto_id, mode, minutes, breakMinutes, cycles } = router.query;

  const isPomodoro  = mode === "pomodoro";
  const workSecs    = isPomodoro ? (parseInt(minutes as string) || 25) * 60 : 0;
  const breakSecs   = isPomodoro ? (parseInt(breakMinutes as string) || 5) * 60 : 0;
  const totalCycles = isPomodoro ? (parseInt(cycles as string) || 4) : 1;
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isBreak, setIsBreak] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [phaseKey, setPhaseKey] = useState(0);

  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [subtasks,    setSubtasks]    = useState<Subtask[]>([]);
  const [projetoNome, setProjetoNome] = useState<string>("");
  const [loading,     setLoading]     = useState(true);
  const [sessionRestored, setSessionRestored] = useState(false);

  const totalSeconds = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running,   setRunning]   = useState(false);
  const [finished,  setFinished]  = useState(false);
  const [concluded, setConcluded] = useState(false);

  const [focusMode, setFocusMode]   = useState(false);
  const [startTime, setStartTime]   = useState<Date | null>(null);

  const endAtRef     = useRef<number | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const elapsedFocusSecondsRef = useRef(0);
  const lastResumeAtRef = useRef<number | null>(null);

  const sessionKey = typeof window !== "undefined" && projeto_id
    ? `tt_session_${projeto_id}` : null;

  function computeLiveElapsed() {
    const extra = lastResumeAtRef.current !== null
      ? (Date.now() - lastResumeAtRef.current) / 1000
      : 0;
    return elapsedFocusSecondsRef.current + extra;
  }

  function startCounting() {
    if (!isBreak) lastResumeAtRef.current = Date.now();
  }

  function stopCounting() {
    if (lastResumeAtRef.current !== null) {
      elapsedFocusSecondsRef.current += (Date.now() - lastResumeAtRef.current) / 1000;
      lastResumeAtRef.current = null;
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    if (!projeto_id || !minutes) return;

    const secs = isPomodoro ? workSecs : parseInt(minutes as string) * 60;
    totalSeconds.current = secs;

    let restored = false;
    if (sessionKey) {
      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw) {
          const saved = JSON.parse(raw) as {
            endAt: number | null;
            secondsLeft: number;
            running: boolean;
            isBreak: boolean;
            currentCycle: number;
            totalSecs: number;
            elapsedFocusSeconds?: number;
            startTime?: string | null;
          };
          if (saved.totalSecs) totalSeconds.current = saved.totalSecs;
          setCurrentCycle(saved.currentCycle ?? 1);
          setIsBreak(saved.isBreak ?? false);
          elapsedFocusSecondsRef.current = saved.elapsedFocusSeconds ?? 0;
          if (saved.startTime) setStartTime(new Date(saved.startTime));

          if (saved.running && saved.endAt) {
            const remaining = Math.max(0, Math.round((saved.endAt - Date.now()) / 1000));
            if (remaining > 0) {
              endAtRef.current = saved.endAt;
              setSecondsLeft(remaining);
              setRunning(true);
              if (!saved.isBreak) lastResumeAtRef.current = Date.now();
              restored = true;
              setSessionRestored(true);
            } else {
              sessionStorage.removeItem(sessionKey);
            }
          } else if (!saved.running && saved.secondsLeft > 0) {
            setSecondsLeft(saved.secondsLeft);
            restored = true;
            setSessionRestored(true);
          } else {
            sessionStorage.removeItem(sessionKey);
          }
        }
      } catch { /* ignora parse error */ }
    }

    if (!restored) setSecondsLeft(secs);
    loadData();
  }, [projeto_id, minutes, router.isReady]);

  useEffect(() => {
    if (!sessionKey) return;
    if (concluded || allDone || finished || (secondsLeft === 0 && !running)) {
      if (concluded || allDone || finished) sessionStorage.removeItem(sessionKey);
      return;
    }
    sessionStorage.setItem(sessionKey, JSON.stringify({
      endAt: endAtRef.current,
      secondsLeft,
      running,
      isBreak,
      currentCycle,
      totalSecs: totalSeconds.current,
      elapsedFocusSeconds: computeLiveElapsed(),
      startTime: startTime ? startTime.toISOString() : null,
    }));
  }, [secondsLeft, running, isBreak, currentCycle, concluded, allDone, finished, startTime]);

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) { router.push("/login"); return; }

    const { data: projData } = await supabase
      .from("projetos")
      .select("titulo")
      .eq("id", projeto_id as string)
      .single();
    if (projData) setProjetoNome(projData.titulo || "");

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id, titulo, status")
      .eq("projeto_id", projeto_id as string)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true });

    const tks = (tasksData || []) as Task[];
    setTasks(tks);

    if (tks.length > 0) {
      const { data: subsData } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", tks.map(t => t.id))
        .eq("user_id", auth.user.id)
        .order("id", { ascending: true });
      setSubtasks((subsData || []) as Subtask[]);
    }

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
            setRunning(false); setFinished(true);
          }
        }
      }, 500);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (!running && endAtRef.current) endAtRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, finished, phaseKey]);

  function handlePomodoroPhaseEnd() {
    stopCounting();
    if (isBreak) {
      const nextCycle = currentCycle + 1;
      if (nextCycle > totalCycles) {
        setAllDone(true); setRunning(false); setFinished(true);
        playCelebrationSound(); startConfetti();
      } else {
        setCurrentCycle(nextCycle); setIsBreak(false);
        totalSeconds.current = workSecs;
        setSecondsLeft(workSecs);
        endAtRef.current = null;
        setPhaseKey(k => k + 1);
        lastResumeAtRef.current = Date.now();
      }
    } else {
      playBreakSound(); setIsBreak(true);
      totalSeconds.current = breakSecs;
      setSecondsLeft(breakSecs);
      endAtRef.current = null;
      setPhaseKey(k => k + 1);
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
    setRunning(v => {
      const next = !v;
      if (next) startCounting(); else stopCounting();
      return next;
    });
  }

  function handleAdjust(delta: number) {
    const adj = delta * 30;
    if (endAtRef.current !== null) {
      endAtRef.current = endAtRef.current + adj * 1000;
    }
    setSecondsLeft(prev => {
      const next = Math.max(0, prev + adj);
      if (next > totalSeconds.current) totalSeconds.current = next;
      return next;
    });
  }

  function handleRestart() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    endAtRef.current = null;
    setRunning(false); setFinished(false);
    setAllDone(false); setIsBreak(false); setCurrentCycle(1);
    const secs = isPomodoro ? workSecs : parseInt(minutes as string || "0") * 60;
    totalSeconds.current = secs;
    setSecondsLeft(secs);
    setStartTime(null);
    elapsedFocusSecondsRef.current = 0;
    lastResumeAtRef.current = null;
  }

  function handleEdit() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.push(`/dashboard/projetos/cronometro?projeto_id=${projeto_id}`);
  }

  function handleBack() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.back();
  }

  async function handleConclude() {
    if (concluded) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    endAtRef.current = null;
    stopCounting();
    setRunning(false); setFinished(true); setConcluded(true);
    playCelebrationSound();
    startConfetti();

    const durationSeconds = Math.round(elapsedFocusSecondsRef.current);
    if (startTime && durationSeconds > 0) {
      try {
        await addTimeEntry({
          project_id: projeto_id as string,
          task_id: null,
          started_at: startTime.toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        });
      } catch (err) {
        console.error("Erro ao salvar sessão de tempo:", err);
      }
    }
  }

  async function toggleSubtask(st: Subtask) {
    const nova = !st.concluida;
    setSubtasks(prev => prev.map(x => x.id === st.id ? { ...x, concluida: nova } : x));
    await supabase.from("subtasks").update({ concluida: nova }).eq("id", st.id);
  }

  async function toggleTask(task: Task) {
    const isDone = task.status === "concluida";
    const novoStatus = isDone ? "para_fazer" : "concluida";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: novoStatus } : t));
    await supabase.from("tasks").update({ status: novoStatus }).eq("id", task.id);
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const progress = totalSeconds.current > 0
    ? 1 - secondsLeft / totalSeconds.current
    : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const headAngle = progress * 2 * Math.PI;
  const headX = CX + R * Math.sin(headAngle);
  const headY = CY - R * Math.cos(headAngle);

  const endTime = startTime
    ? new Date(startTime.getTime() + totalSeconds.current * 1000)
    : null;

  const fmt = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const subtasksDone  = subtasks.filter(s => s.concluida).length;
  const modeLabel = isPomodoro
    ? isBreak ? "POMODORO · PAUSA" : `POMODORO · FOCO ${currentCycle}/${totalCycles}`
    : (MODE_LABELS[mode as string] || "CRONÔMETRO");
  const ringColor = isBreak ? "var(--secondary-500)" : "var(--primary-500)";

  if (loading && !sessionRestored) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
        style={{ display: concluded ? "block" : "none" }}
      />

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
          <>
            <header className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 lg:py-5 shrink-0 z-10">
              <button
                onClick={handleBack}
                className="tt-back-btn flex items-center gap-3 sm:gap-4 transition-colors"
              >
                <span className="tt-back-circle">
                  <ArrowLeft size={18} />
                </span>
                <span className="text-[15px] sm:text-[17px] font-medium text-gray-200">Voltar</span>
              </button>
            </header>
            <div className="tt-hdr-divider shrink-0" />
          </>
        )}

        <div
          className="tt-layout flex-1 min-h-0"
          style={tasks.length > 0
            ? { display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px", padding: "12px 40px 20px", alignItems: "center" }
            : { display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 40px 20px" }
          }
        >
          <div className="flex flex-col items-center gap-5 justify-center">

            <div className="flex flex-col items-center gap-[18px]">
              <p className="tt-eyebrow">
                {isPomodoro
                  ? isBreak
                    ? <>Pomodoro · <span style={{ color: "var(--primary-300)" }}>Pausa</span></>
                    : <>Pomodoro · <span style={{ color: "var(--primary-300)" }}>Foco {currentCycle}/{totalCycles}</span></>
                  : modeLabel}
              </p>
              {isPomodoro && (
                <div className="flex gap-[10px]">
                  {Array.from({ length: totalCycles }).map((_, i) => (
                    <span
                      key={i}
                      className="tt-seg"
                      style={i === currentCycle - 1
                        ? { background: `linear-gradient(90deg, var(--primary-400), var(--primary-500))`, boxShadow: "0 0 12px -1px var(--primary-500)" }
                        : i < currentCycle - 1
                          ? { background: "var(--primary-600)" }
                          : {}}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="tt-ring-wrap">
              <div className="tt-ring-halo" />
              <svg
                width="100%" height="100%"
                viewBox={`0 0 ${CX * 2} ${CY * 2}`}
                className="absolute inset-0"
                overflow="visible"
              >
                <defs>
                  <linearGradient id="ttRingGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--primary-200)" />
                    <stop offset="55%" stopColor="var(--primary-400)" />
                    <stop offset="100%" stopColor="var(--primary-500)" />
                  </linearGradient>
                  <filter id="ttRingGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(148,169,173,0.10)" strokeWidth={10} />
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={isBreak ? "var(--secondary-500)" : "url(#ttRingGrad)"}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${CX} ${CY})`}
                  filter="url(#ttRingGlow)"
                  style={{ transition: "stroke-dashoffset 0.6s linear, stroke 0.5s ease", opacity: progress > 0 ? 1 : 0 }}
                />
                {progress > 0 && (
                  <circle
                    cx={headX} cy={headY} r={8}
                    fill={isBreak ? "var(--secondary-300)" : "var(--primary-200)"}
                    filter="url(#ttRingGlow)"
                  />
                )}
              </svg>
              <div className="relative z-10 flex flex-col items-center gap-[6px] select-none">
                {isPomodoro && (
                  <span className="tt-center-label">
                    {isBreak ? "Pausa" : "Foco"}
                  </span>
                )}
                <div
                  className="tt-time-display"
                  style={{ color: (concluded || allDone) ? "var(--third-400)" : "var(--gray-100)" }}
                >
                  <span>{mm}</span>
                  <span
                    style={{ color: isBreak ? "var(--secondary-400)" : "var(--primary-400)", animation: running ? "colonBlink 1.6s steps(1) infinite" : "none" }}
                  >:</span>
                  <span>{ss}</span>
                </div>
                <span className="tt-time-remaining">
                  {startTime && endTime ? `${fmt(startTime)} – ${fmt(endTime)}` : `sessão de ${Math.floor(totalSeconds.current / 60).toString().padStart(2, "0")}:${(totalSeconds.current % 60).toString().padStart(2, "0")}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-7">
              <button
                onClick={() => handleAdjust(-1)}
                disabled={concluded}
                title="-30s"
                className="tt-ctrl-circle disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus size={20} />
              </button>

              <button
                onClick={togglePlay}
                disabled={concluded || secondsLeft === 0}
                className="tt-play-btn disabled:opacity-30 disabled:cursor-not-allowed"
                style={isBreak
                  ? { background: "var(--secondary-500)", boxShadow: "0 0 0 8px rgba(113,87,197,0.10), 0 20px 50px -14px rgba(113,87,197,0.8)" }
                  : {}}
              >
                {running
                  ? <Pause size={30} fill="currentColor" />
                  : <Play  size={30} fill="currentColor" style={{ marginLeft: 3 }} />
                }
              </button>

              <button
                onClick={() => handleAdjust(1)}
                disabled={concluded}
                title="+30s"
                className="tt-ctrl-circle disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex items-center gap-[14px] flex-wrap justify-center">
              <button onClick={handleEdit} className="tt-act">
                <Pencil size={16} /> Editar
              </button>
              <button
                onClick={() => setFocusMode(v => !v)}
                className={`tt-act${focusMode ? " is-active" : ""}`}
              >
                <Focus size={16} /> Foco
              </button>
              <button onClick={handleRestart} className="tt-act">
                <RotateCcw size={16} /> Reiniciar
              </button>
              {isPomodoro && running && !isBreak && (
                <button
                  onClick={() => {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    endAtRef.current = null;
                    handlePomodoroPhaseEnd();
                  }}
                  className="tt-act"
                >
                  <Coffee size={16} /> Pular pausa
                </button>
              )}
              <button
                onClick={handleConclude}
                disabled={concluded}
                className="tt-act is-end disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={16} />
                {concluded ? "Concluída ✓" : "Concluir"}
              </button>
            </div>

            {(concluded || allDone) && (
              <div className="text-center animate-fade-in" style={{ color: "var(--third-400)" }}>
                <div className="text-base font-semibold">
                  {allDone ? `🎉 ${totalCycles} ciclos concluídos!` : "🎉 Sessão concluída!"}
                </div>
                <button
                  onClick={() => router.push(`/dashboard/projetos/${projeto_id}`)}
                  className="mt-1.5 text-sm underline text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Voltar para o projeto
                </button>
              </div>
            )}
          </div>

          {tasks.length > 0 && (() => {
            const totalCount = subtasks.length > 0 ? subtasks.length : tasks.length;
            const doneCount  = subtasks.length > 0
              ? subtasksDone
              : tasks.filter(t => t.status === "concluida").length;
            const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

            return (
              <aside className="tt-task-panel">
                <div className="tt-task-head">
                  <div className="tt-task-head-row">
                    {projetoNome && (
                      <span className="tt-task-proj">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                        {projetoNome}
                      </span>
                    )}
                    <span className="tt-task-count" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {doneCount}/{totalCount}
                    </span>
                  </div>
                  <h2 className="tt-task-title">Tarefas da sessão</h2>
                  <div className="tt-task-progress">
                    <span style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <div className="tt-task-list custom-scrollbar">
                  {tasks.map(task => {
                    const taskSubs = subtasks.filter(s => s.task_id === task.id);
                    const taskDone = task.status === "concluida";
                    const subsDone = taskSubs.filter(s => s.concluida).length;

                    return (
                      <div key={task.id} className="tt-task-group">
                        <button
                          type="button"
                          onClick={() => toggleTask(task)}
                          className={`tt-task-row${taskDone ? " is-done" : ""}`}
                        >
                          <span className={`tt-task-check${taskDone ? " on" : ""}`}>
                            {taskDone && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8.5 12.5 11 15l4.5-5"/>
                              </svg>
                            )}
                          </span>
                          <span className="tt-task-name">{task.titulo}</span>
                          {taskSubs.length > 0 && (
                            <span className="tt-task-sub-count">{subsDone}/{taskSubs.length}</span>
                          )}
                        </button>

                        {taskSubs.length > 0 ? (
                          <ul className="tt-sub-list">
                            {taskSubs.map(st => (
                              <li key={st.id} className={`tt-sub-row${st.concluida ? " is-done" : ""}`}>
                                <span className="tt-sub-grip">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                    <circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/>
                                    <circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/>
                                    <circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>
                                  </svg>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleSubtask(st)}
                                  className={`tt-task-check sm${st.concluida ? " on" : ""}`}
                                >
                                  {st.concluida && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m5 12.5 4.5 4.5L19 7"/>
                                    </svg>
                                  )}
                                </button>
                                <span className="tt-sub-name">{st.titulo}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="tt-no-subs">Sem subtarefas</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </aside>
            );
          })()}

        </div>
      </div>

      <style jsx global>{`
        /* ── Task panel (project timer) ── */
        .tt-task-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 100%;
          min-height: 0;
          border-radius: 20px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          overflow: hidden;
        }
        .tt-task-head {
          padding: 26px 26px 22px;
          border-bottom: 1px solid var(--primary-700);
          flex-shrink: 0;
        }
        .tt-task-head-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tt-task-proj {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--primary-300);
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(30,182,232,0.10);
          border: 1px solid rgba(30,182,232,0.28);
        }
        .tt-task-count {
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-300);
        }
        .tt-task-title {
          margin: 16px 0 14px;
          font-size: 20px;
          font-weight: 600;
          color: var(--gray-100);
          letter-spacing: -0.01em;
        }
        .tt-task-progress {
          height: 7px;
          border-radius: 999px;
          background: rgba(148,169,173,0.12);
          overflow: hidden;
        }
        .tt-task-progress span {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
          box-shadow: 0 0 12px -1px var(--primary-500);
          transition: width 0.5s ease;
        }
        .tt-task-list {
          flex: 1;
          overflow-y: auto;
          padding: 18px 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tt-task-group { display: flex; flex-direction: column; }
        .tt-task-row {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 14px 15px;
          border-radius: 14px;
          border: 1px solid transparent;
          background: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: border-color .2s, background .2s;
          font-family: inherit;
        }
        .tt-task-row:hover { border-color: var(--primary-700); background: rgba(148,169,173,0.03); }
        .tt-task-row.is-done { background: rgba(102,187,106,0.06); border-color: rgba(102,187,106,0.16); }
        .tt-task-check {
          flex: none;
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1.6px solid var(--gray-500);
          color: var(--primary-900);
          transition: border-color .2s, background .2s, box-shadow .2s;
          margin-top: 1px;
        }
        .tt-task-check.sm { width: 24px; height: 24px; }
        .tt-task-check.on {
          border-color: var(--success-medium);
          background: var(--success-medium);
          box-shadow: 0 0 14px -3px var(--success-medium);
        }
        .tt-task-name {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          color: var(--gray-100);
          line-height: 1.4;
        }
        .tt-task-row.is-done .tt-task-name { color: var(--gray-500); text-decoration: line-through; }
        .tt-task-sub-count {
          flex: none;
          font-size: 13px;
          font-weight: 600;
          color: var(--gray-400);
          font-variant-numeric: tabular-nums;
          padding-top: 4px;
        }
        .tt-no-subs {
          margin: 4px 0 6px 56px;
          font-size: 13px;
          color: var(--gray-500);
        }
        .tt-sub-list {
          list-style: none;
          margin: 4px 0 6px;
          padding: 0 0 0 22px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tt-sub-row {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 12px;
          border-radius: 11px;
          border: 1px solid transparent;
          transition: background .15s;
        }
        .tt-sub-row:hover { background: rgba(148,169,173,0.04); }
        .tt-sub-row.is-done { background: rgba(102,187,106,0.05); border-color: rgba(102,187,106,0.14); }
        .tt-sub-grip {
          display: grid;
          place-items: center;
          color: var(--gray-600);
          flex-shrink: 0;
        }
        .tt-sub-name {
          flex: 1;
          font-size: 14px;
          color: var(--gray-200);
          line-height: 1.35;
          text-align: left;
        }
        .tt-sub-row.is-done .tt-sub-name { color: var(--gray-500); text-decoration: line-through; }

        /* ── Timer redesign ── */
        .tt-back-btn { background: none; border: none; cursor: pointer; padding: 0; color: var(--gray-200); }
        .tt-back-circle {
          display: grid; place-items: center;
          width: 46px; height: 46px;
          border-radius: 50%;
          border: 1px solid var(--gray-600);
          color: var(--gray-300);
          transition: border-color .2s, color .2s;
        }
        .tt-back-btn:hover .tt-back-circle { border-color: var(--primary-500); color: var(--primary-300); }
        .tt-hdr-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(148,169,173,0.18) 30%, rgba(148,169,173,0.18) 70%, transparent);
        }
        .tt-eyebrow {
          margin: 0; font-size: 14px; font-weight: 500;
          letter-spacing: 0.3em; text-transform: uppercase; color: var(--gray-400);
        }
        .tt-seg {
          display: inline-block; width: 42px; height: 5px;
          border-radius: 999px; background: var(--primary-800);
        }
        .tt-ring-wrap {
          position: relative; width: 296px; height: 296px;
          display: grid; place-items: center;
        }
        .tt-ring-halo {
          position: absolute; inset: 24px; border-radius: 50%;
          background: radial-gradient(circle, rgba(30,182,232,0.14), transparent 65%);
          filter: blur(12px);
          animation: ttBreathe 5s ease-in-out infinite;
        }
        .tt-center-label {
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--primary-300);
        }
        .tt-time-display {
          display: flex; align-items: baseline;
          font-size: 68px; font-weight: 500; line-height: 1;
          letter-spacing: -0.03em;
          font-variant-numeric: tabular-nums;
        }
        .tt-time-remaining { font-size: 13px; color: var(--gray-400); }
        .tt-ctrl-circle {
          display: grid; place-items: center;
          width: 46px; height: 46px; border-radius: 50%;
          border: 1px solid var(--gray-600);
          background: var(--primary-800);
          color: var(--gray-200);
          cursor: pointer; transition: border-color .2s, color .2s, transform .2s;
        }
        .tt-ctrl-circle:hover { border-color: var(--primary-500); color: var(--primary-300); transform: scale(1.06); }
        .tt-play-btn {
          display: grid; place-items: center;
          width: 68px; height: 68px; border-radius: 50%;
          border: 0; cursor: pointer; transition: transform .2s;
          color: var(--primary-900);
          background: radial-gradient(120% 120% at 30% 25%, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 0 0 6px rgba(30,182,232,0.10), 0 14px 36px -10px rgba(30,182,232,0.8);
          animation: ttGlowPulse 3s ease-in-out infinite;
        }
        .tt-play-btn:hover { transform: scale(1.05); }
        .tt-act {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: inherit; font-size: 13px; font-weight: 500;
          color: var(--gray-200); cursor: pointer;
          padding: 10px 16px; border-radius: 999px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          transition: border-color .2s, color .2s, background .2s;
        }
        .tt-act:hover { border-color: var(--gray-500); color: var(--gray-100); background: var(--primary-700); }
        .tt-act.is-active { border-color: var(--primary-500); background: rgba(30,182,232,0.10); color: var(--primary-300); }
        .tt-act.is-end {
          color: var(--primary-300);
          border-color: rgba(30,182,232,0.45);
          background: rgba(30,182,232,0.10);
        }
        .tt-act.is-end:hover {
          color: var(--primary-200);
          border-color: var(--primary-500);
          background: rgba(30,182,232,0.18);
          box-shadow: 0 0 26px -10px var(--primary-500);
        }

        @keyframes ttBreathe {
          0%, 100% { opacity: .7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes ttGlowPulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(30,182,232,0.10), 0 20px 50px -14px rgba(30,182,232,0.8); }
          50% { box-shadow: 0 0 0 14px rgba(30,182,232,0.05), 0 20px 60px -12px rgba(30,182,232,0.95); }
        }
        @keyframes colonBlink {
          0%, 55% { opacity: 1; }
          56%, 100% { opacity: 0.15; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }

        /* ── Responsivo ── */
        @media (max-width: 1023px) {
          .tt-layout {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            padding: 16px 16px 28px !important;
            gap: 24px !important;
            overflow-y: auto;
          }
          .tt-task-panel { width: 100%; height: auto; max-height: 360px; }
          .tt-ring-wrap { width: 240px !important; height: 240px !important; }
          .tt-time-display { font-size: 48px !important; }
        }
        @media (max-width: 420px) {
          .tt-ring-wrap { width: 208px !important; height: 208px !important; }
          .tt-time-display { font-size: 40px !important; }
        }
      `}</style>
    </>
  );
}
