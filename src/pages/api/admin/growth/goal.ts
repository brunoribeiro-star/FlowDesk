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
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "GET") {
    const { data: goal, error } = await supabase
      .from("growth_goals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) return res.status(500).json({ error: usersError.message });

    return res.status(200).json({ goal, currentValue: users.length });
  }

  if (req.method === "POST") {
    const { titulo, meta_valor, data_alvo, valor_inicial } = req.body ?? {};
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
        .update({ titulo, meta_valor, data_alvo, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ goal: data });
    }

    const { data, error } = await supabase
      .from("growth_goals")
      .insert({ titulo, meta_valor, data_alvo, valor_inicial: valor_inicial ?? 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ goal: data });
  }

  return res.status(405).end();
}
