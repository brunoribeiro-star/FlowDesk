import { supabase } from "@/lib/supabaseClient";

export interface Projeto {
    id: string;
    user_id: string;
    cliente_id: string | null;
    titulo: string;
    descricao?: string;
    status: string;
    orcamento?: number;
    prazo_entrega?: string;
    created_at: string;
    completed_at?: string | null;
}

export async function getProjetos(): Promise<Projeto[]> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
        .from("projetos")
        .select("id, user_id, cliente_id, titulo, descricao, status, orcamento, prazo_entrega, created_at, completed_at, data_inicio, cover_url, progresso")
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
            orcamento: projeto.orcamento,
            prazo_entrega: projeto.prazo_entrega,
        },
    ]);

    if (error) throw error;
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

export async function duplicateProjeto(id: string): Promise<string> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Usuário não autenticado.");

    const { data: original, error: fetchError } = await supabase
        .from("projetos")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (fetchError || !original) throw new Error("Projeto não encontrado.");

    const { data: novoProjeto, error: insertError } = await supabase
        .from("projetos")
        .insert({
            user_id: user.id,
            cliente_id: original.cliente_id,
            titulo: `${original.titulo} (Cópia)`,
            descricao: original.descricao,
            status: "em_andamento",
            orcamento: original.orcamento,
            prazo_entrega: original.prazo_entrega,
            forma_pagamento: original.forma_pagamento,
            data_inicio: original.data_inicio,
        })
        .select("id")
        .single();

    if (insertError || !novoProjeto) throw new Error("Erro ao duplicar projeto.");

    const novoId = novoProjeto.id;

    const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("projeto_id", id);

    if (tasks && tasks.length > 0) {
        for (const task of tasks) {
            const { data: novaTask } = await supabase
                .from("tasks")
                .insert({
                    user_id: user.id,
                    projeto_id: novoId,
                    titulo: task.titulo,
                    descricao: task.descricao,
                    status: "para_fazer",
                    due_date: task.due_date,
                    concluida: false,
                })
                .select("id")
                .single();

            if (!novaTask) continue;

            const { data: subtasks } = await supabase
                .from("subtasks")
                .select("*")
                .eq("task_id", task.id);

            if (subtasks && subtasks.length > 0) {
                await supabase.from("subtasks").insert(
                    subtasks.map((s: any) => ({
                        user_id: user.id,
                        task_id: novaTask.id,
                        titulo: s.titulo,
                        descricao: s.descricao,
                        concluida: false,
                    }))
                );
            }
        }
    }

    return novoId;
}