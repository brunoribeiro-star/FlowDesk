import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

async function sendPortalEmail(
  to: string,
  magicLink: string,
  projectName: string,
  freelancerName: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY não configurada." };

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
        subject: `${freelancerName} compartilhou o projeto "${projectName}" com você`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f10;color:#e5e7eb;border-radius:12px;">
            <h2 style="color:#1EB6E8;margin-bottom:8px;">Acesso ao portal do projeto</h2>
            <p style="margin-bottom:24px;color:#9ca3af;">
              <strong style="color:#e5e7eb;">${freelancerName}</strong> compartilhou o projeto
              <strong style="color:#e5e7eb;">"${projectName}"</strong> com você no FlowDesk.
            </p>
            <p style="margin-bottom:16px;color:#9ca3af;">
              Clique no botão abaixo para acessar o portal e acompanhar o andamento do projeto.
            </p>
            <a href="${magicLink}"
               style="display:inline-block;background:#1EB6E8;color:#06191F;text-decoration:none;
                      padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Acessar portal
            </a>
            <p style="margin-top:24px;font-size:13px;color:#6b7280;">
              Ou copie o link:<br/>
              <a href="${magicLink}" style="color:#1EB6E8;word-break:break-all;">${magicLink}</a>
            </p>
            <p style="margin-top:32px;font-size:12px;color:#4b5563;">
              Este link expira em 7 dias. Se você não esperava este acesso, pode ignorar este e-mail.
            </p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.message || `Resend status ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro de rede ao enviar e-mail." };
  }
}

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

  const { project_id } = req.body as { project_id?: string };
  if (!project_id) return res.status(400).json({ error: "project_id é obrigatório." });

  const { data: projeto, error: projetoErr } = await supabase
    .from("projetos")
    .select("id, titulo, cliente_id, clientes(id, nome, email)")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (projetoErr || !projeto) {
    return res.status(403).json({ error: "Projeto não encontrado ou sem permissão." });
  }

  const cliente = (projeto as any).clientes as { id: string; nome: string; email: string | null } | null;
  if (!cliente?.email) {
    return res.status(400).json({ error: "O cliente deste projeto não possui e-mail cadastrado." });
  }

  const clienteEmail = cliente.email.trim().toLowerCase();
  const freelancerName = (user.user_metadata as any)?.nome || user.email || "O freelancer";
  const origin = req.headers.origin || `https://${req.headers.host}`;

  const { data: existingMember } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", project_id)
    .eq("email", clienteEmail)
    .eq("role", "cliente")
    .maybeSingle();

  if (existingMember) {
    const dashboardUrl = `${origin}/portal/dashboard`;
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: clienteEmail,
      options: { redirectTo: dashboardUrl },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return res.status(500).json({ error: "Erro ao gerar link de acesso: " + linkErr?.message });
    }

    const emailResult = await sendPortalEmail(
      clienteEmail,
      linkData.properties.action_link,
      projeto.titulo,
      freelancerName
    );

    return res.status(200).json({
      portalUrl: dashboardUrl,
      email_sent: emailResult.ok,
      email_error: emailResult.error ?? null,
      cliente_email: clienteEmail,
      already_had_access: true,
    });
  }

  const { data: existingInvite } = await supabaseAdmin
    .from("client_invites")
    .select("id, token, status")
    .eq("project_id", project_id)
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let token: string;

  if (existingInvite?.status === "pending") {
    token = existingInvite.token;
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);
    await supabaseAdmin
      .from("client_invites")
      .update({ expires_at: newExpiry.toISOString() })
      .eq("id", existingInvite.id);
  } else {
    token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: insertErr } = await supabaseAdmin.from("client_invites").insert([{
      project_id,
      cliente_id: cliente.id,
      invited_by: user.id,
      token,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    }]);

    if (insertErr) {
      return res.status(500).json({ error: "Erro ao criar convite: " + insertErr.message });
    }
  }

  const portalUrl = `${origin}/portal/${token}`;

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: clienteEmail,
    options: { redirectTo: portalUrl },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return res.status(500).json({ error: "Erro ao gerar link de acesso: " + linkErr?.message });
  }

  const emailResult = await sendPortalEmail(
    clienteEmail,
    linkData.properties.action_link,
    projeto.titulo,
    freelancerName
  );

  return res.status(200).json({
    portalUrl,
    email_sent: emailResult.ok,
    email_error: emailResult.error ?? null,
    cliente_email: clienteEmail,
  });
}
