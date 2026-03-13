import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "E-mail obrigatório." });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let page = 1;
  const perPage = 1000;
  const target = email.toLowerCase();

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) return res.status(500).json({ error: "Erro ao verificar e-mail." });

    const found = data.users.some((u) => u.email?.toLowerCase() === target);
    if (found) return res.status(200).json({ exists: true });

    if (data.users.length < perPage) return res.status(200).json({ exists: false });

    page++;
  }
}
