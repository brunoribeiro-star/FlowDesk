import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPeriodWindowStart } from "@/lib/reportUtils";

function r1(v: number): number {
  return Math.round(v * 10) / 10;
}
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

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

  const projQuery = supabaseAdmin
    .from("projetos")
    .select("id, titulo, status, orcamento, created_at, data_inicio, completed_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (windowStart) projQuery.gte("created_at", windowStart.toISOString());

  const { data: projetos } = await projQuery;

  const projetosList = projetos ?? [];
  if (projetosList.length === 0) {
    return res.status(200).json({ projetos: [] });
  }

  const ownedProjectIds = projetosList.map((p) => p.id);

  const pagQuery2 = supabaseAdmin
    .from("pagamentos")
    .select("projeto_id, valor, status")
    .eq("user_id", uid)
    .in("projeto_id", ownedProjectIds);
  if (windowStart) pagQuery2.gte("created_at", windowStart.toISOString());

  const timeQuery2 = supabaseAdmin
    .from("time_entries")
    .select("project_id, duration_seconds")
    .eq("user_id", uid)
    .in("project_id", ownedProjectIds);
  if (windowStart) timeQuery2.gte("started_at", windowStart.toISOString());

  const [pagRes, tasksRes, timeRes] = await Promise.all([
    pagQuery2,

    supabaseAdmin
      .from("tasks")
      .select("id, projeto_id, status, concluida")
      .in("projeto_id", ownedProjectIds),

    timeQuery2,
  ]);

  const pagamentos = pagRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const timeEntries = timeRes.data ?? [];

  const recebidoMap: Record<string, number> = {};
  pagamentos.forEach((p) => {
    if (String(p.status ?? "").toLowerCase() !== "pago") return;
    recebidoMap[p.projeto_id] = (recebidoMap[p.projeto_id] ?? 0) + Number(p.valor ?? 0);
  });

  const taskTotalMap: Record<string, number> = {};
  const taskConcluidaMap: Record<string, number> = {};
  tasks.forEach((t) => {
    taskTotalMap[t.projeto_id] = (taskTotalMap[t.projeto_id] ?? 0) + 1;
    const isConcluida =
      String(t.status ?? "").toLowerCase() === "concluida" || t.concluida === true;
    if (isConcluida) {
      taskConcluidaMap[t.projeto_id] = (taskConcluidaMap[t.projeto_id] ?? 0) + 1;
    }
  });

  const execMap: Record<string, number> = {};
  timeEntries.forEach((e) => {
    if (!e.project_id) return;
    execMap[e.project_id] = (execMap[e.project_id] ?? 0) + Number(e.duration_seconds ?? 0);
  });

  const projetosComparativos = projetosList.map((p) => {
    let tempo_ciclo_dias: number | null = null;
    if (p.completed_at) {
      const start = new Date(p.data_inicio ?? p.created_at).getTime();
      const end = new Date(p.completed_at).getTime();
      const dias = (end - start) / (1000 * 60 * 60 * 24);
      tempo_ciclo_dias = dias > 0 ? r1(dias) : 0;
    }

    const execSec = execMap[p.id] ?? 0;
    const tempo_execucao_horas = execSec > 0 ? r1(execSec / 3600) : 0;

    const tarefas_total = taskTotalMap[p.id] ?? 0;
    const tarefas_concluidas = taskConcluidaMap[p.id] ?? 0;

    return {
      id: p.id,
      titulo: p.titulo,
      status: p.status,
      orcamento: p.orcamento ?? null,
      valor_recebido: r2(recebidoMap[p.id] ?? 0),
      tempo_ciclo_dias,
      tempo_execucao_horas,

      tarefas_total,
      tarefas_concluidas,
      created_at: p.created_at,
      completed_at: p.completed_at ?? null,
    };
  });

  return res.status(200).json({ projetos: projetosComparativos });
}
