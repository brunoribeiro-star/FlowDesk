"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Timer, Zap, Flame, Clock } from "lucide-react";

interface Task {
  id: string;
  titulo: string;
  status: string;
}

function NumericInput({
  value,
  onChange,
  min = 1,
  max = 480,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-xs"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          className="w-12 text-center bg-primary-800 border border-primary-600 rounded-lg px-1 py-0.5 text-gray-100 text-sm font-medium focus:outline-none focus:border-primary-400"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-xs"
        >
          +
        </button>
      </div>
    </div>
  );
}

const MODES = [
  {
    id: "pomodoro",
    label: "Pomodoro",
    minutes: 25,
    icon: Timer,
    description: "Foco curto e eficiente",
    color: "from-primary-600/20 to-primary-700/10",
    border: "border-primary-600",
    accent: "text-primary-400",
    dot: "bg-primary-500",
  },
  {
    id: "foco",
    label: "Foco",
    minutes: 50,
    icon: Zap,
    description: "Sessão profunda e produtiva",
    color: "from-secondary-600/20 to-secondary-700/10",
    border: "border-secondary-600",
    accent: "text-secondary-400",
    dot: "bg-secondary-500",
  },
  {
    id: "sprint",
    label: "Sprint",
    minutes: 90,
    icon: Flame,
    description: "Imersão total no projeto",
    color: "from-third-600/20 to-third-700/10",
    border: "border-third-600",
    accent: "text-third-400",
    dot: "bg-third-500",
  },
  {
    id: "personalizado",
    label: "Personalizado",
    minutes: 0,
    icon: Clock,
    description: "Defina seu próprio tempo",
    color: "from-gray-600/20 to-gray-700/10",
    border: "border-gray-600",
    accent: "text-gray-400",
    dot: "bg-gray-400",
  },
];

export default function CronometroConfigPage() {
  const router = useRouter();
  const { taskId } = router.query;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [pomodoroWork, setPomodoroWork] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [pomodoroCycles, setPomodoroCycles] = useState(4);

  useEffect(() => {
    if (!router.isReady) return;
    if (!taskId) return;
    loadTask();
  }, [taskId, router.isReady]);

  async function loadTask() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push("/login");
      return;
    }
    const { data } = await supabase
      .from("tasks")
      .select("id, titulo, status")
      .eq("id", taskId as string)
      .eq("user_id", auth.user.id)
      .single();
    setTask(data || null);
    setLoading(false);
  }

  function handleStart() {
    if (!selected) return;
    const mode = MODES.find((m) => m.id === selected);
    if (!mode) return;
    if (selected === "pomodoro") {
      router.push(
        `/dashboard/tarefas/cronometro/sessao?taskId=${taskId}&mode=pomodoro&minutes=${pomodoroWork}&breakMinutes=${pomodoroBreak}&cycles=${pomodoroCycles}`
      );
      return;
    }
    const minutes = selected === "personalizado" ? customMinutes : mode.minutes;
    router.push(
      `/dashboard/tarefas/cronometro/sessao?taskId=${taskId}&mode=${selected}&minutes=${minutes}`
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    );
  }

  return (
    <>

      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <header className="flex items-center justify-between px-8 py-6 border-b border-primary-800 bg-primary-900 z-10">
          <button
            onClick={() => router.push(`/dashboard/tarefas/${taskId}`)}
            className="flex items-center gap-2 group text-gray-400 hover:text-white transition-colors"
          >
            <div className="p-2 rounded-full border border-primary-700 group-hover:bg-primary-800 transition-colors">
              <ArrowLeft size={18} />
            </div>
            <span className="text-sm font-medium">Voltar para tarefa</span>
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Timer size={16} className="text-primary-400" />
            <span>Configurar cronômetro</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-2xl flex flex-col gap-8">

            {task && (
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-widest font-medium mb-2">
                  Focando em
                </p>
                <h1 className="text-2xl font-medium text-gray-100 leading-snug">
                  {task.titulo}
                </h1>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selected === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelected(mode.id)}
                    className={`
                      relative flex flex-col gap-3 p-6 rounded-2xl border text-left transition-all
                      bg-gradient-to-br ${mode.color}
                      ${isSelected
                        ? `${mode.border} ring-2 ring-offset-2 ring-offset-primary-900 ring-primary-500/60 scale-[1.01]`
                        : "border-primary-800 hover:border-primary-700 hover:scale-[1.005]"}
                    `}
                  >
                    {isSelected && (
                      <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${mode.dot} shadow-lg`} />
                    )}

                    <div className={`w-10 h-10 rounded-xl bg-primary-800/60 flex items-center justify-center ${mode.accent}`}>
                      <Icon size={20} />
                    </div>

                    <div>
                      <div className="font-medium text-gray-100 text-lg">{mode.label}</div>
                      <div className={`text-sm font-medium ${mode.accent}`}>
                        {mode.id === "personalizado"
                          ? "Tempo livre"
                          : mode.id === "pomodoro"
                          ? `${pomodoroWork}min foco · ${pomodoroBreak}min pausa · ${pomodoroCycles}x`
                          : `${mode.minutes} minutos`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{mode.description}</div>
                    </div>

                    {mode.id === "pomodoro" && isSelected && (
                      <div
                        className="flex flex-wrap items-end gap-4 mt-2 pt-3 border-t border-primary-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <NumericInput label="Foco (min)" value={pomodoroWork} onChange={setPomodoroWork} min={1} max={120} />
                        <NumericInput label="Pausa (min)" value={pomodoroBreak} onChange={setPomodoroBreak} min={1} max={60} />
                        <NumericInput label="Ciclos" value={pomodoroCycles} onChange={setPomodoroCycles} min={1} max={20} />
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total</span>
                          <span className="text-sm text-gray-300 font-medium">
                            {Math.round(pomodoroWork * pomodoroCycles + pomodoroBreak * (pomodoroCycles - 1))}min
                          </span>
                        </div>
                      </div>
                    )}

                    {mode.id === "personalizado" && isSelected && (
                      <div
                        className="flex items-center gap-3 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setCustomMinutes((v) => Math.max(1, v - 5))}
                          className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-sm"
                        >
                          −
                        </button>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={480}
                            value={customMinutes}
                            onChange={(e) =>
                              setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-16 text-center bg-primary-800 border border-primary-600 rounded-lg px-2 py-1 text-gray-100 text-lg font-medium focus:outline-none focus:border-primary-400"
                          />
                          <span className="text-sm text-gray-400">min</span>
                        </div>
                        <button
                          onClick={() => setCustomMinutes((v) => Math.min(480, v + 5))}
                          className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleStart}
              disabled={!selected}
              className={`
                w-full py-4 rounded-2xl font-medium text-lg transition-all
                ${selected
                  ? "bg-primary-500 hover:bg-primary-400 text-primary-900 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-[1.01]"
                  : "bg-primary-800/50 text-gray-600 cursor-not-allowed"}
              `}
            >
              {selected ? "Iniciar cronômetro →" : "Selecione um modo para continuar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
