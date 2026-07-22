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
    const { data, error } = await supabase
      .from("growth_content_calendar")
      .select("*")
      .order("data_planejada", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data });
  }

  if (req.method === "POST") {
    const { data_planejada, pilar, redes, titulo, legenda, notas, origem_trend_id, formato, conteudo_detalhado } = req.body ?? {};
    if (!data_planejada || !pilar || !titulo) {
      return res.status(400).json({ error: "data_planejada, pilar e titulo são obrigatórios" });
    }

    const { data, error } = await supabase
      .from("growth_content_calendar")
      .insert({
        data_planejada,
        pilar,
        redes: redes ?? [],
        titulo,
        legenda: legenda ?? null,
        notas: notas ?? null,
        origem_trend_id: origem_trend_id ?? null,
        formato: formato ?? "reel",
        conteudo_detalhado: conteudo_detalhado ?? null,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  return res.status(405).end();
}
