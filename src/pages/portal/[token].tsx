import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

type State =
  | "loading"
  | "accepting"
  | "accepted"
  | "already_accepted"
  | "expired"
  | "not_found"
  | "email_mismatch"
  | "error";

export default function PortalTokenPage() {
  const router = useRouter();
  const { token } = router.query;

  const [state, setState] = useState<State>("loading");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !token || typeof token !== "string") return;

    let cancelled = false;

    (async () => {
      const validateRes = await fetch(`/api/client-invites/validate?token=${encodeURIComponent(token)}`);
      const validateJson = await validateRes.json();

      if (cancelled) return;

      if (!validateRes.ok) {
        if (validateJson.error === "not_found") { setState("not_found"); return; }
        setState("error");
        setErrorMsg(validateJson.error || "Erro desconhecido.");
        return;
      }

      if (validateJson.state === "already_accepted") {
        setState("already_accepted");
        setProjectId(validateJson.project_id);
        return;
      }

      if (validateJson.state === "expired") {
        setState("expired");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        router.replace("/portal/login");
        return;
      }

      await acceptInvite(session.access_token, token, cancelled, setState, setProjectId, setErrorMsg, router);
    })();

    return () => { cancelled = true; };
  }, [router, token]);

  function goToPortal() {
    router.push("/portal/dashboard");
  }

  return (
    <div className="min-h-screen bg-primary-900 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-primary-800 border border-primary-700 rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">

        {(state === "loading" || state === "accepting") && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            <p className="text-gray-300 text-[15px]">
              {state === "accepting" ? "Confirmando acesso..." : "Validando link..."}
            </p>
          </div>
        )}

        {state === "accepted" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-third-400/20 border border-third-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-third-300"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 className="text-[20px] font-semibold text-gray-100">Acesso confirmado!</h1>
            <p className="text-gray-400 text-[14px]">Redirecionando para o portal do projeto...</p>
            <button onClick={goToPortal} className="mt-2 bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-xl px-6 py-2.5 text-[15px] transition-colors">
              Acessar projeto
            </button>
          </div>
        )}

        {state === "already_accepted" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary-700 border border-primary-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h1 className="text-[20px] font-semibold text-gray-100">Acesso já ativado</h1>
            <p className="text-gray-400 text-[14px]">Este link já foi utilizado. Acesse o portal do projeto.</p>
            <button onClick={goToPortal} className="mt-2 bg-primary-700 hover:bg-primary-600 text-gray-100 font-medium rounded-xl px-6 py-2.5 text-[15px] transition-colors border border-primary-600">
              Ir para o projeto
            </button>
          </div>
        )}

        {state === "expired" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h1 className="text-[20px] font-semibold text-gray-100">Link expirado</h1>
            <p className="text-gray-400 text-[14px]">Este link de acesso expirou. Solicite um novo link ao seu contato.</p>
          </div>
        )}

        {state === "not_found" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <h1 className="text-[20px] font-semibold text-gray-100">Link inválido</h1>
            <p className="text-gray-400 text-[14px]">Este link não existe ou foi removido.</p>
          </div>
        )}

        {state === "email_mismatch" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <h1 className="text-[20px] font-semibold text-gray-100">E-mail incorreto</h1>
            <p className="text-gray-400 text-[14px]">Este link foi enviado para um e-mail diferente. Verifique sua caixa de entrada com o e-mail correto.</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="mt-2 bg-primary-700 hover:bg-primary-600 text-gray-100 font-medium rounded-xl px-6 py-2.5 text-[15px] transition-colors border border-primary-600"
            >
              Sair
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h1 className="text-[20px] font-semibold text-gray-100">Algo deu errado</h1>
            <p className="text-gray-400 text-[14px]">{errorMsg || "Ocorreu um erro ao processar o acesso."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

async function acceptInvite(
  accessToken: string,
  token: string,
  cancelled: boolean,
  setState: (s: State) => void,
  setProjectId: (id: string) => void,
  setErrorMsg: (msg: string) => void,
  router: ReturnType<typeof useRouter>
) {
  if (cancelled) return;
  setState("accepting");

  const acceptRes = await fetch("/api/client-invites/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });
  const acceptJson = await acceptRes.json();

  if (cancelled) return;

  if (!acceptRes.ok) {
    const errCode = acceptJson.error;
    if (errCode === "already_accepted") {
      setState("already_accepted");
      setProjectId(acceptJson.project_id);
      return;
    }
    if (errCode === "expired") { setState("expired"); return; }
    if (errCode === "email_mismatch") { setState("email_mismatch"); return; }
    if (errCode === "not_found") { setState("not_found"); return; }
    setState("error");
    setErrorMsg(acceptJson.error || "Erro ao confirmar acesso.");
    return;
  }

  setState("accepted");
  setProjectId(acceptJson.project_id);
  setTimeout(() => {
    if (!cancelled) router.push("/portal/dashboard");
  }, 1500);
}
