import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError("Erro ao enviar o e-mail. Tente novamente.");
    } else {
      setSent(true);
    }
  }

  return (
    <AuthBackground>
      <AuthCard>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
          <span className="auth-logo-wrap"><Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority /></span>
        </div>

        {sent ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: "72px",
                height: "72px",
                margin: "8px auto 22px",
                borderRadius: "50%",
                color: "var(--primary-400)",
                background: "color-mix(in srgb, var(--primary-500) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary-500) 26%, transparent)",
              }}
            >
              <Mail size={28} strokeWidth={1.9} />
            </div>

            <div style={{ marginBottom: "28px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "27px",
                  fontWeight: 700,
                  color: "var(--gray-100)",
                  letterSpacing: "-0.02em",
                }}
              >
                E-mail enviado
              </h1>
              <p style={{ margin: "9px 0 0", fontSize: "15.5px", lineHeight: 1.5, color: "var(--gray-400)" }}>
                Enviamos um link de recuperação para{" "}
                <strong style={{ color: "var(--gray-200)", fontWeight: 600 }}>{email}</strong>.
                {" "}Verifique sua caixa de entrada.
              </p>
            </div>

            <Link
              href="/login"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "58px",
                fontFamily: "inherit",
                fontSize: "16.5px",
                fontWeight: 700,
                color: "var(--primary-900)",
                textDecoration: "none",
                borderRadius: "14px",
                background: "linear-gradient(180deg, var(--primary-400), var(--primary-500))",
                boxShadow: "0 16px 34px -14px color-mix(in srgb, var(--primary-500) 85%, transparent)",
              }}
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "27px",
                  fontWeight: 700,
                  color: "var(--gray-100)",
                  letterSpacing: "-0.02em",
                }}
              >
                Recuperar senha
              </h1>
              <p style={{ margin: "9px 0 0", fontSize: "15.5px", lineHeight: 1.5, color: "var(--gray-400)" }}>
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <AuthInput
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                required
                icon={<Mail size={19} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={254}
              />

              {error && (
                <p style={{ fontSize: "13px", textAlign: "center", color: "var(--error-medium)", margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: "58px",
                  fontFamily: "inherit",
                  fontSize: "16.5px",
                  fontWeight: 700,
                  color: "var(--primary-900)",
                  cursor: loading ? "not-allowed" : "pointer",
                  border: "none",
                  borderRadius: "14px",
                  background: "linear-gradient(180deg, var(--primary-400), var(--primary-500))",
                  boxShadow: "0 16px 34px -14px color-mix(in srgb, var(--primary-500) 85%, transparent)",
                  opacity: loading ? 0.6 : 1,
                  transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 20px 40px -14px color-mix(in srgb, var(--primary-500) 95%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "none";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 16px 34px -14px color-mix(in srgb, var(--primary-500) 85%, transparent)";
                }}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>

              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  height: "46px",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--gray-400)",
                  textDecoration: "none",
                  transition: "color 0.16s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--gray-200)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--gray-400)"; }}
              >
                <ChevronLeft size={17} />
                Voltar para o login
              </Link>
            </form>
          </>
        )}
      </AuthCard>
    </AuthBackground>
  );
}
