import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(req: NextApiRequest): Promise<boolean> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return false;
  const { data: { user } } = await supabase.auth.getUser(token);
  return !!user && user.email === process.env.ADMIN_EMAIL;
}

type Period = "7d" | "30d" | "90d" | "180d" | "365d" | "all";
type GroupBy = "day" | "week" | "month";

function resolveGroupBy(period: Period): GroupBy {
  if (period === "7d" || period === "30d") return "day";
  if (period === "90d") return "week";
  return "month";
}

function periodStart(period: Period): Date | null {
  const now = new Date();
  const days: Record<Period, number | null> = {
    "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365, "all": null,
  };
  const d = days[period];
  return d ? new Date(now.getTime() - d * 24 * 60 * 60 * 1000) : null;
}

function computeUserGrowth(
  users: any[],
  groupBy: GroupBy,
  start: Date | null,
  now: Date
): { label: string; novos: number }[] {
  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  if (groupBy === "day") {
    const from = start ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cur = new Date(from);
    cur.setHours(0, 0, 0, 0);
    const result: { label: string; novos: number }[] = [];
    while (cur <= now) {
      const next = new Date(cur);
      next.setDate(next.getDate() + 1);
      result.push({
        label: `${cur.getDate().toString().padStart(2, "0")}/${(cur.getMonth() + 1).toString().padStart(2, "0")}`,
        novos: users.filter(u => { const d = new Date(u.created_at); return d >= cur && d < next; }).length,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }

  if (groupBy === "week") {
    const from = start ?? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const cur = new Date(from);
    cur.setHours(0, 0, 0, 0);
    const result: { label: string; novos: number }[] = [];
    while (cur <= now) {
      const next = new Date(cur);
      next.setDate(next.getDate() + 7);
      result.push({
        label: `${cur.getDate().toString().padStart(2, "0")}/${(cur.getMonth() + 1).toString().padStart(2, "0")}`,
        novos: users.filter(u => { const d = new Date(u.created_at); return d >= cur && d < next; }).length,
      });
      cur.setDate(cur.getDate() + 7);
    }
    return result;
  }

  // Monthly
  const fromMonth = start
    ? new Date(start.getFullYear(), start.getMonth(), 1)
    : users.length > 0
      ? (() => {
          const oldest = users.reduce((m, u) => {
            const d = new Date(u.created_at);
            return d < m ? d : m;
          }, new Date(users[0].created_at));
          return new Date(oldest.getFullYear(), oldest.getMonth(), 1);
        })()
      : new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const result: { label: string; novos: number }[] = [];
  const cur = new Date(fromMonth);
  while (
    cur.getFullYear() < now.getFullYear() ||
    (cur.getFullYear() === now.getFullYear() && cur.getMonth() <= now.getMonth())
  ) {
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    result.push({
      label: `${MONTHS[cur.getMonth()]}/${cur.getFullYear().toString().slice(2)}`,
      novos: users.filter(u => { const d = new Date(u.created_at); return d >= cur && d < next; }).length,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const period = ((req.query.period as string) ?? "90d") as Period;
  const groupBy = resolveGroupBy(period);
  const start = periodStart(period);

  const [snapshotResult, usersResult] = await Promise.all([
    (() => {
      let q = supabase
        .from("admin_metrics_snapshots")
        .select("date, mrr, arr, active_subscribers, essencial_count, profissional_count, total_users, trial_count, new_users_today")
        .order("date", { ascending: true });
      if (start) q = q.gte("date", start.toISOString().split("T")[0]);
      return q;
    })(),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const snapshots = snapshotResult.data ?? [];
  const authUsers = usersResult.data?.users ?? [];

  const usersInPeriod = start
    ? authUsers.filter(u => new Date(u.created_at) >= start)
    : authUsers;

  const now = new Date();
  const userGrowth = computeUserGrowth(usersInPeriod, groupBy, start, now);

  return res.status(200).json({
    snapshots,
    userGrowth,
    period,
    groupBy,
    hasSnapshotData: snapshots.length > 0,
    totalUsers: authUsers.length,
  });
}
