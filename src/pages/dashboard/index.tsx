import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";

/* ===== Tipagens ===== */
type Point = { x: number; y: number; date: string; value: number };

/* ===== Dados temporários para o gráfico (mock) ===== */
const currentMonth: Point[] = [
  { x: 0.0, y: 0.02, date: "01 seg", value: 1000 },
  { x: 0.15, y: 0.18, date: "07 dom", value: 18000 },
  { x: 0.32, y: 0.32, date: "14 dom", value: 32000 },
  { x: 0.55, y: 0.68, date: "22 seg", value: 100000 },
  { x: 0.75, y: 0.74, date: "26 sex", value: 118000 },
  { x: 0.98, y: 0.78, date: "30 ter", value: 132978 },
];

const lastMonth: Point[] = [
  { x: 0.0, y: 0.05, date: "01", value: 5000 },
  { x: 0.25, y: 0.28, date: "08", value: 28000 },
  { x: 0.50, y: 0.55, date: "16", value: 55000 },
  { x: 0.75, y: 0.72, date: "23", value: 72000 },
  { x: 1.0, y: 0.82, date: "30", value: 120000 },
];

const Y_STEPS = ["150k", "100k", "50k", "0"];
const WEEKS = ["Semana 01", "Semana 02", "Semana 03", "Semana 04"];

export default function DashboardHome() {
  /* ===== Estados ===== */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; value: number; date: string } | null>(null);
  const [visibleActivities, setVisibleActivities] = useState(5);
  const [user, setUser] = useState<any>(null);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const activitiesRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 800, height: 320 });

  /* ===== Observar tamanho do gráfico ===== */
  useEffect(() => {
    if (!graphRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setGraphSize({ width, height });
    });
    observer.observe(graphRef.current);
    return () => observer.disconnect();
  }, []);

  /* ===== Ajustar quantidade de atividades conforme altura ===== */
  useEffect(() => {
    function adjustVisibleActivities() {
      if (activitiesRef.current) {
        const h = activitiesRef.current.clientHeight;
        const cardsFit = Math.floor(h / 110);
        setVisibleActivities(Math.max(3, Math.min(cardsFit, 7)));
      }
    }
    adjustVisibleActivities();
    window.addEventListener("resize", adjustVisibleActivities);
    return () => window.removeEventListener("resize", adjustVisibleActivities);
  }, []);

  /* ===== Buscar usuário logado e dados reais ===== */
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(userData.user);

      // Buscar projetos do usuário
      const { data: projData } = await supabase
        .from("projetos")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      // Buscar atividades recentes
      const { data: atvData } = await supabase
        .from("atividades")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setProjetos(projData || []);
      setAtividades(atvData || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  /* ===== Preparar gráfico ===== */
  const graph = { w: graphSize.width, h: graphSize.height, pad: 40 };
  const pathCurrent = useMemo(() => toPath(currentMonth, graph), [graphSize]);
  const pathLast = useMemo(() => toPath(lastMonth, graph), [graphSize]);
  const faturamentoMes = toCurrency(currentMonth.at(-1)!.value);

  /* ===== Calcular métricas ===== */
  const METRICS = [
    {
      id: "proj",
      icon: "/projetos-dashboard.svg",
      label: "Projetos ativos",
      value: projetos.length > 0 ? `${projetos.length} Projetos` : "Nenhum projeto",
    },
    {
      id: "entregas",
      icon: "/entregas.svg",
      label: "Entregas pendentes",
      value: projetos.filter((p) => p.status === "pendente").length + " pendentes",
    },
    {
      id: "tarefas",
      icon: "/tarefas.svg",
      label: "Tarefas vencendo",
      value: "—",
    },
    {
      id: "pay",
      icon: "/pagamentos.svg",
      label: "Pagamentos a receber",
      value: "—",
    },
  ];

  /* ===== Renderização ===== */
  if (loading)
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center text-[24px]">
        Carregando...
      </div>
    );

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      {/* ===== CONTEÚDO ===== */}
      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">
        {/* HEADER */}
        <header className="w-full flex items-center gap-[92px]">
          <div className="flex items-center gap-3">
            <div className="w-[70px] h-[70px] rounded-full overflow-hidden border border-primary-600">
              <Image src="/perfil.svg" alt="Avatar" width={70} height={70} className="object-contain p-2" />
            </div>
            <div className="flex flex-col gap-[5px]">
              <div className="text-[30px] text-gray-200 font-medium">
                Olá, {user?.user_metadata?.name || "Usuário"}!
              </div>
              <div className="text-[20px] text-gray-300">Aqui está o resumo do seu trabalho.</div>
            </div>
          </div>

          <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 flex items-center gap-3 min-w-0">
            <div className="flex-1 flex items-center gap-3 bg-primary-700 border border-primary-600 rounded-lg px-4 py-3 min-w-0">
              <Image src="/buscar.svg" alt="Buscar" width={18} height={18} />
              <input
                placeholder="Buscar..."
                className="w-full bg-transparent outline-none text-[16px] text-gray-200 placeholder-gray-300"
              />
            </div>
            <div className="flex items-center gap-5 pr-1 shrink-0">
              <div className="relative">
                <Image src="/notificacao.svg" alt="Notificações" width={22} height={22} />
              </div>
              <Image src="/perfil.svg" alt="Perfil" width={22} height={22} />
            </div>
          </div>
        </header>

        {/* PRINCIPAL */}
        <section className="flex-1 flex flex-col gap-4 min-h-0">
          {/* METRICS */}
          <div className="w-full grid grid-cols-4 gap-4">
            {METRICS.map((m) => (
              <div
                key={m.id}
                className="flex flex-col justify-center items-start gap-3 p-5 rounded-lg bg-primary-800 border border-primary-700 w-full h-fit hover:[background:linear-gradient(180deg,var(--primary-500),var(--primary-800))] transition-colors"
              >
                <Image src={m.icon} alt={m.label} width={26} height={26} />
                <div className="text-[16px] text-gray-300">{m.label}</div>
                <div className="text-[32px] text-gray-200 font-medium">{m.value}</div>
              </div>
            ))}
          </div>

          {/* GRÁFICO + ATIVIDADES */}
          <div className="flex-1 grid grid-cols-[1.2fr,0.8fr] gap-4 min-h-[440px]">
            {/* === GRÁFICO === */}
            <div className="flex flex-col gap-4 h-full min-h-0">
              <div className="flex-1 flex flex-col rounded-lg bg-primary-800 border border-primary-700 overflow-hidden min-h-0">
                <div className="px-5 py-5 border-b border-primary-700">
                  <div className="text-[16px] text-gray-300 mb-2">Faturamento deste mês</div>
                  <div className="flex items-center justify-between">
                    <div className="text-[32px] text-gray-200 font-medium">{faturamentoMes}</div>
                    <div className="flex items-center gap-6">
                      <LegendDot label="Mês atual" color="var(--primary-500)" />
                      <LegendDot label="Último mês" color="var(--primary-600)" />
                    </div>
                  </div>
                </div>

                <div ref={graphRef} className="relative flex-1 px-8 py-4">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {Y_STEPS.map((label, i) => (
                      <div key={i} className="flex items-center w-full text-gray-400 text-[14px]">
                        <span className="w-12 text-right mr-2">{label}</span>
                        <div className="flex-1 border-t border-dashed border-gray-400" />
                      </div>
                    ))}
                  </div>

                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${graph.w} ${graph.h}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="absolute inset-0"
                    onMouseLeave={() => setHover(null)}
                  >
                    <path d={pathLast} fill="none" stroke="var(--primary-600)" strokeWidth={2} strokeDasharray="6 6" />
                    <path d={pathCurrent} fill="none" stroke="var(--primary-500)" strokeWidth={4} />
                    {currentMonth.map((p, i) => {
                      const { cx, cy } = toCoord(p, graph);
                      return (
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r={8}
                          fill="var(--primary-500)"
                          className="cursor-pointer"
                          onMouseEnter={() => setHover({ x: cx, y: cy, value: p.value, date: p.date })}
                        />
                      );
                    })}
                  </svg>

                  {hover && (
                    <div
                      style={{ left: hover.x + 10, top: hover.y - 80 }}
                      className="absolute z-10 rounded-lg px-3 py-4 bg-primary-600 text-gray-100"
                    >
                      <div className="text-[18px] font-medium">{toCurrency(hover.value)}</div>
                      <div className="text-[14px] mt-1">{hover.date}</div>
                    </div>
                  )}
                </div>

                <div className="mt-2 rounded-lg bg-primary-700 px-5 py-3 flex items-center justify-between">
                  {WEEKS.map((w) => (
                    <span key={w} className="text-[16px] leading-none text-gray-400">
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-4 text-[24px] font-semibold transition-colors">
                  Novo projeto
                </button>
                <button className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-4 text-[24px]">
                  Novo briefing
                </button>
              </div>
            </div>

            {/* === ATIVIDADES === */}
            <div
              ref={activitiesRef}
              className="h-full rounded-lg bg-primary-800 border border-primary-700 p-6 flex flex-col gap-5 min-h-0 overflow-hidden"
            >
              <div className="text-[24px] text-gray-200 font-medium">Atividades recentes</div>
              <div className="flex flex-col min-h-0 overflow-hidden">
                {atividades.length > 0 ? (
                  atividades.slice(0, visibleActivities).map((a, i) => (
                    <div key={i} className="flex items-start gap-3 py-4 border-b border-primary-700 last:border-b-0">
                      <div className="w-8 h-8 rounded-full bg-primary-700 border border-primary-600 flex items-center justify-center text-gray-200">
                        •
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="text-[18px] text-gray-300 font-medium">{a.tipo}</div>
                        <div className="text-[16px] text-gray-400">{a.descricao}</div>
                      </div>
                      <div className="text-[14px] text-gray-400 whitespace-nowrap">{a.created_at?.slice(0, 10)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-[16px] mt-10 text-center">
                    Nenhuma atividade recente
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============ Helpers ============ */
function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[16px] text-gray-200">{label}</span>
    </div>
  );
}

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toCoord(p: Point, g: { w: number; h: number; pad: number }) {
  const cx = g.pad + p.x * (g.w - g.pad * 2);
  const cy = g.h - g.pad - p.y * (g.h - g.pad * 2);
  return { cx, cy };
}

function toPath(points: Point[], g: { w: number; h: number; pad: number }) {
  if (!points.length) return "";
  const first = toCoord(points[0], g);
  let d = `M ${first.cx} ${first.cy}`;
  for (let i = 1; i < points.length; i++) {
    const { cx, cy } = toCoord(points[i], g);
    d += ` L ${cx} ${cy}`;
  }
  return d;
}