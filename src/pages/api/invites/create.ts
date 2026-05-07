import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { buildEmailHtml, p, strong } from "@/lib/emailTemplates";

async function sendInviteEmail(
  to: string,
  inviteLink: string,
  projectName: string,
  inviterName: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";

  const html = buildEmailHtml({
    headerSubtitle: "Convite de colaboração",
    heading: "Você foi convidado para colaborar",
    body: `
      <p style="${p}">
        <strong style="${strong}">${inviterName}</strong> convidou você para colaborar no projeto
        <strong style="${strong}">"${projectName}"</strong> no FlowDesk.
      </p>
      <p style="${p} margin-bottom:0;">
        Clique no botão abaixo para aceitar o convite e começar a colaborar.
      </p>
    `,
    cta: { label: "Aceitar convite", url: inviteLink },
    footerNote: `
      Ou copie o link: <a href="${inviteLink}" style="color:#1EB6E8;word-break:break-all;">${inviteLink}</a>
      <br><br>Este link expira em 7 dias. Se você não esperava este convite, pode ignorar este e-mail.
    `,
  });

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
        html,
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
