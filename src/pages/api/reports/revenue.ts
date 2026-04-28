import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPeriodWindowStart, getMonthCountForPeriod } from "@/lib/reportUtils";

function getLastNMonths(n: number): { year: number; month: number; label: string }[] {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
    });
  }
  return result;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
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
  const monthCount = getMonthCountForPeriod(period);
  const windowStart = getPeriodWindowStart(period);
  const queryWindowStart = windowStart ?? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - (monthCount - 1));
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [pagRes, projRes, collabEarnedRes] = await Promise.all([
    supabaseAdmin
      .from("pagamentos")
      .select("id, valor, status, data_pagamento, data_prevista, created_at, projeto_id")
      .eq("user_id", uid)
      .gte("created_at", queryWindowStart.toISOString()),
    supabaseAdmin
      .from("projetos")
      .select("id, status")
      .eq("user_id", uid),
    supabaseAdmin
      .from("collaborator_payment_splits")
      .select("amount, status, paid_at, created_at")
      .eq("member_user_id", uid)
      .gte("created_at", queryWindowStart.toISOString()),
  ]);

  const pagamentos = pagRes.data ?? [];
  const projetos = projRes.data ?? [];
  const collabEarned = collabEarnedRes.data ?? [];
  const projetoStatusMap: Record<string, string> = {};
  projetos.forEach((p) => {
    projetoStatusMap[p.id] = String(p.status ?? "").toLowerCase();
  });

  const ownedProjectIds = projetos.map((p) => p.id);

  let repassesPorMes: { amount: number; paid_at: string | null; created_at: string }[] = [];
  if (ownedProjectIds.length > 0) {
    const { data: splitsData } = await supabaseAdmin
      .from("collaborator_payment_splits")
      .select("amount, paid_at, created_at")
      .in("project_id", ownedProjectIds)
      .eq("status", "pago")
      .gte("created_at", queryWindowStart.toISOString());
    repassesPorMes = splitsData ?? [];
  }

  const meses = getLastNMonths(monthCount);
  const brutoMap: Record<string, number> = {};
  const pendenteMap: Record<string, number> = {};
  const repasseMap: Record<string, number> = {};

  meses.forEach(({ year, month }) => {
    const key = monthKey(year, month);
    brutoMap[key] = 0;
    pendenteMap[key] = 0;
    repasseMap[key] = 0;
  });

  pagamentos.forEach((p) => {
    const valor = Number(p.valor ?? 0);
    const status = String(p.status ?? "").toLowerCase();
    const isPago = status === "pago";
    const isPendente = status === "pendente";

    if (!isPago && !isPendente) return;

    const dateStr = isPago
      ? (p.data_pagamento ?? p.created_at)
      : (p.data_prevista ?? p.created_at);

    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;

    const key = monthKey(d.getFullYear(), d.getMonth() + 1);
    if (!(key in brutoMap)) return;
    if (isPago) {
      brutoMap[key] += valor;
    } else {
      pendenteMap[key] += valor;
    }
  });

  collabEarned.forEach((s) => {
    const valor = Number(s.amount ?? 0);
    const status = String(s.status ?? "").toLowerCase();
    const isPago = status === "pago";
    const dateStr = isPago ? (s.paid_at ?? s.created_at) : s.created_at;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const key = monthKey(d.getFullYear(), d.getMonth() + 1);
    if (!(key in brutoMap)) return;
    if (isPago) {
      brutoMap[key] += valor;
    } else {
      pendenteMap[key] += valor;
    }
  });

  repassesPorMes.forEach((s) => {
    const valor = Number(s.amount ?? 0);
    const dateStr = s.paid_at ?? s.created_at;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const key = monthKey(d.getFullYear(), d.getMonth() + 1);
    if (!(key in repasseMap)) return;
    repasseMap[key] += valor;
  });

  const pontosMensais = meses.map(({ year, month, label }) => {
    const key = monthKey(year, month);
    const valorRecebido = r2(brutoMap[key] ?? 0);
    const valorPendente = r2(pendenteMap[key] ?? 0);
    const repassesColaboradores = r2(repasseMap[key] ?? 0);
    const faturamentoBruto = valorRecebido;
    const faturamentoLiquido = r2(valorRecebido - repassesColaboradores);
    return {
      mes: label,
      ano: year,
      mes_num: month,
      valor_recebido: valorRecebido,
      valor_pendente: valorPendente,
      repasses_colaboradores: repassesColaboradores,
      faturamento_bruto: faturamentoBruto,
      faturamento_liquido: faturamentoLiquido,
    };
  });

  const totalValorRecebido = pontosMensais.reduce((acc, m) => acc + m.valor_recebido, 0);
  const totalValorPendente = pontosMensais.reduce((acc, m) => acc + m.valor_pendente, 0);
  const totalRepasses = pontosMensais.reduce((acc, m) => acc + m.repasses_colaboradores, 0);
  const totalFaturamentoLiquido = totalValorRecebido - totalRepasses;

  return res.status(200).json({
    mensal: pontosMensais,
    totais: {
      valor_recebido: r2(totalValorRecebido),
      valor_pendente: r2(totalValorPendente),
      repasses_colaboradores: r2(totalRepasses),
      faturamento_bruto: r2(totalValorRecebido),
      faturamento_liquido: r2(totalFaturamentoLiquido),
    },
  });
}
