import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanId, PlanLimits } from "@/lib/stripeConfig";

export interface SubscriptionStatus {
  plan: PlanId;
  status: string;
  isTrialActive: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingInterval: "mensal" | "anual" | null;
  limits: PlanLimits & { storageGB: number };
  extraStorageAddons: number;
  trialUsed: boolean;
  loading: boolean;
}

const DEFAULT: SubscriptionStatus = {
  plan: "essencial",
  status: "free",
  isTrialActive: false,
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  billingInterval: null,
  limits: { projetos: 10, clientes: 10, storageGB: 5, coworkingMembros: 1 },
  extraStorageAddons: 0,
  trialUsed: false,
  loading: true,
};

export function useSubscription(): SubscriptionStatus & { refresh: () => void } {
  const { user, session } = useAuth();
  const [data, setData] = useState<SubscriptionStatus>(DEFAULT);

  const fetch = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await window.fetch("/api/subscription/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setData({ ...json, loading: false });
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!user) {
      setData({ ...DEFAULT, loading: false });
      return;
    }
    fetch();
  }, [user, fetch]);

  return { ...data, refresh: fetch };
}
