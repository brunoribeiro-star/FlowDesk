import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, respostas } = req.body as {
    token: string;
    respostas: { pergunta: string; resposta: string }[];
  };

  if (!token) return res.status(400).json({ error: "Token inválido." });
  if (!Array.isArray(respostas) || respostas.length === 0) {
    return res.status(400).json({ error: "Nenhuma resposta fornecida." });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: envio, error } = await supabaseAdmin
    .from("briefings_envios")
    .select("id, status, respondido_em, projeto_id, user_id")
    .eq("token", token)
    .single();

  if (error || !envio) {
    return res.status(404).json({ error: "Briefing não encontrado." });
  }

  if (envio.status === "respondido" || envio.respondido_em) {
    return res.status(409).json({ error: "Este briefing já foi respondido." });
  }

  const rows = respostas.map((r) => ({
    envio_id: envio.id,
    projeto_id: envio.projeto_id,
    user_id: envio.user_id,
    pergunta: r.pergunta,
    resposta: r.resposta,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("briefings_respostas")
    .insert(rows);

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  await supabaseAdmin
    .from("briefings_envios")
    .update({ status: "respondido", respondido_em: new Date().toISOString() })
    .eq("id", envio.id);

  return res.status(200).json({ ok: true });
}
