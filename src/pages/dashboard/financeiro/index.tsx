"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import HeaderProfile from "@/components/HeaderProfile";
import DatePicker from "@/components/DatePicker";
import { SkeletonList } from "@/components/Skeleton";
import { formatCurrency, formatarData } from "@/lib/utils";
import {
  getGastos,
  addGasto,
  updateGasto,
  deleteGasto,
  encerrarGastoFixo,
} from "@/lib/supabaseQueries/gastos";
import {
  getGastosDoMes,
  totalGastosDoMes,
  getSituacaoGasto,
  CATEGORIAS_GASTO,
  type Gasto,
  type GastoDoMes,
  type TipoGasto,
  type SituacaoGasto,
} from "@/lib/gastosUtils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Pencil,
  Trash2,
  Ban,
  TrendingUp,
  TrendingDown,
  Wallet,
  ListChecks,
  History,
} from "lucide-react";

const GastosPorCategoriaDonut = dynamic(
  () => import("@/components/financeiro/GastosPorCategoriaDonut"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[260px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

const GastosVsFaturamentoChart = dynamic(
  () => import("@/components/financeiro/GastosVsFaturamentoChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function hojeAnoMes() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

function ultimoDiaDoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).toISOString().slice(0, 10);
}

function maskMoney(v: string) {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moneyToNumber(masked: string) {
  const clean = masked.replace(/[R$\s.]/g, "").replace(",", ".");
  const num = Number(clean);
  return Number.isNaN(num) ? 0 : num;
}

function formatarMesAno(dataStr: string): string {
  const [ano, mes] = dataStr.split("-").map(Number);
  return `${MESES_LABEL[mes - 1].slice(0, 3)}/${ano}`;
}

function descreverPeriodo(g: Gasto, situacao: SituacaoGasto): string {
  if (g.tipo === "variavel") return formatarData(g.data_inicio);
  if (g.tipo === "fixo") {
    return situacao.status === "encerrado" && g.data_fim
      ? `${formatarData(g.data_inicio)} até ${formatarData(g.data_fim)}`
      : `Recorrente desde ${formatarData(g.data_inicio)}`;
  }
  return situacao.fimEstimado
    ? `${g.total_parcelas}x · ${formatarMesAno(g.data_inicio)} → ${formatarMesAno(situacao.fimEstimado)}`
    : `${g.total_parcelas}x`;
}

function situacaoBadge(situacao: SituacaoGasto) {
  if (situacao.status === "ativo")
    return { label: "Ativo", color: "var(--success-medium)", bg: "rgba(102,187,106,0.10)", border: "rgba(102,187,106,0.35)" };
  if (situacao.status === "encerrado")
    return { label: "Encerrado", color: "var(--gray-400)", bg: "rgba(148,169,173,0.10)", border: "rgba(148,169,173,0.30)" };
  return { label: "Pontual", color: "var(--gray-300)", bg: "rgba(148,169,173,0.10)", border: "rgba(148,169,173,0.30)" };
}

interface FormState {
  descricao: string;
  categoria: string;
  categoriaOutraAtiva: boolean;
  tipo: TipoGasto;
  valor: string;
  data_inicio: string;
  total_parcelas: string;
}

function formInicial(refDate: { ano: number; mes: number }): FormState {
  return {
    descricao: "",
    categoria: CATEGORIAS_GASTO[0],
    categoriaOutraAtiva: false,
    tipo: "variavel",
    valor: "",
    data_inicio: `${refDate.ano}-${String(refDate.mes).padStart(2, "0")}-01`,
    total_parcelas: "2",
  };
}

const TIPO_OPCOES: { value: TipoGasto; label: string }[] = [
  { value: "variavel", label: "Variável" },
  { value: "fixo", label: "Conta fixa" },
  { value: "parcelado", label: "Parcelado" },
];

const DRAFT_KEY = "flowdesk_financeiro_gasto_draft";

interface Draft {
  modalOpen: boolean;
  editingId: string | null;
  form: FormState;
}

function lerRascunho(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

const rascunhoInicial = lerRascunho();

export default function FinanceiroPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refDate, setRefDate] = useState(hojeAnoMes());

  const [modalOpen, setModalOpen] = useState(rascunhoInicial?.modalOpen ?? false);
  const [editingId, setEditingId] = useState<string | null>(rascunhoInicial?.editingId ?? null);
  const [form, setForm] = useState<FormState>(rascunhoInicial?.form ?? formInicial(hojeAnoMes()));
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (modalOpen) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ modalOpen, editingId, form }));
    } else {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, [modalOpen, editingId, form]);

  const [revenueMensal, setRevenueMensal] = useState<
    { ano: number; mes_num: number; valor_recebido: number }[]
  >([]);

  useEffect(() => {
    async function carregar() {
      if (!authUser) return;
      setLoading(true);
      try {
        const data = await getGastos();
        setGastos(data);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [authUser]);

  useEffect(() => {
    async function carregarFaturamento() {
      if (!authUser) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const resp = await fetch("/api/reports/revenue?period=365d", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (resp.ok) setRevenueMensal(json.mensal ?? []);
    }
    carregarFaturamento();
  }, [authUser]);

  const gastosDoMes = useMemo(
    () => getGastosDoMes(gastos, refDate.ano, refDate.mes),
    [gastos, refDate]
  );

  const totalGastosMes = totalGastosDoMes(gastosDoMes);

  const faturamentoMes = useMemo(() => {
    const encontrado = revenueMensal.find(
      (m) => m.ano === refDate.ano && m.mes_num === refDate.mes
    );
    return encontrado ? encontrado.valor_recebido : 0;
  }, [revenueMensal, refDate]);

  const saldoMes = Math.round((faturamentoMes - totalGastosMes) * 100) / 100;

  const fixosEParcelados = useMemo(
    () => gastosDoMes.filter((g) => g.tipo !== "variavel"),
    [gastosDoMes]
  );

  const categoriaData = useMemo(() => {
    const mapa: Record<string, number> = {};
    gastosDoMes.forEach((g) => {
      mapa[g.categoria] = (mapa[g.categoria] || 0) + Number(g.valor || 0);
    });
    return Object.entries(mapa).map(([categoria, valor]) => ({ categoria, valor }));
  }, [gastosDoMes]);

  const categoriasConhecidas = useMemo(() => {
    const set = new Set<string>([...CATEGORIAS_GASTO, ...gastos.map((g) => g.categoria)]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [gastos]);

  const comparisonData = useMemo(() => {
    if (!revenueMensal.length) return [];
    return revenueMensal.map((m) => {
      const gastosDesseMes = getGastosDoMes(gastos, m.ano, m.mes_num);
      const totalGastosDesseMes = totalGastosDoMes(gastosDesseMes);
      const label = `${MESES_LABEL[m.mes_num - 1].slice(0, 3)}/${String(m.ano).slice(2)}`;
      return {
        mes: label,
        ano: m.ano,
        mes_num: m.mes_num,
        faturamento: m.valor_recebido,
        gastos: totalGastosDesseMes,
        saldo: Math.round((m.valor_recebido - totalGastosDesseMes) * 100) / 100,
      };
    });
  }, [gastos, revenueMensal]);

  function irParaMesAnterior() {
    setRefDate((prev) => {
      const mes = prev.mes === 1 ? 12 : prev.mes - 1;
      const ano = prev.mes === 1 ? prev.ano - 1 : prev.ano;
      return { ano, mes };
    });
  }

  function irParaProximoMes() {
    setRefDate((prev) => {
      const mes = prev.mes === 12 ? 1 : prev.mes + 1;
      const ano = prev.mes === 12 ? prev.ano + 1 : prev.ano;
      return { ano, mes };
    });
  }

  function abrirModalNovo() {
    setEditingId(null);
    setForm(formInicial(refDate));
    setErroForm(null);
    setModalOpen(true);
  }

  function abrirModalEditar(g: Gasto) {
    setEditingId(g.id);
    setForm({
      descricao: g.descricao,
      categoria: g.categoria,
      categoriaOutraAtiva: !categoriasConhecidas.includes(g.categoria),
      tipo: g.tipo,
      valor: formatCurrency(g.valor),
      data_inicio: g.data_inicio,
      total_parcelas: String(g.total_parcelas ?? 2),
    });
    setErroForm(null);
    setModalOpen(true);
  }

  function ajustarParcelas(delta: number) {
    setForm((f) => {
      const atual = Number(f.total_parcelas) || 2;
      const proximo = Math.max(2, atual + delta);
      return { ...f, total_parcelas: String(proximo) };
    });
  }

  async function salvarGasto() {
    if (!form.descricao.trim()) {
      setErroForm("Informe uma descrição.");
      return;
    }
    if (!form.categoria.trim()) {
      setErroForm("Informe uma categoria.");
      return;
    }
    const valorNum = moneyToNumber(form.valor);
    if (!valorNum || valorNum <= 0) {
      setErroForm("Informe um valor válido.");
      return;
    }
    if (form.tipo === "parcelado" && (!Number(form.total_parcelas) || Number(form.total_parcelas) < 2)) {
      setErroForm("Informe o número de parcelas (mínimo 2).");
      return;
    }

    setSalvando(true);
    setErroForm(null);
    try {
      const payload = {
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        tipo: form.tipo,
        valor: valorNum,
        data_inicio: form.data_inicio,
        total_parcelas: form.tipo === "parcelado" ? Number(form.total_parcelas) : null,
        data_fim: null as string | null,
      };

      if (editingId) {
        const atualizado = await updateGasto(editingId, payload);
        setGastos((prev) => prev.map((g) => (g.id === editingId ? atualizado : g)));
      } else {
        const criado = await addGasto(payload);
        setGastos((prev) => [criado, ...prev]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setErroForm(err.message ?? "Erro ao salvar gasto.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este gasto?")) return;
    await deleteGasto(id);
    setGastos((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleEncerrar(g: Gasto, ateAnoMes: { ano: number; mes: number }) {
    if (!confirm(`Encerrar "${g.descricao}"? Ele deixará de aparecer a partir do mês seguinte.`)) return;
    const dataFim = ultimoDiaDoMes(ateAnoMes.ano, ateAnoMes.mes);
    const atualizado = await encerrarGastoFixo(g.id, dataFim);
    setGastos((prev) => prev.map((x) => (x.id === g.id ? atualizado : x)));
  }

  function tipoBadge(g: GastoDoMes) {
    if (g.tipo === "fixo")
      return {
        label: "Fixo",
        color: "var(--primary-300)",
        bg: "rgba(30,182,232,0.10)",
        border: "rgba(30,182,232,0.35)",
      };
    if (g.tipo === "parcelado")
      return {
        label: `Parcelado ${g.parcela_atual}/${g.total_parcelas}`,
        color: "var(--alert-medium)",
        bg: "rgba(255,167,38,0.10)",
        border: "rgba(255,167,38,0.35)",
      };
    return {
      label: "Variável",
      color: "var(--gray-300)",
      bg: "rgba(148,169,173,0.10)",
      border: "rgba(148,169,173,0.30)",
    };
  }

  const mesLabel = `${MESES_LABEL[refDate.mes - 1]} de ${refDate.ano}`;

  const statCards = [
    {
      icon: TrendingUp,
      label: "Faturamento do mês",
      value: formatCurrency(faturamentoMes),
      sublabel: "recebido no período",
      valueColor: "var(--gray-100)",
    },
    {
      icon: TrendingDown,
      label: "Gastos do mês",
      value: formatCurrency(totalGastosMes),
      sublabel: `${gastosDoMes.length} lançamento${gastosDoMes.length !== 1 ? "s" : ""}`,
      valueColor: "var(--gray-100)",
    },
    {
      icon: Wallet,
      label: "Saldo do mês",
      value: formatCurrency(saldoMes),
      sublabel: "faturamento − gastos",
      valueColor: saldoMes >= 0 ? "var(--success-medium)" : "var(--error-medium)",
    },
    {
      icon: ListChecks,
      label: "Contas fixas e parceladas",
      value: String(fixosEParcelados.length),
      sublabel: `${gastosDoMes.length - fixosEParcelados.length} gasto(s) variável(is)`,
      valueColor: "var(--gray-100)",
    },
  ];

  return (
    <div
      className="relative flex flex-col flex-1 gap-[22px] overflow-y-auto financeiro-scroll"
      style={{ padding: "28px 40px 36px" }}
    >
      <div
        className="pointer-events-none absolute rounded-full z-0"
        style={{ width: 520, height: 520, right: -180, top: -180, background: "radial-gradient(circle, rgba(30,182,232,0.12), transparent 70%)", filter: "blur(100px)" }}
      />
      <div
        className="pointer-events-none absolute rounded-full z-0"
        style={{ width: 460, height: 460, right: -160, bottom: -200, background: "radial-gradient(circle, rgba(16,66,83,0.5), transparent 70%)", filter: "blur(100px)" }}
      />

      <header
        className="relative z-10 flex items-center gap-5 pb-[22px] border-b"
        style={{ borderColor: "var(--gray-700)" }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="grid place-items-center cursor-pointer transition-colors duration-200 flex-none"
          style={{ width: 46, height: 46, borderRadius: 13, border: "1px solid var(--gray-700)", background: "var(--primary-800)", color: "var(--gray-200)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-500)"; (e.currentTarget as HTMLElement).style.color = "var(--primary-300)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gray-700)"; (e.currentTarget as HTMLElement).style.color = "var(--gray-200)"; }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold tracking-tight" style={{ fontSize: 26, color: "var(--gray-100)" }}>Financeiro</span>
        <div className="ml-auto">
          <HeaderProfile />
        </div>
      </header>

      <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
        <div
          className="flex items-center gap-1"
          style={{ borderRadius: 13, border: "1px solid var(--gray-700)", background: "var(--primary-800)", padding: 6 }}
        >
          <button
            type="button"
            onClick={irParaMesAnterior}
            className="grid place-items-center cursor-pointer transition-colors duration-200"
            style={{ width: 36, height: 36, borderRadius: 10, border: 0, background: "none", color: "var(--gray-300)" }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-100)", minWidth: 168, textAlign: "center" }}>
            {mesLabel}
          </span>
          <button
            type="button"
            onClick={irParaProximoMes}
            className="grid place-items-center cursor-pointer transition-colors duration-200"
            style={{ width: 36, height: 36, borderRadius: 10, border: 0, background: "none", color: "var(--gray-300)" }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={abrirModalNovo}
          className="flex items-center gap-2 cursor-pointer transition-all duration-200"
          style={{ height: 48, padding: "0 20px", borderRadius: 13, border: 0, background: "linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)", color: "var(--primary-900)", fontSize: 15, fontWeight: 700, boxShadow: "0 12px 28px -12px rgba(30,182,232,0.8)" }}
        >
          <Plus size={18} />
          Novo gasto
        </button>
      </div>

      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col p-[24px_26px] rounded-[18px] bg-primary-800 border border-primary-700 hover:border-primary-600 hover:-translate-y-0.5 transition-all duration-200 cursor-default"
          >
            <div className="flex items-center gap-[11px] mb-[18px]">
              <span
                className="w-[38px] h-[38px] rounded-[11px] flex-none flex items-center justify-center border text-primary-400 border-primary-600"
                style={{ background: "color-mix(in srgb, var(--primary-500) 10%, transparent)" }}
              >
                <card.icon size={20} />
              </span>
              <span className="text-[15px] font-medium text-gray-300">{card.label}</span>
            </div>
            <p
              className="text-[33px] font-bold leading-[1.1] tracking-tight m-0"
              style={{ color: card.valueColor }}
            >
              {card.value}
            </p>
            <p className="text-[13.5px] text-gray-500 mt-[9px] m-0">{card.sublabel}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col gap-[18px]">
        <h2 className="text-[17px] font-semibold text-gray-200 tracking-tight m-0">
          Gastos x Faturamento (últimos meses)
        </h2>
        <div className="rounded-[18px] bg-primary-800 border border-primary-700 px-[30px] pt-[30px] pb-[22px]">
          {comparisonData.length > 0 ? (
            <GastosVsFaturamentoChart data={comparisonData} />
          ) : (
            <div className="h-72 flex items-center justify-center text-[14px] text-gray-500">
              Carregando dados de faturamento...
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-[18px]">
        <div
          className="lg:col-span-2 flex flex-col overflow-hidden"
          style={{ borderRadius: 22, border: "1px solid var(--gray-700)", background: "linear-gradient(180deg, rgba(20,40,48,0.36), rgba(8,34,42,0.2))", height: 480 }}
        >
          <div
            className="grid items-center flex-none"
            style={{ padding: "20px 26px", borderBottom: "1px solid var(--gray-700)", gap: 16, gridTemplateColumns: "2.1fr 1.3fr 1.4fr 1fr 1.2fr" }}
          >
            {["Descrição", "Categoria", "Tipo", "Valor", "Ações"].map((h, i) => (
              <span key={i} className={i === 4 ? "text-right" : ""} style={{ fontSize: 13, fontWeight: 500, color: "var(--gray-400)" }}>{h}</span>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto financeiro-scroll flex flex-col">
            {loading ? (
              <SkeletonList rows={5} cols={5} />
            ) : gastosDoMes.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: "var(--gray-500)" }}>
                Nenhum gasto neste mês.
              </div>
            ) : (
              gastosDoMes.map((g) => {
                const badge = tipoBadge(g);
                const podeEncerrar = g.tipo === "fixo" && !g.data_fim;
                return (
                  <div
                    key={g.id}
                    className="grid items-center transition-colors duration-200"
                    style={{ padding: "16px 26px", borderBottom: "1px solid rgba(29,38,40,0.7)", gap: 16, gridTemplateColumns: "2.1fr 1.3fr 1.4fr 1fr 1.2fr" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(148,169,173,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span className="truncate font-semibold text-white" style={{ fontSize: 15.5 }}>{g.descricao}</span>

                    <span className="truncate" style={{ fontSize: 14, color: "var(--gray-300)" }}>{g.categoria}</span>

                    <div>
                      <span
                        className="inline-flex items-center gap-2 font-semibold"
                        style={{ fontSize: 13, padding: "6px 12px", borderRadius: 10, border: `1px solid ${badge.border}`, background: badge.bg, color: badge.color }}
                      >
                        <span className="rounded-full flex-none" style={{ width: 7, height: 7, background: "currentColor", display: "inline-block" }} />
                        {badge.label}
                      </span>
                    </div>

                    <span className="font-bold text-white" style={{ fontSize: 15.5, fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(g.valor)}
                    </span>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => abrirModalEditar(g)}
                        className="grid place-items-center cursor-pointer transition-colors duration-200"
                        style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: "none", color: "var(--gray-400)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(148,169,173,0.10)"; (e.currentTarget as HTMLElement).style.color = "var(--gray-100)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                      >
                        <Pencil size={16} />
                      </button>

                      {podeEncerrar && (
                        <button
                          type="button"
                          title="Encerrar conta fixa"
                          onClick={() => handleEncerrar(g, refDate)}
                          className="grid place-items-center cursor-pointer transition-colors duration-200"
                          style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: "none", color: "var(--gray-400)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,167,38,0.10)"; (e.currentTarget as HTMLElement).style.color = "var(--alert-medium)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                        >
                          <Ban size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Excluir"
                        onClick={() => handleExcluir(g.id)}
                        className="grid place-items-center cursor-pointer transition-colors duration-200"
                        style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: "none", color: "var(--gray-400)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,83,80,0.10)"; (e.currentTarget as HTMLElement).style.color = "var(--error-medium)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col px-7 pt-[26px] pb-[30px] rounded-[18px] bg-primary-800 border border-primary-700">
          <div className="mb-2">
            <div className="text-[18px] font-semibold text-gray-100">Por categoria</div>
            <div className="text-[14px] text-gray-400 mt-[6px]">Gastos do mês selecionado</div>
          </div>
          <GastosPorCategoriaDonut data={categoriaData} />
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-[18px]">
        <div className="flex items-center gap-[10px]">
          <History size={18} className="text-primary-400" />
          <h2 className="text-[17px] font-semibold text-gray-200 tracking-tight m-0">Todos os gastos</h2>
        </div>
        <p className="text-[13.5px] text-gray-500 -mt-[10px] m-0">
          Histórico completo, independente do mês selecionado acima — veja quando cada gasto começou e quando termina.
        </p>

        <div
          className="flex flex-col overflow-hidden"
          style={{ borderRadius: 22, border: "1px solid var(--gray-700)", background: "linear-gradient(180deg, rgba(20,40,48,0.36), rgba(8,34,42,0.2))" }}
        >
          <div
            className="grid items-center flex-none"
            style={{ padding: "20px 26px", borderBottom: "1px solid var(--gray-700)", gap: 16, gridTemplateColumns: "1.9fr 1.2fr 1fr 1fr 1.6fr 1fr 1.2fr" }}
          >
            {["Descrição", "Categoria", "Tipo", "Valor", "Período", "Situação", "Ações"].map((h, i) => (
              <span key={i} className={i === 6 ? "text-right" : ""} style={{ fontSize: 13, fontWeight: 500, color: "var(--gray-400)" }}>{h}</span>
            ))}
          </div>

          <div style={{ maxHeight: 460, overflowY: "auto" }} className="financeiro-scroll flex flex-col">
            {loading ? (
              <SkeletonList rows={5} cols={7} />
            ) : gastos.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: "var(--gray-500)" }}>
                Nenhum gasto cadastrado ainda.
              </div>
            ) : (
              gastos.map((g) => {
                const situacao = getSituacaoGasto(g);
                const badge = situacaoBadge(situacao);
                const podeEncerrar = g.tipo === "fixo" && !g.data_fim;
                return (
                  <div
                    key={g.id}
                    className="grid items-center transition-colors duration-200"
                    style={{ padding: "16px 26px", borderBottom: "1px solid rgba(29,38,40,0.7)", gap: 16, gridTemplateColumns: "1.9fr 1.2fr 1fr 1fr 1.6fr 1fr 1.2fr" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(148,169,173,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span className="truncate font-semibold text-white" style={{ fontSize: 15 }}>{g.descricao}</span>

                    <span className="truncate" style={{ fontSize: 13.5, color: "var(--gray-300)" }}>{g.categoria}</span>

                    <span className="truncate" style={{ fontSize: 13.5, color: "var(--gray-300)" }}>
                      {g.tipo === "fixo" ? "Fixo" : g.tipo === "parcelado" ? "Parcelado" : "Variável"}
                    </span>

                    <span className="font-bold text-white" style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(g.valor)}
                    </span>

                    <span className="truncate" style={{ fontSize: 13.5, color: "var(--gray-400)" }}>
                      {descreverPeriodo(g, situacao)}
                    </span>

                    <div>
                      <span
                        className="inline-flex items-center gap-2 font-semibold"
                        style={{ fontSize: 12.5, padding: "5px 11px", borderRadius: 10, border: `1px solid ${badge.border}`, background: badge.bg, color: badge.color }}
                      >
                        <span className="rounded-full flex-none" style={{ width: 6, height: 6, background: "currentColor", display: "inline-block" }} />
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => abrirModalEditar(g)}
                        className="grid place-items-center cursor-pointer transition-colors duration-200"
                        style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: "none", color: "var(--gray-400)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(148,169,173,0.10)"; (e.currentTarget as HTMLElement).style.color = "var(--gray-100)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                      >
                        <Pencil size={16} />
                      </button>

                      {podeEncerrar && (
                        <button
                          type="button"
                          title="Encerrar conta fixa"
                          onClick={() => handleEncerrar(g, hojeAnoMes())}
                          className="grid place-items-center cursor-pointer transition-colors duration-200"
                          style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: "none", color: "var(--gray-400)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,167,38,0.10)"; (e.currentTarget as HTMLElement).style.color = "var(--alert-medium)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                        >
                          <Ban size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Excluir"
                        onClick={() => handleExcluir(g.id)}
                        className="grid place-items-center cursor-pointer transition-colors duration-200"
                        style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: "none", color: "var(--gray-400)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,83,80,0.10)"; (e.currentTarget as HTMLElement).style.color = "var(--error-medium)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(4,12,16,0.72)", backdropFilter: "blur(4px)" }}>
          <div
            className="w-full max-w-md flex flex-col overflow-hidden"
            style={{ borderRadius: 24, border: "1px solid var(--gray-600)", background: "linear-gradient(180deg, rgba(16,40,50,0.98), rgba(7,28,36,0.98))", boxShadow: "0 50px 110px -34px rgba(0,0,0,0.85), 0 0 0 1px rgba(30,182,232,0.10)" }}
          >
            <div className="flex items-center justify-between" style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--gray-700)" }}>
              <div className="font-semibold text-white" style={{ fontSize: 18 }}>
                {editingId ? "Editar gasto" : "Novo gasto"}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="grid place-items-center cursor-pointer transition-colors duration-200"
                style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--gray-700)", background: "rgba(20,40,48,0.4)", color: "var(--gray-400)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4" style={{ padding: "24px 28px 28px", maxHeight: "70vh", overflowY: "auto" }}>
              <div>
                <label className="block mb-[6px]" style={{ fontSize: 13, color: "var(--gray-300)" }}>Descrição</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Aluguel do estúdio"
                  className="w-full outline-none transition-colors duration-200"
                  style={{ borderRadius: 13, border: "1px solid var(--gray-700)", background: "rgba(6,25,31,0.6)", color: "var(--gray-100)", fontSize: 14, padding: "14px 18px" }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-500)"; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gray-700)"; }}
                />
              </div>

              <div>
                <label className="block mb-[6px]" style={{ fontSize: 13, color: "var(--gray-300)" }}>Categoria</label>
                {form.categoriaOutraAtiva ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={form.categoria}
                      onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                      placeholder="Nome da nova categoria"
                      className="flex-1 outline-none transition-colors duration-200"
                      style={{ borderRadius: 13, border: "1px solid var(--gray-700)", background: "rgba(6,25,31,0.6)", color: "var(--gray-100)", fontSize: 14, padding: "14px 18px" }}
                      onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-500)"; }}
                      onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gray-700)"; }}
                    />
                    <button
                      type="button"
                      title="Cancelar"
                      onClick={() => setForm((f) => ({ ...f, categoriaOutraAtiva: false, categoria: categoriasConhecidas[0] ?? CATEGORIAS_GASTO[0] }))}
                      className="grid place-items-center cursor-pointer transition-colors duration-200 flex-none"
                      style={{ width: 48, height: 48, borderRadius: 13, border: "1px solid var(--gray-700)", background: "rgba(20,40,48,0.4)", color: "var(--gray-400)" }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <select
                    value={form.categoria}
                    onChange={(e) => {
                      if (e.target.value === "__nova__") {
                        setForm((f) => ({ ...f, categoriaOutraAtiva: true, categoria: "" }));
                      } else {
                        setForm((f) => ({ ...f, categoria: e.target.value }));
                      }
                    }}
                    className="w-full appearance-none cursor-pointer outline-none transition-colors duration-200"
                    style={{ borderRadius: 13, border: "1px solid var(--gray-700)", background: "rgba(6,25,31,0.6)", color: "var(--gray-100)", fontSize: 14, padding: "14px 18px" }}
                  >
                    {categoriasConhecidas.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__nova__">+ Nova categoria...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block mb-[8px]" style={{ fontSize: 13, color: "var(--gray-300)" }}>Tipo de gasto</label>
                <div className="flex gap-2">
                  {TIPO_OPCOES.map((opt) => {
                    const ativo = form.tipo === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, tipo: opt.value }))}
                        className="flex-1 cursor-pointer transition-all duration-200"
                        style={{
                          height: 42,
                          borderRadius: 11,
                          fontSize: 13.5,
                          fontWeight: 600,
                          border: `1px solid ${ativo ? "var(--primary-500)" : "var(--gray-700)"}`,
                          background: ativo ? "rgba(30,182,232,0.14)" : "transparent",
                          color: ativo ? "var(--primary-200)" : "var(--gray-400)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block mb-[6px]" style={{ fontSize: 13, color: "var(--gray-300)" }}>
                    {form.tipo === "variavel" ? "Valor" : "Valor da parcela mensal"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: maskMoney(e.target.value) }))}
                    placeholder="R$ 0,00"
                    className="w-full outline-none transition-colors duration-200"
                    style={{ borderRadius: 13, border: "1px solid var(--gray-700)", background: "rgba(6,25,31,0.6)", color: "var(--gray-100)", fontSize: 14, padding: "14px 18px" }}
                    onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-500)"; }}
                    onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gray-700)"; }}
                  />
                </div>

                {form.tipo === "parcelado" && (
                  <div style={{ width: 120 }}>
                    <label className="block mb-[6px]" style={{ fontSize: 13, color: "var(--gray-300)" }}>Parcelas</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="2"
                        value={form.total_parcelas}
                        onChange={(e) => setForm((f) => ({ ...f, total_parcelas: e.target.value }))}
                        className="w-full outline-none transition-colors duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ borderRadius: 13, border: "1px solid var(--gray-700)", background: "rgba(6,25,31,0.6)", color: "var(--gray-100)", fontSize: 14, padding: "14px 30px 14px 18px" }}
                        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-500)"; }}
                        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gray-700)"; }}
                      />
                      <div className="absolute flex flex-col" style={{ right: 6, top: "50%", transform: "translateY(-50%)", gap: 1 }}>
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => ajustarParcelas(1)}
                          className="grid place-items-center cursor-pointer transition-colors duration-200"
                          style={{ width: 22, height: 17, borderRadius: 5, border: 0, background: "rgba(148,169,173,0.10)", color: "var(--gray-400)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary-300)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => ajustarParcelas(-1)}
                          className="grid place-items-center cursor-pointer transition-colors duration-200"
                          style={{ width: 22, height: 17, borderRadius: 5, border: 0, background: "rgba(148,169,173,0.10)", color: "var(--gray-400)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary-300)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gray-400)"; }}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-[6px]" style={{ fontSize: 13, color: "var(--gray-300)" }}>
                  {form.tipo === "variavel" ? "Data do gasto" : "Data de início"}
                </label>
                <DatePicker
                  value={form.data_inicio}
                  onChange={(v) => setForm((f) => ({ ...f, data_inicio: v }))}
                  className="w-full"
                />
              </div>

              {erroForm && (
                <div
                  className="flex items-center gap-2 rounded-[11px] text-[13px]"
                  style={{ padding: "12px 16px", background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.3)", color: "var(--error-medium)" }}
                >
                  {erroForm}
                </div>
              )}

              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 cursor-pointer transition-colors duration-200"
                  style={{ height: 48, borderRadius: 13, border: "1px solid var(--gray-700)", background: "none", color: "var(--gray-300)", fontSize: 14, fontWeight: 500 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarGasto}
                  disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ height: 48, borderRadius: 13, border: 0, background: "linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)", color: "var(--primary-900)", fontSize: 15, fontWeight: 700, boxShadow: "0 12px 28px -12px rgba(30,182,232,0.8)" }}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .financeiro-scroll::-webkit-scrollbar { width: 8px; }
        .financeiro-scroll::-webkit-scrollbar-thumb { background: var(--primary-600); border-radius: 8px; }
        .financeiro-scroll { scrollbar-width: thin; scrollbar-color: var(--primary-600) transparent; }
      `}</style>
    </div>
  );
}
