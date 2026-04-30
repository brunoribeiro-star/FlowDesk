import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { getPriceId, TRIAL_DAYS, type BillingPeriod } from "@/lib/stripeConfig";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { plan, period } = req.body as { plan: "essencial" | "profissional"; period: BillingPeriod };
  if (!plan || !period) return res.status(400).json({ error: "plan e period são obrigatórios" });

  const priceId = getPriceId(plan, period);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, trial_used")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const { data: profile } = await supabase
      .from("users")
      .select("nome")
      .eq("id", user.id)
      .maybeSingle();

    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.nome ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      plan: "essencial",
      status: "incomplete",
    }, { onConflict: "user_id" });
  }

  const trialUsed = sub?.trial_used ?? false;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: trialUsed
      ? undefined
      : { trial_period_days: TRIAL_DAYS },
    success_url: `${baseUrl}/dashboard/configuracoes?tab=assinatura&checkout=success`,
    cancel_url: `${baseUrl}/dashboard/configuracoes?tab=assinatura&checkout=cancelled`,
    allow_promotion_codes: true,
    locale: "pt-BR",
  });

  return res.status(200).json({ url: session.url });
}
