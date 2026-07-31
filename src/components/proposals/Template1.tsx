import React, { useEffect, useState } from "react";

export type ProposalContent = {
  section1: {
    title: string;
    subtitle: string;
    items: { num: string; title: string; text: string }[];
  };
  section2: {
    title: string;
    subtitle: string;
    values: { title: string; text: string }[];
    aboutTitle: string;
    aboutText1: string;
    aboutText2: string;
  };
  section3: {
    title: string;
    subtitle: string;
    steps: { num: string; title: string; text: string; highlight?: boolean }[];
  };
  section4: {
    title: string;
    subtitle: string;
    features: { title: string; text: string }[];
  };
  section5: {
    title: string;
    subtitle: string;
    description: string;
  };
  section6: {
    title: string;
    subtitle: string;
    timeline: { title: string; text: string; day: string }[];
  };
  section7: {
    title: string;
    subtitle: string;
  };
  section8: {
    title: string;
    subtitle: string;
    options: {
      option1: { title: string; text: string };
      option2: { title: string; text: string };
      option3: { title: string; text: string };
      option4: { title: string; text: string };
    };
  };
};

export const DEFAULT_CONTENT: ProposalContent = {
  section1: {
    title: "Conteúdo da Proposta",
    subtitle:
      "Um resumo do que está incluído neste documento para facilitar a navegação e compreensão.",
    items: [
      {
        num: "01",
        title: "Visão & Contexto",
        text: "Apresentamos o cenário atual, objetivos principais e como o projeto se encaixa na estratégia do cliente.",
      },
      {
        num: "02",
        title: "Planejamento",
        text: "Divisão do projeto em etapas claras, incluindo prazos estimados e entregas de cada fase.",
      },
      {
        num: "03",
        title: "Execução",
        text: "Metodologia de trabalho, ferramentas utilizadas e como será o fluxo de comunicação.",
      },
      {
        num: "04",
        title: "Investimento",
        text: "Estrutura de valores, formas de pagamento e condições para início do projeto.",
      },
    ],
  },
  section2: {
    title: "Nossos Valores & Sobre Nós",
    subtitle:
      "Um pouco sobre como trabalhamos e o que você pode esperar ao longo do projeto.",
    values: [
      {
        title: "Transparência:",
        text: "cada etapa, prazo e decisão é compartilhada com o cliente.",
      },
      {
        title: "Qualidade:",
        text: "foco em interfaces limpas, performance e usabilidade real.",
      },
      {
        title: "Parceria:",
        text: "tratamos o projeto como um esforço conjunto, e não apenas uma entrega pontual.",
      },
      {
        title: "Resultado:",
        text: "decisões orientadas a objetivos de negócio, e não somente estética.",
      },
    ],
    aboutTitle: "Sobre a Empresa",
    aboutText1:
      "Atuamos com foco em projetos digitais que unem estratégia, design e desenvolvimento. Cada solução é desenhada respeitando o momento do cliente, seu público e seus objetivos.",
    aboutText2:
      "Acreditamos em processos organizados, comunicação clara e entregas que podem ser facilmente evoluídas no futuro, sem depender de soluções engessadas ou pouco escaláveis.",
  },
  section3: {
    title: "Etapas de Criação",
    subtitle:
      "O desenvolvimento acontece em fases, todas com validações importantes.",
    steps: [
      {
        num: "01",
        title: "Alinhamento inicial",
        text: "Entendimento do contexto, definição de objetivos e coleta de referências.",
        highlight: true,
      },
      {
        num: "02",
        title: "Estrutura & Design",
        text: "Construção da arquitetura de navegação e do layout visual.",
      },
      {
        num: "03",
        title: "Refinos & Entrega",
        text: "Ajustes finos, testes e aprovação final para publicação.",
      },
    ],
  },
  section4: {
    title: "Projeto Responsivo",
    subtitle:
      "Garantia de que o sistema funcione bem em qualquer dispositivo, do desktop ao celular.",
    features: [
      {
        title: "Escala",
        text: "Interfaces desenhadas para diferentes resoluções, evitando cortes ou distorções.",
      },
      {
        title: "Usabilidade",
        text: "Componentes pensados para toque, clique e leitura confortável em qualquer dispositivo.",
      },
      {
        title: "Performance",
        text: "Boas práticas que contribuem para carregamento rápido e experiência fluida.",
      },
    ],
  },
  section5: {
    title: "Descrição da Proposta",
    subtitle:
      "Um resumo descritivo do escopo, foco principal e resultados esperados.",
    description:
      "Descrição detalhada do projeto. Aqui você pode explicar o objetivo, o escopo, as necessidades e a visão geral.",
  },
  section6: {
    title: "Prazos e Entregas",
    subtitle:
      "Estimativa de tempo para cada etapa do projeto, podendo ser ajustada conforme a complexidade.",
    timeline: [
      {
        title: "Planejamento",
        text: "Mapeamento de requisitos, definição de escopo e estrutura.",
        day: "Dia 15",
      },
      {
        title: "Desenvolvimento",
        text: "Construção completa do projeto com base no layout aprovado.",
        day: "Dia 30",
      },
      {
        title: "Integrações",
        text: "Conexões com APIs, formulários, automações e testes.",
        day: "Dia 45",
      },
      {
        title: "Publicação",
        text: "Ajustes finais, homologação e entrega oficial.",
        day: "Dia 60",
      },
    ],
  },
  section7: {
    title: "Ferramentas & Tecnologias",
    subtitle:
      "As tecnologias escolhidas para garantir performance, segurança e facilidade de manutenção.",
  },
  section8: {
    title: "Investimento",
    subtitle: "Opções de investimento e formas de pagamento.",
    options: {
      option1: {
        title: "À vista",
        text: "Condição especial para fechamento rápido do projeto.",
      },
      option2: {
        title: "50% / 50%",
        text: "Metade do valor no início do projeto e o restante na entrega final.",
      },
      option3: {
        title: "12x no cartão",
        text: "Pagamento parcelado ideal para diluir o investimento no médio prazo.",
      },
      option4: {
        title: "Parcelado no PIX",
        text: "Parcelas e condições definidas em conjunto, conforme necessidade.",
      },
    },
  },
};

type Template1Props = {
  projectName?: string;
  clientName?: string;
  companyName?: string;
  technologies?: string[];
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
  content?: ProposalContent;
  onContentChange?: (newContent: ProposalContent) => void;
};

export function formatCurrencyBRL(v?: number | null) {
  if (v == null || Number.isNaN(v)) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EditableText = ({
  text,
  onChange,
  className,
  style,
  tagName = "span",
  editable = true,
}: {
  text: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  tagName?: React.ElementType;
  editable?: boolean;
}) => {
  const Tag = tagName as any;

  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      style={{ ...style, outline: "none", minWidth: "10px" }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLElement>) =>
        onChange(e.currentTarget.innerText)
      }
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};

export default function Template1({
  projectName,
  clientName,
  companyName,
  technologies = [],
  primaryColor = "#22c55e",
  secondaryColor = "#0f172a",
  bannerUrl,
  logoUrl,
  value,
  valueDiscount,
  value12x,
  dueDate,
  date,
  editable = true,
  content = DEFAULT_CONTENT,
  onContentChange,
}: Template1Props) {
  const safeProject = projectName || "Nome do projeto";
  const safeClient = clientName || "Nome do cliente";
  const safeCompany = companyName || "Sua empresa";
  const safeDate = date || "__/__/____";
  const safeDue = dueDate || "__/__/____";

  const updateContent = (path: string[], value: string) => {
    if (!onContentChange) return;

    const newContent = JSON.parse(JSON.stringify(content));
    let current = newContent;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onContentChange(newContent);
  };

  const bgCoverStyle: React.CSSProperties = bannerUrl
    ? {
        backgroundImage: `url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: primaryColor };

  const footerStyle: React.CSSProperties = { backgroundColor: primaryColor };
  const accentStyle: React.CSSProperties = { color: primaryColor };
  const accentBgStyle: React.CSSProperties = { backgroundColor: primaryColor };
  const softAccentBg: React.CSSProperties = {
    background: `linear-gradient(135deg, ${primaryColor}15, #ffffff)`,
    borderColor: `${primaryColor}40`,
  };
  const gradientV: React.CSSProperties = {
    background: `linear-gradient(to bottom, ${primaryColor}, transparent)`,
  };
  const gradientH: React.CSSProperties = {
    background: `linear-gradient(90deg, ${primaryColor}, transparent)`,
  };

  const pageClass =
    "w-full flex justify-center py-16 md:py-20 bg-white text-slate-900";
  const pageInnerClass =
    "w-full max-w-[1200px] px-6 md:px-10 flex flex-col gap-8 font-[var(--font-dm-sans)]";

  const SectionHeader = ({
    title,
    subtitle,
    sectionKey,
  }: {
    title: string;
    subtitle?: string;
    sectionKey: keyof ProposalContent;
  }) => (
    <div className="flex flex-col items-center text-center gap-3">
      <EditableText
        tagName="h2"
        className="text-[26px] md:text-[28px] font-semibold tracking-tight"
        style={accentStyle}
        text={title}
        onChange={(val) => updateContent([sectionKey, "title"], val)}
        editable={editable}
      />
      {subtitle && (
        <EditableText
          tagName="p"
          className="text-[14px] md:text-[15px] text-slate-600 max-w-2xl leading-relaxed"
          text={subtitle}
          onChange={(val) => updateContent([sectionKey, "subtitle"], val)}
          editable={editable}
        />
      )}
    </div>
  );

  const Footer = ({ label, number }: { label: string; number: string }) => (
    <div
      className="mt-10 h-10 rounded-full flex items-center justify-between px-8 text-white text-[12px]"
      style={footerStyle}
    >
      <span>{label}</span>
      <span>{number}</span>
    </div>
  );

  return (
    <div className="w-full bg-white text-slate-900">
      <section className={`${pageClass} pdf-section`} style={bgCoverStyle}>
        <div className={pageInnerClass}>
          <div className="bg-[#f9fdf9]/95 rounded-[26px] shadow-[0_18px_40px_rgba(15,23,42,0.18)] px-8 md:px-12 py-12 min-h-[360px] flex flex-col gap-10">
            <header className="flex items-center justify-start">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={safeCompany}
                  style={{
                    maxHeight: "55px",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-2xl border-2 border-slate-300 border-t-4 rotate-45 bg-white"
                  style={{ borderColor: primaryColor }}
                />
              )}
            </header>

            <div className="flex-1 flex items-center">
              <div className="flex flex-col gap-3">
                <h1 className="text-[40px] font-medium">{safeProject}</h1>
                <p className="text-base text-slate-600">
                  Proposta comercial para {safeClient}
                </p>
              </div>
            </div>

            <footer className="pt-6 border-t border-slate-200 flex flex-wrap gap-8">
              {[
                { label: "Cliente", value: safeClient },
                { label: "Vencimento", value: safeDue },
                { label: "Data da proposta", value: safeDate },
              ].map((item, idx) => (
                <div className="flex flex-col gap-1" key={idx}>
                  <span className="text-[11px] uppercase font-semibold text-slate-500">
                    {item.label}
                  </span>
                  <span className="text-sm">{item.value}</span>
                </div>
              ))}
            </footer>
          </div>
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section1.title}
            subtitle={content.section1.subtitle}
            sectionKey="section1"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            {content.section1.items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-5 flex flex-col gap-2"
                style={softAccentBg}
              >
                <span
                  className="text-[22px] font-semibold"
                  style={accentStyle}
                >
                  {item.num}
                </span>
                <EditableText
                  tagName="h3"
                  className="text-[15px] font-semibold"
                  text={item.title}
                  onChange={(val) =>
                    updateContent(["section1", "items", idx.toString(), "title"], val)
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className="text-[13px] leading-relaxed text-slate-600"
                  text={item.text}
                  onChange={(val) =>
                    updateContent(["section1", "items", idx.toString(), "text"], val)
                  }
                  editable={editable}
                />
              </div>
            ))}
          </div>

          <Footer label="Conteúdo da Proposta" number="01" />
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section2.title}
            subtitle={content.section2.subtitle}
            sectionKey="section2"
          />

          <div className="grid grid-cols-1 md:grid-cols-[1.1fr,1.1fr] gap-8 mt-6 items-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
              <h3 className="text-[16px] font-semibold">Nossos valores</h3>
              <ul className="space-y-3 text-[13px] text-slate-600">
                {content.section2.values.map((val, idx) => (
                  <li key={idx}>
                    <EditableText
                      tagName="span"
                      className="font-semibold"
                      text={val.title}
                      onChange={(v) =>
                        updateContent(
                          ["section2", "values", idx.toString(), "title"],
                          v
                        )
                      }
                      editable={editable}
                    />{" "}
                    <EditableText
                      tagName="span"
                      text={val.text}
                      onChange={(v) =>
                        updateContent(
                          ["section2", "values", idx.toString(), "text"],
                          v
                        )
                      }
                      editable={editable}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
              <EditableText
                tagName="h3"
                className="text-[16px] font-semibold"
                text={content.section2.aboutTitle}
                onChange={(val) => updateContent(["section2", "aboutTitle"], val)}
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[13px] text-slate-600 leading-relaxed"
                text={content.section2.aboutText1}
                onChange={(val) => updateContent(["section2", "aboutText1"], val)}
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[13px] text-slate-600 leading-relaxed"
                text={content.section2.aboutText2}
                onChange={(val) => updateContent(["section2", "aboutText2"], val)}
                editable={editable}
              />
            </div>
          </div>

          <Footer label="Nossos Valores & Sobre Nós" number="02" />
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section3.title}
            subtitle={content.section3.subtitle}
            sectionKey="section3"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {content.section3.steps.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-2xl px-5 py-6 flex flex-col gap-2 ${
                  item.highlight
                    ? "text-white"
                    : "bg-white text-slate-900 border border-slate-200"
                }`}
                style={item.highlight ? accentBgStyle : {}}
              >
                <span className="text-[18px] font-medium">{item.num}</span>
                <EditableText
                  tagName="h3"
                  className="text-[16px] font-semibold"
                  text={item.title}
                  onChange={(val) =>
                    updateContent(["section3", "steps", idx.toString(), "title"], val)
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className={`text-[13px] leading-relaxed ${
                    item.highlight ? "text-white/90" : "text-slate-500"
                  }`}
                  text={item.text}
                  onChange={(val) =>
                    updateContent(["section3", "steps", idx.toString(), "text"], val)
                  }
                  editable={editable}
                />
              </div>
            ))}
          </div>

          <Footer label="Etapas de Criação" number="03" />
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section4.title}
            subtitle={content.section4.subtitle}
            sectionKey="section4"
          />

          <div className="grid grid-cols-1 md:grid-cols-[0.9fr,1.4fr] gap-10 items-center mt-6">
            <div className="flex items-center justify-center">
              <div className="w-[230px] h-[440px] rounded-[40px] bg-slate-900 p-2.5 shadow-2xl relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[120px] h-6 rounded-[14px] bg-black/80" />
                <div
                  className="w-full h-full rounded-[30px] flex items-center justify-center text-center px-4"
                  style={accentBgStyle}
                >
                  <span className="text-white text-[18px] font-medium leading-snug">
                    Layout adaptado
                    <br />
                    para qualquer tela
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <ul className="relative pl-6 mt-4">
                <span
                  className="absolute left-[5px] top-0 bottom-0 w-[3px] rounded-full"
                  style={gradientV}
                />
                {content.section4.features.map((item, idx) => (
                  <li key={idx} className="mb-4 relative pl-4">
                    <EditableText
                      tagName="h4"
                      className="font-semibold mb-1"
                      text={item.title}
                      onChange={(val) =>
                        updateContent(
                          ["section4", "features", idx.toString(), "title"],
                          val
                        )
                      }
                      editable={editable}
                    />
                    <EditableText
                      tagName="p"
                      className="text-[13px] text-slate-500"
                      text={item.text}
                      onChange={(val) =>
                        updateContent(
                          ["section4", "features", idx.toString(), "text"],
                          val
                        )
                      }
                      editable={editable}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Footer label="Responsividade" number="04" />
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section5.title}
            subtitle={content.section5.subtitle}
            sectionKey="section5"
          />

          <EditableText
            tagName="p"
            className="text-[15px] text-slate-700 text-center leading-relaxed mt-4 max-w-3xl mx-auto"
            text={content.section5.description}
            onChange={(val) => updateContent(["section5", "description"], val)}
            editable={editable}
          />

          <Footer label="Descrição da Proposta" number="05" />
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section6.title}
            subtitle={content.section6.subtitle}
            sectionKey="section6"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            {content.section6.timeline.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 p-5 bg-white flex flex-col"
              >
                <EditableText
                  tagName="h3"
                  className="font-semibold mb-2"
                  text={item.title}
                  onChange={(val) =>
                    updateContent(
                      ["section6", "timeline", idx.toString(), "title"],
                      val
                    )
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className="text-[13px] text-slate-500"
                  text={item.text}
                  onChange={(val) =>
                    updateContent(
                      ["section6", "timeline", idx.toString(), "text"],
                      val
                    )
                  }
                  editable={editable}
                />

                <div className="mt-auto pt-4">
                  <div
                    className="h-[3px] rounded-full mb-3"
                    style={gradientH}
                  />
                  <EditableText
                    tagName="div"
                    className="text-[16px] font-semibold text-slate-800"
                    text={item.day}
                    onChange={(val) =>
                      updateContent(
                        ["section6", "timeline", idx.toString(), "day"],
                        val
                      )
                    }
                    editable={editable}
                  />
                </div>
              </div>
            ))}
          </div>

          <Footer label="Prazos e Entregas" number="06" />
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section7.title}
            subtitle={content.section7.subtitle}
            sectionKey="section7"
          />

          {technologies.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
              {technologies.map((tech) => (
                <div
                  key={tech}
                  className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2 bg-white"
                >
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[18px] font-semibold"
                    style={accentBgStyle}
                  >
                    {tech[0]}
                  </span>
                  <span className="text-sm font-medium">{tech}</span>
                  <p className="text-xs text-slate-500">
                    Tecnologia utilizada como parte da construção e manutenção do
                    projeto.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600 text-center mt-4 italic">
              Nenhuma tecnologia informada. Você pode editar esta seção para
              listar as principais ferramentas do projeto.
            </p>
          )}

          <Footer label="Ferramentas & Tecnologias" number="07" />
        </div>
      </section>

      <section className={`${pageClass} pdf-section`} style={{ pageBreakBefore: "always" }}>
        <div className={pageInnerClass}>
          <SectionHeader
            title={content.section8.title}
            subtitle={content.section8.subtitle}
            sectionKey="section8"
          />

          <p className="text-[13px] text-slate-600 mb-5 text-center max-w-2xl mx-auto">
            Os valores abaixo podem ser ajustados conforme o escopo final
            definido em conjunto. Todos os formatos incluem suporte básico
            pós-entrega por um período acordado.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="relative rounded-2xl p-6 text-white overflow-hidden"
              style={accentBgStyle}
            >
              <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-[radial-gradient(circle_at_top,_#ffffff_0,_transparent_60%)]" />
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] bg-white text-slate-800">
                  1ª opção
                </div>
                <EditableText
                  tagName="h3"
                  className="mt-6 text-[16px] font-semibold"
                  text={content.section8.options.option1.title}
                  onChange={(val) =>
                    updateContent(["section8", "options", "option1", "title"], val)
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className="text-[13px] text-white/90"
                  text={content.section8.options.option1.text}
                  onChange={(val) =>
                    updateContent(["section8", "options", "option1", "text"], val)
                  }
                  editable={editable}
                />
                {valueDiscount != null ? (
                  <>
                    <p className="text-[13px] line-through opacity-80 mt-2">
                      {formatCurrencyBRL(value)}
                    </p>
                    <p className="text-[22px] font-semibold mt-1">
                      {formatCurrencyBRL(valueDiscount)}
                    </p>
                  </>
                ) : (
                  <p className="text-[22px] font-semibold mt-3">
                    {formatCurrencyBRL(value)}
                  </p>
                )}
              </div>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6">
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] bg-white border border-slate-200 text-slate-800">
                2ª opção
              </div>
              <EditableText
                tagName="h3"
                className="mt-8 text-[16px] font-semibold"
                text={content.section8.options.option2.title}
                onChange={(val) =>
                  updateContent(["section8", "options", "option2", "title"], val)
                }
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[13px] text-slate-500"
                text={content.section8.options.option2.text}
                onChange={(val) =>
                  updateContent(["section8", "options", "option2", "text"], val)
                }
                editable={editable}
              />
              <p className="text-[16px] font-semibold text-slate-900 mt-3">
                Total: {formatCurrencyBRL(value)}
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6">
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] bg-white border border-slate-200 text-slate-800">
                3ª opção
              </div>
              <EditableText
                tagName="h3"
                className="mt-8 text-[16px] font-semibold"
                text={content.section8.options.option3.title}
                onChange={(val) =>
                  updateContent(["section8", "options", "option3", "title"], val)
                }
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[13px] text-slate-500"
                text={content.section8.options.option3.text}
                onChange={(val) =>
                  updateContent(["section8", "options", "option3", "text"], val)
                }
                editable={editable}
              />
              <p className="text-[16px] font-semibold mt-3">
                {formatCurrencyBRL(value12x)} / mês
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6">
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] bg-white border border-slate-200 text-slate-800">
                4ª opção
              </div>
              <EditableText
                tagName="h3"
                className="mt-8 text-[16px] font-semibold"
                text={content.section8.options.option4.title}
                onChange={(val) =>
                  updateContent(["section8", "options", "option4", "title"], val)
                }
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[13px] text-slate-500"
                text={content.section8.options.option4.text}
                onChange={(val) =>
                  updateContent(["section8", "options", "option4", "text"], val)
                }
                editable={editable}
              />
              <p className="text-[16px] font-semibold mt-3">
                {formatCurrencyBRL(value)} em parcelas a combinar
              </p>
            </div>
          </div>

          <Footer label="Investimento" number="08" />
        </div>
      </section>
    </div>
  );
}