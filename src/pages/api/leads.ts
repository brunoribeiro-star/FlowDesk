import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-webhook-secret");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.LEADS_WEBHOOK_SECRET;
  if (secret) {
    const provided = (req.query.secret ?? req.headers["x-webhook-secret"]) as string | undefined;
    if (provided !== secret) return res.status(401).json({ error: "Unauthorized" });
  }

  const body = req.body;
  // Framer can send fields nested under "fields" or at the top level
  const fields = body?.fields ?? body;

  const email = (fields?.email ?? fields?.Email ?? "").trim().toLowerCase();
  const nome = fields?.nome ?? fields?.name ?? fields?.Name ?? fields?.Nome ?? null;
  const telefone = fields?.telefone ?? fields?.phone ?? fields?.Phone ?? fields?.Telefone ?? null;

  if (!email) return res.status(400).json({ error: "E-mail obrigatório." });

  const { error } = await supabase
    .from("leads")
    .upsert({ email, nome, telefone, source: "landing_page", status: "pendente" }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("[leads webhook] upsert error:", error.message, { email, nome, telefone });
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
