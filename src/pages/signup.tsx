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
  const [emailFocused, setEmailFocused] = useState(false);
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <span className="auth-logo-wrap"><Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority /></span>
        </div>

        <div style={{ textAlign: "left", marginBottom: "14px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "27px",
              fontWeight: 700,
              color: "var(--gray-100)",
              letterSpacing: "-0.02em",
            }}
          >
            Criar conta
          </h1>
          <p style={{ margin: "5px 0 0", fontSize: "15.5px", lineHeight: 1.5, color: "var(--gray-400)" }}>
            Comece seus 7 dias grátis, sem cartão de crédito.
          </p>
        </div>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <AuthInput
            label="Nome completo"
            type="text"
            placeholder="Seu nome"
            required
            icon={<User size={19} />}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            maxLength={100}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <label style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--gray-200)" }}>
              E-mail
            </label>
            <div
              className="relative"
              style={{
                height: "50px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "0 16px",
                borderRadius: "14px",
                border: `1px solid ${emailError ? "var(--error-medium)" : emailFocused ? "var(--primary-500)" : "var(--gray-600)"}`,
                background: emailFocused
                  ? "color-mix(in srgb, var(--primary-600) 30%, var(--primary-900))"
                  : "var(--primary-900)",
                boxShadow: emailFocused && !emailError ? "0 0 0 3px color-mix(in srgb, var(--primary-500) 16%, transparent)" : "none",
                transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
              }}
            >
              <Mail
                size={19}
                style={{ color: emailFocused ? "var(--primary-400)" : "var(--gray-500)", flexShrink: 0 }}
              />
              <input
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => {
                  setEmailFocused(false);
                  checkEmailExists(email);
                }}
                autoComplete="email"
                maxLength={254}
                style={{
                  flex: 1,
                  fontSize: "16px",
                  color: "var(--gray-100)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  paddingRight: checkingEmail ? "28px" : "0",
                }}
              />
              {checkingEmail && (
                <span style={{ position: "absolute", right: "16px" }}>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid var(--primary-500)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                    }}
                    className="animate-spin"
                  />
                </span>
              )}
            </div>
            {emailError && (
              <p style={{ fontSize: "13px", color: "var(--error-medium)", margin: 0 }}>
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
            icon={<Lock size={19} />}
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
            icon={<Lock size={19} />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            maxLength={128}
          />

          {error && (
            <p style={{ fontSize: "13px", textAlign: "center", color: "var(--error-medium)", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !!emailError || checkingEmail}
            style={{
              height: "50px",
              fontFamily: "inherit",
              fontSize: "16.5px",
              fontWeight: 700,
              color: "var(--primary-900)",
              cursor: loading || emailError || checkingEmail ? "not-allowed" : "pointer",
              border: "none",
              borderRadius: "14px",
              background: "linear-gradient(180deg, var(--primary-400), var(--primary-500))",
              boxShadow: "0 16px 34px -14px color-mix(in srgb, var(--primary-500) 85%, transparent)",
              opacity: loading || emailError || checkingEmail ? 0.6 : 1,
              transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading && !emailError && !checkingEmail) {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 20px 40px -14px color-mix(in srgb, var(--primary-500) 95%, transparent)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 16px 34px -14px color-mix(in srgb, var(--primary-500) 85%, transparent)";
            }}
          >
            {loading ? "Criando conta..." : "Criar conta"}
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

          <p style={{ textAlign: "center", fontSize: "15px", color: "var(--gray-400)", margin: 0 }}>
            Já tem uma conta?{" "}
            <Link href="/login" style={{ color: "var(--primary-400)", fontWeight: 600, textDecoration: "none" }}>
              Entrar
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
