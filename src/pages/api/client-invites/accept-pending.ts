import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) return res.status(401).json({ error: "Não autenticado." });

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: "Não autenticado." });

  const userEmail = user.email?.trim().toLowerCase();
  if (!userEmail) return res.status(200).json({ accepted: [] });

  const { data: clientes } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, foto_url")
    .ilike("email", userEmail);

  if (!clientes || clientes.length === 0) {
    return res.status(200).json({ accepted: [] });
  }

  const clienteIds = clientes.map((c) => c.id);

  const { data: invites } = await supabaseAdmin
    .from("client_invites")
    .select("id, project_id, cliente_id, expires_at")
    .in("cliente_id", clienteIds)
    .eq("status", "pending");

  if (!invites || invites.length === 0) {
    return res.status(200).json({ accepted: [] });
  }

  const accepted: string[] = [];

  for (const invite of invites) {
    if (new Date(invite.expires_at) < new Date()) continue;

    const { data: existingMember } = await supabaseAdmin
      .from("project_members")
      .select("id")
      .eq("project_id", invite.project_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingMember) {
      const cliente = clientes.find((c) => c.id === invite.cliente_id);

      await supabaseAdmin
        .from("users")
        .upsert(
          { id: user.id, nome: cliente?.nome ?? null, role: "cliente", avatar_url: cliente?.foto_url ?? null },
          { onConflict: "id", ignoreDuplicates: true }
        );

      const { error: memberErr } = await supabaseAdmin.from("project_members").insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: "cliente",
        email: user.email ?? null,
        nome: cliente?.nome ?? null,
        avatar_url: cliente?.foto_url ?? null,
      });

      if (memberErr) continue;
    }

    await supabaseAdmin
      .from("client_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    accepted.push(invite.project_id);
  }

  return res.status(200).json({ accepted });
}
