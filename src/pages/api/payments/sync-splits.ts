import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { syncCollaboratorPaymentSplits } from "../collaborators/set-split";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!accessToken) return res.status(401).json({ error: "Não autenticado." });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return res.status(401).json({ error: "Não autenticado." });

  const { project_id } = req.body as { project_id?: string };
  if (!project_id) return res.status(400).json({ error: "project_id é obrigatório." });

  const { data: projeto } = await supabase
    .from("projetos")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!projeto) return res.status(403).json({ error: "Sem permissão." });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: splits, error: splitsErr } = await supabaseAdmin
    .from("project_member_splits")
    .select("member_user_id, split_type, split_value")
    .eq("project_id", project_id);

  if (splitsErr) return res.status(500).json({ error: splitsErr.message });
  if (!splits || splits.length === 0) return res.status(200).json({ ok: true, synced: 0 });

  for (const s of splits) {
    await syncCollaboratorPaymentSplits(
      supabaseAdmin,
      project_id,
      s.member_user_id,
      s.split_type as "percentage" | "fixed",
      s.split_value
    );
  }

  return res.status(200).json({ ok: true, synced: splits.length });
}
