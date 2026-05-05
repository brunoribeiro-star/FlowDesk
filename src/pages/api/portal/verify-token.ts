import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, token } = req.body as { email?: string; token?: string };
  if (!email?.trim() || !token?.trim()) {
    return res.status(400).json({ error: "E-mail e token são obrigatórios." });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  const { data: rows, error: findErr } = await supabaseAdmin
    .from("portal_access_tokens")
    .select("id, expires_at, used_at")
    .eq("email", trimmedEmail)
    .eq("token", trimmedToken)
    .is("used_at", null)
    .limit(1);

  if (findErr || !rows || rows.length === 0) {
    return res.status(401).json({ error: "Código inválido ou expirado." });
  }

  const record = rows[0];

  if (new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ error: "Código inválido ou expirado." });
  }

  await supabaseAdmin
    .from("portal_access_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id);

  const origin =
    (req.headers.origin as string) ||
    (req.headers.host ? `https://${req.headers.host}` : "https://app.oflowdesk.com");

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: trimmedEmail,
    options: { redirectTo: `${origin}/portal/dashboard` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("generateLink error:", linkError);
    return res.status(500).json({ error: "Erro ao gerar acesso. Tente usar o link do e-mail." });
  }

  return res.status(200).json({ magicLink: linkData.properties.action_link });
}
