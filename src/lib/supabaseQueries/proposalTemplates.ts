import { supabase } from "@/lib/supabaseClient";

export interface ProposalTemplatePayload {
  user_id: string;
  title: string;
  primary_color?: string;
  cover_image_url?: string;
  logo_url?: string;
  structure?: any;
}

export interface ProposalTemplateUpdate {
  title?: string;
  primary_color?: string;
  cover_image_url?: string;
  logo_url?: string;
  structure?: any;
}

export async function createTemplate(payload: ProposalTemplatePayload) {
  const { data, error } = await supabase
    .from("proposal_templates")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTemplates() {
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTemplate(id: string) {
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTemplate(
  id: string,
  updates: ProposalTemplateUpdate
) {
  const { data, error } = await supabase
    .from("proposal_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: string) {
  const { data, error } = await supabase
    .from("proposal_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return data;
}