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

  const { leadId, email, plan = "profissional", days = 30, lifetime = false } = req.body as {
    leadId?: string;
    email?: string;
    plan?: "essencial" | "profissional";
    days?: number;
    lifetime?: boolean;
  };

  if (!leadId || !email) {
    return res.status(400).json({ error: "leadId e email são obrigatórios." });
  }

  // Check if user already exists
  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers.find(u => u.email === email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Send invitation email — user sets their own password on first access
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oflowdesk.com"}/dashboard`,
    });

    if (inviteError || !inviteData.user) {
      return res.status(500).json({ error: inviteError?.message ?? "Erro ao criar convite." });
    }

    userId = inviteData.user.id;
  }

  // Grant plan
  const periodEnd = lifetime
    ? null
    : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status: "active",
      current_period_end: periodEnd,
      trial_used: true,
      cancel_at_period_end: false,
      billing_interval: "mensal",
      is_lifetime: lifetime,
    },
    { onConflict: "user_id" }
  );

  if (subError) return res.status(500).json({ error: subError.message });

  // Update lead status
  const { error: leadError } = await supabase
    .from("leads")
    .update({ status: "acesso_liberado", acesso_liberado_em: new Date().toISOString() })
    .eq("id", leadId);

  if (leadError) return res.status(500).json({ error: leadError.message });

  return res.status(200).json({ ok: true, userId, alreadyExisted: !!existingUser });
}
