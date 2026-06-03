import React from "react";

interface UrgenciaIndicatorProps {
  nivel: string;
}

const HEIGHTS = [7, 11, 15, 18];

function getUrgenciaConfig(nivel: string): { color: string; shadow: string; ativos: number } {
  switch (nivel) {
    case "Muito urgente":
    case "Vencida":
      return { color: "var(--error-medium)", shadow: "0 0 6px -1px var(--error-medium)", ativos: 4 };
    case "Urgente":
      return { color: "var(--alert-medium)", shadow: "0 0 6px -1px var(--alert-medium)", ativos: 3 };
    case "Normal":
      return { color: "var(--primary-400)", shadow: "0 0 6px -1px var(--primary-500)", ativos: 2 };
    case "Baixa":
      return { color: "var(--primary-400)", shadow: "0 0 6px -1px var(--primary-500)", ativos: 1 };
    default:
      return { color: "var(--gray-600)", shadow: "none", ativos: 0 };
  }
}

const UrgenciaIndicator = React.memo(function UrgenciaIndicator({ nivel }: UrgenciaIndicatorProps) {
  const { color, shadow, ativos } = getUrgenciaConfig(nivel);

  return (
    <div style={{ display: "inline-flex", alignItems: "flex-end", gap: "3px", height: "18px" }}>
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: h,
            borderRadius: 2,
            background: i < ativos ? color : "var(--gray-600)",
            boxShadow: i < ativos ? shadow : "none",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
});

export default UrgenciaIndicator;
