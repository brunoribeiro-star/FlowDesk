import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { PLAN_PRICES, TRIAL_DAYS } from "@/lib/stripeConfig";

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

  const now = new Date();

  const [subsResult, usersResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("user_id, plan, status, billing_interval, current_period_end, stripe_subscription_id")
      .not("stripe_subscription_id", "is", null),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const subscriptions = subsResult.data ?? [];
  const authUsers = usersResult.data?.users ?? [];

  const activeSubs = subscriptions.filter((s: any) => {
    const periodEnd = s.current_period_end ? new Date(s.current_period_end) : null;
    return s.status === "active" && periodEnd && periodEnd > now;
  });

  let mrr = 0;
  const planDistribution: Record<string, number> = {};

  for (const sub of activeSubs) {
    const plan = sub.plan as "essencial" | "profissional";
    const interval = sub.billing_interval as "mensal" | "anual";
    const prices = PLAN_PRICES[plan];
    if (!prices) continue;

    mrr += interval === "anual" ? prices.anual / 12 : prices.mensal;
    planDistribution[plan] = (planDistribution[plan] ?? 0) + 1;
  }

  const arr = mrr * 12;

  // Weekly signups for the last 12 weeks
  const weeklyGrowth: { semana: string; novos: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const count = authUsers.filter(u => {
      const d = new Date(u.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;

    const label = `${weekStart.getDate().toString().padStart(2, "0")}/${(weekStart.getMonth() + 1).toString().padStart(2, "0")}`;
    weeklyGrowth.push({ semana: label, novos: count });
  }

  // Trial stats
  const trialCount = authUsers.filter(u => {
    const trialEnd = new Date(new Date(u.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    return now < trialEnd;
  }).length;

  return res.status(200).json({
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    activeSubscribers: activeSubs.length,
    planDistribution,
    weeklyGrowth,
    trialCount,
    totalUsers: authUsers.length,
  });
}
