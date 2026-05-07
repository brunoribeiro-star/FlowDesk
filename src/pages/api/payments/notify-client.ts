import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildEmailHtml, p, strong } from "@/lib/emailTemplates";

async function sendCobrancaEmail(
  to: string,
  clienteName: string,
  freelancerName: string,
  projetoTitulo: string,
  valor: number,
  pixChave: string | null,
  portalUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY não configurada." };

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";
  const valorFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const pixBlock = pixChave
    ? `
      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:16px;">
        <tr>
          <td style="background:#0d2a38;border:1px solid #1d4a62;border-radius:12px;padding:18px 20px;">
            <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Chave PIX para pagamento</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#1EB6E8;word-break:break-all;">${pixChave}</p>
          </td>
        </tr>
      </table>
    `
    : "";

  const html = buildEmailHtml({
    headerSubtitle: "Cobrança",
    heading: "Você tem um pagamento pendente",
    body: `
      <p style="${p}">
        Olá, <strong style="${strong}">${clienteName}</strong>!
        <strong style="${strong}">${freelancerName}</strong> enviou uma cobrança referente ao projeto
        <strong style="${strong}">"${projetoTitulo}"</strong>.
      </p>
      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:8px;">
        <tr>
          <td style="background:#0d2a38;border:1px solid #1d4a62;border-radius:12px;padding:20px 24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Valor a pagar</p>
            <p style="margin:0;font-size:32px;font-weight:800;color:#f3f4f6;">${valorFormatado}</p>
          </td>
        </tr>
      </table>
      ${pixBlock}
    `,
    cta: { label: "Ver no portal", url: portalUrl },
    footerNote: "Após realizar o pagamento, acesse o portal e marque como pago.",
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
        subject: `Lembrete de pagamento — ${projetoTitulo}`,
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { pagamento_id, pix_chave } = req.body as { pagamento_id?: string; pix_chave?: string };
  if (!pagamento_id) return res.status(400).json({ error: "pagamento_id é obrigatório." });

  const { data: pagamento, error: pagErr } = await supabaseAdmin
    .from("pagamentos")
    .select("id, valor, status, projeto_id, user_id")
    .eq("id", pagamento_id)
    .single();

  if (pagErr || !pagamento) return res.status(404).json({ error: "Pagamento não encontrado." });
  if (pagamento.user_id !== user.id) return res.status(403).json({ error: "Sem permissão." });
  if (pagamento.status === "pago") return res.status(400).json({ error: "Pagamento já está pago." });

  const { data: projeto, error: projErr } = await supabaseAdmin
    .from("projetos")
    .select("id, titulo, cliente_id, clientes(id, nome, email)")
    .eq("id", pagamento.projeto_id)
    .single();

  if (projErr || !projeto) return res.status(404).json({ error: "Projeto não encontrado." });

  const cliente = (projeto as any).clientes as { id: string; nome: string; email: string | null } | null;
  if (!cliente?.email) return res.status(400).json({ error: "Cliente sem e-mail cadastrado." });

  const pixChaveAtual = pix_chave?.trim() || null;

  const updates: Record<string, any> = {
    notificado_em: new Date().toISOString(),
  };
  if (pixChaveAtual !== undefined) updates.pix_chave = pixChaveAtual;

  await supabaseAdmin.from("pagamentos").update(updates).eq("id", pagamento_id);

  const freelancerName = (user.user_metadata as any)?.nome || user.email || "O freelancer";
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const portalUrl = `${origin}/portal/pagamentos`;

  const emailResult = await sendCobrancaEmail(
    cliente.email,
    cliente.nome,
    freelancerName,
    projeto.titulo,
    Number(pagamento.valor ?? 0),
    pixChaveAtual,
    portalUrl
  );

  await supabaseAdmin.from("atividades").insert([{
    user_id: user.id,
    projeto_id: pagamento.projeto_id,
    tipo: "Pagamentos",
    descricao: `Cobrança enviada ao cliente para pagamento de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(pagamento.valor ?? 0))}.`,
  }]);

  return res.status(200).json({
    ok: true,
    email_sent: emailResult.ok,
    email_error: emailResult.error ?? null,
  });
}
