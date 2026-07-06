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

export async function syncPagamentosComValorProjeto(projetoId: string, novoValor: number | null | undefined) {
    if (novoValor == null || novoValor < 0) return;

    const user = await getUser();

    const { data: pagamentos, error } = await supabase
        .from("pagamentos")
        .select("id, valor, status, parcela")
        .eq("projeto_id", projetoId);

    if (error) throw error;
    if (!pagamentos || pagamentos.length === 0) return;

    const pago = pagamentos
        .filter((p) => p.status === "pago")
        .reduce((acc, p) => acc + Number(p.valor || 0), 0);

    const pendentes = pagamentos.filter((p) => p.status !== "pago");
    const pendenteAtual = pendentes.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const targetPendente = Math.max(0, novoValor - pago);

    if (Math.abs(pendenteAtual - targetPendente) < 0.01) return;

    if (pendentes.length === 0) {
        if (targetPendente <= 0) return;
        const maiorParcela = pagamentos.reduce((acc, p) => Math.max(acc, p.parcela || 0), 0);
        const { error: insertError } = await supabase.from("pagamentos").insert([
            {
                projeto_id: projetoId,
                user_id: user.id,
                valor: targetPendente,
                forma_pagamento: "pix",
                parcela: maiorParcela + 1,
                total_parcelas: maiorParcela + 1,
                tipo: "ajuste",
                status: "pendente",
                data_prevista: new Date().toISOString().slice(0, 10),
            },
        ]);
        if (insertError) throw insertError;
        return;
    }

    if (pendentes.length === 1) {
        const { error: updateError } = await supabase
            .from("pagamentos")
            .update({ valor: targetPendente })
            .eq("id", pendentes[0].id);
        if (updateError) throw updateError;
        return;
    }

    let acumulado = 0;
    for (let i = 0; i < pendentes.length; i++) {
        const isLast = i === pendentes.length - 1;
        let novoValorParcela: number;
        if (isLast) {
            novoValorParcela = Math.round((targetPendente - acumulado) * 100) / 100;
        } else {
            const proporcao = pendenteAtual > 0 ? Number(pendentes[i].valor || 0) / pendenteAtual : 1 / pendentes.length;
            novoValorParcela = Math.round(targetPendente * proporcao * 100) / 100;
            acumulado += novoValorParcela;
        }
        const { error: updateError } = await supabase
            .from("pagamentos")
            .update({ valor: novoValorParcela })
            .eq("id", pendentes[i].id);
        if (updateError) throw updateError;
    }
}