import { supabase } from "@/lib/supabaseClient";

export type ProposalStatus =
  | "analisando"
  | "negociando"
  | "aceita"
  | "recusada"
  | "em_espera";

export interface ProposalPayload {
  user_id: string;
  template_id?: string | null;
  client_id?: string | null;

  title?: string;
  status?: ProposalStatus;
  due_date?: string | null;
  value?: number | null;

  description?: any;

  primary_color?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;

  pdf_url?: string | null;
}

export interface ProposalUpdate {
  title?: string;
  status?: ProposalStatus;
  due_date?: string | null;
  value?: number | null;

  description?: any;

  primary_color?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;

  pdf_url?: string | null;
}

export async function createProposal(payload: ProposalPayload) {
  const { data, error } = await supabase
    .from("proposals")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

const PROPOSAL_COLS = "id, user_id, template_id, client_id, title, status, due_date, value, description, primary_color, banner_url, logo_url, pdf_url, created_at";

export async function getProposals() {
  const { data, error } = await supabase
    .from("proposals")
    .select(PROPOSAL_COLS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProposal(id: string) {
  const { data, error } = await supabase
    .from("proposals")
    .select(PROPOSAL_COLS)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProposal(id: string, updates: ProposalUpdate) {
  const { data, error } = await supabase
    .from("proposals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus
) {
  const { data, error } = await supabase
    .from("proposals")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProposal(id: string) {
  const { data, error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return data;
}