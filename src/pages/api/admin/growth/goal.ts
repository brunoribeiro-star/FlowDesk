import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { TRIAL_DAYS } from "@/lib/stripeConfig";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(req: NextApiRequest): Promise<boolean> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return false;
  const { data: { user } } = await supabase.auth.getUser(token);
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!user && !!adminEmail && user.email === adminEmail;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "GET") {
    const { data: goal, error } = await supabase
      .from("growth_goals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const [
      { data: { users: authUsers }, error: usersError },
      { data: subscriptions },
      { data: profiles },
      { data: snapshots },
    ] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from("subscriptions").select("user_id, status, is_lifetime, trial_used"),
      supabase.from("users").select("id, role"),
      supabase
        .from("admin_metrics_snapshots")
        .select("date, active_subscribers, trial_count, total_users")
        .order("date", { ascending: true }),
    ]);
    if (usersError) return res.status(500).json({ error: usersError.message });

    const subMap = new Map((subscriptions ?? []).map((s: any) => [s.user_id, s]));
    const clientIds = new Set((profiles ?? []).filter((p: any) => p.role === "cliente").map((p: any) => p.id));
    const now = new Date();

    let pagantes = 0, trial = 0, total = 0;
    for (const u of authUsers) {
      if (clientIds.has(u.id)) continue;
      total++;
      const sub = subMap.get(u.id) as any;
      const createdAt = new Date(u.created_at);
      const trialEnd = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const isTrialActive = !sub?.trial_used && now < trialEnd;
      const isPagante = sub?.is_lifetime === true || sub?.status === "active";
      if (isPagante) pagantes++;
      else if (isTrialActive) trial++;
    }

    return res.status(200).json({
      goal,
      currentValue: { pagantes, trial, total },
      historico: snapshots ?? [],
    });
  }

  if (req.method === "POST") {
    const { titulo, meta_valor, data_alvo, valor_inicial, metrica } = req.body ?? {};
    if (!titulo || !meta_valor || !data_alvo) {
      return res.status(400).json({ error: "titulo, meta_valor e data_alvo são obrigatórios" });
    }

    const { data: existing } = await supabase
      .from("growth_goals")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("growth_goals")
        .update({ titulo, meta_valor, data_alvo, metrica: metrica ?? "pagantes", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ goal: data });
    }

    const { data, error } = await supabase
      .from("growth_goals")
      .insert({ titulo, meta_valor, data_alvo, metrica: metrica ?? "pagantes", valor_inicial: valor_inicial ?? 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ goal: data });
  }

  return res.status(405).end();
}
