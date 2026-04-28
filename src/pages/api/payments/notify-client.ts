import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
      <div style="margin:24px 0;padding:16px 20px;background:#0d2a38;border-radius:10px;border:1px solid #1d4a62;">
        <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;">Chave PIX para pagamento:</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#1EB6E8;word-break:break-all;">${pixChave}</p>
      </div>
    `
    : "";

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
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f10;color:#e5e7eb;border-radius:12px;">
            <h2 style="color:#1EB6E8;margin-bottom:8px;">Lembrete de pagamento</h2>
            <p style="margin-bottom:8px;color:#9ca3af;">
              Olá, <strong style="color:#e5e7eb;">${clienteName}</strong>!
            </p>
            <p style="margin-bottom:24px;color:#9ca3af;">
              <strong style="color:#e5e7eb;">${freelancerName}</strong> enviou uma cobrança referente ao projeto
              <strong style="color:#e5e7eb;">"${projetoTitulo}"</strong>.
            </p>
            <div style="padding:16px 20px;background:#0d2a38;border-radius:10px;border:1px solid #1d4a62;margin-bottom:24px;">
              <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">Valor a pagar</p>
              <p style="margin:0;font-size:28px;font-weight:700;color:#e5e7eb;">${valorFormatado}</p>
            </div>
            ${pixBlock}
            <a href="${portalUrl}"
               style="display:inline-block;background:#1EB6E8;color:#06191F;text-decoration:none;
                      padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Ver no portal
            </a>
            <p style="margin-top:32px;font-size:12px;color:#4b5563;">
              Após realizar o pagamento, acesse o portal e marque como pago.
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
