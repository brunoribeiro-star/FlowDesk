import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { PRICES } from "@/lib/stripeConfig";

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

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return res.status(400).json({ error: "Nenhuma assinatura encontrada" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (sub.stripe_subscription_id) {
    const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const session = await stripe.checkout.sessions.create({
      customer: sub.stripe_customer_id,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: PRICES.storage_extra, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/configuracoes?tab=assinatura&storage=added`,
      cancel_url: `${baseUrl}/dashboard/configuracoes?tab=assinatura`,
      locale: "pt-BR",
      subscription_data: {
        metadata: { addon: "storage_extra", parent_subscription: subscription.id },
      },
    });
    return res.status(200).json({ url: session.url });
  }

  const session = await stripe.checkout.sessions.create({
    customer: sub.stripe_customer_id,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: PRICES.storage_extra, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/configuracoes?tab=assinatura&storage=added`,
    cancel_url: `${baseUrl}/dashboard/configuracoes?tab=assinatura`,
    locale: "pt-BR",
  });

  return res.status(200).json({ url: session.url });
}
