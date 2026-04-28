import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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

  const { pagamento_id } = req.body as { pagamento_id?: string };
  if (!pagamento_id) return res.status(400).json({ error: "pagamento_id é obrigatório." });

  const { data: pagamento, error: pagErr } = await supabaseAdmin
    .from("pagamentos")
    .select("id, valor, status, projeto_id")
    .eq("id", pagamento_id)
    .single();

  if (pagErr || !pagamento) return res.status(404).json({ error: "Pagamento não encontrado." });
  if (pagamento.status === "pago") return res.status(400).json({ error: "Pagamento já marcado como pago." });

  const { data: membership } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", pagamento.projeto_id)
    .eq("user_id", user.id)
    .eq("role", "cliente")
    .maybeSingle();

  if (!membership) return res.status(403).json({ error: "Sem permissão para este pagamento." });

  const { error: updateErr } = await supabaseAdmin
    .from("pagamentos")
    .update({ status: "pago", data_pagamento: new Date().toISOString() })
    .eq("id", pagamento_id);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  await supabaseAdmin.from("atividades").insert([{
    user_id: user.id,
    projeto_id: pagamento.projeto_id,
    tipo: "Pagamentos",
    descricao: `Pagamento de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(pagamento.valor ?? 0))} confirmado pelo cliente.`,
  }]);

  return res.status(200).json({ ok: true });
}
