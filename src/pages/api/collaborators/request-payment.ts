import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

async function sendPaymentRequestEmail(
  to: string,
  ownerName: string,
  collaboratorName: string,
  projetoTitulo: string,
  projectUrl: string
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
        subject: `${collaboratorName} solicitou pagamento — ${projetoTitulo}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f10;color:#e5e7eb;border-radius:12px;">
            <h2 style="color:#1EB6E8;margin-bottom:8px;">Solicitação de pagamento</h2>
            <p style="margin-bottom:24px;color:#9ca3af;">
              Olá, <strong style="color:#e5e7eb;">${ownerName}</strong>!
            </p>
            <p style="margin-bottom:24px;color:#9ca3af;">
              O colaborador <strong style="color:#e5e7eb;">${collaboratorName}</strong> solicitou o pagamento
              referente à sua participação no projeto
              <strong style="color:#e5e7eb;">"${projetoTitulo}"</strong>.
            </p>
            <a href="${projectUrl}"
               style="display:inline-block;background:#1EB6E8;color:#06191F;text-decoration:none;
                      padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Ver projeto
            </a>
            <p style="margin-top:32px;font-size:12px;color:#4b5563;">
              Acesse o FlowDesk para revisar e efetuar o pagamento ao colaborador.
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

  const accessToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!accessToken) return res.status(401).json({ error: "Não autenticado." });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return res.status(401).json({ error: "Não autenticado." });

  const { project_id } = req.body as { project_id?: string };
  if (!project_id) return res.status(400).json({ error: "project_id é obrigatório." });

  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", project_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return res.status(403).json({ error: "Você não é membro deste projeto." });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from("project_member_splits")
    .update({
      payment_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", project_id)
    .eq("member_user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });

  const { data: projeto } = await supabaseAdmin
    .from("projetos")
    .select("id, titulo, user_id")
    .eq("id", project_id)
    .single();

  if (projeto) {
    const { data: ownerAuth } = await supabaseAdmin.auth.admin.getUserById(projeto.user_id);
    const ownerEmail = ownerAuth?.user?.email;

    if (ownerEmail) {
      const collaboratorName = (user.user_metadata as any)?.nome || user.email || "O colaborador";
      const ownerName = (ownerAuth.user?.user_metadata as any)?.nome || ownerEmail;
      const origin = req.headers.origin || `https://${req.headers.host}`;
      const projectUrl = `${origin}/dashboard/projetos/${project_id}`;

      await sendPaymentRequestEmail(ownerEmail, ownerName, collaboratorName, projeto.titulo, projectUrl);
    }
  }

  return res.status(200).json({ ok: true });
}
