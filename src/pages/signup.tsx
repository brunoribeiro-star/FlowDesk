import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";

function traduzirErroSupabase(msg: string): string {
  if (msg.includes("User already registered")) return "Já existe uma conta com esse e-mail.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "E-mail não confirmado. Verifique sua caixa de entrada.";
  if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("invalid format")) return "Formato de e-mail inválido.";
  if (msg.includes("rate limit") || msg.includes("after")) return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (msg.includes("Signup requires a valid password")) return "A senha é obrigatória.";
  return msg;
}

export default function SignupPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const router = useRouter();

  async function checkEmailExists(value: string): Promise<boolean> {
    if (!value || !value.includes("@")) return false;
    setCheckingEmail(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (data.exists) {
        setEmailError("Já existe uma conta com esse e-mail.");
        return true;
      }
    } catch {
    } finally {
      setCheckingEmail(false);
    }
    return false;
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const exists = await checkEmailExists(email);
    if (exists) return;

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome, name: nome } },
    });

    if (signUpError) {
      setError(traduzirErroSupabase(signUpError.message));
      setLoading(false);
      return;
    }

    if (!data.user || data.user.identities?.length === 0) {
      setError("Já existe uma conta com esse e-mail.");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
    } else {
      setError("Erro inesperado ao autenticar. Tente novamente.");
    }

    setLoading(false);
  }

  async function handleGoogleAuth() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(traduzirErroSupabase(error.message));
  }

  return (
    <AuthBackground>
      <AuthCard>
        <div className="flex justify-center mb-6">
          <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority />
        </div>

        <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--gray-100)" }}>
          Criar conta
        </h1>
        <p className="text-xs mb-6" style={{ color: "var(--gray-400)" }}>
          Comece seus 7 dias grátis, sem cartão de crédito.
        </p>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <AuthInput
            label="Nome completo"
            type="text"
            placeholder="Seu nome"
            required
            icon={<User className="w-4 h-4" />}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            maxLength={100}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--gray-200)" }}>
              E-mail
            </label>
            <div className="relative flex items-center">
              <span
                className="absolute left-3.5 w-4 h-4 flex items-center justify-center"
                style={{ color: "var(--gray-400)" }}
              >
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => checkEmailExists(email)}
                autoComplete="email"
                maxLength={254}
                className="w-full h-11 rounded-xl text-sm focus:outline-none transition-colors"
                style={{
                  background: "var(--primary-800)",
                  border: emailError
                    ? "1px solid var(--error-medium)"
                    : "1px solid var(--primary-700)",
                  color: "var(--gray-100)",
                  paddingLeft: "2.5rem",
                  paddingRight: "1rem",
                }}
                onFocus={(e) => {
                  if (!emailError) e.currentTarget.style.borderColor = "var(--primary-500)";
                }}
                onBlurCapture={(e) => {
                  if (!emailError) e.currentTarget.style.borderColor = "var(--primary-700)";
                }}
              />
              {checkingEmail && (
                <span className="absolute right-3">
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--primary-500)", borderTopColor: "transparent" }}
                  />
                </span>
              )}
            </div>
            {emailError && (
              <p className="text-xs" style={{ color: "var(--error-medium)" }}>
                {emailError}{" "}
                <Link href="/login" style={{ color: "var(--primary-400)" }}>
                  Fazer login?
                </Link>
              </p>
            )}
          </div>

          <AuthInput
            label="Senha"
            type="password"
            placeholder="Crie uma senha"
            required
            icon={<Lock className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            maxLength={128}
          />
          <AuthInput
            label="Confirmar senha"
            type="password"
            placeholder="Repita a senha"
            required
            icon={<Lock className="w-4 h-4" />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            maxLength={128}
          />

          {error && (
            <p className="text-xs text-center" style={{ color: "var(--error-medium)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !!emailError || checkingEmail}
            className="w-full h-11 rounded-xl text-sm font-semibold mt-1 transition-opacity"
            style={{
              background: "var(--primary-500)",
              color: "var(--primary-900)",
              opacity: loading || emailError || checkingEmail ? 0.6 : 1,
            }}
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 h-px" style={{ background: "var(--primary-700)" }} />
            <span className="text-xs" style={{ color: "var(--gray-500)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "var(--primary-700)" }} />
          </div>

          <button
            type="button"
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

          <p className="text-center text-xs" style={{ color: "var(--gray-500)" }}>
            Já tem uma conta?{" "}
            <Link href="/login" className="transition-colors" style={{ color: "var(--primary-400)" }}>
              Entrar
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
