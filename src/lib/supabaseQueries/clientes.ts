import { supabase  } from "@/lib/supabaseClient";

export interface Cliente {
    id: string;
    user_id: string;
    nome: string;
    empresa?: string;
    email?: string;
    telefone?: string;
    observacoes?: string;
    created_at: string;
}

export async function getClientes(): Promise<Cliente[]> {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Cliente[];
}

export async function addCliente(cliente: Omit<Cliente, "id" | "user_id" | "created_at">) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
        .from("clientes")
        .insert([
            {
                user_id: user.id,
                nome: cliente.nome,
                empresa: cliente.empresa || null,
                email: cliente.email || null,
                telefone: cliente.telefone || null,
                observacoes: cliente.observacoes || null,
            },
        ])
        .select()
        .single();

    if (error) throw error;
    return data as Cliente;
}

export async function updateCliente(id: string, updates: Partial<Cliente>) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Usuário não auntenticado.");

    const { data, error } = await supabase
        .from("clientes")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

    if (error) throw error;
    return data as Cliente;
}

export async function deleteCliente(id: string) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) throw error;
    return true;
}