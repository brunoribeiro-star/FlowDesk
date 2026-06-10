import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  async function handleReset(e: React.FormEvent) {
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

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("Erro ao redefinir a senha. Tente novamente.");
    } else {
      setDone(true);
    }
  }

  const logoBlock = (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
      <span className="auth-logo-wrap"><Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority /></span>
    </div>
  );

  if (!ready) {
    return (
      <AuthBackground>
        <AuthCard>
          {logoBlock}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "16px 0" }}>
            <div
              className="animate-spin"
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid var(--primary-500)",
                borderTopColor: "transparent",
                borderRadius: "50%",
              }}
            />
            <p style={{ fontSize: "15px", color: "var(--gray-400)", margin: 0 }}>
              Validando link de recuperação...
            </p>
          </div>
        </AuthCard>
      </AuthBackground>
    );
  }

  if (done) {
    return (
      <AuthBackground>
        <AuthCard>
          {logoBlock}
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
              <CheckCircle size={28} strokeWidth={1.9} />
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
                Senha redefinida
              </h1>
              <p style={{ margin: "9px 0 0", fontSize: "15.5px", lineHeight: 1.5, color: "var(--gray-400)" }}>
                Sua senha foi atualizada com sucesso. Faça login para continuar.
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
              Ir para o login
            </Link>
          </div>
        </AuthCard>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <AuthCard>
        {logoBlock}

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
            Criar nova senha
          </h1>
          <p style={{ margin: "9px 0 0", fontSize: "15.5px", lineHeight: 1.5, color: "var(--gray-400)" }}>
            Escolha uma senha segura para sua conta.
          </p>
        </div>

        <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <AuthInput
            label="Nova senha"
            type="password"
            placeholder="Digite sua nova senha"
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
            placeholder="Repita a nova senha"
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
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
