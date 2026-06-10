import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import Head from "next/head";

function traduzirErroSupabase(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "E-mail não confirmado. Verifique sua caixa de entrada.";
  if (msg.includes("rate limit") || msg.includes("after")) return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (msg.includes("invalid format")) return "Formato de e-mail inválido.";
  if (msg.includes("User not found")) return "Nenhuma conta encontrada com esse e-mail.";
  return msg;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const rawRedirect = typeof router.query.redirect === "string" ? router.query.redirect : null;
  const redirectTo = rawRedirect && rawRedirect !== "/onboarding" ? rawRedirect : "/dashboard";

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 15000)
        ),
      ]);

      if (error) {
        setError(traduzirErroSupabase(error.message));
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(
        err?.message === "TIMEOUT"
          ? "A conexão demorou muito. Verifique sua internet e tente novamente."
          : "Erro de conexão. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (error) setError(traduzirErroSupabase(error.message));
  }

  return (
    <>
      <Head><title>Entrar — FlowDesk</title></Head>
      <AuthBackground>
        <AuthCard>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <span className="auth-logo-wrap"><Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority /></span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              padding: "6px",
              marginBottom: "14px",
              borderRadius: "15px",
              border: "1px solid var(--gray-600)",
              background: "var(--primary-900)",
            }}
          >
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
                cursor: "pointer",
                boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--primary-500) 34%, transparent)",
              }}
            >
              Freelancer
            </button>
            <button
              type="button"
              onClick={() => router.push("/portal/login")}
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
              Cliente
            </button>
          </div>

          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "27px",
                fontWeight: 700,
                color: "var(--gray-100)",
                letterSpacing: "-0.02em",
              }}
            >
              Entrar no FlowDesk
            </h1>
            <p style={{ margin: "5px 0 0", fontSize: "15.5px", lineHeight: 1.5, color: "var(--gray-400)" }}>
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <AuthInput
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              icon={<Mail size={19} />}
              autoComplete="email"
              maxLength={254}
            />
            <AuthInput
              label="Senha"
              name="password"
              type="password"
              placeholder="Sua senha"
              required
              icon={<Lock size={19} />}
              autoComplete="current-password"
              maxLength={128}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-4px" }}>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: "14.5px",
                  fontWeight: 600,
                  color: "var(--primary-400)",
                  textDecoration: "none",
                }}
              >
                Esqueceu a senha?
              </Link>
            </div>

            {error && (
              <p style={{ fontSize: "13px", textAlign: "center", color: "var(--error-medium)", margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                height: "50px",
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
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                margin: "2px 0",
                color: "var(--gray-500)",
                fontSize: "14px",
              }}
            >
              <span style={{ flex: 1, height: "1px", background: "var(--gray-700)" }} />
              ou
              <span style={{ flex: 1, height: "1px", background: "var(--gray-700)" }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                height: "50px",
                fontFamily: "inherit",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--gray-100)",
                cursor: "pointer",
                borderRadius: "14px",
                border: "1px solid var(--gray-600)",
                background: "var(--primary-900)",
                transition: "border-color 0.18s, background 0.18s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gray-500)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-800)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gray-600)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-900)";
              }}
            >
              <Image src="/google.svg" alt="Google" width={20} height={20} />
              Continuar com Google
            </button>
          </form>

          <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: "15px", color: "var(--gray-400)" }}>
            Não tem uma conta?{" "}
            <Link
              href="/signup"
              style={{ color: "var(--primary-400)", fontWeight: 600, textDecoration: "none" }}
            >
              Criar conta
            </Link>
          </p>
        </AuthCard>
      </AuthBackground>
    </>
  );
}
