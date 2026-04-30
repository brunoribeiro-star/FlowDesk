import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, STORAGE_ADDON_GB, TRIAL_DAYS, type PlanId } from "@/lib/stripeConfig";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Recursively lists all files under a bucket prefix and sums their sizes in bytes.
async function sumBucketBytes(bucket: string, prefix: string): Promise<number> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return 0;

  const sizes = await Promise.all(
    data.map((item) =>
      item.metadata
        ? Promise.resolve((item.metadata.size as number) ?? 0)
        : sumBucketBytes(bucket, `${prefix}/${item.name}`)
    )
  );
  return sizes.reduce((a, b) => a + b, 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, trial_used, extra_storage_addons")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date();
  const createdAt = new Date(user.created_at);
  const trialEnd = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const isTrialActive = !sub?.trial_used && now < trialEnd;
  const plan: PlanId = isTrialActive ? "trial" : (sub?.plan as PlanId) ?? "essencial";
  const extraStorageGB = ((sub?.extra_storage_addons ?? 0) as number) * STORAGE_ADDON_GB;
  const limitGB = PLAN_LIMITS[plan].storageGB + extraStorageGB;

  const [projetosBytes, coversBytes] = await Promise.all([
    sumBucketBytes("projetos", user.id),
    sumBucketBytes("project-covers", user.id),
  ]);

  const usedBytes = projetosBytes + coversBytes;
  const usedGB = usedBytes / (1024 * 1024 * 1024);

  return res.status(200).json({
    usedBytes,
    usedGB,
    limitGB,
    available: usedGB < limitGB,
  });
}
