import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { PLAN_PRICES, TRIAL_DAYS } from "@/lib/stripeConfig";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAuthorized(req: NextApiRequest): Promise<boolean> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return false;
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;
  const { data: { user } } = await supabase.auth.getUser(token);
  return !!user && user.email === process.env.ADMIN_EMAIL;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(await isAuthorized(req))) return res.status(403).json({ error: "Forbidden" });

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const [subsResult, usersResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status, billing_interval, current_period_end, stripe_subscription_id")
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
  let essencialCount = 0;
  let profissionalCount = 0;

  for (const sub of activeSubs) {
    const plan = sub.plan as "essencial" | "profissional";
    const interval = sub.billing_interval as "mensal" | "anual";
    const prices = PLAN_PRICES[plan];
    if (!prices) continue;
    mrr += interval === "anual" ? prices.anual / 12 : prices.mensal;
    if (plan === "essencial") essencialCount++;
    else profissionalCount++;
  }

  const arr = mrr * 12;

  const trialCount = authUsers.filter(u => {
    const trialEnd = new Date(new Date(u.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    return now < trialEnd;
  }).length;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const newUsersToday = authUsers.filter(u => new Date(u.created_at) >= todayStart).length;

  const { error } = await supabase
    .from("admin_metrics_snapshots")
    .upsert(
      {
        date: today,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        active_subscribers: activeSubs.length,
        essencial_count: essencialCount,
        profissional_count: profissionalCount,
        total_users: authUsers.length,
        trial_count: trialCount,
        new_users_today: newUsersToday,
      },
      { onConflict: "date" }
    );

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    ok: true,
    date: today,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    activeSubscribers: activeSubs.length,
    totalUsers: authUsers.length,
  });
}
