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
        <div className="flex justify-center mb-8">
          <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority />
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--primary-500) 15%, transparent)" }}
            >
              <Mail className="w-6 h-6" style={{ color: "var(--primary-500)" }} />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--gray-100)" }}>
                E-mail enviado
              </h2>
              <p className="text-sm" style={{ color: "var(--gray-400)" }}>
                Enviamos um link de recuperação para{" "}
                <span style={{ color: "var(--gray-200)" }}>{email}</span>.
                Verifique sua caixa de entrada.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity mt-2"
              style={{ background: "var(--primary-500)", color: "var(--primary-900)" }}
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-center mb-1" style={{ color: "var(--gray-100)" }}>
              Recuperar senha
            </h1>
            <p className="text-sm text-center mb-7" style={{ color: "var(--gray-400)" }}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AuthInput
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                required
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={254}
              />

              {error && (
                <p className="text-xs text-center" style={{ color: "var(--error-medium)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity mt-1"
                style={{
                  background: "var(--primary-500)",
                  color: "var(--primary-900)",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>

            <div className="flex justify-center mt-6">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: "var(--gray-400)" }}
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </div>
          </>
        )}
      </AuthCard>
    </AuthBackground>
  );
}
