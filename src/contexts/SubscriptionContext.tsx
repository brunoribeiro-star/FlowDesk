import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanId, PlanLimits } from "@/lib/stripeConfig";

export interface SubscriptionStatus {
  plan: PlanId;
  status: string;
  isTrialActive: boolean;
  isLifetime: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingInterval: "mensal" | "anual" | null;
  hasStripeSubscription: boolean;
  limits: PlanLimits & { storageGB: number };
  extraStorageAddons: number;
  trialUsed: boolean;
  loading: boolean;
  refresh: () => void;
}

type SubscriptionData = Omit<SubscriptionStatus, "refresh">;

const DEFAULT_DATA: SubscriptionData = {
  plan: "essencial",
  status: "free",
  isTrialActive: false,
  isLifetime: false,
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  billingInterval: null,
  hasStripeSubscription: false,
  limits: { projetos: 10, clientes: 10, storageGB: 5, coworkingMembros: 1, portalClienteCompleto: false, relatoriosCompletos: false },
  extraStorageAddons: 0,
  trialUsed: false,
  loading: true,
};

const SubscriptionContext = createContext<SubscriptionStatus>({ ...DEFAULT_DATA, refresh: () => {} });

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [data, setData] = useState<SubscriptionData>(DEFAULT_DATA);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }
    try {
      const res = await fetch("/api/subscription/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }
      const json = await res.json();
      setData({ ...json, loading: false });
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!user) {
      setData({ ...DEFAULT_DATA, loading: false });
      return;
    }
    setData((prev) => ({ ...prev, loading: true }));
    fetchData();
  }, [user, fetchData]);

  return (
    <SubscriptionContext.Provider value={{ ...data, refresh: fetchData }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionStatus {
  return useContext(SubscriptionContext);
}
