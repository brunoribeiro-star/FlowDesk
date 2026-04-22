import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Image from "next/image";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Step = "form" | "sent" | "error";

function traduzirErro(msg: string): string {
  if (msg.includes("rate limit") || msg.includes("after")) return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (msg.includes("invalid format") || msg.includes("Invalid email")) return "Formato de e-mail inválido.";
  return "Não foi possível enviar o link. Tente novamente.";
}

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);

    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/portal/dashboard`
      : "/portal/dashboard";

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("not found") || error.message.includes("Signups not allowed")) {
        setErrorMsg("Nenhum portal encontrado para este e-mail. Verifique se é o mesmo e-mail que seu contato usou para convidá-lo.");
      } else {
        setErrorMsg(traduzirErro(error.message));
      }
      setStep("error");
      return;
    }

    setStep("sent");
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
            {step === "sent" ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
                  <Mail size={26} className="text-primary-400" />
                </div>
                <div>
                  <h1 className="text-[18px] font-semibold text-gray-100 mb-2">Verifique seu e-mail</h1>
                  <p className="text-[14px] text-gray-400 leading-relaxed">
                    Enviamos um link de acesso para{" "}
                    <strong className="text-gray-200">{email.trim()}</strong>.
                    <br />
                    Clique no link para entrar no portal.
                  </p>
                </div>
                <p className="text-[12px] text-gray-600">
                  O link expira em 1 hora. Não recebeu?{" "}
                  <button
                    type="button"
                    onClick={() => { setStep("form"); setErrorMsg(null); }}
                    className="text-primary-400 hover:text-primary-300 transition-colors underline"
                  >
                    Tentar novamente
                  </button>
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-[18px] font-semibold text-gray-100 mb-1">Portal do cliente</h1>
                  <p className="text-[14px] text-gray-400">
                    Insira o e-mail que seu contato usou para convidá-lo. Enviaremos um link de acesso direto.
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
                        onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); if (step === "error") setStep("form"); }}
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
                    {loading ? "Enviando..." : "Enviar link de acesso"}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-[12px] text-gray-700 mt-6">
            Você é freelancer?{" "}
            <a href="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
              Entrar no FlowDesk
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
