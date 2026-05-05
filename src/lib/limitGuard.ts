export type LimitType =
  | "projetos"
  | "clientes"
  | "storage"
  | "coworking"
  | "portal_cliente"
  | "relatorios";

const LIMIT_LABELS: Record<LimitType, string> = {
  projetos: "Limite de projetos atingido",
  clientes: "Limite de clientes atingido",
  storage: "Armazenamento cheio",
  coworking: "Limite de colaboradores atingido",
  portal_cliente: "Entregáveis e aprovações são exclusivos do plano Profissional",
  relatorios: "Relatórios completos são exclusivos do plano Profissional",
};

export function triggerUpgradeBanner(limitType: LimitType) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("flowdesk:limit-reached", {
      detail: { limitType, label: LIMIT_LABELS[limitType] },
    })
  );
}
