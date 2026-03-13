import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export async function syncCollaboratorPaymentSplits(
  supabase: any,
  project_id: string,
  member_user_id: string,
  split_type: "percentage" | "fixed",
  split_value: number
): Promise<{ ok?: boolean; error?: string }> {
  const { data: pagamentos, error: pagErr } = await supabase
    .from("pagamentos")
    .select("id, valor, status, data_pagamento")
    .eq("projeto_id", project_id)
    .order("parcela", { ascending: true });

  if (pagErr) return { error: pagErr.message };
  if (!pagamentos || pagamentos.length === 0) return { ok: true };

  const totalParcelas = pagamentos.length;

  const { data: existingSplits } = await supabase
    .from("collaborator_payment_splits")
    .select("id, pagamento_id, status")
    .eq("project_id", project_id)
    .eq("member_user_id", member_user_id);

  const existingMap = new Map<string, { id: string; pagamento_id: string; status: string }>(
    ((existingSplits || []) as any[]).map((s: any) => [s.pagamento_id as string, s])
  );

  const toInsert: any[] = [];
  const toUpdate: { id: string; amount: number }[] = [];

  for (const p of pagamentos) {
    let amount: number;
    if (split_type === "percentage") {
      amount = Number(p.valor) * (split_value / 100);
    } else {
      amount = split_value / totalParcelas;
    }
    amount = Math.round(amount * 100) / 100;

    const existing = existingMap.get(p.id);
    if (existing) {
      toUpdate.push({ id: existing.id, amount });
    } else {
      toInsert.push({
        project_id,
        member_user_id,
        pagamento_id: p.id,
        amount,
        status: "pendente",
      });
    }
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("collaborator_payment_splits")
      .insert(toInsert);
    if (insertErr) return { error: insertErr.message };
  }

  for (const u of toUpdate) {
    const { error: updateErr } = await supabase
      .from("collaborator_payment_splits")
      .update({ amount: u.amount })
      .eq("id", u.id);
    if (updateErr) return { error: updateErr.message };
  }

  return { ok: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  const { project_id, member_user_id, split_type, split_value, payment_status } = req.body as {
    project_id?: string;
    member_user_id?: string;
    split_type?: "percentage" | "fixed";
    split_value?: number;
    payment_status?: "pending" | "paid";
  };

  if (!project_id || !member_user_id || !split_type || split_value === undefined) {
    return res.status(400).json({ error: "project_id, member_user_id, split_type e split_value são obrigatórios." });
  }

  if (!["percentage", "fixed"].includes(split_type)) {
    return res.status(400).json({ error: "split_type deve ser 'percentage' ou 'fixed'." });
  }

  const { data: projeto, error: projetoErr } = await supabase
    .from("projetos")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (projetoErr || !projeto) {
    return res.status(403).json({ error: "Você não tem permissão para configurar splits neste projeto." });
  }

  const { data: member } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", project_id)
    .eq("user_id", member_user_id)
    .maybeSingle();

  if (!member) {
    return res.status(404).json({ error: "Colaborador não encontrado neste projeto." });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const isPaid = payment_status === "paid";
  const upsertPayload: Record<string, any> = {
    project_id,
    member_user_id,
    split_type,
    split_value,
    payment_status: payment_status ?? "pending",
    updated_at: new Date().toISOString(),
  };
  if (isPaid) upsertPayload.paid_at = new Date().toISOString();

  const { error: upsertErr } = await supabaseAdmin
    .from("project_member_splits")
    .upsert(upsertPayload, { onConflict: "project_id,member_user_id" });

  if (upsertErr) {
    return res.status(500).json({ error: "Erro ao salvar split: " + upsertErr.message });
  }

  const syncRes = await syncCollaboratorPaymentSplits(supabaseAdmin, project_id, member_user_id, split_type, split_value);
  if (syncRes.error) {
    return res.status(500).json({ error: "Split salvo, mas erro ao sincronizar parcelas: " + syncRes.error });
  }

  return res.status(200).json({ ok: true });
}
