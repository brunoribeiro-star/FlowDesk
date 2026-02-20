import React from "react";

type Template3Props = {
  projectName?: string;
  clientName?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  value?: number | null;
  valueDiscount?: number | null;
  value12x?: number | null;
  dueDate?: string | null;
  date?: string | null;
  editable?: boolean;
};

export function formatCurrencyBRL(v?: number | null) {
  if (v == null || Number.isNaN(v)) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Template3({
  projectName,
  clientName,
  companyName,
  primaryColor = "#009688",
  secondaryColor = "#111827",
  bannerUrl,
  logoUrl,
  value,
  valueDiscount,
  value12x,
  dueDate,
  date,
  editable = true,
}: Template3Props) {
  const safeProject = projectName || "Nome do projeto";
  const safeClient = clientName || "Nome do cliente";
  const safeCompany = companyName || "Sua empresa";
  const safeDate = date || "__/__/____";
  const safeDue = dueDate || "__/__/____";

  const bgCoverStyle: React.CSSProperties = bannerUrl
    ? {
        backgroundImage: `url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundColor: primaryColor,
      };

  const footerStyle: React.CSSProperties = {
    backgroundColor: primaryColor,
  };

  const accentStyle: React.CSSProperties = {
    color: primaryColor,
  };

  const accentBgStyle: React.CSSProperties = {
    backgroundColor: primaryColor,
  };

  const accentBorderStyle: React.CSSProperties = {
    borderColor: primaryColor,
  };

  const pageClass =
    "w-full flex justify-center py-24 md:py-[100px] bg-white text-slate-900";
  const pageInnerClass =
    "w-full max-w-5xl px-6 md:px-10 flex flex-col gap-8 font-[var(--font-dm-sans)]";

  const editableProps = editable
    ? { contentEditable: true, suppressContentEditableWarning: true }
    : {};

  return (
    <div className="w-full bg-white text-slate-900">
      <section className={`${pageClass}`} style={bgCoverStyle}>
        <div className={`${pageInnerClass}`}>
          <div className="bg-white/95 rounded-[26px] shadow-[0_18px_40px_rgba(15,23,42,0.18)] px-8 md:px-12 py-10 md:py-12 flex flex-col justify-between min-h-[360px] gap-10">
            <header className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="w-9 h-9 rounded-xl border-2 border-slate-200 overflow-hidden flex items-center justify-center bg-white">
                    <img
                      src={logoUrl}
                      alt={safeCompany}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="w-7 h-7 rounded-xl border-2 border-slate-300 border-t-4 rotate-45"
                    style={accentBorderStyle}
                  />
                )}
                <span
                  className="text-base font-semibold text-slate-900"
                  {...editableProps}
                >
                  {safeCompany}
                </span>
              </div>
            </header>

            <div className="flex-1 flex items-center">
              <div className="flex flex-col gap-2">
                <h1
                  className="text-[30px] md:text-[40px] font-medium leading-tight text-slate-900"
                  {...editableProps}
                >
                  {safeProject}
                </h1>
                <p
                  className="text-sm md:text-base text-slate-500"
                  {...editableProps}
                >
                  Proposta comercial para {safeClient}
                </p>
              </div>
            </div>

            <footer className="pt-6 border-t border-slate-200 flex flex-wrap gap-6 md:gap-12">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cliente
                </span>
                <span className="text-sm text-slate-900" {...editableProps}>
                  {safeClient}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Vencimento
                </span>
                <span className="text-sm text-slate-900" {...editableProps}>
                  {safeDue}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Data da proposta
                </span>
                <span className="text-sm text-slate-900" {...editableProps}>
                  {safeDate}
                </span>
              </div>
            </footer>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <div className="flex flex-col items-center text-center gap-3">
            <h2
              className="text-[28px] font-medium"
              style={accentStyle}
              {...editableProps}
            >
              Conteúdo da Proposta
            </h2>
            <p
              className="text-[14px] md:text-[15px] text-slate-500 max-w-2xl"
              {...editableProps}
            >
              Nesta proposta você encontra um resumo claro de como vamos conduzir o
              projeto, as etapas envolvidas, o que será entregue e como funciona o
              investimento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-4">
            {[
              {
                num: "01",
                title: "Alinhamento inicial",
                text: "Momento para entender contexto, objetivos e necessidades do projeto, definindo escopo e prioridades junto com você.",
              },
              {
                num: "02",
                title: "Etapas do projeto",
                text: "Organização do fluxo de trabalho em fases claras, com comunicação transparente e checkpoints definidos.",
              },
              {
                num: "03",
                title: "Resultados esperados",
                text: "Alinhamento das entregas finais, padrão de qualidade e indicadores que mostram o sucesso do projeto.",
              },
              {
                num: "04",
                title: "Investimento e prazos",
                text: "Detalhamento do investimento, condições de pagamento e prazos estimados para cada etapa da entrega.",
              },
            ].map((item, idx) => (
              <div key={idx} className="text-left">
                <span
                  className="block text-[22px] font-medium mb-2"
                  style={accentStyle}
                >
                  {item.num}
                </span>
                <h3
                  className="text-[15px] font-semibold mb-1"
                  {...editableProps}
                >
                  {item.title}
                </h3>
                <p
                  className="text-[13px] leading-relaxed text-slate-500"
                  {...editableProps}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Conteúdo da Proposta</span>
            <span>01</span>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <div className="grid grid-cols-1 md:grid-cols-[0.9fr,1.4fr] gap-10">
            <aside className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-2xl px-6 py-6 md:py-7">
              <h3 className="text-[18px] font-semibold mb-3" {...editableProps}>
                Sobre nós
              </h3>
              <p
                className="text-[14px] leading-relaxed text-slate-600"
                {...editableProps}
              >
                Somos um time especializado em tecnologia, design e experiência do
                usuário. Unimos visão estratégica, estética e desempenho para criar
                produtos digitais que entregam resultado de verdade.
              </p>
            </aside>

            <div className="flex flex-col">
              <h2
                className="text-[28px] font-medium"
                style={accentStyle}
                {...editableProps}
              >
                Nossos valores
              </h2>

              <ul className="mt-4 flex flex-col gap-4">
                {[
                  {
                    title: "Excelência",
                    text: "Cuidado em cada etapa do processo, buscando sempre entregar algo acima do esperado.",
                  },
                  {
                    title: "Organização",
                    text: "Planejamento, cronograma e comunicação claros, para que você acompanhe o projeto com segurança.",
                  },
                  {
                    title: "Qualidade contínua",
                    text: "Pensamos não só no lançamento, mas também na manutenção e evolução futura do projeto.",
                  },
                  {
                    title: "Parceria",
                    text: "Trabalhamos lado a lado com você, ouvindo feedbacks e ajustando o caminho sempre que necessário.",
                  },
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="grid grid-cols-[auto,1fr] gap-3 items-start"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-[3px] rotate-45 mt-1"
                      style={accentBgStyle}
                    />
                    <div>
                      <h4
                        className="text-[15px] font-semibold mb-1"
                        {...editableProps}
                      >
                        {item.title}
                      </h4>
                      <p
                        className="text-[13px] text-slate-500"
                        {...editableProps}
                      >
                        {item.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Conteúdo da Proposta</span>
            <span>02</span>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <div className="flex flex-col items-center text-center gap-3">
            <h2
              className="text-[28px] font-medium"
              style={accentStyle}
              {...editableProps}
            >
              Etapas de Criação
            </h2>
            <p
              className="text-[14px] md:text-[15px] text-slate-500 max-w-2xl"
              {...editableProps}
            >
              O processo de criação do projeto é dividido em etapas claras, com pontos
              de validação e espaço para ajustes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {[
              {
                num: "01",
                title: "Alinhamento inicial",
                text: "Reunião para entender contexto, objetivos, público e referências. A partir disso, definimos juntos o escopo e o foco do projeto.",
                highlight: false,
              },
              {
                num: "02",
                title: "Estrutura e design",
                text: "Mapeamento das telas ou seções, organização das informações e desenvolvimento do layout com foco em experiência do usuário.",
                highlight: false,
              },
              {
                num: "03",
                title: "Refinos e aprovação",
                text: "Ajustes finos, validação com você e preparação dos arquivos finais que seguirão para desenvolvimento ou publicação.",
                highlight: true,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border px-5 py-6 flex flex-col gap-2 ${
                  item.highlight
                    ? "text-white"
                    : "bg-white text-slate-900 border-slate-200"
                }`}
                style={
                  item.highlight
                    ? { backgroundColor: primaryColor, borderColor: primaryColor }
                    : {}
                }
              >
                <span
                  className="text-[18px] font-medium"
                  style={!item.highlight ? accentStyle : {}}
                >
                  {item.num}
                </span>
                <h3
                  className="text-[16px] font-semibold"
                  {...editableProps}
                >
                  {item.title}
                </h3>
                <p
                  className={`text-[13px] leading-relaxed ${
                    item.highlight ? "text-teal-50" : "text-slate-500"
                  }`}
                  {...editableProps}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Etapas de Criação</span>
            <span>03</span>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <div className="grid grid-cols-1 md:grid-cols-[0.9fr,1.4fr] gap-10 items-center">
            <div className="flex items-center justify-center">
              <div className="w-[230px] h-[460px] rounded-[40px] bg-black p-2.5 shadow-[0_20px_40px_rgba(15,23,42,0.35)] relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[120px] h-6 rounded-[14px] bg-black" />
                <div
                  className="w-full h-full rounded-[30px] flex items-center justify-center text-center px-4"
                  style={accentBgStyle}
                >
                  <span
                    className="text-white text-[18px] leading-snug font-medium"
                    {...editableProps}
                  >
                    Seu sistema
                    <br />
                    100% responsivo
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                {logoUrl ? (
                  <div className="w-7 h-7 rounded-xl border border-slate-300 overflow-hidden flex items-center justify-center bg-white">
                    <img
                      src={logoUrl}
                      alt={safeCompany}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 rounded-md border-2 border-slate-300 border-t-4 rotate-45"
                    style={accentBorderStyle}
                  />
                )}
                <span
                  className="text-sm font-semibold text-slate-900"
                  {...editableProps}
                >
                  {safeCompany}
                </span>
              </div>

              <h2
                className="text-[28px] font-medium mb-2"
                style={accentStyle}
                {...editableProps}
              >
                Projeto 100% responsivo
              </h2>

              <ul className="relative pl-6 mt-4">
                <span
                  className="absolute left-[5px] top-0 bottom-0 w-[3px] rounded-full"
                  style={{
                    background:
                      "linear-gradient(to bottom, #0f766e, #14b8a6, #a7f3d0)",
                  }}
                />
                {[
                  {
                    title: "Escala",
                    text: "Layout pensado para diferentes tamanhos de tela, garantindo leitura confortável e navegação fluida.",
                  },
                  {
                    title: "UI Design",
                    text: "Interfaces criadas em ferramenta profissional, permitindo validação visual antes da implementação.",
                  },
                  {
                    title: "Velocidade",
                    text: "Foco em performance, boas práticas e otimizações que tornam o uso diário mais agradável.",
                  },
                ].map((item, idx) => (
                  <li key={idx} className="mb-4 relative pl-4">
                    <h4
                      className="text-[15px] font-semibold mb-1"
                      {...editableProps}
                    >
                      {item.title}
                    </h4>
                    <p
                      className="text-[13px] text-slate-500"
                      {...editableProps}
                    >
                      {item.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Responsividade</span>
            <span>04</span>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <h2
            className="text-[28px] font-medium"
            style={accentStyle}
            {...editableProps}
          >
            Descrição da Proposta
          </h2>
          <p
            className="mt-4 text-[14px] leading-relaxed text-slate-700"
            {...editableProps}
          >
            Esta proposta tem como objetivo organizar o projeto de {safeProject} de
            forma clara, profissional e sustentável, conectando o posicionamento de{" "}
            {safeClient} a uma experiência digital bem planejada.
          </p>
          <p
            className="mt-4 text-[14px] leading-relaxed text-slate-700"
            {...editableProps}
          >
            A partir do alinhamento inicial, estruturamos o escopo, organizamos as
            telas ou seções, definimos o estilo visual e garantimos um fluxo de
            navegação intuitivo. Durante o processo, você acompanha a evolução por
            meio de pontos de validação e feedback.
          </p>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Descrição da Proposta</span>
            <span>05</span>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <div className="flex flex-col items-center text-center gap-3">
            <h2
              className="text-[28px] font-medium"
              style={accentStyle}
              {...editableProps}
            >
              Prazos e Entregas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            {[
              {
                title: "Planejamento e design completo do projeto",
                text: "Desenvolvimento da identidade visual aplicada, definição das principais telas ou seções e protótipos navegáveis.",
                day: "Dia 15",
              },
              {
                title: "Desenvolvimento e implementação",
                text: "Implementação do projeto com tecnologias adequadas, garantindo performance e fidelidade ao layout aprovado.",
                day: "Dia 30",
              },
              {
                title: "Integrações e validações",
                text: "Integração com serviços necessários, formulários, APIs e validação das funcionalidades principais.",
                day: "Dia 45",
              },
              {
                title: "Testes finais, publicação e backups",
                text: "Rodada final de testes, ajustes pontuais, publicação em produção e configuração de backups básicos.",
                day: "Dia 60",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 px-4 py-5 flex flex-col h-full bg-white"
              >
                <div className="flex-1">
                  <h3
                    className="text-[15px] font-semibold mb-2"
                    {...editableProps}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-[13px] text-slate-500"
                    {...editableProps}
                  >
                    {item.text}
                  </p>
                </div>
                <div className="mt-4">
                  <div
                    className="h-[3px] rounded-full mb-3"
                    style={{
                      background:
                        "linear-gradient(90deg,#0f766e,#14b8a6,#a7f3d0)",
                    }}
                  />
                  <div
                    className="text-[16px] font-semibold text-slate-800"
                    {...editableProps}
                  >
                    {item.day}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Prazos e Entregas</span>
            <span>06</span>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <h2
            className="text-[28px] font-medium"
            style={accentStyle}
            {...editableProps}
          >
            Tecnologias e ferramentas usadas no projeto
          </h2>

          <ul className="mt-2 mb-3 list-none p-0">
            <li className="inline-flex items-center gap-2 text-[14px] text-slate-700">
              <span
                className="w-2.5 h-2.5 rounded-[3px] rotate-45"
                style={accentBgStyle}
              />
              <span {...editableProps}>Framer</span>
            </li>
          </ul>

          <p
            className="text-[13px] leading-relaxed text-slate-500"
            {...editableProps}
          >
            Algumas tecnologias específicas podem ser definidas ao longo do projeto,
            de acordo com as necessidades identificadas em conjunto. O foco é sempre
            garantir um equilíbrio entre performance, segurança, escalabilidade e
            facilidade de manutenção.
          </p>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Tecnologias</span>
            <span>07</span>
          </div>
        </div>
      </section>

      <section className={pageClass}>
        <div className={pageInnerClass}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2
              className="text-[28px] font-medium"
              style={accentStyle}
              {...editableProps}
            >
              Investimento
            </h2>
            <div className="flex items-center gap-3 text-[12px] text-slate-500">
              <span {...editableProps}>Contrato</span>
              <span {...editableProps}>Nota fiscal</span>
            </div>
          </div>

          <p
            className="text-[13px] leading-relaxed text-slate-600 mb-5"
            {...editableProps}
          >
            A seguir estão algumas formas de investimento sugeridas. Os valores podem
            ser ajustados conforme o escopo final do projeto. Os campos de valor
            podem ser preenchidos automaticamente a partir do painel do FlowDesk.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="relative rounded-2xl border px-5 py-6 flex flex-col gap-2 text-white"
              style={accentBgStyle}
            >
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-slate-800">
                1ª
              </div>
              <h3
                className="mt-6 text-[16px] font-semibold"
                {...editableProps}
              >
                À vista
              </h3>
              <p
                className="text-[13px] text-teal-50"
                {...editableProps}
              >
                Pagamento à vista com condição especial para fechamento rápido.
              </p>
              <p
                className="text-[13px] line-through text-teal-100"
                {...editableProps}
              >
                {formatCurrencyBRL(value)}
              </p>
              <p
                className="text-[18px] font-semibold"
                {...editableProps}
              >
                {formatCurrencyBRL(valueDiscount)}
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative rounded-2xl border border-slate-200 px-5 py-6 bg-white flex flex-col gap-2">
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-slate-800 border border-slate-200">
                  2ª
                </div>
                <h3
                  className="mt-6 text-[16px] font-semibold"
                  {...editableProps}
                >
                  50% / 50%
                </h3>
                <p
                  className="text-[13px] text-slate-500"
                  {...editableProps}
                >
                  Pagamento dividido em duas parcelas iguais: uma no início do
                  projeto e outra na entrega final.
                </p>
                <p
                  className="text-[16px] font-semibold text-slate-900"
                  {...editableProps}
                >
                  Total: {formatCurrencyBRL(value)}
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-200 px-5 py-6 bg-white flex flex-col gap-2">
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-slate-800 border border-slate-200">
                  3ª
                </div>
                <h3
                  className="mt-6 text-[16px] font-semibold"
                  {...editableProps}
                >
                  12x no cartão
                </h3>
                <p
                  className="text-[13px] text-slate-500"
                  {...editableProps}
                >
                  Pagamento parcelado em até 12x no cartão de crédito, ideal para
                  diluir o investimento no tempo.
                </p>
                <p
                  className="text-[16px] font-semibold text-slate-900"
                  {...editableProps}
                >
                  {formatCurrencyBRL(value12x)} / mês (estimado)
                </p>
              </div>
            </div>

            <div className="relative rounded-2xl border border-slate-200 px-5 py-6 bg-white flex flex-col gap-2">
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-slate-800 border border-slate-200">
                4ª
              </div>
              <h3
                className="mt-6 text-[16px] font-semibold"
                {...editableProps}
              >
                Parcelado no PIX
              </h3>
              <p
                className="text-[13px] text-slate-500"
                {...editableProps}
              >
                Pagamento dividido em parcelas por PIX, com datas e condições
                acordadas em conjunto.
              </p>
              <p
                className="text-[16px] font-semibold text-slate-900"
                {...editableProps}
              >
                {formatCurrencyBRL(value)} em parcelas a combinar
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-[12px] text-slate-600">
            <div className="flex flex-col gap-2">
              <div className="h-px bg-slate-300" />
              <div className="font-medium" {...editableProps}>
                {safeCompany}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-px bg-slate-300" />
              <div className="font-medium" {...editableProps}>
                {safeClient}
              </div>
            </div>
          </div>

          <div
            className="mt-12 h-10 rounded-full flex items-center justify-between px-8 text-[12px] text-white"
            style={footerStyle}
          >
            <span {...editableProps}>Investimento</span>
            <span>08</span>
          </div>
        </div>
      </section>
    </div>
  );
}