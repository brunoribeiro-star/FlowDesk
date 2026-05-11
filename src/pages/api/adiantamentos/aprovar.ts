import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildEmailHtml, p, strong } from "@/lib/emailTemplates";

async function sendEmailAprovado(
  to: string,
  freelancerName: string,
  clienteName: string,
  projetoTitulo: string,
  valor: number,
  portalUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>";
  const valorFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const html = buildEmailHtml({
    headerSubtitle: "Adiantamento Aprovado",
    heading: "Seu adiantamento foi aprovado!",
    body: `
      <p style="${p}">Olá, <strong style="${strong}">${freelancerName}</strong>!</p>
      <p style="${p}"><strong style="${strong}">${clienteName}</strong> aprovou sua solicitação de adiantamento de <strong style="${strong}">${valorFmt}</strong> referente ao projeto <strong style="${strong}">"${projetoTitulo}"</strong>.</p>
      <p style="${p}">A transferência deverá ser realizada em breve. Acesse seu projeto para confirmar o recebimento assim que o valor chegar.</p>
    `,
    cta: { label: "Ver no FlowDesk", url: portalUrl },
    footerNote: "Após receber o valor, confirme o recebimento no seu projeto.",
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `Adiantamento aprovado — ${projetoTitulo}`, html }),
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

  const { adiantamento_id } = req.body as { adiantamento_id?: string };
  if (!adiantamento_id) return res.status(400).json({ error: "adiantamento_id é obrigatório." });

  const { data: adiantamento, error: adErr } = await supabaseAdmin
    .from("adiantamentos")
    .select("id, projeto_id, user_id, valor, status")
    .eq("id", adiantamento_id)
    .single();

  if (adErr || !adiantamento) return res.status(404).json({ error: "Adiantamento não encontrado." });
  if (adiantamento.status !== "solicitado") return res.status(400).json({ error: "Apenas solicitações pendentes podem ser aprovadas." });

  const { data: membership } = await supabaseAdmin
    .from("project_members")
    .select("role")
    .eq("project_id", adiantamento.projeto_id)
    .eq("user_id", user.id)
    .eq("role", "cliente")
    .maybeSingle();

  if (!membership) return res.status(403).json({ error: "Apenas o cliente do projeto pode aprovar." });

  await supabaseAdmin
    .from("adiantamentos")
    .update({ status: "aprovado", respondido_em: new Date().toISOString() })
    .eq("id", adiantamento_id);

  const { data: projeto } = await supabaseAdmin
    .from("projetos")
    .select("titulo, clientes:cliente_id(nome)")
    .eq("id", adiantamento.projeto_id)
    .single();

  const { data: freelancerAuth } = await supabaseAdmin.auth.admin.getUserById(adiantamento.user_id);
  const freelancerEmail = freelancerAuth?.user?.email;
  const freelancerName = (freelancerAuth?.user?.user_metadata as any)?.nome || freelancerEmail || "Freelancer";
  const clienteName = (user.user_metadata as any)?.nome || user.email || "Cliente";
  const origin = req.headers.origin || `https://${req.headers.host}`;

  if (freelancerEmail && projeto) {
    await sendEmailAprovado(
      freelancerEmail,
      freelancerName,
      clienteName,
      (projeto as any).titulo,
      Number(adiantamento.valor),
      `${origin}/dashboard/projetos/${adiantamento.projeto_id}`
    );
  }

  await supabaseAdmin.from("atividades").insert([{
    user_id: adiantamento.user_id,
    projeto_id: adiantamento.projeto_id,
    tipo: "Financeiro",
    descricao: `Adiantamento de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(adiantamento.valor))} aprovado pelo cliente.`,
  }]);

  return res.status(200).json({ ok: true });
}
