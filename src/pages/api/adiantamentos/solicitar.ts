import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildEmailHtml, p, strong } from "@/lib/emailTemplates";

async function sendEmailAdiantamento(
  to: string,
  clienteName: string,
  freelancerName: string,
  projetoTitulo: string,
  valor: number,
  motivo: string,
  pixChave: string | null,
  portalUrl: string
): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false };

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";
  const valorFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const pixBlock = pixChave
    ? `<table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:16px;">
        <tr><td style="background:#0d2a38;border:1px solid #1d4a62;border-radius:12px;padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Chave PIX para transferência</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#1EB6E8;word-break:break-all;">${pixChave}</p>
        </td></tr>
      </table>`
    : "";

  const html = buildEmailHtml({
    headerSubtitle: "Solicitação de Adiantamento",
    heading: "Solicitação de adiantamento recebida",
    body: `
      <p style="${p}">Olá, <strong style="${strong}">${clienteName}</strong>!</p>
      <p style="${p}"><strong style="${strong}">${freelancerName}</strong> está solicitando um adiantamento referente ao projeto <strong style="${strong}">"${projetoTitulo}"</strong>.</p>
      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:8px;">
        <tr><td style="background:#0d2a38;border:1px solid #1d4a62;border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Valor solicitado</p>
          <p style="margin:0;font-size:32px;font-weight:800;color:#f3f4f6;">${valorFmt}</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:12px;">
        <tr><td style="background:#0d2a38;border:1px solid #1d4a62;border-radius:12px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Motivo</p>
          <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;">${motivo}</p>
        </td></tr>
      </table>
      ${pixBlock}
    `,
    cta: { label: "Ver solicitação no portal", url: portalUrl },
    footerNote: "Você pode aprovar ou recusar essa solicitação diretamente no seu portal.",
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `Solicitação de adiantamento — ${projetoTitulo}`, html }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
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

  const { projeto_id, valor, motivo, pix_chave, pix_tipo } = req.body as {
    projeto_id?: string; valor?: number; motivo?: string; pix_chave?: string; pix_tipo?: string;
  };

  if (!projeto_id || !valor || !motivo?.trim()) {
    return res.status(400).json({ error: "projeto_id, valor e motivo são obrigatórios." });
  }

  const { data: projeto, error: projErr } = await supabaseAdmin
    .from("projetos")
    .select("id, titulo, user_id, valor, clientes:cliente_id(id, nome, email)")
    .eq("id", projeto_id)
    .single();

  if (projErr || !projeto) return res.status(404).json({ error: "Projeto não encontrado." });
  if (projeto.user_id !== user.id) return res.status(403).json({ error: "Apenas o dono do projeto pode solicitar adiantamentos." });

  const maxValor = Number(projeto.valor ?? 0);
  if (Number(valor) <= 0) return res.status(400).json({ error: "Valor deve ser maior que zero." });
  if (maxValor > 0 && Number(valor) > maxValor) {
    return res.status(400).json({ error: `Valor não pode ser maior que o valor do projeto (${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(maxValor)}).` });
  }

  const { data: pendentes } = await supabaseAdmin
    .from("adiantamentos")
    .select("id")
    .eq("projeto_id", projeto_id)
    .eq("status", "solicitado")
    .limit(1);

  if (pendentes && pendentes.length > 0) {
    return res.status(400).json({ error: "Já existe uma solicitação de adiantamento pendente para este projeto." });
  }

  const { data: adiantamento, error: insertErr } = await supabaseAdmin
    .from("adiantamentos")
    .insert([{
      projeto_id,
      user_id: user.id,
      valor: Number(valor),
      motivo: motivo.trim(),
      pix_chave: pix_chave?.trim() || null,
      pix_tipo: pix_tipo || null,
      status: "solicitado",
      solicitado_em: new Date().toISOString(),
    }])
    .select()
    .single();

  if (insertErr) return res.status(500).json({ error: "Erro ao criar solicitação." });

  const cliente = (projeto as any).clientes as { id: string; nome: string; email: string | null } | null;
  const freelancerName = (user.user_metadata as any)?.nome || user.email || "O freelancer";
  const origin = req.headers.origin || `https://${req.headers.host}`;

  if (cliente?.email) {
    await sendEmailAdiantamento(
      cliente.email,
      cliente.nome || "Cliente",
      freelancerName,
      projeto.titulo,
      Number(valor),
      motivo.trim(),
      pix_chave?.trim() || null,
      `${origin}/portal/dashboard`
    );
  }

  await supabaseAdmin.from("atividades").insert([{
    user_id: user.id,
    projeto_id,
    tipo: "Financeiro",
    descricao: `Adiantamento de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor))} solicitado ao cliente.`,
  }]);

  return res.status(200).json({ ok: true, adiantamento });
}
