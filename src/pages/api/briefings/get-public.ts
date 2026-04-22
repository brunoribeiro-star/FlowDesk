import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token inválido." });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: envio, error } = await supabaseAdmin
    .from("briefings_envios")
    .select(`
      id, status, respondido_em, prazo_resposta,
      template:template_id(id, titulo, descricao),
      projeto:projeto_id(id, titulo, clientes:cliente_id(nome, empresa))
    `)
    .eq("token", token)
    .single();

  if (error || !envio) {
    return res.status(404).json({ error: "Briefing não encontrado." });
  }

  const templateId = (envio.template as any)?.id;
  const { data: campos } = await supabaseAdmin
    .from("briefings_campos")
    .select("id, titulo_pergunta, descricao_pergunta, tipo, obrigatorio, opcoes, placeholder, ordem")
    .eq("template_id", templateId)
    .order("ordem", { ascending: true });

  return res.status(200).json({ envio, campos: campos ?? [] });
}
