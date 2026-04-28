import { supabase } from "@/lib/supabaseClient";

export interface Pagamento {
    id: string;
    projeto_id: string;
    user_id: string;
    valor: number;
    forma_pagamento: "pix" | "pix_2x" | "cartao";
    parcela: number;
    total_parcelas: number;
    tipo: string;
    status: "pago" | "pendente";
    data_pagamento: string | null;
    data_prevista: string | null;
    created_at: string;
}

async function getUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Usuário não autenticado");
    return data.user;
}

const PAGAMENTO_COLS = "id, projeto_id, user_id, valor, forma_pagamento, parcela, total_parcelas, tipo, status, data_pagamento, data_prevista, pix_chave, notificado_em, created_at";

export async function getPagamentos(): Promise<Pagamento[]> {
    const user = await getUser();

    const { data, error } = await supabase
        .from("pagamentos")
        .select(PAGAMENTO_COLS)
        .eq("user_id", user.id)
        .order("data_prevista", { ascending: true });

    if (error) throw error;
    return data as Pagamento[];
}

export async function getPagamentosByProjeto(projeto_id: string): Promise<Pagamento[]>{
    await getUser();

    const { data, error } = await supabase
        .from("pagamentos")
        .select(PAGAMENTO_COLS)
        .eq("projeto_id", projeto_id)
        .order("parcela", { ascending: true });

    if (error) throw error;
    return data as Pagamento[];
}

export async function addPagamento(
    pagamento: Omit<Pagamento, "id" | "created_at" | "user_id">
) {
    const user = await getUser();

    const { data, error } = await supabase
        .from("pagamentos")
        .insert([
            {
                ...pagamento,
                user_id: user.id,
            },
        ])
        .select()
        .single();

    if (error) throw error;
    return data as Pagamento;
}

export async function updatePagamento(id: string, updates: Partial<Pagamento>) {
    const user = await getUser();

    const { data, error } = await supabase
        .from("pagamentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Pagamento;
}

export async function deletePagamento(id: string) {
    const user = await getUser();

    const { error } = await supabase.from("pagamentos").delete().eq("id", id);

    if (error) throw error;
    return true;
}