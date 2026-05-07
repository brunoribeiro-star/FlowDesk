import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildEmailHtml, strong } from "@/lib/emailTemplates";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendAccessEmail(
  to: string,
  clienteName: string,
  magicLink: string,
  otpCode: string,
  origin: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY não configurada." };
  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";

  const greeting = clienteName
    ? `Olá, <strong style="${strong}">${clienteName}</strong>! Use o código abaixo ou clique no botão para entrar.`
    : "Use o código abaixo ou clique no botão para entrar.";

  const otpFormatted = `${otpCode.slice(0, 3)} ${otpCode.slice(3)}`;

  const html = buildEmailHtml({
    headerSubtitle: "Portal do cliente",
    heading: "Acesse o seu portal",
    body: `
      <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.65;">${greeting}</p>

      <!-- OTP block -->
      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td style="background:#0d2a38;border:1px solid #1d4a62;border-radius:12px;padding:24px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Seu código de acesso</p>
            <p style="margin:0;font-size:42px;font-weight:800;color:#1EB6E8;letter-spacing:12px;font-variant-numeric:tabular-nums;">${otpCode}</p>
            <p style="margin:10px 0 0;font-size:12px;color:#4b7080;">Válido por 1 hora &middot; Uso único</p>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:20px;">
        <tr>
          <td style="border-top:1px solid #1f2937;width:50%;"></td>
          <td style="padding:0 12px;white-space:nowrap;font-size:12px;color:#4b5563;">ou acesse com um clique</td>
          <td style="border-top:1px solid #1f2937;width:50%;"></td>
        </tr>
      </table>
    `,
    cta: { label: "Acessar portal agora", url: magicLink },
    footerNote: "Se você não solicitou este acesso, ignore este e-mail com segurança.",
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
        subject: `${otpFormatted} é seu código de acesso — FlowDesk`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.message || `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro de rede ao enviar e-mail." };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body as { email?: string };
  if (!email?.trim()) return res.status(400).json({ error: "E-mail obrigatório." });

  const trimmed = email.trim().toLowerCase();

  const { data: clienteRows } = await supabaseAdmin
    .from("clientes")
    .select("id, nome")
    .ilike("email", trimmed)
    .limit(1);

  if (!clienteRows || clienteRows.length === 0) {
    return res.status(404).json({ error: "not_found" });
  }

  const cliente = clienteRows[0];

  const { data: projetoRows } = await supabaseAdmin
    .from("projetos")
    .select("id")
    .eq("cliente_id", cliente.id)
    .limit(1);

  if (!projetoRows || projetoRows.length === 0) {
    return res.status(404).json({ error: "not_found" });
  }

  const origin =
    (req.headers.origin as string) ||
    (req.headers.host ? `https://${req.headers.host}` : "https://app.oflowdesk.com");

  const redirectTo = `${origin}/portal/dashboard`;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: trimmed,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("generateLink error:", linkError);
    return res.status(500).json({ error: "Erro ao gerar link de acesso." });
  }

  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from("portal_access_tokens").insert({
    email: trimmed,
    token: otpCode,
    expires_at: expiresAt,
  });

  const emailResult = await sendAccessEmail(
    trimmed,
    cliente.nome || "",
    linkData.properties.action_link,
    otpCode,
    origin
  );

  if (!emailResult.ok) {
    console.error("Email send error:", emailResult.error);
    return res.status(500).json({ error: "Erro ao enviar e-mail." });
  }

  return res.status(200).json({ ok: true });
}
