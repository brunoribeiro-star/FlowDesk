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

  if (!ready) {
    return (
      <AuthBackground>
        <AuthCard>
          <div className="flex justify-center mb-8">
            <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority />
          </div>
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--primary-500)", borderTopColor: "transparent" }}
            />
            <p className="text-sm" style={{ color: "var(--gray-400)" }}>
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
          <div className="flex justify-center mb-8">
            <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority />
          </div>
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--primary-500) 15%, transparent)" }}
            >
              <CheckCircle className="w-6 h-6" style={{ color: "var(--primary-500)" }} />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--gray-100)" }}>
                Senha redefinida
              </h2>
              <p className="text-sm" style={{ color: "var(--gray-400)" }}>
                Sua senha foi atualizada com sucesso. Faça login para continuar.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center transition-opacity mt-2"
              style={{ background: "var(--primary-500)", color: "var(--primary-900)" }}
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
        <div className="flex justify-center mb-8">
          <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={140} height={36} priority />
        </div>

        <h1 className="text-xl font-semibold text-center mb-1" style={{ color: "var(--gray-100)" }}>
          Criar nova senha
        </h1>
        <p className="text-sm text-center mb-7" style={{ color: "var(--gray-400)" }}>
          Escolha uma senha segura para sua conta.
        </p>

        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <AuthInput
            label="Nova senha"
            type="password"
            placeholder="Digite sua nova senha"
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
            placeholder="Repita a nova senha"
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
            disabled={loading}
            className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity mt-1"
            style={{
              background: "var(--primary-500)",
              color: "var(--primary-900)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
