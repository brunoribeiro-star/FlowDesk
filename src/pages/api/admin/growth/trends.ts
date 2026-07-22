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

function isTrendAgent(req: NextApiRequest): boolean {
  const secret = req.headers["x-agent-secret"];
  return !!process.env.GROWTH_AGENT_SECRET && secret === process.env.GROWTH_AGENT_SECRET;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST" && isTrendAgent(req)) {
    const { titulo, descricao, fonte_url, pilar_sugerido, roteiro_sugerido } = req.body ?? {};
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });

    const { data, error } = await supabase
      .from("growth_trend_ideas")
      .insert({
        titulo,
        descricao: descricao ?? null,
        fonte_url: fonte_url ?? null,
        pilar_sugerido: pilar_sugerido ?? null,
        roteiro_sugerido: roteiro_sugerido ?? null,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("growth_trend_ideas")
      .select("*")
      .order("detectado_em", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data });
  }

  if (req.method === "POST") {
    const { titulo, descricao, fonte_url, pilar_sugerido, roteiro_sugerido } = req.body ?? {};
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });

    const { data, error } = await supabase
      .from("growth_trend_ideas")
      .insert({
        titulo,
        descricao: descricao ?? null,
        fonte_url: fonte_url ?? null,
        pilar_sugerido: pilar_sugerido ?? null,
        roteiro_sugerido: roteiro_sugerido ?? null,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  return res.status(405).end();
}
