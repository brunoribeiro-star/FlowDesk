import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ error: "Token é obrigatório." });

  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("client_invites")
    .select("id, project_id, cliente_id, status, expires_at, clientes(id, nome, email, foto_url)")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) return res.status(500).json({ error: "Erro ao buscar convite." });
  if (!invite) return res.status(404).json({ error: "not_found" });

  if (invite.status === "accepted") {
    return res.status(400).json({ error: "already_accepted", project_id: invite.project_id });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return res.status(400).json({ error: "expired" });
  }

  const cliente = (invite as any).clientes as { id: string; nome: string; email: string; foto_url: string | null };
  const userEmail = user.email?.toLowerCase() ?? "";

  if (userEmail !== cliente.email.toLowerCase()) {
    return res.status(403).json({ error: "email_mismatch" });
  }

  const { data: existingMember } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", invite.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: userErr } = await supabaseAdmin
    .from("users")
    .upsert({ id: user.id, nome: cliente.nome, role: "cliente", avatar_url: cliente.foto_url ?? null },
      { onConflict: "id", ignoreDuplicates: false });

  if (userErr) {
    return res.status(500).json({ error: "Erro ao criar perfil: " + userErr.message });
  }

  if (!existingMember) {
    const { error: memberErr } = await supabaseAdmin.from("project_members").insert([{
      project_id: invite.project_id,
      user_id: user.id,
      role: "cliente",
      email: user.email ?? null,
      nome: cliente.nome,
      avatar_url: cliente.foto_url ?? null,
    }]);

    if (memberErr) {
      return res.status(500).json({ error: "Erro ao adicionar acesso: " + memberErr.message });
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from("client_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (updateErr) {
    return res.status(500).json({ error: "Erro ao confirmar acesso: " + updateErr.message });
  }

  return res.status(200).json({ project_id: invite.project_id });
}
