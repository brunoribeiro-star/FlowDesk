import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildEmailHtml, p, strong } from "@/lib/emailTemplates";

async function sendBriefingEmail(
  to: string,
  briefingLink: string,
  briefingTitle: string,
  projetoTitle: string,
  freelancerName: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY não configurada." };

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";

  const html = buildEmailHtml({
    headerSubtitle: "Briefing",
    heading: "Você recebeu um briefing para responder",
    body: `
      <p style="${p}">
        <strong style="${strong}">${freelancerName}</strong> enviou o briefing
        <strong style="${strong}">"${briefingTitle}"</strong>
        referente ao projeto <strong style="${strong}">"${projetoTitle}"</strong>.
      </p>
      <p style="${p} margin-bottom:0;">
        Clique no botão abaixo para acessar e preencher o formulário.
      </p>
    `,
    cta: { label: "Responder briefing", url: briefingLink },
    footerNote: `
      Ou copie o link: <a href="${briefingLink}" style="color:#1EB6E8;word-break:break-all;">${briefingLink}</a>
      <br><br>Se você não esperava este e-mail, pode ignorá-lo.
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
        subject: `${freelancerName} enviou um briefing para você responder`,
        html,
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

  const { envio_id, email_override } = req.body as { envio_id?: string; email_override?: string };
  if (!envio_id) return res.status(400).json({ error: "envio_id é obrigatório." });

  const { data: envio, error: envioErr } = await supabaseAdmin
    .from("briefings_envios")
    .select(`
      id, token, projeto_id, template_id,
      briefings_templates:template_id(titulo),
      projetos:projeto_id(titulo, cliente_id, clientes:cliente_id(nome, email))
    `)
    .eq("id", envio_id)
    .eq("user_id", user.id)
    .single();

  if (envioErr || !envio) {
    return res.status(404).json({ error: "Envio não encontrado ou sem permissão." });
  }

  const projeto = (envio as any).projetos as { titulo: string; cliente_id: string | null; clientes: { nome: string; email: string | null } | null } | null;
  const template = (envio as any).briefings_templates as { titulo: string } | null;

  const emailDestino = email_override?.trim().toLowerCase() || projeto?.clientes?.email || null;
  if (!emailDestino) {
    return res.status(400).json({ error: "Nenhum e-mail disponível. Informe um e-mail manualmente." });
  }

  const token = (envio as any).token as string | null;
  if (!token) {
    return res.status(400).json({ error: "Este envio não possui token. Recrie o briefing." });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const briefingLink = `${origin}/briefing/${token}`;

  const freelancerName = (user.user_metadata as any)?.nome || user.email || "O freelancer";

  const emailResult = await sendBriefingEmail(
    emailDestino,
    briefingLink,
    template?.titulo || "Briefing",
    projeto?.titulo || "Projeto",
    freelancerName
  );

  if (emailResult.ok) {
    await supabaseAdmin
      .from("briefings_envios")
      .update({ email_enviado: true })
      .eq("id", envio_id);
  }

  return res.status(200).json({
    ok: emailResult.ok,
    briefing_link: briefingLink,
    email_sent: emailResult.ok,
    email_error: emailResult.error ?? null,
    cliente_email: emailDestino,
  });
}
