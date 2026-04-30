export type LimitType =
  | "projetos"
  | "clientes"
  | "storage"
  | "coworking";

const LIMIT_LABELS: Record<LimitType, string> = {
  projetos: "Limite de projetos atingido",
  clientes: "Limite de clientes atingido",
  storage: "Armazenamento cheio",
  coworking: "Limite de colaboradores atingido",
};

export function triggerUpgradeBanner(limitType: LimitType) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("flowdesk:limit-reached", {
      detail: { limitType, label: LIMIT_LABELS[limitType] },
    })
  );
}
