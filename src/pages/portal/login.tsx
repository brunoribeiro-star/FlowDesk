import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";

type Step = "form" | "sent" | "verifying_otp" | "error";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpValue = otp.join("");
  const otpComplete = otpValue.length === 6;

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (otpComplete && step === "sent") {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Navigate through the magic link so Supabase creates the session
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

      <div className="min-h-screen bg-primary-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={130} height={34} priority />
          </div>

          <div className="bg-primary-800 border border-primary-700 rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">

            {/* Role toggle — hidden on sent step to save space */}
            {step !== "sent" && (
              <div className="flex items-center gap-1 p-1 bg-primary-900 border border-primary-700 rounded-xl mb-7">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors text-gray-500 hover:text-gray-300"
                >
                  Freelancer
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors bg-primary-700 text-gray-100"
                >
                  Cliente
                </button>
              </div>
            )}

            {/* ── STEP: sent — OTP input ── */}
            {step === "sent" && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResend}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-700 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h1 className="text-[17px] font-semibold text-gray-100">Verifique seu e-mail</h1>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Código enviado para <span className="text-gray-300">{email.trim()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-gray-400">
                    Digite o código de 6 dígitos
                  </label>

                  <div
                    className="flex gap-2 justify-between"
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
                        className={[
                          "w-full aspect-square text-center text-[22px] font-bold rounded-xl border transition-all outline-none",
                          "bg-primary-900 text-gray-100",
                          otpError
                            ? "border-rose-500 focus:border-rose-400"
                            : digit
                            ? "border-primary-500 focus:border-primary-400"
                            : "border-primary-700 focus:border-primary-500",
                        ].join(" ")}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="text-[13px] text-rose-400 leading-relaxed">{otpError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={!otpComplete || otpLoading}
                  className={`w-full py-3 rounded-xl font-semibold text-[15px] transition-all ${
                    !otpComplete || otpLoading
                      ? "bg-primary-700 text-primary-400 cursor-not-allowed"
                      : "bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20"
                  }`}
                >
                  {otpLoading ? "Verificando..." : "Entrar"}
                </button>

                <div className="flex flex-col gap-2 text-center">
                  <p className="text-[12px] text-gray-600">
                    Ou{" "}
                    <span className="text-gray-500">clique no link enviado no e-mail</span>{" "}
                    para entrar sem digitar o código.
                  </p>
                  <p className="text-[12px] text-gray-600">
                    Não recebeu?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-primary-400 hover:text-primary-300 transition-colors underline"
                    >
                      Reenviar código
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP: form or error — email input ── */}
            {(step === "form" || step === "error") && (
              <>
                <div className="mb-6">
                  <h1 className="text-[18px] font-semibold text-gray-100 mb-1">Acessar portal</h1>
                  <p className="text-[14px] text-gray-400">
                    Digite o e-mail cadastrado pelo seu contato. Enviaremos um código e um link de acesso.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-gray-300">E-mail</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrorMsg(null);
                          if (step === "error") setStep("form");
                        }}
                        placeholder="seu@email.com"
                        required
                        autoFocus
                        className="w-full bg-primary-900 border border-primary-700 rounded-xl pl-10 pr-4 py-3 text-[14px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-[13px] text-rose-400 leading-relaxed">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className={`w-full py-3 rounded-xl font-semibold text-[15px] transition-all ${
                      loading || !email.trim()
                        ? "bg-primary-700 text-primary-400 cursor-not-allowed"
                        : "bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20"
                    }`}
                  >
                    {loading ? "Enviando..." : "Enviar código de acesso"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
