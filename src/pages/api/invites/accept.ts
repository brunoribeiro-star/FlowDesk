import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { syncCollaboratorPaymentSplits } from "../collaborators/set-split";

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ error: "Token é obrigatório." });
  }

  const { data: invite, error: inviteErr } = await supabase
    .from("project_invites")
    .select("id, project_id, invited_email, status, expires_at, split_type, split_value, already_paid")
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

  let nome: string | null = null;
  let avatar_url: string | null = null;

  try {
    const { data: adminUserData } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const meta = adminUserData?.user?.user_metadata as any;
    nome = meta?.nome ?? null;
    avatar_url = meta?.avatar_url ?? null;
  } catch {
    nome = (user.user_metadata as any)?.nome ?? null;
    avatar_url = (user.user_metadata as any)?.avatar_url ?? null;
  }

  // Garante que o perfil existe na tabela users antes de inserir em project_members (FK)
  await supabaseAdmin.from("users").upsert(
    { id: user.id, nome: nome ?? user.email ?? "", avatar_url: avatar_url ?? null },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", invite.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberErr } = await supabaseAdmin.from("project_members").insert([
      {
        project_id: invite.project_id,
        user_id: user.id,
        role: "collaborator",
        email: user.email ?? null,
        nome,
        avatar_url,
      },
    ]);
    if (memberErr) {
      return res.status(500).json({ error: "Erro ao adicionar membro: " + memberErr.message });
    }
  }

  if (invite.split_type && invite.split_value != null) {
    const splitPayload: Record<string, any> = {
      project_id: invite.project_id,
      member_user_id: user.id,
      split_type: invite.split_type,
      split_value: invite.split_value,
      updated_at: new Date().toISOString(),
    };

    const { error: splitErr } = await supabaseAdmin
      .from("project_member_splits")
      .upsert(splitPayload, { onConflict: "project_id,member_user_id" });

    if (splitErr) {
      return res.status(500).json({ error: "Erro ao criar split: " + splitErr.message });
    }

    await syncCollaboratorPaymentSplits(
      supabaseAdmin,
      invite.project_id,
      user.id,
      invite.split_type as "percentage" | "fixed",
      invite.split_value
    );

    if (invite.already_paid) {
      const now = new Date().toISOString();

      await supabaseAdmin
        .from("project_member_splits")
        .update({ payment_status: "paid", paid_at: now, updated_at: now })
        .eq("project_id", invite.project_id)
        .eq("member_user_id", user.id);

      await supabaseAdmin
        .from("collaborator_payment_splits")
        .update({ status: "pago", paid_at: now })
        .eq("project_id", invite.project_id)
        .eq("member_user_id", user.id);
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from("project_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (updateErr) {
    return res.status(500).json({ error: "Erro ao atualizar convite: " + updateErr.message });
  }

  return res.status(200).json({ project_id: invite.project_id });
}
