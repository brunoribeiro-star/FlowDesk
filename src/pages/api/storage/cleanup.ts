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
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).end();

  const secret = req.headers.authorization?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Projetos finalizados há mais de 30 dias
  const { data: expiredProjects, error: projError } = await supabase
    .from("projetos")
    .select("id, user_id")
    .in("status", ["finalizado", "arquivado", "concluído", "concluido"])
    .not("completed_at", "is", null)
    .lte("completed_at", thirtyDaysAgo);

  if (projError) return res.status(500).json({ error: projError.message });
  if (!expiredProjects?.length) return res.status(200).json({ deleted: 0 });

  const projectIds = expiredProjects.map((p: any) => p.id);

  // Busca os arquivos desses projetos
  const { data: arquivos } = await supabase
    .from("arquivos_projeto")
    .select("id, url")
    .in("projeto_id", projectIds);

  let deletedFiles = 0;

  if (arquivos?.length) {
    // Agrupa paths por bucket
    const projetosPaths: string[] = [];
    for (const f of arquivos) {
      const path = extractPath(f.url, "projetos");
      if (path) projetosPaths.push(path);
    }

    if (projetosPaths.length) {
      await supabase.storage.from("projetos").remove(projetosPaths);
    }

    // Remove registros do banco
    const { count } = await supabase
      .from("arquivos_projeto")
      .delete({ count: "exact" })
      .in("projeto_id", projectIds);

    deletedFiles = count ?? 0;
  }

  // Remove capas dos projetos
  for (const p of expiredProjects) {
    const { data: proj } = await supabase
      .from("projetos")
      .select("cover_url")
      .eq("id", p.id)
      .maybeSingle();

    if (proj?.cover_url) {
      const path = extractPath(proj.cover_url, "project-covers");
      if (path) await supabase.storage.from("project-covers").remove([path]);
    }
  }

  return res.status(200).json({ deleted: deletedFiles, projects: projectIds.length });
}
