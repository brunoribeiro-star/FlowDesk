import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: { sizeLimit: "4mb" }, responseLimit: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Sessão inválida." });

  const { content, titulo, fontFamily } = req.body as { content?: string; titulo?: string; fontFamily?: string };
  if (!content) return res.status(400).json({ error: "content é obrigatório." });

  const face = fontFamily === "arial" ? "'Arial', Helvetica, sans-serif" : "'Times New Roman', Times, serif";

  try {
    const HTMLtoDOCX = require("html-to-docx");

    const htmlDoc = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body { font-family: ${face}; font-size: 12pt; line-height: 1.85; }
h1 { font-size: 18pt; text-align: center; text-transform: uppercase; margin-bottom: 24px; }
h2 { font-size: 13pt; text-transform: uppercase; margin: 20px 0 8px; }
h3 { font-size: 12pt; margin: 16px 0 6px; }
p { margin-bottom: 10px; text-align: justify; }
</style></head><body>${content}</body></html>`;

    const fileBuffer = await HTMLtoDOCX(htmlDoc, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    });

    const slug = (titulo ?? "contrato").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}.docx"`);
    return res.status(200).send(fileBuffer);
  } catch (err) {
    console.error("Erro ao gerar DOCX:", err);
    return res.status(500).json({ error: "Erro ao gerar DOCX." });
  }
}
