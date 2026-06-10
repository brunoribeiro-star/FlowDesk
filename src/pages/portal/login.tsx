import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";

type Step = "form" | "sent" | "verifying_otp" | "error";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpValue = otp.join("");
  const otpComplete = otpValue.length === 6;

  useEffect(() => {
    if (otpComplete && step === "sent") {
      handleVerifyOtp();
    }
  }, [otpComplete, otpValue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/portal/send-access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.error === "not_found" || res.status === 404) {
          setErrorMsg(
            "Nenhum portal encontrado para este e-mail. Verifique se é o mesmo e-mail que seu contato usou para convidá-lo."
          );
        } else {
          setErrorMsg("Não foi possível enviar o código. Tente novamente.");
        }
        setStep("error");
        return;
      }

      setOtp(["", "", "", "", "", ""]);
      setOtpError(null);
      setStep("sent");
    } catch {
      setErrorMsg("Erro de conexão. Verifique sua internet e tente novamente.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length !== 6) return;

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/portal/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token: code }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setOtpError(json.error || "Código inválido ou expirado.");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        return;
      }

      window.location.href = json.magicLink;
    } catch {
      setOtpError("Erro de conexão. Tente novamente.");
    } finally {
      setOtpLoading(false);
    }
  }

  function handleOtpChange(idx: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setOtpError(null);
    if (digit && idx < 5) {
      setTimeout(() => otpRefs.current[idx + 1]?.focus(), 0);
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (otp[idx]) {
        const next = [...otp];
        next[idx] = "";
        setOtp(next);
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const next = [...otp];
      for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
      setOtp(next);
      const focusIdx = Math.min(pasted.length, 5);
      setTimeout(() => otpRefs.current[focusIdx]?.focus(), 0);
      e.preventDefault();
    }
  }

  function handleResend() {
    setOtp(["", "", "", "", "", ""]);
    setOtpError(null);
    setStep("form");
    setErrorMsg(null);
  }

  return (
    <>
      <Head>
        <title>Acessar portal do cliente — FlowDesk</title>
      </Head>

      <AuthBackground>
        <AuthCard>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
            <span className="auth-logo-wrap"><Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority /></span>
          </div>

          {step === "sent" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: "46px",
                    height: "46px",
                    borderRadius: "50%",
                    border: "1px solid var(--gray-600)",
                    color: "var(--gray-300)",
                    background: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary-500)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--primary-300)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gray-600)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--gray-300)";
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "19px",
                      fontWeight: 600,
                      color: "var(--gray-200)",
                    }}
                  >
                    Verifique seu e-mail
                  </h1>
                  <p style={{ margin: "3px 0 0", fontSize: "13px", color: "var(--gray-500)" }}>
                    Código enviado para{" "}
                    <strong style={{ color: "var(--gray-300)", fontWeight: 600 }}>{email.trim()}</strong>
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--gray-200)" }}>
                  Digite o código de 6 dígitos
                </label>

                <div
                  style={{ display: "flex", gap: "8px" }}
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      style={{
                        flex: 1,
                        aspectRatio: "1",
                        textAlign: "center",
                        fontSize: "22px",
                        fontWeight: 700,
                        borderRadius: "14px",
                        border: `1px solid ${otpError ? "var(--error-medium)" : digit ? "var(--primary-500)" : "var(--gray-600)"}`,
                        background: "var(--primary-900)",
                        color: "var(--gray-100)",
                        outline: "none",
                        transition: "border-color 0.18s",
                      }}
                    />
                  ))}
                </div>

                {otpError && (
                  <p style={{ fontSize: "13px", color: "var(--error-medium)", margin: 0 }}>{otpError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!otpComplete || otpLoading}
                style={{
                  height: "58px",
                  fontFamily: "inherit",
                  fontSize: "16.5px",
                  fontWeight: 700,
                  color: !otpComplete || otpLoading ? "var(--primary-400)" : "var(--primary-900)",
                  cursor: !otpComplete || otpLoading ? "not-allowed" : "pointer",
                  border: "none",
                  borderRadius: "14px",
                  background: !otpComplete || otpLoading
                    ? "var(--primary-700)"
                    : "linear-gradient(180deg, var(--primary-400), var(--primary-500))",
                  boxShadow: !otpComplete || otpLoading ? "none" : "0 16px 34px -14px color-mix(in srgb, var(--primary-500) 85%, transparent)",
                  transition: "all 0.2s",
                }}
              >
                {otpLoading ? "Verificando..." : "Entrar"}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--gray-600)", margin: 0 }}>
                  Ou{" "}
                  <span style={{ color: "var(--gray-500)" }}>clique no link enviado no e-mail</span>{" "}
                  para entrar sem digitar o código.
                </p>
                <p style={{ fontSize: "12px", color: "var(--gray-600)", margin: 0 }}>
                  Não recebeu?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    style={{
                      color: "var(--primary-400)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "inherit",
                      textDecoration: "underline",
                    }}
                  >
                    Reenviar código
                  </button>
                </p>
              </div>
            </div>
          )}

          {(step === "form" || step === "error") && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  padding: "6px",
                  marginBottom: "28px",
                  borderRadius: "15px",
                  border: "1px solid var(--gray-600)",
                  background: "var(--primary-900)",
                }}
              >
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  style={{
                    height: "46px",
                    fontFamily: "inherit",
                    fontSize: "15.5px",
                    fontWeight: 600,
                    color: "var(--gray-400)",
                    background: "none",
                    border: "none",
                    borderRadius: "11px",
                    cursor: "pointer",
                    transition: "color 0.18s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--gray-200)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--gray-400)"; }}
                >
                  Freelancer
                </button>
                <button
                  type="button"
                  style={{
                    height: "46px",
                    fontFamily: "inherit",
                    fontSize: "15.5px",
                    fontWeight: 600,
                    color: "var(--gray-100)",
                    background: "linear-gradient(180deg, color-mix(in srgb, var(--primary-500) 16%, transparent), color-mix(in srgb, var(--primary-600) 50%, transparent))",
                    border: "none",
                    borderRadius: "11px",
                    cursor: "default",
                    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--primary-500) 34%, transparent)",
                  }}
                >
                  Cliente
                </button>
              </div>

              <div style={{ textAlign: "left", marginBottom: "28px" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "27px",
                    fontWeight: 700,
                    color: "var(--gray-100)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Acessar portal
                </h1>
                <p style={{ margin: "9px 0 0", fontSize: "15.5px", lineHeight: 1.5, color: "var(--gray-400)" }}>
                  Digite o e-mail cadastrado pelo seu contato. Enviaremos um código e um link de acesso.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <label style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--gray-200)" }}>
                    E-mail
                  </label>
                  <div
                    style={{
                      height: "56px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "0 16px",
                      borderRadius: "14px",
                      border: `1px solid ${errorMsg ? "var(--error-medium)" : emailFocused ? "var(--primary-500)" : "var(--gray-600)"}`,
                      background: emailFocused
                        ? "color-mix(in srgb, var(--primary-600) 30%, var(--primary-900))"
                        : "var(--primary-900)",
                      boxShadow: emailFocused && !errorMsg ? "0 0 0 3px color-mix(in srgb, var(--primary-500) 16%, transparent)" : "none",
                      transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
                    }}
                  >
                    <Mail
                      size={19}
                      style={{ color: emailFocused ? "var(--primary-400)" : "var(--gray-500)", flexShrink: 0 }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMsg(null);
                        if (step === "error") setStep("form");
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="seu@email.com"
                      required
                      autoFocus
                      style={{
                        flex: 1,
                        fontSize: "16px",
                        color: "var(--gray-100)",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p style={{ fontSize: "13px", color: "var(--error-medium)", margin: 0, lineHeight: 1.5 }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  style={{
                    height: "58px",
                    fontFamily: "inherit",
                    fontSize: "16.5px",
                    fontWeight: 700,
                    color: loading || !email.trim() ? "var(--primary-400)" : "var(--primary-200)",
                    cursor: loading || !email.trim() ? "not-allowed" : "pointer",
                    border: `1px solid color-mix(in srgb, var(--primary-500) 34%, transparent)`,
                    borderRadius: "14px",
                    background: loading || !email.trim()
                      ? "var(--primary-700)"
                      : "color-mix(in srgb, var(--primary-500) 12%, transparent)",
                    transition: "background 0.18s",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && email.trim()) {
                      (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary-500) 18%, transparent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && email.trim()) {
                      (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary-500) 12%, transparent)";
                    }
                  }}
                >
                  {loading ? "Enviando..." : "Enviar código de acesso"}
                </button>
              </form>
            </>
          )}
        </AuthCard>
      </AuthBackground>
    </>
  );
}
