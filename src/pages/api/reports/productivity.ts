import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPeriodWindowStart, getMonthCountForPeriod, secondsToHoras } from "@/lib/reportUtils";

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
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
  const monthCount = getMonthCountForPeriod(period);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: projetos } = await supabaseAdmin
    .from("projetos")
    .select("id, titulo")
    .eq("user_id", uid);

  const projetosList = projetos ?? [];
  const ownedProjectIds = projetosList.map((p) => p.id);

  const timeQuery = supabaseAdmin
    .from("time_entries")
    .select("duration_seconds, project_id, started_at")
    .eq("user_id", uid)
    .order("started_at", { ascending: true });
  if (windowStart) timeQuery.gte("started_at", windowStart.toISOString());

  const { data: timeEntriesRaw } = await timeQuery;

  const timeEntries = timeEntriesRaw ?? [];
  const totalSec = timeEntries.reduce(
    (acc, e) => acc + Number(e.duration_seconds ?? 0),
    0
  );
  const totalHoras = secondsToHoras(totalSec);

  const projetoExecMap: Record<string, number> = {};
  timeEntries.forEach((e) => {
    if (!e.project_id) return;
    projetoExecMap[e.project_id] =
      (projetoExecMap[e.project_id] ?? 0) + Number(e.duration_seconds ?? 0);
  });

  const projetoTituloMap: Record<string, string> = {};
  projetosList.forEach((p) => {
    projetoTituloMap[p.id] = p.titulo;
  });

  const distribuicaoPorProjeto = Object.entries(projetoExecMap)
    .filter(([id]) => ownedProjectIds.includes(id))
    .map(([id, sec]) => ({
      projeto_id: id,
      titulo: projetoTituloMap[id] ?? "—",
      horas_rastreadas: secondsToHoras(sec),
      percentual: totalSec > 0 ? r2((sec / totalSec) * 100) : 0,
    }))
    .sort((a, b) => b.horas_rastreadas - a.horas_rastreadas);

  const mesHorasMap: Record<string, { label: string; seg: number }> = {};
  timeEntries.forEach((e) => {
    if (!e.started_at) return;
    const d = new Date(e.started_at);
    if (isNaN(d.getTime())) return;
    const key = monthKey(d);
    if (!mesHorasMap[key]) {
      mesHorasMap[key] = { label: monthLabel(d), seg: 0 };
    }
    mesHorasMap[key].seg += Number(e.duration_seconds ?? 0);
  });

  const mesesMaisProdutivos = Object.entries(mesHorasMap)
    .map(([mes, { label, seg }]) => ({
      mes,
      label,
      horas_rastreadas: secondsToHoras(seg),
    }))
    .sort((a, b) => b.horas_rastreadas - a.horas_rastreadas)
    .slice(0, 6);

  const now = new Date();
  const ultimos12Meses: { mes: string; label: string; horas_rastreadas: number }[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    ultimos12Meses.push({
      mes: key,
      label: monthLabel(d),
      horas_rastreadas: mesHorasMap[key] ? secondsToHoras(mesHorasMap[key].seg) : 0,
    });
  }

  const projetoMaisHoras =
    distribuicaoPorProjeto.length > 0 ? distribuicaoPorProjeto[0] : null;

  const mesMaisProdutivo =
    mesesMaisProdutivos.length > 0 ? mesesMaisProdutivos[0] : null;

  return res.status(200).json({
    total_horas_rastreadas: totalHoras,
    distribuicao_por_projeto: distribuicaoPorProjeto,
    evolucao_mensal: ultimos12Meses,
    meses_mais_produtivos: mesesMaisProdutivos,

    insights: {
      projeto_mais_horas: projetoMaisHoras
        ? {
            titulo: projetoMaisHoras.titulo,
            horas: projetoMaisHoras.horas_rastreadas,
            percentual: projetoMaisHoras.percentual,
          }
        : null,
      mes_mais_produtivo: mesMaisProdutivo
        ? { label: mesMaisProdutivo.label, horas: mesMaisProdutivo.horas_rastreadas }
        : null,
    },
  });
}
