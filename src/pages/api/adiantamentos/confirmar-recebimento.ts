import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
    .select("id, projeto_id, user_id, valor, status, pix_chave")
    .eq("id", adiantamento_id)
    .single();

  if (adErr || !adiantamento) return res.status(404).json({ error: "Adiantamento não encontrado." });
  if (adiantamento.user_id !== user.id) return res.status(403).json({ error: "Sem permissão." });
  if (adiantamento.status !== "aprovado") return res.status(400).json({ error: "Apenas adiantamentos aprovados podem ter recebimento confirmado." });

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("adiantamentos")
    .update({ status: "pago", pago_em: now })
    .eq("id", adiantamento_id);

  const valorFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(adiantamento.valor));

  await supabaseAdmin.from("pagamentos").insert([{
    projeto_id: adiantamento.projeto_id,
    user_id: user.id,
    valor: Number(adiantamento.valor),
    status: "pago",
    tipo: "adiantamento",
    forma_pagamento: "pix",
    parcela: 1,
    total_parcelas: 1,
    data_pagamento: now,
    pix_chave: adiantamento.pix_chave || null,
  }]);

  await supabaseAdmin.from("atividades").insert([{
    user_id: user.id,
    projeto_id: adiantamento.projeto_id,
    tipo: "Financeiro",
    descricao: `Recebimento de adiantamento de ${valorFmt} confirmado.`,
  }]);

  return res.status(200).json({ ok: true });
}
