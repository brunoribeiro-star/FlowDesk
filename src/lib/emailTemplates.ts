export function buildEmailHtml(opts: {
  headerSubtitle: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const { headerSubtitle, heading, body, cta, footerNote } = opts;

  const ctaHtml = cta
    ? `
    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:28px;">
      <tr>
        <td>
          <a href="${cta.url}"
             style="display:block;text-align:center;background:#1EB6E8;color:#06191F;text-decoration:none;
                    padding:14px 36px;border-radius:9px;font-weight:700;font-size:15px;letter-spacing:0.1px;">
            ${cta.label}
          </a>
        </td>
      </tr>
    </table>`
    : "";

  const footerNoteHtml = footerNote
    ? `<div style="margin-top:24px;font-size:13px;color:#6b7280;line-height:1.7;">${footerNote}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>FlowDesk</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:520px;background:#111113;border:1px solid #1f2937;border-radius:14px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d2a38 0%,#06191F 100%);padding:24px 32px;border-bottom:1px solid #1d3a4a;">
              <p style="margin:0;font-size:21px;font-weight:700;color:#1EB6E8;letter-spacing:-0.3px;">FlowDesk</p>
              <p style="margin:5px 0 0;font-size:12px;color:#4b7080;letter-spacing:0.2px;">${headerSubtitle}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f3f4f6;line-height:1.3;">${heading}</p>
              ${body}
              ${ctaHtml}
              ${footerNoteHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #1f2937;">
              <p style="margin:0;font-size:11px;color:#374151;">
                FlowDesk &mdash; Gestão de projetos para freelancers &amp; estúdios
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const p = `margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.65;`;
export const strong = `color:#e5e7eb;`;
