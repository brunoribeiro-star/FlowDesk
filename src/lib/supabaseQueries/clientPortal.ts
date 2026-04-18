import { supabase } from "@/lib/supabaseClient";

export async function getPortalProject(projectId: string) {
  const { data, error } = await supabase
    .from("projetos")
    .select("id, titulo, descricao, status, prazo_entrega, data_inicio, progresso, cover_url")
    .eq("id", projectId)
    .single();
  return { data, error };
}

export async function getPortalTasks(projectId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, titulo, status, concluida, due_date, subtasks(id, titulo, concluida)")
    .eq("projeto_id", projectId)
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

export async function getPortalFiles(projectId: string) {
  const { data, error } = await supabase
    .from("arquivos_projeto")
    .select("id, nome, url, status, created_at")
    .eq("projeto_id", projectId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function getPortalLinks(projectId: string) {
  const { data, error } = await supabase
    .from("links_projeto")
    .select("id, titulo, url, created_at")
    .eq("projeto_id", projectId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function getPortalBriefings(projectId: string) {
  const { data, error } = await supabase
    .from("briefings_envios")
    .select(`
      id, status, enviado_em, respondido_em, prazo_resposta,
      briefings_templates(id, titulo, descricao),
      briefings_respostas(id, pergunta, resposta)
    `)
    .eq("projeto_id", projectId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function getPortalBriefingCampos(templateId: string) {
  const { data, error } = await supabase
    .from("briefings_campos")
    .select("id, titulo_pergunta, descricao_pergunta, tipo, obrigatorio, opcoes, placeholder, ordem")
    .eq("template_id", templateId)
    .order("ordem", { ascending: true });
  return { data: data ?? [], error };
}

export async function getPortalEntregaveis(projectId: string) {
  const { data, error } = await supabase
    .from("entregaveis")
    .select("id, titulo, descricao, url, arquivo_url, arquivo_tipo, arquivos, status, feedback_cliente, feedback_imagem_url, feedback_pins, feedback_imagens, reviewed_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function getPortalPayments(projectId: string) {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, valor, status, data_prevista, forma_pagamento, parcela, total_parcelas")
    .eq("projeto_id", projectId)
    .order("data_prevista", { ascending: true });
  return { data: data ?? [], error };
}

export async function updateEntregavelStatus(
  id: string,
  status: "aprovado" | "para_alteracao",
  feedback: string,
  feedbackImagemUrl?: string | null,
  feedbackPins?: Array<{ xPct: number; yPct: number; text: string }> | null,
  feedbackImagens?: Array<{ url: string; pins: Array<{ xPct: number; yPct: number; text: string }> }> | null
) {
  const { error } = await supabase
    .from("entregaveis")
    .update({
      status,
      feedback_cliente: feedback || null,
      feedback_imagem_url: feedbackImagemUrl ?? null,
      feedback_pins: feedbackPins ?? null,
      feedback_imagens: feedbackImagens ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  return { error };
}

export async function submitBriefingResposta(
  envioId: string,
  projectId: string,
  respostas: { pergunta: string; resposta: string }[]
) {
  const rows = respostas.map((r) => ({
    envio_id: envioId,
    projeto_id: projectId,
    pergunta: r.pergunta,
    resposta: r.resposta,
  }));

  const { error } = await supabase.from("briefings_respostas").insert(rows);

  if (!error) {
    await supabase
      .from("briefings_envios")
      .update({ status: "respondido", respondido_em: new Date().toISOString() })
      .eq("id", envioId);
  }

  return { error };
}

export async function getClientProjects(userId: string) {
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id, projetos:project_id(id, titulo, status, progresso, prazo_entrega, data_inicio, cover_url)")
    .eq("user_id", userId)
    .eq("role", "cliente");
  return { data: data ?? [], error };
}

export async function getClientAllEntregaveis(projectIds: string[]) {
  if (!projectIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("entregaveis")
    .select("id, titulo, descricao, url, arquivo_url, arquivo_tipo, arquivos, status, feedback_cliente, feedback_imagem_url, reviewed_at, created_at, project_id, projetos:project_id(titulo)")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function getClientAllBriefings(projectIds: string[]) {
  if (!projectIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("briefings_envios")
    .select(`id, status, enviado_em, respondido_em, prazo_resposta, projeto_id, projetos:projeto_id(titulo), briefings_templates(id, titulo), briefings_respostas(id, pergunta, resposta)`)
    .in("projeto_id", projectIds)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function getClientAllPagamentos(projectIds: string[]) {
  if (!projectIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, valor, status, data_prevista, forma_pagamento, parcela, total_parcelas, projeto_id, projetos:projeto_id(titulo)")
    .in("projeto_id", projectIds)
    .order("data_prevista", { ascending: true });
  return { data: data ?? [], error };
}

export async function getClientActivities(projectIds: string[]) {
  if (!projectIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("atividades")
    .select("id, tipo, descricao, created_at, projeto_id, projetos:projeto_id(titulo)")
    .in("projeto_id", projectIds)
    .order("created_at", { ascending: false })
    .limit(40);
  return { data: data ?? [], error };
}

export async function getClientDashboardStats(projectIds: string[]) {
  if (!projectIds.length) {
    return { entregaveis: [], briefings: [], pagamentos: [], tasks: [] };
  }
  const [
    { data: entregaveis },
    { data: briefings },
    { data: pagamentos },
    { data: tasks },
  ] = await Promise.all([
    supabase.from("entregaveis").select("project_id, status").in("project_id", projectIds),
    supabase.from("briefings_envios").select("projeto_id, status, respondido_em").in("projeto_id", projectIds),
    supabase.from("pagamentos").select("projeto_id, status").in("projeto_id", projectIds),
    supabase.from("tasks").select("projeto_id, status, concluida, subtasks(id, concluida)").in("projeto_id", projectIds),
  ]);
  return {
    entregaveis: entregaveis ?? [],
    briefings: briefings ?? [],
    pagamentos: pagamentos ?? [],
    tasks: tasks ?? [],
  };
}
