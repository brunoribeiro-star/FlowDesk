import { supabase } from "@/lib/supabaseClient";

export type AdiantamentoStatus = "solicitado" | "aprovado" | "recusado" | "pago" | "cancelado";
export type PixTipo = "email" | "telefone" | "cpf_cnpj" | "aleatoria";

export interface Adiantamento {
  id: string;
  projeto_id: string;
  user_id: string;
  valor: number;
  motivo: string;
  status: AdiantamentoStatus;
  feedback_cliente: string | null;
  pix_chave: string | null;
  pix_tipo: PixTipo | null;
  solicitado_em: string;
  respondido_em: string | null;
  pago_em: string | null;
  created_at: string;
  updated_at: string;
}

const COLS = "id, projeto_id, user_id, valor, motivo, status, feedback_cliente, pix_chave, pix_tipo, solicitado_em, respondido_em, pago_em, created_at, updated_at";

export async function getAdiantamentosByProjeto(projeto_id: string): Promise<Adiantamento[]> {
  const { data, error } = await supabase
    .from("adiantamentos")
    .select(COLS)
    .eq("projeto_id", projeto_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Adiantamento[];
}

export async function getAdiantamentosPendentesCliente(projectIds: string[]): Promise<(Adiantamento & { projetos: { titulo: string } | null })[]> {
  if (!projectIds.length) return [];
  const { data, error } = await supabase
    .from("adiantamentos")
    .select(`${COLS}, projetos:projeto_id(titulo)`)
    .in("projeto_id", projectIds)
    .eq("status", "solicitado")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}
