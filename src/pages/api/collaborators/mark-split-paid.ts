import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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

  const { project_id, split_id } = req.body as {
    project_id?: string;
    split_id?: string;
  };
  if (!project_id || !split_id) {
    return res.status(400).json({ error: "project_id e split_id são obrigatórios." });
  }

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

  const { error } = await supabaseAdmin
    .from("collaborator_payment_splits")
    .update({ status: "pago", paid_at: new Date().toISOString() })
    .eq("id", split_id)
    .eq("project_id", project_id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
