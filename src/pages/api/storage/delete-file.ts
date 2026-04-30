import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function extractPath(url: string, bucket: string): string | null {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { file_id, url } = req.body as { file_id: string; url: string };
  if (!file_id || !url) return res.status(400).json({ error: "file_id e url são obrigatórios" });

  // Verifica que o arquivo pertence ao usuário (via projeto)
  const { data: arquivo } = await supabase
    .from("arquivos_projeto")
    .select("id, projeto_id, projetos!inner(user_id, status)")
    .eq("id", file_id)
    .maybeSingle();

  if (!arquivo) return res.status(404).json({ error: "Arquivo não encontrado" });
  if ((arquivo.projetos as any).user_id !== user.id) return res.status(403).json({ error: "Sem permissão" });
  const NON_ACTIVE = ["finalizado", "arquivado", "concluído", "concluido"];
  if (!NON_ACTIVE.includes((arquivo.projetos as any).status)) return res.status(400).json({ error: "Apenas arquivos de projetos finalizados ou arquivados podem ser excluídos aqui" });

  // Remove do storage
  const path = extractPath(url, "projetos");
  if (path) {
    await supabase.storage.from("projetos").remove([path]);
  }

  // Remove do banco
  const { error: delError } = await supabase
    .from("arquivos_projeto")
    .delete()
    .eq("id", file_id);

  if (delError) return res.status(500).json({ error: delError.message });

  return res.status(200).json({ ok: true });
}
