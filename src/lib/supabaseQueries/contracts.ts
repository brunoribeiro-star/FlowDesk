import { supabase } from "@/lib/supabaseClient";

export async function getContractTemplates(userId: string) {
  return supabase
    .from("contract_templates")
    .select("id, titulo, variables, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function getContractTemplate(id: string) {
  return supabase
    .from("contract_templates")
    .select("*")
    .eq("id", id)
    .single();
}

export async function addContractTemplate(data: {
  user_id: string;
  titulo: string;
  content: string;
  variables: string[];
}) {
  return supabase.from("contract_templates").insert(data).select().single();
}

export async function updateContractTemplate(
  id: string,
  data: { titulo?: string; content?: string; variables?: string[] }
) {
  return supabase
    .from("contract_templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

export async function deleteContractTemplate(id: string) {
  return supabase.from("contract_templates").delete().eq("id", id);
}

export async function getContracts(userId: string) {
  return supabase
    .from("contracts")
    .select("id, titulo, variables_data, content, created_at, template_id, contract_templates(titulo)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function addContract(data: {
  user_id: string;
  template_id: string | null;
  cliente_id: string | null;
  titulo: string;
  variables_data: Record<string, string>;
  content: string;
}) {
  return supabase.from("contracts").insert(data).select().single();
}

export async function deleteContract(id: string) {
  return supabase.from("contracts").delete().eq("id", id);
}
