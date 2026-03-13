import React from "react";

interface UrgenciaIndicatorProps {
  nivel: string;
}

function getUrgenciaColor(nivel: string): string {
  switch (nivel) {
    case "Muito urgente":
    case "Vencida": return "bg-rose-400";
    case "Urgente":  return "bg-amber-400";
    case "Normal":   return "bg-sky-400";
    case "Baixa":    return "bg-emerald-400";
    default:         return "bg-gray-600";
  }
}

function getAtivos(nivel: string): number {
  switch (nivel) {
    case "Muito urgente":
    case "Vencida": return 4;
    case "Urgente": return 3;
    case "Normal":  return 2;
    case "Baixa":   return 1;
    default:        return 0;
  }
}

const UrgenciaIndicator = React.memo(function UrgenciaIndicator({ nivel }: UrgenciaIndicatorProps) {
  const total = 4;
  const ativos = getAtivos(nivel);
  const colorClass = getUrgenciaColor(nivel);

  return (
    <div className="flex items-end gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${i < ativos ? colorClass : "bg-gray-600"}`}
          style={{ height: 6 + i * 3 }}
        />
      ))}
    </div>
  );
});

export default UrgenciaIndicator;
