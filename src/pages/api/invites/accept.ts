import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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

  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ error: "Token é obrigatório." });
  }

  const { data: invite, error: inviteErr } = await supabase
    .from("project_invites")
    .select("id, project_id, invited_email, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) {
    return res.status(500).json({ error: "Erro ao buscar convite." });
  }

  if (!invite) {
    return res.status(404).json({ error: "Convite não encontrado." });
  }

  if (invite.status === "accepted") {
    return res.status(400).json({ error: "already_accepted", project_id: invite.project_id });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return res.status(400).json({ error: "expired" });
  }

  const userEmail = user.email?.toLowerCase() ?? "";
  if (userEmail !== invite.invited_email.toLowerCase()) {
    return res.status(403).json({ error: "email_mismatch" });
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", invite.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberErr } = await supabase.from("project_members").insert([
      {
        project_id: invite.project_id,
        user_id: user.id,
        role: "collaborator",
      },
    ]);
    if (memberErr) {
      return res.status(500).json({ error: "Erro ao adicionar membro: " + memberErr.message });
    }
  }

  const { error: updateErr } = await supabase
    .from("project_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (updateErr) {
    return res.status(500).json({ error: "Erro ao atualizar convite: " + updateErr.message });
  }

  return res.status(200).json({ project_id: invite.project_id });
}
