"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Timer, Zap, Flame, Clock, ArrowRight, Check } from "lucide-react";

interface Projeto {
  id: string;
  titulo: string;
  status: string;
}

const MODES = [
  {
    id: "pomodoro", label: "Pomodoro", minutes: 25, Icon: Timer,
    desc: "Ciclos de foco com pausas curtas",
    acc: { color: "var(--primary-400)", soft: "rgba(79,197,235,0.14)", line: "rgba(79,197,235,0.45)", shadow: "rgba(79,197,235,0.65)" },
  },
  {
    id: "foco", label: "Foco", minutes: 50, Icon: Zap,
    desc: "Sessão profunda e produtiva",
    acc: { color: "var(--secondary-400)", soft: "rgba(140,119,211,0.14)", line: "rgba(140,119,211,0.45)", shadow: "rgba(140,119,211,0.65)" },
  },
  {
    id: "sprint", label: "Sprint", minutes: 90, Icon: Flame,
    desc: "Imersão total no projeto",
    acc: { color: "var(--third-400)", soft: "rgba(40,185,148,0.14)", line: "rgba(40,185,148,0.45)", shadow: "rgba(40,185,148,0.65)" },
  },
  {
    id: "personalizado", label: "Personalizado", minutes: 0, Icon: Clock,
    desc: "Defina seu próprio tempo",
    acc: { color: "var(--gray-300)", soft: "rgba(148,169,173,0.12)", line: "rgba(148,169,173,0.35)", shadow: "rgba(148,169,173,0.45)" },
  },
];

function NumericInput({ value, onChange, min = 1, max = 480, label }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-xs">
          −
        </button>
        <input type="number" min={min} max={max} value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          className="w-12 text-center bg-primary-900 border border-primary-700 rounded-lg px-1 py-0.5 text-gray-100 text-sm font-medium focus:outline-none focus:border-primary-400" />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-xs">
          +
        </button>
      </div>
    </div>
  );
}

export default function ProjetoCronometroConfigPage() {
  const router = useRouter();
  const { projeto_id } = router.query;

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [pomodoroWork, setPomodoroWork] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [pomodoroCycles, setPomodoroCycles] = useState(4);

  useEffect(() => {
    if (!router.isReady) return;
    if (!projeto_id) return;
    loadProjeto();
  }, [projeto_id, router.isReady]);

  async function loadProjeto() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push("/login");
      return;
    }
    const { data } = await supabase
      .from("projetos")
      .select("id, titulo, status")
      .eq("id", projeto_id as string)
      .eq("user_id", auth.user.id)
      .single();
    setProjeto(data || null);
    setLoading(false);
  }

  function handleStart() {
    if (!selected) return;
    const mode = MODES.find(m => m.id === selected);
    if (!mode) return;
    if (typeof window !== "undefined" && projeto_id) {
      sessionStorage.removeItem(`tt_session_${projeto_id}`);
    }
    if (selected === "pomodoro") {
      router.push(
        `/dashboard/projetos/cronometro/sessao?projeto_id=${projeto_id}&mode=pomodoro&minutes=${pomodoroWork}&breakMinutes=${pomodoroBreak}&cycles=${pomodoroCycles}`
      );
      return;
    }
    const minutes = selected === "personalizado" ? customMinutes : mode.minutes;
    router.push(
      `/dashboard/projetos/cronometro/sessao?projeto_id=${projeto_id}&mode=${selected}&minutes=${minutes}`
    );
  }

  const selectedMode = MODES.find(m => m.id === selected);

  function modeValueText(mode: typeof MODES[number]) {
    if (mode.id === "pomodoro") return `${pomodoroWork}min foco · ${pomodoroBreak}min pausa · ${pomodoroCycles}x`;
    if (mode.id === "personalizado") return "Tempo livre";
    return `${mode.minutes} minutos`;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "var(--primary-900)" }}>
      <div className="pointer-events-none absolute z-0" style={{
        width: 460, height: 460, right: 0, top: -120, borderRadius: "50%",
        filter: "blur(110px)",
        background: "radial-gradient(circle, rgba(113,87,197,0.11), transparent 70%)",
      }} />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 xl:px-11 py-4 sm:py-6">
        <button type="button" onClick={() => router.push(`/dashboard/projetos/${projeto_id}`)}
          className="group flex items-center gap-3 sm:gap-4 bg-transparent border-0 p-0 cursor-pointer">
          <span className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-gray-600 text-gray-300 transition-all duration-200 group-hover:border-primary-500 group-hover:text-primary-300 flex-none">
            <ArrowLeft size={18} />
          </span>
          <span className="text-[16px] sm:text-[19px] font-medium text-gray-200">Voltar para projeto</span>
        </button>
      </header>

      <div className="relative z-10 h-px" style={{
        background: "linear-gradient(90deg, transparent, rgba(148,169,173,0.18) 30%, rgba(148,169,173,0.18) 70%, transparent)",
      }} />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 gap-8 sm:gap-10 overflow-y-auto">

        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-gray-500 mb-3">Focando em</p>
          <h1 className="text-[26px] sm:text-[38px] xl:text-[44px] font-semibold tracking-tight leading-tight text-gray-100">
            {projeto?.titulo || "Projeto"}
          </h1>
          <p className="mt-3 text-[14px] sm:text-[16px] xl:text-[17px] text-gray-500">
            Como você quer cronometrar essa sessão de trabalho.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full max-w-[780px]">
          {MODES.map(mode => {
            const isSelected = selected === mode.id;
            const { Icon } = mode;
            return (
              <button key={mode.id} type="button"
                onClick={() => setSelected(mode.id)}
                className={`group relative overflow-hidden text-left flex gap-4 sm:gap-5 p-5 sm:p-7 rounded-[22px] border transition-all duration-200 cursor-pointer hover:-translate-y-1 ${isSelected ? "-translate-y-1" : ""}`}
                style={{
                  background: "linear-gradient(180deg, var(--primary-800), var(--primary-900))",
                  borderColor: isSelected ? mode.acc.color : "var(--gray-700)",
                  boxShadow: isSelected
                    ? `0 0 0 1px ${mode.acc.color}, 0 22px 50px -22px ${mode.acc.shadow}, 0 0 60px -20px ${mode.acc.shadow}`
                    : undefined,
                }}>

                <span className={`absolute inset-0 rounded-[22px] pointer-events-none transition-opacity duration-300 group-hover:opacity-100 ${isSelected ? "opacity-100" : "opacity-0"}`}
                  style={{ background: `radial-gradient(120% 90% at 0% 0%, ${mode.acc.soft}, transparent 60%)` }}
                  aria-hidden="true" />

                <span className="relative flex-none flex items-center justify-center w-14 h-14 rounded-2xl border transition-all duration-200"
                  style={{
                    color: mode.acc.color,
                    background: mode.acc.soft,
                    borderColor: mode.acc.line,
                    boxShadow: isSelected ? `0 0 24px -6px ${mode.acc.color}` : undefined,
                  }}>
                  <Icon size={24} />
                </span>

                <span className="relative flex flex-col gap-1.5 flex-1 min-w-0">
                  <span className="text-[22px] font-semibold text-gray-100 tracking-tight leading-tight">
                    {mode.label}
                  </span>
                  <span className="text-[15px] font-semibold" style={{ color: mode.acc.color }}>
                    {modeValueText(mode)}
                  </span>
                  <span className="text-[14px] text-gray-500 leading-snug">{mode.desc}</span>

                  {mode.id === "pomodoro" && isSelected && (
                    <div className="flex flex-wrap items-end gap-4 mt-2 pt-3 border-t border-gray-700"
                      onClick={e => e.stopPropagation()}>
                      <NumericInput label="Foco (min)" value={pomodoroWork} onChange={setPomodoroWork} min={1} max={120} />
                      <NumericInput label="Pausa (min)" value={pomodoroBreak} onChange={setPomodoroBreak} min={1} max={60} />
                      <NumericInput label="Ciclos" value={pomodoroCycles} onChange={setPomodoroCycles} min={1} max={20} />
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total</span>
                        <span className="text-sm text-gray-300 font-medium">
                          {Math.round(pomodoroWork * pomodoroCycles + pomodoroBreak * (pomodoroCycles - 1))}min
                        </span>
                      </div>
                    </div>
                  )}

                  {mode.id === "personalizado" && isSelected && (
                    <div className="flex items-center gap-3 mt-1" onClick={e => e.stopPropagation()}>
                      <button type="button" onClick={() => setCustomMinutes(v => Math.max(1, v - 5))}
                        className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-sm">
                        −
                      </button>
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} max={480} value={customMinutes}
                          onChange={e => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 text-center bg-primary-900 border border-primary-700 rounded-lg px-2 py-1 text-gray-100 text-lg font-medium focus:outline-none focus:border-primary-400" />
                        <span className="text-sm text-gray-500">min</span>
                      </div>
                      <button type="button" onClick={() => setCustomMinutes(v => Math.min(480, v + 5))}
                        className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center text-gray-300 hover:bg-primary-700 transition-colors text-sm">
                        +
                      </button>
                    </div>
                  )}
                </span>

                <span className="absolute top-5 right-5 flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 pointer-events-none"
                  style={{
                    color: mode.acc.color,
                    opacity: isSelected ? 1 : 0,
                    transform: isSelected ? "scale(1)" : "scale(0.7)",
                  }}>
                  <Check size={20} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-7 flex-wrap justify-center">
          <span className="flex items-center gap-2.5 text-[15px] text-gray-300">
            <span className="w-2 h-2 rounded-full animate-pulse shrink-0"
              style={{ background: "var(--primary-400)", boxShadow: "0 0 12px 1px var(--primary-400)" }} />
            {selectedMode ? `${selectedMode.label} selecionado` : "Selecione um modo para continuar"}
          </span>
          <button type="button" onClick={handleStart} disabled={!selected}
            className="flex items-center gap-2.5 text-[16px] font-semibold px-7 py-3.5 rounded-full border-0 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            style={{
              color: "var(--primary-900)",
              background: "linear-gradient(135deg, var(--primary-300), var(--primary-500) 60%, var(--third-400))",
              boxShadow: selected ? "0 14px 34px -12px rgba(30,182,232,0.7)" : undefined,
            }}>
            Continuar <ArrowRight size={18} />
          </button>
        </div>
      </main>
    </div>
  );
}
