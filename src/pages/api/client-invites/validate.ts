import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query;
  if (!token || typeof token !== "string") return res.status(400).json({ error: "Token inválido." });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: invite, error } = await supabase
    .from("client_invites")
    .select("id, project_id, status, expires_at, clientes(email)")
    .eq("token", token)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "Erro ao validar convite." });
  if (!invite) return res.status(404).json({ error: "not_found" });

  if (invite.status === "accepted") {
    return res.status(200).json({ state: "already_accepted", project_id: invite.project_id });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return res.status(200).json({ state: "expired" });
  }

  const clienteEmail = (invite as any).clientes?.email ?? null;

  return res.status(200).json({
    state: "valid",
    project_id: invite.project_id,
    cliente_email: clienteEmail,
    expires_at: invite.expires_at,
  });
}
