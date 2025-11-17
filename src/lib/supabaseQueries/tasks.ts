import { supabase } from "@/lib/supabaseClient";

export type TaskStatus = "para_fazer" | "em_andamento" | "concluida";

export interface Task {
  id: string;
  user_id: string | null;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
  concluida: boolean | null;
}

export interface NovaTask {
  titulo: string;
  descricao?: string | null;
  projeto_id: string;
  due_date?: string | null;
}

export async function addTask(task: NovaTask): Promise<Task> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      projeto_id: task.projeto_id,
      titulo: task.titulo,
      descricao: task.descricao ?? null,
      due_date: task.due_date ?? null,
      status: "para_fazer",
      concluida: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, "titulo" | "descricao" | "status" | "due_date" | "concluida">>
): Promise<Task> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}