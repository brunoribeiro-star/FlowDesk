import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!accessToken) return res.status(401).json({ error: "Não autenticado." });

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) return res.status(401).json({ error: "Não autenticado." });

  const { envio_id, respostas } = req.body as {
    envio_id: string;
    respostas: { pergunta: string; resposta: string }[];
  };

  if (!envio_id || !Array.isArray(respostas) || respostas.length === 0) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: envio, error: envioError } = await supabaseAdmin
    .from("briefings_envios")
    .select("id, status, respondido_em, projeto_id, user_id")
    .eq("id", envio_id)
    .single();

  if (envioError || !envio) {
    return res.status(404).json({ error: "Briefing não encontrado." });
  }

  if (envio.status === "respondido" || envio.respondido_em) {
    return res.status(409).json({ error: "Este briefing já foi respondido." });
  }

  if (envio.projeto_id) {
    const { data: membership } = await supabaseAdmin
      .from("project_members")
      .select("id")
      .eq("project_id", envio.projeto_id)
      .eq("user_id", user.id)
      .eq("role", "cliente")
      .maybeSingle();

    if (!membership) {
      return res.status(403).json({ error: "Sem permissão para responder este briefing." });
    }
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

  const { error: updateError } = await supabaseAdmin
    .from("briefings_envios")
    .update({ status: "respondido", respondido_em: new Date().toISOString() })
    .eq("id", envio.id);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({ ok: true });
}
