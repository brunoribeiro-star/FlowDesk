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
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!user && !!adminEmail && user.email === adminEmail;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const { userId, plan, days, lifetime } = req.body as {
    userId?: string;
    plan?: "essencial" | "profissional";
    days?: number;
    lifetime?: boolean;
  };

  if (!userId || !plan || (!lifetime && !days)) {
    return res.status(400).json({ error: "userId, plan e days (ou lifetime) são obrigatórios." });
  }

  const periodEnd = lifetime
    ? null
    : new Date(Date.now() + (days!) * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status: "active",
      current_period_end: periodEnd,
      trial_used: true,
      cancel_at_period_end: false,
      billing_interval: "mensal",
      is_lifetime: lifetime ?? false,
    },
    { onConflict: "user_id" }
  );

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
