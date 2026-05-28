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
        <div className="flex justify-center mb-8">
          <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority />
        </div>

        {/* Role toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl mb-7"
          style={{ background: "var(--primary-900)", border: "1px solid var(--primary-700)" }}
        >
          <button
            type="button"
            className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: "var(--primary-700)", color: "var(--gray-100)" }}
          >
            Freelancer
          </button>
          <button
            type="button"
            onClick={() => router.push("/portal/login")}
            className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: "var(--gray-500)" }}
          >
            Cliente
          </button>
        </div>

        <h1
          className="text-xl font-semibold text-center mb-1"
          style={{ color: "var(--gray-100)" }}
        >
          Entrar no FlowDesk
        </h1>
        <p className="text-sm text-center mb-7" style={{ color: "var(--gray-400)" }}>
          Acesse sua conta para continuar
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <AuthInput
            label="E-mail"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            icon={<Mail className="w-4 h-4" />}
            autoComplete="email"
            maxLength={254}
          />
          <AuthInput
            label="Senha"
            name="password"
            type="password"
            placeholder="Sua senha"
            required
            icon={<Lock className="w-4 h-4" />}
            autoComplete="current-password"
            maxLength={128}
          />

          <div className="flex justify-end -mt-1">
            <Link
              href="/forgot-password"
              className="text-xs transition-colors"
              style={{ color: "var(--primary-400)" }}
            >
              Esqueceu a senha?
            </Link>
          </div>

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
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "var(--primary-700)" }} />
          <span className="text-xs" style={{ color: "var(--gray-500)" }}>
            ou
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--primary-700)" }} />
        </div>

        <button
          onClick={handleGoogleAuth}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2.5 text-sm transition-colors"
          style={{
            background: "var(--primary-800)",
            border: "1px solid var(--primary-700)",
            color: "var(--gray-200)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary-500)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary-700)";
          }}
        >
          <Image src="/google.svg" alt="Google" width={18} height={18} />
          Continuar com Google
        </button>

        <p className="text-center text-xs mt-7" style={{ color: "var(--gray-500)" }}>
          Não tem uma conta?{" "}
          <Link
            href="/signup"
            className="transition-colors"
            style={{ color: "var(--primary-400)" }}
          >
            Criar conta
          </Link>
        </p>
      </AuthCard>
    </AuthBackground>
    </>
  );
}
