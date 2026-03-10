import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!accessToken) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const { project_id, invited_email } = req.body as { project_id?: string; invited_email?: string };

  if (!project_id || !invited_email) {
    return res.status(400).json({ error: "project_id e invited_email são obrigatórios." });
  }

  const emailTrimmed = invited_email.trim().toLowerCase();

  // Verify caller owns the project
  const { data: projeto, error: projetoErr } = await supabase
    .from("projetos")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (projetoErr || !projeto) {
    return res.status(403).json({ error: "Você não tem permissão para convidar neste projeto." });
  }

  // Generate a cryptographically secure token
  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: insertErr } = await supabase.from("project_invites").insert([
    {
      project_id,
      invited_email: emailTrimmed,
      invited_by: user.id,
      token,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    },
  ]);

  if (insertErr) {
    return res.status(500).json({ error: "Erro ao criar convite: " + insertErr.message });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const inviteLink = `${origin}/invite/${token}`;

  return res.status(200).json({ inviteLink });
}
