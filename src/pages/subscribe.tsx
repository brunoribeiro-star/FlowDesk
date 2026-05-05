import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { Check, Zap } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_PRICES, type BillingPeriod } from "@/lib/stripeConfig";

export default function SubscribePage() {
  const router = useRouter();
  const subscription = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("mensal");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: "essencial" | "profissional") {
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { router.push("/login"); return; }
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, period: billingPeriod }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setError("Erro ao iniciar checkout. Tente novamente.");
    } catch {
      setError("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const essencialFeatures = [
    "10 projetos ativos",
    "10 clientes",
    "5 GB de armazenamento",
    "1 colaborador por projeto",
    "Portal do cliente básico",
    "Propostas ilimitadas",
    "Time tracker e briefings",
  ];

  const profissionalFeatures = [
    "Projetos ilimitados",
    "Clientes ilimitados",
    "20 GB de armazenamento",
    "Até 5 colaboradores por projeto",
    "Portal do cliente completo",
    "Aprovação de demandas pelo cliente",
    "Propostas ilimitadas",
    "Relatórios completos",
  ];

  return (
    <>
      <Head>
        <title>Escolha seu plano — FlowDesk</title>
      </Head>

      <div className="min-h-screen bg-primary-900 flex flex-col items-center justify-center p-6 gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={130} height={34} priority />
          <h1 className="text-[22px] font-bold text-gray-100 mt-4">Período de teste encerrado</h1>
          <p className="text-[14px] text-gray-400 max-w-md leading-relaxed">
            Escolha um plano para continuar usando o FlowDesk. Você pode cancelar a qualquer momento.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-primary-800 border border-primary-700 rounded-full p-1">
            {(["mensal", "anual"] as BillingPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBillingPeriod(p)}
                className={`px-5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  billingPeriod === p ? "bg-primary-500 text-primary-900" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {p === "mensal" ? "Mensal" : "Anual"}
              </button>
            ))}
          </div>
          {billingPeriod === "anual" && (
            <span className="text-[12px] text-green-400 font-medium">20% de desconto</span>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          {/* Essencial */}
          <div className="bg-primary-800 border border-primary-700 rounded-2xl p-6 flex flex-col">
            <div className="mb-4">
              <h2 className="text-[18px] font-bold text-gray-100">Essencial</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Para quem está começando</p>
            </div>

            <div className="mb-5">
              <span className="text-[30px] font-bold text-gray-100">
                R${" "}
                {billingPeriod === "mensal"
                  ? PLAN_PRICES.essencial.mensal.toFixed(2).replace(".", ",")
                  : (PLAN_PRICES.essencial.anual / 12).toFixed(2).replace(".", ",")}
              </span>
              <span className="text-[13px] text-gray-500">/mês</span>
              {billingPeriod === "anual" && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  R$ {PLAN_PRICES.essencial.anual.toFixed(2).replace(".", ",")} cobrado anualmente
                </p>
              )}
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {essencialFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-gray-300">
                  <Check size={14} className="text-primary-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => startCheckout("essencial")}
              disabled={!!checkoutLoading}
              className="w-full py-3 rounded-xl bg-primary-700 border border-primary-600 text-gray-200 font-semibold text-[14px] hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {checkoutLoading === "essencial" ? "Aguarde..." : "Escolher Essencial"}
            </button>
          </div>

          {/* Profissional */}
          <div className="bg-primary-800 border-2 border-primary-500 rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary-500 text-primary-950 text-[11px] font-bold px-3 py-1 rounded-full">
                RECOMENDADO
              </span>
            </div>

            <div className="mb-4 mt-2">
              <h2 className="text-[18px] font-bold text-gray-100">Profissional</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Para freelancers ativos</p>
            </div>

            <div className="mb-5">
              <span className="text-[30px] font-bold text-gray-100">
                R${" "}
                {billingPeriod === "mensal"
                  ? PLAN_PRICES.profissional.mensal.toFixed(2).replace(".", ",")
                  : (PLAN_PRICES.profissional.anual / 12).toFixed(2).replace(".", ",")}
              </span>
              <span className="text-[13px] text-gray-500">/mês</span>
              {billingPeriod === "anual" && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  R$ {PLAN_PRICES.profissional.anual.toFixed(2).replace(".", ",")} cobrado anualmente
                </p>
              )}
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {profissionalFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-gray-300">
                  <Check size={14} className="text-primary-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => startCheckout("profissional")}
              disabled={!!checkoutLoading}
              className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Zap size={15} />
              {checkoutLoading === "profissional" ? "Aguarde..." : "Fazer upgrade"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-rose-400">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="text-[13px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </>
  );
}
