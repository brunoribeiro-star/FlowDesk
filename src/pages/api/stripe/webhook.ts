import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { planFromPriceId, PRICES } from "@/lib/stripeConfig";
import type Stripe from "stripe";

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("Trial ending soon for customer:", sub.customer);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  return res.status(200).json({ received: true });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;
  const priceId = sub.items.data[0]?.price.id;
  const isStorageAddon = priceId === PRICES.storage_extra || sub.metadata?.addon === "storage_extra";

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id, trial_used")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!existing?.user_id) return;

  if (isStorageAddon) {
    const { data: current } = await supabase
      .from("subscriptions")
      .select("extra_storage_addons")
      .eq("user_id", existing.user_id)
      .maybeSingle();

    const currentAddons = (current?.extra_storage_addons ?? 0) as number;
    if (sub.status === "active") {
      await supabase
        .from("subscriptions")
        .update({ extra_storage_addons: currentAddons + 1 })
        .eq("user_id", existing.user_id);
    }
    return;
  }

  const plan = planFromPriceId(priceId);
  const trialUsed = existing.trial_used || sub.status !== "trialing";

  const periodEnd =
    (sub.items?.data?.[0] as any)?.current_period_end
    ?? sub.trial_end
    ?? (sub as any).current_period_end;

  const stripeInterval = sub.items?.data?.[0]?.plan?.interval;
  const billingInterval: "mensal" | "anual" = stripeInterval === "year" ? "anual" : "mensal";

  await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      trial_used: trialUsed,
      cancel_at_period_end: sub.cancel_at_period_end,
      billing_interval: billingInterval,
    })
    .eq("user_id", existing.user_id);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!existing?.user_id) return;

  await supabase.from("subscriptions").update({
    plan: "essencial",
    status: "canceled",
    stripe_subscription_id: null,
    cancel_at_period_end: false,
  }).eq("user_id", existing.user_id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!existing?.user_id) return;

  await supabase.from("subscriptions").update({
    status: "active",
  }).eq("user_id", existing.user_id);
}
