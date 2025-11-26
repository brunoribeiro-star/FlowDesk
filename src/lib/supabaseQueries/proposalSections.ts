import { supabase } from "@/lib/supabaseClient";

export type SectionType =
    | "title"
    | "subtitle"
    | "text"
    | "list"
    | "image"
    | "html";

export interface ProposalSectionPayload {
    proposal_id: string;
    page: number;
    order: number;
    type: SectionType;
    editable?: boolean;
    content: any;
}

export interface ProposalSectionUpdate {
    page?: number;
    order?: number;
    type?: SectionType;
    editable?: boolean;
    content: any;
}

export async function addSection(payload: ProposalSectionPayload) {
    const { data, error } = await supabase
        .from("proposal_sections")
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getSectionsByProposal(proposalId: string) {
    const { data, error } = await supabase
        .from("proposal_sections")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("page", { ascending: true })
        .order("order", {ascending: true });

    if (error) throw error;
    return data;
}

export async function updateSection(
  sectionId: string,
  updates: ProposalSectionUpdate
) {
  const { data, error } = await supabase
    .from("proposal_sections")
    .update(updates)
    .eq("id", sectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSection(sectionId: string) {
    const { data, error } = await supabase
        .from("proposal_sections")
        .delete()
        .eq("id", sectionId);

    if (error) throw error;
    return data;
}