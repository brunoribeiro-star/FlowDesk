import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildEmailHtml, p, strong } from "@/lib/emailTemplates";

async function sendEmailRecusado(
  to: string,
  freelancerName: string,
  clienteName: string,
  projetoTitulo: string,
  valor: number,
  feedback: string,
  portalUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";
  const valorFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const html = buildEmailHtml({
    headerSubtitle: "Adiantamento Recusado",
    heading: "Solicitação de adiantamento recusada",
    body: `
      <p style="${p}">Olá, <strong style="${strong}">${freelancerName}</strong>!</p>
      <p style="${p}"><strong style="${strong}">${clienteName}</strong> não pôde aprovar sua solicitação de adiantamento de <strong style="${strong}">${valorFmt}</strong> referente ao projeto <strong style="${strong}">"${projetoTitulo}"</strong>.</p>
      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:12px;">
        <tr><td style="background:#0d2a38;border:1px solid #1d4a62;border-radius:12px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Motivo informado pelo cliente</p>
          <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;">${feedback}</p>
        </td></tr>
      </table>
    `,
    cta: { label: "Ver no FlowDesk", url: portalUrl },
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `Adiantamento recusado — ${projetoTitulo}`, html }),
    });
  } catch {}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado." });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: "Não autenticado." });

  const { adiantamento_id, feedback } = req.body as { adiantamento_id?: string; feedback?: string };
  if (!adiantamento_id) return res.status(400).json({ error: "adiantamento_id é obrigatório." });
  if (!feedback?.trim()) return res.status(400).json({ error: "Informe o motivo da recusa." });

  const { data: adiantamento, error: adErr } = await supabaseAdmin
    .from("adiantamentos")
    .select("id, projeto_id, user_id, valor, status")
    .eq("id", adiantamento_id)
    .single();

  if (adErr || !adiantamento) return res.status(404).json({ error: "Adiantamento não encontrado." });
  if (adiantamento.status !== "solicitado") return res.status(400).json({ error: "Apenas solicitações pendentes podem ser recusadas." });

  const { data: membership } = await supabaseAdmin
    .from("project_members")
    .select("role")
    .eq("project_id", adiantamento.projeto_id)
    .eq("user_id", user.id)
    .eq("role", "cliente")
    .maybeSingle();

  if (!membership) return res.status(403).json({ error: "Apenas o cliente do projeto pode recusar." });

  await supabaseAdmin
    .from("adiantamentos")
    .update({ status: "recusado", feedback_cliente: feedback.trim(), respondido_em: new Date().toISOString() })
    .eq("id", adiantamento_id);

  const { data: projeto } = await supabaseAdmin
    .from("projetos")
    .select("titulo")
    .eq("id", adiantamento.projeto_id)
    .single();

  const { data: freelancerAuth } = await supabaseAdmin.auth.admin.getUserById(adiantamento.user_id);
  const freelancerEmail = freelancerAuth?.user?.email;
  const freelancerName = (freelancerAuth?.user?.user_metadata as any)?.nome || freelancerEmail || "Freelancer";
  const clienteName = (user.user_metadata as any)?.nome || user.email || "Cliente";
  const origin = req.headers.origin || `https://${req.headers.host}`;

  if (freelancerEmail && projeto) {
    await sendEmailRecusado(
      freelancerEmail,
      freelancerName,
      clienteName,
      (projeto as any).titulo,
      Number(adiantamento.valor),
      feedback.trim(),
      `${origin}/dashboard/projetos/${adiantamento.projeto_id}`
    );
  }

  await supabaseAdmin.from("atividades").insert([{
    user_id: adiantamento.user_id,
    projeto_id: adiantamento.projeto_id,
    tipo: "Financeiro",
    descricao: `Solicitação de adiantamento de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(adiantamento.valor))} recusada pelo cliente.`,
  }]);

  return res.status(200).json({ ok: true });
}
