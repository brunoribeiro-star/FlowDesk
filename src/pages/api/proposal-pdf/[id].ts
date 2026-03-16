import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createPrintToken } from "@/lib/printToken";
import { PDFDocument } from "pdf-lib";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = req.query.id as string;

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!accessToken) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: "Sessão inválida." });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("id, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (proposalError || !proposal) {
    return res.status(404).json({ error: "Proposta não encontrada." });
  }

  const printToken = createPrintToken(id);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`);

  const printUrl = `${baseUrl}/propostas/print/${id}?token=${printToken}`;

  let browser: any = null;
  try {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const chromium = await import("@sparticuz/chromium").catch(() => null);
      const puppeteerCore = await import("puppeteer-core").catch(() => null);
      if (!chromium || !puppeteerCore) {
        throw new Error(
          "@sparticuz/chromium and puppeteer-core are required in production"
        );
      }
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

    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    await page.goto(printUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
        )
      )
    );

    const sections = await page.$$(".pdf-section");

    if (sections.length === 0) {
      throw new Error("No .pdf-section elements found on the print page");
    }

    const screenshots: Buffer[] = [];

    for (const section of sections) {
      const box = await section.boundingBox();
      if (!box) continue;

      const screenshotBuffer = await section.screenshot({
        type: "png",
        omitBackground: false,
      });

      screenshots.push(Buffer.from(screenshotBuffer as Buffer));
    }

    await browser.close();
    browser = null;

    const pdfDoc = await PDFDocument.create();

    for (const shot of screenshots) {
      const pngImage = await pdfDoc.embedPng(shot);
      const { width, height } = pngImage;
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="proposta-${proposal.title
        .toLowerCase()
        .replace(/\s+/g, "-")}.pdf"`
    );
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("Erro ao gerar PDF com Puppeteer:", err);
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    res.status(500).json({ error: "Erro ao gerar PDF." });
  }
}
