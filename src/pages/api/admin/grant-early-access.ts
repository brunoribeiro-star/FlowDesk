import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildEmailHtml, p, strong } from "@/lib/emailTemplates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(req: NextApiRequest): Promise<boolean> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return false;
  const { data: { user } } = await supabase.auth.getUser(token);
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!user && !!adminEmail && user.email === adminEmail;
}

async function sendEarlyAccessEmail({
  email,
  nome,
  plan,
  days,
  lifetime,
  alreadyExisted,
}: {
  email: string;
  nome: string | null;
  plan: "essencial" | "profissional";
  days: number;
  lifetime: boolean;
  alreadyExisted: boolean;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@oflowdesk.com>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oflowdesk.com";
  const primeiroNome = nome ? nome.split(" ")[0] : "olá";
  const planLabel = plan === "profissional" ? "Profissional" : "Essencial";
  const duracaoLabel = lifetime ? "permanente" : `por ${days} dias`;

  const accessNote = alreadyExisted
    ? `<p style="${p}">Você já tem uma conta no FlowDesk — é só fazer login normalmente.</p>`
    : `<p style="${p}">Você vai receber um e-mail separado com o link para definir sua senha e acessar o FlowDesk.</p>`;

  const html = buildEmailHtml({
    headerSubtitle: "Acesso Antecipado",
    heading: "Seu acesso foi liberado!",
    body: `
      <p style="${p}">
        Olá, <strong style="${strong}">${primeiroNome}</strong>! 🎉
      </p>
      <p style="${p}">
        Seu acesso antecipado ao FlowDesk foi liberado. Você tem o plano
        <strong style="${strong}">${planLabel}</strong> ${duracaoLabel} — aproveite para explorar tudo que o FlowDesk tem a oferecer.
      </p>
      ${accessNote}
      <p style="${p} margin-bottom:0;">
        Qualquer dúvida, é só responder este e-mail. Boas-vindas ao FlowDesk!
      </p>
    `,
    cta: { label: "Acessar o FlowDesk", url: appUrl },
    footerNote: "Você recebeu este e-mail porque solicitou acesso antecipado ao FlowDesk.",
  });

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Seu acesso ao FlowDesk foi liberado! 🚀",
      html,
    }),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const { leadId, email, plan = "profissional", days = 30, lifetime = false } = req.body as {
    leadId?: string;
    email?: string;
    plan?: "essencial" | "profissional";
    days?: number;
    lifetime?: boolean;
  };

  if (!leadId || !email) {
    return res.status(400).json({ error: "leadId e email são obrigatórios." });
  }

  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers.find(u => u.email === email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oflowdesk.com"}/dashboard`,
    });

    if (inviteError || !inviteData.user) {
      return res.status(500).json({ error: inviteError?.message ?? "Erro ao criar convite." });
    }

    userId = inviteData.user.id;
  }

  const periodEnd = lifetime
    ? null
    : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status: "active",
      current_period_end: periodEnd,
      trial_used: true,
      cancel_at_period_end: false,
      billing_interval: "mensal",
      is_lifetime: lifetime,
    },
    { onConflict: "user_id" }
  );

  if (subError) return res.status(500).json({ error: subError.message });

  const { error: leadError } = await supabase
    .from("leads")
    .update({ status: "acesso_liberado", acesso_liberado_em: new Date().toISOString() })
    .eq("id", leadId);

  if (leadError) return res.status(500).json({ error: leadError.message });

  const { data: lead } = await supabase.from("leads").select("nome").eq("id", leadId).single();
  const nome = lead?.nome ?? null;

  await sendEarlyAccessEmail({ email, nome, plan, days, lifetime, alreadyExisted: !!existingUser });

  return res.status(200).json({ ok: true, userId, alreadyExisted: !!existingUser });
}
