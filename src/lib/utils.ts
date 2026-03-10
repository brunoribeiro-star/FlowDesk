export function jsonToPlainText(json: any): string {
  try {
    if (!json) return "";
    if (typeof json === "string") {
      try { json = JSON.parse(json); } catch { return json; }
    }
    if (!json?.content) return "";
    const parts: string[] = [];
    const walk = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (typeof node === "object") {
        if (typeof node.text === "string") parts.push(node.text);
        if (node.content) walk(node.content);
      }
    };
    walk(json.content);
    return parts.join(" ").trim();
  } catch {
    return "";
  }
}

export function formatarDataCurta(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatarData(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function tempoRelativo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras > 1 ? "s" : ""}`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 30) return `há ${diffDias} dia${diffDias > 1 ? "s" : ""}`;
  const diffMeses = Math.floor(diffDias / 30);
  return `há ${diffMeses} mês${diffMeses > 1 ? "es" : ""}`;
}

export function calcularUrgencia(due_date: string | null): string {
  if (!due_date) return "Sem prioridade";
  const hoje = new Date();
  const limite = new Date(due_date + "T00:00:00");
  const dias = (limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
  if (dias < 0) return "Vencida";
  if (dias <= 1) return "Muito urgente";
  if (dias <= 2) return "Urgente";
  if (dias <= 7) return "Normal";
  return "Baixa";
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // fallback 1 MB

export function validateImageFile(file: File, spec?: { label: string; maxKB: number }): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Envie uma imagem nos formatos PNG, JPEG ou WebP.";
  }
  const limitBytes = spec ? spec.maxKB * 1024 : MAX_IMAGE_SIZE_BYTES;
  if (file.size > limitBytes) {
    const sizeKB = (file.size / 1024).toFixed(0);
    const label = spec ? spec.label.toLowerCase() : "imagem";
    const limitKB = spec ? spec.maxKB : Math.round(MAX_IMAGE_SIZE_BYTES / 1024);
    return `Imagem muito grande (${sizeKB} KB) para ${label}. Tamanho máximo: ${limitKB} KB. Use o conversor para otimizá-la.`;
  }
  return null;
}

