import { supabase } from "@/lib/supabaseClient";
import type { Gasto } from "@/lib/gastosUtils";

export type { Gasto };

async function getUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Usuário não autenticado");
    return data.user;
}

const GASTO_COLS = "id, user_id, descricao, categoria, tipo, valor, data_inicio, total_parcelas, data_fim, created_at, updated_at";

export async function getGastos(): Promise<Gasto[]> {
    const user = await getUser();

    const { data, error } = await supabase
        .from("gastos")
        .select(GASTO_COLS)
        .eq("user_id", user.id)
        .order("data_inicio", { ascending: false });

    if (error) throw error;
    return data as Gasto[];
}

export async function addGasto(
    gasto: Omit<Gasto, "id" | "user_id" | "created_at" | "updated_at">
) {
    const user = await getUser();

    const { data, error } = await supabase
        .from("gastos")
        .insert([
            {
                ...gasto,
                user_id: user.id,
            },
        ])
        .select()
        .single();

    if (error) throw error;
    return data as Gasto;
}

export async function updateGasto(id: string, updates: Partial<Gasto>) {
    await getUser();

    const { data, error } = await supabase
        .from("gastos")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Gasto;
}

export async function deleteGasto(id: string) {
    await getUser();

    const { error } = await supabase.from("gastos").delete().eq("id", id);

    if (error) throw error;
    return true;
}

export async function encerrarGastoFixo(id: string, data_fim: string) {
    return updateGasto(id, { data_fim });
}
