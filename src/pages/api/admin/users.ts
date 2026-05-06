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

  const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) return res.status(500).json({ error: error.message });

  const { data: subscriptions } = await supabase.from("subscriptions").select("*");
  const { data: profiles } = await supabase.from("users").select("id, nome, avatar_url");

  const subMap = new Map((subscriptions ?? []).map((s: any) => [s.user_id, s]));
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const now = new Date();

  const users = authUsers.map((authUser) => {
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
      plan,
      status,
      isTrialActive,
      trialEnd: isTrialActive ? trialEnd.toISOString() : null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      trialUsed: sub?.trial_used ?? false,
    };
  });

  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.status(200).json({ users });
}
