import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token inválido." });
  }

  // Public read — anon key is sufficient (RLS should allow SELECT on project_invites by token)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: invite, error } = await supabase
    .from("project_invites")
    .select("id, project_id, invited_email, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: "Erro ao validar convite." });
  }

  if (!invite) {
    return res.status(404).json({ error: "not_found" });
  }

  if (invite.status === "accepted") {
    return res.status(200).json({ state: "already_accepted", project_id: invite.project_id });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return res.status(200).json({ state: "expired" });
  }

  return res.status(200).json({
    state: "valid",
    invited_email: invite.invited_email,
    project_id: invite.project_id,
    expires_at: invite.expires_at,
  });
}
