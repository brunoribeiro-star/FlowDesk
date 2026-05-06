import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, STORAGE_ADDON_GB, TRIAL_DAYS, type PlanId } from "@/lib/stripeConfig";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date();
  const createdAt = new Date(user.created_at);
  const trialEnd = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const isTrialActive = !sub?.trial_used && now < trialEnd;

  const isLifetime = sub?.is_lifetime ?? false;
  const plan: PlanId = isTrialActive ? "trial" : (sub?.plan as PlanId) ?? "essencial";
  const status = sub?.status ?? (isTrialActive ? "trialing" : "free");
  const extraStorageGB = ((sub?.extra_storage_addons ?? 0) as number) * STORAGE_ADDON_GB;
  const limits = PLAN_LIMITS[plan];

  return res.status(200).json({
    plan,
    status,
    isTrialActive,
    isLifetime,
    trialEnd: isTrialActive ? trialEnd.toISOString() : null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    billingInterval: (sub?.billing_interval as "mensal" | "anual") ?? null,
    limits: {
      ...limits,
      storageGB: limits.storageGB + extraStorageGB,
    },
    extraStorageAddons: sub?.extra_storage_addons ?? 0,
    trialUsed: sub?.trial_used ?? false,
  });
}
