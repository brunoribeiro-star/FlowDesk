import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { CheckCircle, ClipboardList, AlertCircle } from "lucide-react";

type Campo = {
  id: string;
  titulo_pergunta: string;
  descricao_pergunta: string | null;
  tipo: "short_text" | "long_text" | "multiple_choice" | "checkboxes" | string;
  obrigatorio: boolean;
  opcoes: string[] | null;
  placeholder: string | null;
  ordem: number;
};

type Envio = {
  id: string;
  status: string | null;
  respondido_em: string | null;
  prazo_resposta: string | null;
  template: { id: string; titulo: string; descricao: string | null } | null;
  projeto: { id: string; titulo: string; clientes: { nome: string; empresa: string | null } | null } | null;
};

type PageState = "loading" | "ready" | "already_answered" | "not_found" | "submitted" | "error";

export default function PublicBriefingPage() {
  const router = useRouter();
  const { token } = router.query;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string | string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || typeof token !== "string") return;

    fetch(`/api/briefings/get-public?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPageState("not_found");
          return;
        }
        setEnvio(data.envio);
        setCampos(data.campos);
        if (data.envio.status === "respondido" || data.envio.respondido_em) {
          setPageState("already_answered");
        } else {
          setPageState("ready");
        }
      })
      .catch(() => setPageState("error"));
  }, [token]);

  function handleChange(campoId: string, value: string | string[]) {
    setRespostas((prev) => ({ ...prev, [campoId]: value }));
    if (erros[campoId]) {
      setErros((prev) => { const n = { ...prev }; delete n[campoId]; return n; });
    }
  }

  function handleCheckboxChange(campoId: string, opcao: string, checked: boolean) {
    const atual = (respostas[campoId] as string[] | undefined) ?? [];
    const nova = checked ? [...atual, opcao] : atual.filter((o) => o !== opcao);
    handleChange(campoId, nova);
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    campos.forEach((campo) => {
      if (!campo.obrigatorio) return;
      const val = respostas[campo.id];
      if (campo.tipo === "checkboxes") {
        if (!val || (val as string[]).length === 0) {
          novosErros[campo.id] = "Selecione pelo menos uma opção.";
        }
      } else {
        if (!val || String(val).trim() === "") {
          novosErros[campo.id] = "Este campo é obrigatório.";
        }
      }
    });
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setSubmitting(true);
    setSubmitError(null);

    const rows = campos.map((campo) => {
      const val = respostas[campo.id];
      const resposta = Array.isArray(val) ? val.join(", ") : (val ?? "");
      return { pergunta: campo.titulo_pergunta, resposta };
    });

    try {
      const res = await fetch("/api/briefings/submit-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, respostas: rows }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmitError(data.error || "Erro ao enviar respostas.");
        setSubmitting(false);
        return;
      }

      setPageState("submitted");
    } catch {
      setSubmitError("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  }

  const clienteNome = envio?.projeto?.clientes?.nome || null;
  const projetoTitulo = envio?.projeto?.titulo || null;
  const briefingTitulo = envio?.template?.titulo || "Briefing";
  const briefingDescricao = envio?.template?.descricao || null;

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pageState === "not_found" || pageState === "error") {
    return (
      <>
        <Head><title>Briefing não encontrado</title></Head>
        <div className="min-h-screen bg-primary-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <AlertCircle size={28} className="text-rose-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-100">Briefing não encontrado</h1>
            <p className="text-gray-400 text-sm">
              Este link pode ter expirado ou ser inválido. Entre em contato com o freelancer responsável.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (pageState === "already_answered") {
    return (
      <>
        <Head><title>Briefing já respondido</title></Head>
        <div className="min-h-screen bg-primary-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-100">Briefing já respondido</h1>
            <p className="text-gray-400 text-sm">
              Este briefing já foi respondido anteriormente. Obrigado!
            </p>
          </div>
        </div>
      </>
    );
  }

  if (pageState === "submitted") {
    return (
      <>
        <Head><title>Respostas enviadas</title></Head>
        <div className="min-h-screen bg-primary-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100 mb-2">Respostas enviadas!</h1>
              <p className="text-gray-400 text-sm">
                Obrigado por responder o briefing{projetoTitulo ? ` do projeto "${projetoTitulo}"` : ""}.
                O freelancer será notificado.
              </p>
            </div>
            <div className="mt-2 text-[12px] text-gray-600">
              Powered by FlowDesk
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{briefingTitulo}</title>
        <meta name="description" content={briefingDescricao || `Responda o briefing: ${briefingTitulo}`} />
      </Head>

      <div className="min-h-screen bg-primary-900 text-gray-100 py-12 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            {projetoTitulo && (
              <span className="text-[13px] text-primary-400 font-medium tracking-wide">
                Projeto: {projetoTitulo}{clienteNome ? ` — ${clienteNome}` : ""}
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={20} className="text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-100">{briefingTitulo}</h1>
            </div>
            {briefingDescricao && (
              <p className="text-gray-400 text-sm leading-relaxed mt-1">{briefingDescricao}</p>
            )}
            {envio?.prazo_resposta && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-amber-400">
                <span>Prazo:</span>
                <span>{new Date(envio.prazo_resposta).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {campos.map((campo) => {
              const val = respostas[campo.id];
              const erro = erros[campo.id];

              return (
                <div
                  key={campo.id}
                  className={`bg-primary-800 border rounded-2xl p-5 flex flex-col gap-3 transition-colors ${
                    erro ? "border-rose-500/50" : "border-primary-700"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-[15px] font-medium text-gray-100">
                      {campo.titulo_pergunta}
                      {campo.obrigatorio && (
                        <span className="text-rose-400 ml-1" title="Obrigatório">*</span>
                      )}
                    </label>
                    {campo.descricao_pergunta && (
                      <span className="text-[13px] text-gray-400">{campo.descricao_pergunta}</span>
                    )}
                  </div>

                  {campo.tipo === "short_text" && (
                    <input
                      type="text"
                      value={(val as string) || ""}
                      onChange={(e) => handleChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder || "Sua resposta..."}
                      className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[14px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                    />
                  )}

                  {campo.tipo === "long_text" && (
                    <textarea
                      value={(val as string) || ""}
                      onChange={(e) => handleChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder || "Sua resposta..."}
                      rows={4}
                      className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[14px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                    />
                  )}

                  {campo.tipo === "multiple_choice" && (
                    <div className="flex flex-col gap-2">
                      {(campo.opcoes || []).map((opcao, i) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            val === opcao
                              ? "border-primary-500 bg-primary-500"
                              : "border-primary-700 group-hover:border-primary-400"
                          }`}>
                            {val === opcao && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <input
                            type="radio"
                            name={`campo-${campo.id}`}
                            value={opcao}
                            checked={val === opcao}
                            onChange={() => handleChange(campo.id, opcao)}
                            className="sr-only"
                          />
                          <span className="text-[14px] text-gray-300 group-hover:text-gray-100 transition-colors">
                            {opcao}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {campo.tipo === "checkboxes" && (
                    <div className="flex flex-col gap-2">
                      {(campo.opcoes || []).map((opcao, i) => {
                        const checked = Array.isArray(val) && val.includes(opcao);
                        return (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              checked
                                ? "border-primary-500 bg-primary-500"
                                : "border-primary-700 group-hover:border-primary-400"
                            }`}>
                              {checked && (
                                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                  <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => handleCheckboxChange(campo.id, opcao, e.target.checked)}
                              className="sr-only"
                            />
                            <span className="text-[14px] text-gray-300 group-hover:text-gray-100 transition-colors">
                              {opcao}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {erro && (
                    <span className="text-[12px] text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {erro}
                    </span>
                  )}
                </div>
              );
            })}

            {submitError && (
              <div className="px-4 py-3 rounded-xl bg-rose-900/20 border border-rose-500/40 text-rose-300 text-[13px] flex items-center gap-2">
                <AlertCircle size={14} />
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[12px] text-gray-600">
                {campos.filter((c) => c.obrigatorio).length > 0
                  ? `* Campos obrigatórios`
                  : ""}
              </span>
              <button
                type="submit"
                disabled={submitting}
                className={`px-8 py-3 rounded-xl font-semibold text-[15px] transition-all ${
                  submitting
                    ? "bg-primary-600 text-primary-300 cursor-not-allowed"
                    : "bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20"
                }`}
              >
                {submitting ? "Enviando..." : "Enviar respostas"}
              </button>
            </div>
          </form>

          <div className="text-center text-[12px] text-gray-700 pb-4">
            Powered by FlowDesk
          </div>
        </div>
      </div>
    </>
  );
}
