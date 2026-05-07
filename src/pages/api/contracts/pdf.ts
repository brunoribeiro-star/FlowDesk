import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: { sizeLimit: "4mb" }, responseLimit: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function buildHtml(content: string, fontFamily: string = "times"): string {
  const face = fontFamily === "arial" ? "'Arial', Helvetica, sans-serif" : "'Times New Roman', Times, serif";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #111; }
  body {
    font-family: ${face};
    font-size: 12pt;
    line-height: 1.85;
    padding: 72px 80px;
    max-width: 820px;
    margin: 0 auto;
  }
  h1 { font-size: 18pt; font-weight: 700; text-align: center; margin: 0 0 28px; text-transform: uppercase; letter-spacing: 0.04em; }
  h2 { font-size: 13pt; font-weight: 700; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.03em; }
  h3 { font-size: 12pt; font-weight: 700; margin: 18px 0 6px; }
  p { margin-bottom: 12px; text-align: justify; }
  ul, ol { margin: 8px 0 12px 24px; }
  li { margin-bottom: 4px; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  s { text-decoration: line-through; }
  hr { border: none; border-top: 1px solid #aaa; margin: 28px 0; }
  blockquote { border-left: 3px solid #aaa; padding-left: 16px; margin: 16px 0; color: #444; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-justify { text-align: justify; }
</style>
</head>
<body>${content}</body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Sessão inválida." });

  const { content, titulo, fontFamily } = req.body as { content?: string; titulo?: string; fontFamily?: string };
  if (!content) return res.status(400).json({ error: "content é obrigatório." });

  const htmlDoc = buildHtml(content, fontFamily);
  let browser: any = null;

  try {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const chromium = await import("@sparticuz/chromium").catch(() => null);
      const puppeteerCore = await import("puppeteer-core").catch(() => null);
      if (!chromium || !puppeteerCore) throw new Error("@sparticuz/chromium required in production");
      browser = await puppeteerCore.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });
    } else {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    await page.setContent(htmlDoc, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();
    browser = null;

    const slug = (titulo ?? "contrato").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}.pdf"`);
    return res.status(200).send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    if (browser) { try { await browser.close(); } catch {} }
    return res.status(500).json({ error: "Erro ao gerar PDF." });
  }
}
