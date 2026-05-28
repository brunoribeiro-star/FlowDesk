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
  if (req.method !== "GET") return res.status(405).end();
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const [
    usersResult,
    { data: subscriptions },
    { data: profiles },
    { data: allProjects },
    { data: allClients },
    { data: allTimeEntries },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("subscriptions").select("*"),
    supabase.from("users").select("id, nome, avatar_url, role"),
    supabase.from("projetos").select("user_id, status").range(0, 9999),
    supabase.from("clientes").select("user_id").range(0, 9999),
    supabase.from("time_entries").select("user_id, duration_seconds").range(0, 49999),
  ]);

  const { data: { users: authUsers }, error } = usersResult;
  if (error) return res.status(500).json({ error: error.message });

  const subMap = new Map((subscriptions ?? []).map((s: any) => [s.user_id, s]));
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const projectMap = new Map<string, number>();
  for (const p of allProjects ?? []) {
    if (p.status !== "finalizado") {
      projectMap.set(p.user_id, (projectMap.get(p.user_id) ?? 0) + 1);
    }
  }

  const clientMap = new Map<string, number>();
  for (const c of allClients ?? []) {
    clientMap.set(c.user_id, (clientMap.get(c.user_id) ?? 0) + 1);
  }

  const hoursMap = new Map<string, number>();
  for (const t of allTimeEntries ?? []) {
    hoursMap.set(t.user_id, (hoursMap.get(t.user_id) ?? 0) + (t.duration_seconds ?? 0));
  }

  const now = new Date();

  const clientUserIds = new Set(
    (profiles ?? []).filter((p: any) => p.role === "cliente").map((p: any) => p.id)
  );

  const users = authUsers.filter((authUser) => !clientUserIds.has(authUser.id)).map((authUser) => {
    const sub = subMap.get(authUser.id) as any;
    const profile = profileMap.get(authUser.id) as any;

    const createdAt = new Date(authUser.created_at);
    const trialEnd = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const isTrialActive = !sub?.trial_used && now < trialEnd;

    const plan = isTrialActive ? "trial" : (sub?.plan ?? "essencial");
    const status = sub?.status ?? (isTrialActive ? "trialing" : "free");

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      nome: profile?.nome ?? authUser.user_metadata?.nome ?? authUser.user_metadata?.name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      plan,
      status,
      isTrialActive,
      isLifetime: sub?.is_lifetime ?? false,
      stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
      billingInterval: sub?.billing_interval ?? null,
      trialEnd: isTrialActive ? trialEnd.toISOString() : null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      trialUsed: sub?.trial_used ?? false,
      projetos_ativos: projectMap.get(authUser.id) ?? 0,
      clientes_count: clientMap.get(authUser.id) ?? 0,
      horas_rastreadas: hoursMap.get(authUser.id) ?? 0,
    };
  });

  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.status(200).json({ users });
}
