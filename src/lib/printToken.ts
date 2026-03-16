import crypto from "crypto";

const SECRET =
  process.env.PRINT_TOKEN_SECRET ||
  "flowdesk-print-default-secret-change-in-prod";

export function createPrintToken(proposalId: string): string {
  const ts = Date.now().toString();
  const payload = `${proposalId}|${ts}`;
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");
  const full = `${payload}|${sig}`;
  return Buffer.from(full).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function validatePrintToken(
  token: string,
  proposalId: string
): boolean {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const decoded = Buffer.from(padded + "=".repeat(padLen), "base64").toString("utf8");

    const parts = decoded.split("|");
    if (parts.length !== 3) return false;

    const [pid, tsStr, sig] = parts;
    if (pid !== proposalId) return false;

    const ts = parseInt(tsStr, 10);
    if (isNaN(ts) || Date.now() - ts > 120_000) return false;

    const payload = `${pid}|${tsStr}`;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}
