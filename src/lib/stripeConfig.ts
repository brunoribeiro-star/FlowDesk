export type PlanId = "trial" | "essencial" | "profissional";
export type BillingPeriod = "mensal" | "anual";

export interface PlanLimits {
  projetos: number | null;
  clientes: number | null;
  storageGB: number;
  coworkingMembros: number | null;
  portalClienteCompleto: boolean;
  relatoriosCompletos: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  trial: {
    projetos: null,
    clientes: null,
    storageGB: 20,
    coworkingMembros: 5,
    portalClienteCompleto: true,
    relatoriosCompletos: true,
  },
  essencial: {
    projetos: 10,
    clientes: 10,
    storageGB: 5,
    coworkingMembros: 1,
    portalClienteCompleto: false,
    relatoriosCompletos: false,
  },
  profissional: {
    projetos: null,
    clientes: null,
    storageGB: 20,
    coworkingMembros: 5,
    portalClienteCompleto: true,
    relatoriosCompletos: true,
  },
};

export const PRICES = {
  essencial_mensal: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENCIAL_MENSAL!,
  essencial_anual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENCIAL_ANUAL!,
  profissional_mensal: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFISSIONAL_MENSAL!,
  profissional_anual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFISSIONAL_ANUAL!,
  storage_extra: process.env.NEXT_PUBLIC_STRIPE_PRICE_STORAGE_EXTRA!,
} as const;

export const PLAN_PRICES = {
  essencial: { mensal: 35.9, anual: 35.9 * 0.8 * 12 },
  profissional: { mensal: 71.9, anual: 71.9 * 0.8 * 12 },
  storage_extra: 9.9,
};

export const TRIAL_DAYS = 7;
export const STORAGE_ADDON_GB = 5;

export function getPriceId(plan: "essencial" | "profissional", period: BillingPeriod): string {
  return PRICES[`${plan}_${period}`];
}

export function planFromPriceId(priceId: string): PlanId {
  if (priceId === PRICES.essencial_mensal || priceId === PRICES.essencial_anual) return "essencial";
  if (priceId === PRICES.profissional_mensal || priceId === PRICES.profissional_anual) return "profissional";
  return "essencial";
}
