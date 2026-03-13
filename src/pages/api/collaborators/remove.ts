import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) return res.status(401).json({ error: "Não autenticado." });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return res.status(401).json({ error: "Não autenticado." });

  const { project_id, member_user_id } = req.body as {
    project_id?: string;
    member_user_id?: string;
  };

  if (!project_id || !member_user_id) {
    return res.status(400).json({ error: "project_id e member_user_id são obrigatórios." });
  }

  const { data: projeto, error: projetoErr } = await supabase
    .from("projetos")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (projetoErr || !projeto) {
    return res.status(403).json({ error: "Você não tem permissão para remover membros deste projeto." });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: payErr } = await supabaseAdmin
    .from("collaborator_payment_splits")
    .delete()
    .eq("project_id", project_id)
    .eq("member_user_id", member_user_id);

  if (payErr) {
    return res.status(500).json({ error: "Erro ao remover splits de pagamento: " + payErr.message });
  }

  const { error: splitErr } = await supabaseAdmin
    .from("project_member_splits")
    .delete()
    .eq("project_id", project_id)
    .eq("member_user_id", member_user_id);

  if (splitErr) {
    return res.status(500).json({ error: "Erro ao remover configuração de split: " + splitErr.message });
  }

  const { error: memberErr } = await supabaseAdmin
    .from("project_members")
    .delete()
    .eq("project_id", project_id)
    .eq("user_id", member_user_id);

  if (memberErr) {
    return res.status(500).json({ error: "Erro ao remover membro: " + memberErr.message });
  }

  return res.status(200).json({ ok: true });
}
