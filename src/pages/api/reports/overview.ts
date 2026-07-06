import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPeriodWindowStart, roundHorasToMinuto } from "@/lib/reportUtils";

const CONCLUDED_STATUSES = new Set(["concluído", "concluido", "finalizado"]);
const INACTIVE_STATUSES = new Set(["concluído", "concluido", "finalizado", "arquivado"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!accessToken) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const uid = user.id;

  const period = String(req.query.period ?? "365d");
  const windowStart = getPeriodWindowStart(period);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const pagQuery = supabaseAdmin
    .from("pagamentos")
    .select("id, valor, status")
    .eq("user_id", uid);
  if (windowStart) pagQuery.gte("created_at", windowStart.toISOString());

  const timeQuery = supabaseAdmin
    .from("time_entries")
    .select("duration_seconds, project_id, task_id")
    .eq("user_id", uid);
  if (windowStart) timeQuery.gte("started_at", windowStart.toISOString());

  const collabEarnedQuery = supabaseAdmin
    .from("collaborator_payment_splits")
    .select("amount, status")
    .eq("member_user_id", uid);
  if (windowStart) collabEarnedQuery.gte("created_at", windowStart.toISOString());

  const [projRes, pagRes, timeRes, collabEarnedRes] = await Promise.all([
    supabaseAdmin
      .from("projetos")
      .select("id, status, created_at, data_inicio, completed_at")
      .eq("user_id", uid),

    pagQuery,
    timeQuery,
    collabEarnedQuery,
  ]);

  const projetos = projRes.data ?? [];
  const pagamentos = pagRes.data ?? [];
  const timeEntries = timeRes.data ?? [];
  const collabEarned = collabEarnedRes.data ?? [];
  const ownedProjectIds = projetos.map((p) => p.id);

  let collabSplitsPaid: { amount: number }[] = [];
  if (ownedProjectIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("collaborator_payment_splits")
      .select("amount")
      .in("project_id", ownedProjectIds)
      .eq("status", "pago");
    collabSplitsPaid = data ?? [];
  }

  const ownerRecebido = pagamentos
    .filter((p) => String(p.status ?? "").toLowerCase() === "pago")
    .reduce((acc, p) => acc + Number(p.valor ?? 0), 0);

  const ownerPendente = pagamentos
    .filter((p) => String(p.status ?? "").toLowerCase() === "pendente")
    .reduce((acc, p) => acc + Number(p.valor ?? 0), 0);

  const collabEarnedPago = collabEarned
    .filter((s) => String(s.status ?? "").toLowerCase() === "pago")
    .reduce((acc, s) => acc + Number(s.amount ?? 0), 0);

  const collabEarnedPendente = collabEarned
    .filter((s) => String(s.status ?? "").toLowerCase() !== "pago")
    .reduce((acc, s) => acc + Number(s.amount ?? 0), 0);

  const repassesColaboradores = collabSplitsPaid.reduce(
    (acc, s) => acc + Number(s.amount ?? 0),
    0
  );

  const valorRecebido = ownerRecebido + collabEarnedPago;
  const valorPendente = ownerPendente + collabEarnedPendente;
  const faturamentoBruto = valorRecebido;
  const faturamentoLiquido = valorRecebido - repassesColaboradores;

  const projetosAtivos = projetos.filter(
    (p) => !INACTIVE_STATUSES.has(String(p.status ?? "").toLowerCase())
  ).length;

  const projetosFinalizados = projetos.filter((p) =>
    CONCLUDED_STATUSES.has(String(p.status ?? "").toLowerCase())
  ).length;

  const ciclosProjeto = projetos
    .filter((p) => p.completed_at)
    .map((p) => {
      const start = new Date(p.data_inicio ?? p.created_at).getTime();
      const end = new Date(p.completed_at!).getTime();
      return (end - start) / (1000 * 60 * 60 * 24); // em dias
    })
    .filter((d) => d > 0);

  const tempoCicloMedioProjetoDias =
    ciclosProjeto.length > 0
      ? ciclosProjeto.reduce((a, b) => a + b, 0) / ciclosProjeto.length
      : null;

  const projectTimeMap: Record<string, number> = {};
  timeEntries.forEach((e) => {
    if (!e.project_id) return;
    projectTimeMap[e.project_id] = (projectTimeMap[e.project_id] ?? 0) + Number(e.duration_seconds ?? 0);
  });
  const execucoesProjeto = Object.values(projectTimeMap).map((s) => s / 3600);

  const tempoExecucaoMedioProjetoHoras =
    execucoesProjeto.length > 0
      ? execucoesProjeto.reduce((a, b) => a + b, 0) / execucoesProjeto.length
      : null;

  const taskTimeMap: Record<string, number> = {};
  timeEntries.forEach((e) => {
    if (!e.task_id) return;
    taskTimeMap[e.task_id] = (taskTimeMap[e.task_id] ?? 0) + Number(e.duration_seconds ?? 0);
  });
  const execucoesTarefa = Object.values(taskTimeMap).map((s) => s / 3600);

  const tempoExecucaoMedioTarefaHoras =
    execucoesTarefa.length > 0
      ? execucoesTarefa.reduce((a, b) => a + b, 0) / execucoesTarefa.length
      : null;

  return res.status(200).json({
    valor_recebido: round2(valorRecebido),
    valor_pendente: round2(valorPendente),
    repasses_colaboradores: round2(repassesColaboradores),
    faturamento_bruto: round2(faturamentoBruto),
    faturamento_liquido: round2(faturamentoLiquido),

    projetos_ativos: projetosAtivos,
    projetos_finalizados: projetosFinalizados,
    projetos_total: projetos.length,

    tempo_ciclo_medio_projeto_dias: round1(tempoCicloMedioProjetoDias),

    tempo_execucao_medio_projeto_horas: tempoExecucaoMedioProjetoHoras !== null ? roundHorasToMinuto(tempoExecucaoMedioProjetoHoras) : null,
    tempo_execucao_medio_tarefa_horas: tempoExecucaoMedioTarefaHoras !== null ? roundHorasToMinuto(tempoExecucaoMedioTarefaHoras) : null,

    _meta: {
      projetos_com_ciclo_completo: ciclosProjeto.length,
      projetos_com_rastreio: execucoesProjeto.length,
      tarefas_com_rastreio: execucoesTarefa.length,
    },
  });
}

function round2(v: number | null): number | null {
  return v !== null ? Math.round(v * 100) / 100 : null;
}

function round1(v: number | null): number | null {
  return v !== null ? Math.round(v * 10) / 10 : null;
}
