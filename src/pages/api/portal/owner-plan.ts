import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, TRIAL_DAYS, type PlanId } from "@/lib/stripeConfig";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { project_ids } = req.query;
  if (!project_ids) return res.status(400).json({ error: "project_ids obrigatório" });

  const ids = Array.isArray(project_ids) ? project_ids : project_ids.split(",");

  // Busca o user_id (owner) de cada projeto
  const { data: projects } = await supabase
    .from("projetos")
    .select("id, user_id")
    .in("id", ids);

  if (!projects?.length) return res.status(200).json({ plans: {} });

  const ownerIds = [...new Set(projects.map((p: any) => p.user_id))];

  // Busca subscriptions dos owners
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, plan, status, trial_used")
    .in("user_id", ownerIds);

  // Busca created_at dos owners para calcular trial
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const usersMap: Record<string, string> = {};
  for (const u of authUsers?.users ?? []) {
    usersMap[u.id] = u.created_at;
  }

  const now = new Date();

  function resolveOwnerPlan(userId: string): PlanId {
    const sub = subs?.find((s: any) => s.user_id === userId);
    const createdAt = usersMap[userId] ? new Date(usersMap[userId]) : now;
    const trialEnd = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const isTrialActive = !sub?.trial_used && now < trialEnd;
    if (isTrialActive) return "trial";
    return (sub?.plan as PlanId) ?? "essencial";
  }

  // Monta mapa project_id → plano do owner
  const plans: Record<string, { plan: PlanId; portalApproval: boolean }> = {};
  for (const p of projects) {
    const plan = resolveOwnerPlan((p as any).user_id);
    plans[(p as any).id] = {
      plan,
      portalApproval: plan !== "essencial",
    };
  }

  return res.status(200).json({ plans });
}
