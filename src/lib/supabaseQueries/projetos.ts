import { supabase } from "@/lib/supabaseClient";

export interface Projeto {
    id: string;
    user_id: string;
    cliente_id: string | null;
    titulo: string;
    descricao?: string;
    status: string;
    valor?: number;
    prazo_entrega?: string;
    created_at: string;
}

export async function getProjetos(): Promise<Projeto[]> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if  (userError || !user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
        .from("projetos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Projeto[];
}

export async function addProjeto(projeto: Omit<Projeto, "id" | "user_id" | "created_at">) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase.from("projetos").insert([
        {
            user_id: user.id,
            cliente_id: projeto.cliente_id,
            titulo: projeto.titulo,
            descricao: projeto.descricao,
            status: projeto.status || "Em andamento",
            valor: projeto.valor,
            prazo_entrega: projeto.prazo_entrega,
        },
    ]);

    if (userError) throw error;
}

export async function updateProjeto(id: string, updates: Partial<Projeto>) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
        .from("projetos")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

        if (error) throw error;
}

export async function deleteProjeto(id: string) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
        .from("projetos")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) throw error;
}