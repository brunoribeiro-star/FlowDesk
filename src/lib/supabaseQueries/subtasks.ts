import { supabase } from "@/lib/supabaseClient";

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  concluida: boolean;
  created_at: string;
}

export type NovaSubtask = {
  task_id: string;
  titulo: string;
  descricao?: string | null;
};

export type UpdateSubtask = Partial<Omit<Subtask, "id" | "user_id" | "created_at">>;

export async function getSubtasksByTask(task_id: string): Promise<Subtask[]> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("subtasks")
    .select("*")
    .eq("task_id", task_id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Subtask[];
}

export async function getSubtask(id: string): Promise<Subtask | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("subtasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) throw error;
  return data as Subtask;
}

export async function addSubtask(subtask: NovaSubtask): Promise<Subtask> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("subtasks")
    .insert([
      {
        task_id: subtask.task_id,
        user_id: user.id,
        titulo: subtask.titulo,
        descricao: subtask.descricao ?? null,
        concluida: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Subtask;
}

export async function updateSubtask(id: string, updates: UpdateSubtask): Promise<Subtask> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("subtasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Subtask;
}

export async function toggleSubtaskStatus(id: string) {
  const subtask = await getSubtask(id);
  if (!subtask) throw new Error("Subtask não encontrada.");

  const novoStatus = !subtask.concluida;

  return updateSubtask(id, { concluida: novoStatus });
}

export async function deleteSubtask(id: string) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const { error } = await supabase
    .from("subtasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  return true;
}