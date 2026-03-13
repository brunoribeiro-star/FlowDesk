import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

async function sendInviteEmail(
  to: string,
  inviteLink: string,
  projectName: string,
  inviterName: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${inviterName} convidou você para colaborar em "${projectName}"`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f10;color:#e5e7eb;border-radius:12px;">
            <h2 style="color:#a78bfa;margin-bottom:8px;">Convite de colaboração</h2>
            <p style="margin-bottom:24px;color:#9ca3af;">
              <strong style="color:#e5e7eb;">${inviterName}</strong> convidou você para colaborar no projeto
              <strong style="color:#e5e7eb;">"${projectName}"</strong> no FlowDesk.
            </p>
            <a href="${inviteLink}"
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;
                      padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Aceitar convite
            </a>
            <p style="margin-top:24px;font-size:13px;color:#6b7280;">
              Ou copie o link:<br/>
              <a href="${inviteLink}" style="color:#a78bfa;word-break:break-all;">${inviteLink}</a>
            </p>
            <p style="margin-top:32px;font-size:12px;color:#4b5563;">
              Este link expira em 7 dias. Se você não esperava este convite, pode ignorar este email.
            </p>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

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

  const { project_id, invited_email, split_type, split_value, already_paid } = req.body as {
    project_id?: string;
    invited_email?: string;
    split_type?: "percentage" | "fixed";
    split_value?: number;
    already_paid?: boolean;
  };

  if (!project_id || !invited_email) {
    return res.status(400).json({ error: "project_id e invited_email são obrigatórios." });
  }

  const emailTrimmed = invited_email.trim().toLowerCase();

  const { data: projeto, error: projetoErr } = await supabase
    .from("projetos")
    .select("id, titulo")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (projetoErr || !projeto) {
    return res.status(403).json({ error: "Você não tem permissão para convidar neste projeto." });
  }

  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", project_id)
    .eq("email", emailTrimmed)
    .maybeSingle();

  if (existingMember) {
    return res.status(409).json({ error: "Este usuário já é membro do projeto." });
  }

  const { data: existingInvite } = await supabase
    .from("project_invites")
    .select("id")
    .eq("project_id", project_id)
    .eq("invited_email", emailTrimmed)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return res.status(409).json({ error: "Já existe um convite pendente para este email neste projeto." });
  }

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
      split_type: split_type ?? null,
      split_value: split_value ?? null,
      already_paid: already_paid ?? false,
    },
  ]);

  if (insertErr) {
    return res.status(500).json({ error: "Erro ao criar convite: " + insertErr.message });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const inviteLink = `${origin}/invite/${token}`;

  const inviterName = (user.user_metadata as any)?.nome || user.email || "Um usuário";
  const email_sent = await sendInviteEmail(emailTrimmed, inviteLink, projeto.titulo, inviterName);

  return res.status(200).json({ inviteLink, email_sent });
}
