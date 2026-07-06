import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPeriodWindowStart, secondsToHoras, roundHorasToMinuto } from "@/lib/reportUtils";

const TOP_N = 5;

function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

function secToHours(s: number): number {
  return secondsToHoras(s);
}

function msToDays(ms: number): number {
  return r1(ms / (1000 * 60 * 60 * 24));
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

  const { data: projetos } = await supabaseAdmin
    .from("projetos")
    .select("id, titulo, status, created_at, data_inicio, completed_at")
    .eq("user_id", uid);

  const projetosList = projetos ?? [];
  const ownedProjectIds = projetosList.map((p) => p.id);

  if (ownedProjectIds.length === 0) {
    return res.status(200).json(emptyResponse());
  }

  const timeQuery = supabaseAdmin
    .from("time_entries")
    .select("duration_seconds, project_id, task_id")
    .eq("user_id", uid);
  if (windowStart) timeQuery.gte("started_at", windowStart.toISOString());

  const [tasksRes, timeRes] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select("id, titulo, projeto_id, created_at, completed_at, status")
      .in("projeto_id", ownedProjectIds),

    timeQuery,
  ]);

  const tasks = tasksRes.data ?? [];
  const timeEntries = timeRes.data ?? [];
  const projectExecMap: Record<string, number> = {};
  const taskExecMap: Record<string, number> = {};

  timeEntries.forEach((e) => {
    if (e.project_id) {
      projectExecMap[e.project_id] = (projectExecMap[e.project_id] ?? 0) + Number(e.duration_seconds ?? 0);
    }
    if (e.task_id) {
      taskExecMap[e.task_id] = (taskExecMap[e.task_id] ?? 0) + Number(e.duration_seconds ?? 0);
    }
  });

  const projetoTituloMap: Record<string, string> = {};
  projetosList.forEach((p) => {
    projetoTituloMap[p.id] = p.titulo;
  });

  const projetosComCiclo = projetosList
    .filter((p) => p.completed_at)
    .map((p) => {
      const start = new Date(p.data_inicio ?? p.created_at).getTime();
      const end = new Date(p.completed_at!).getTime();
      const ciclo_dias = msToDays(end - start);
      return {
        id: p.id,
        titulo: p.titulo,
        status: p.status,
        ciclo_dias: ciclo_dias > 0 ? ciclo_dias : 0,
        data_inicio: p.data_inicio ?? p.created_at,
        completed_at: p.completed_at,
      };
    })
    .sort((a, b) => b.ciclo_dias - a.ciclo_dias);

  const mediaCicloProjeto =
    projetosComCiclo.length > 0
      ? r1(projetosComCiclo.reduce((acc, p) => acc + p.ciclo_dias, 0) / projetosComCiclo.length)
      : null;

  const projetosComExecucao = projetosList
    .filter((p) => (projectExecMap[p.id] ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      status: p.status,
      execucao_horas: secToHours(projectExecMap[p.id] ?? 0),
    }))
    .sort((a, b) => b.execucao_horas - a.execucao_horas);

  const mediaExecucaoProjeto =
    projetosComExecucao.length > 0
      ? roundHorasToMinuto(
          projetosComExecucao.reduce((acc, p) => acc + p.execucao_horas, 0) /
            projetosComExecucao.length
        )
      : null;

  const tarefasComCiclo = tasks
    .filter((t) => t.completed_at)
    .map((t) => {
      const start = new Date(t.created_at).getTime();
      const end = new Date(t.completed_at!).getTime();
      const ciclo_dias = msToDays(end - start);
      return {
        id: t.id,
        titulo: t.titulo,
        projeto_id: t.projeto_id,
        projeto_titulo: projetoTituloMap[t.projeto_id] ?? "—",
        ciclo_dias: ciclo_dias > 0 ? ciclo_dias : 0,
        created_at: t.created_at,
        completed_at: t.completed_at,
      };
    })
    .sort((a, b) => b.ciclo_dias - a.ciclo_dias);

  const mediaCicloTarefa =
    tarefasComCiclo.length > 0
      ? r1(tarefasComCiclo.reduce((acc, t) => acc + t.ciclo_dias, 0) / tarefasComCiclo.length)
      : null;

  const tarefasComExecucao = tasks
    .filter((t) => (taskExecMap[t.id] ?? 0) > 0)
    .map((t) => ({
      id: t.id,
      titulo: t.titulo,
      projeto_id: t.projeto_id,
      projeto_titulo: projetoTituloMap[t.projeto_id] ?? "—",
      execucao_horas: secToHours(taskExecMap[t.id] ?? 0),
    }))
    .sort((a, b) => b.execucao_horas - a.execucao_horas);

  const mediaExecucaoTarefa =
    tarefasComExecucao.length > 0
      ? roundHorasToMinuto(
          tarefasComExecucao.reduce((acc, t) => acc + t.execucao_horas, 0) /
            tarefasComExecucao.length
        )
      : null;

  return res.status(200).json({
    projetos: {
      mais_lentos_ciclo: projetosComCiclo.slice(0, TOP_N),
      mais_tempo_execucao: projetosComExecucao.slice(0, TOP_N),
      media_ciclo_dias: mediaCicloProjeto,
      media_execucao_horas: mediaExecucaoProjeto,
      total_com_ciclo: projetosComCiclo.length,
      total_com_rastreio: projetosComExecucao.length,
    },
    tarefas: {
      mais_lentas_ciclo: tarefasComCiclo.slice(0, TOP_N),
      mais_tempo_execucao: tarefasComExecucao.slice(0, TOP_N),
      media_ciclo_dias: mediaCicloTarefa,
      media_execucao_horas: mediaExecucaoTarefa,
      total_com_ciclo: tarefasComCiclo.length,
      total_com_rastreio: tarefasComExecucao.length,
    },
  });
}

function emptyResponse() {
  const empty = {
    mais_lentos_ciclo: [],
    mais_tempo_execucao: [],
    media_ciclo_dias: null,
    media_execucao_horas: null,
    total_com_ciclo: 0,
    total_com_rastreio: 0,
  };
  return {
    projetos: { ...empty, mais_lentas_ciclo: undefined },
    tarefas: {
      mais_lentas_ciclo: [],
      mais_tempo_execucao: [],
      media_ciclo_dias: null,
      media_execucao_horas: null,
      total_com_ciclo: 0,
      total_com_rastreio: 0,
    },
  };
}
