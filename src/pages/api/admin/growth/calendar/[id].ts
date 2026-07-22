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

  const id = req.query.id as string;

  if (req.method === "PUT") {
    const {
      data_planejada, pilar, redes, titulo, legenda, notas, status, formato, conteudo_detalhado,
      link_publicado, curtidas, visualizacoes, comentarios,
    } = req.body ?? {};
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data_planejada !== undefined) updates.data_planejada = data_planejada;
    if (pilar !== undefined) updates.pilar = pilar;
    if (redes !== undefined) updates.redes = redes;
    if (titulo !== undefined) updates.titulo = titulo;
    if (legenda !== undefined) updates.legenda = legenda;
    if (notas !== undefined) updates.notas = notas;
    if (status !== undefined) updates.status = status;
    if (formato !== undefined) updates.formato = formato;
    if (conteudo_detalhado !== undefined) updates.conteudo_detalhado = conteudo_detalhado;
    if (link_publicado !== undefined) updates.link_publicado = link_publicado;
    if (curtidas !== undefined) updates.curtidas = curtidas;
    if (visualizacoes !== undefined) updates.visualizacoes = visualizacoes;
    if (comentarios !== undefined) updates.comentarios = comentarios;

    const { data, error } = await supabase
      .from("growth_content_calendar")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("growth_content_calendar").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
