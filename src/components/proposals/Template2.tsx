import React from "react";
import {
  ProposalContent,
  DEFAULT_CONTENT,
  formatCurrencyBRL,
} from "./Template1";

type Template2Props = {
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

export default function Template2({
  projectName,
  clientName,
  companyName,
  technologies = [],
  primaryColor = "#22c55e",
  secondaryColor = "#0d1117",
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
}: Template2Props) {
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

  const pageClass =
    "w-full flex justify-center py-16 md:py-20 bg-[#0d1117] text-[#e6edf3]";
  const pageInnerClass =
    "w-full max-w-[1200px] px-6 md:px-10 flex flex-col gap-8";

  const SectionHeader = ({
    num,
    label,
    title,
    subtitle,
    sectionKey,
  }: {
    num: string;
    label: string;
    title: string;
    subtitle?: string;
    sectionKey: keyof ProposalContent;
  }) => (
    <div className="flex flex-col gap-4 mb-2">
      <div className="flex items-center gap-3">
        <span
          className="text-[11px] font-mono font-semibold"
          style={{ color: primaryColor }}
        >
          {num}
        </span>
        <div className="flex-1 h-px bg-[#30363d]" />
        <span className="text-[11px] text-[#8b949e] uppercase tracking-widest">
          {label}
        </span>
      </div>
      <EditableText
        tagName="h2"
        className="text-[26px] md:text-[28px] font-semibold tracking-tight"
        style={{ color: primaryColor }}
        text={title}
        onChange={(val) => updateContent([sectionKey, "title"], val)}
        editable={editable}
      />
      {subtitle && (
        <EditableText
          tagName="p"
          className="text-[14px] md:text-[15px] text-[#8b949e] max-w-2xl leading-relaxed"
          text={subtitle}
          onChange={(val) => updateContent([sectionKey, "subtitle"], val)}
          editable={editable}
        />
      )}
    </div>
  );

  const DarkFooter = ({ label, number }: { label: string; number: string }) => (
    <div className="mt-10 h-10 rounded-full flex items-center justify-between px-8 text-[12px] bg-[#161b22] border border-[#30363d]">
      <span className="text-[#8b949e]">{label}</span>
      <span
        className="font-mono font-semibold"
        style={{ color: primaryColor }}
      >
        {number}
      </span>
    </div>
  );

  const coverBg: React.CSSProperties = bannerUrl
    ? {
        backgroundImage: `linear-gradient(rgba(13,17,23,0.75), rgba(13,17,23,0.75)), url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
      };

  return (
    <div className="w-full bg-[#0d1117] text-[#e6edf3]">
      <section
        className="w-full flex justify-center pdf-section"
        style={{ ...coverBg, minHeight: "520px", position: "relative" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #30363d 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
            opacity: 0.45,
          }}
        />

        <div
          className="relative z-10 w-full max-w-[1200px] px-6 md:px-10 py-16 md:py-20 flex flex-col justify-between"
          style={{ minHeight: "520px" }}
        >
          <div className="flex items-start justify-between">
            <div>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={safeCompany}
                  style={{
                    maxHeight: "52px",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="text-[#e6edf3] text-sm font-medium">
                    {safeCompany}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[12px] text-[#8b949e] font-mono mt-1">
              {safeDate}
            </span>
          </div>

          <div className="flex flex-col gap-4 my-10">
            <div
              className="w-16 h-[3px] rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <h1 className="text-[52px] md:text-[56px] font-bold leading-tight tracking-tight text-[#e6edf3]">
              {safeProject}
            </h1>
            <p className="text-[16px] text-[#8b949e]">
              Proposta comercial para{" "}
              <span className="text-[#e6edf3]">{safeClient}</span>
            </p>
          </div>

          <div
            className="pt-6 flex flex-wrap gap-0"
            style={{ borderTop: "1px solid #30363d" }}
          >
            {[
              { label: "Cliente", value: safeClient },
              { label: "Vencimento", value: safeDue },
              { label: "Data da proposta", value: safeDate },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 pr-8 mr-8"
                style={idx < 2 ? { borderRight: "1px solid #30363d" } : {}}
              >
                <span className="text-[11px] uppercase tracking-widest text-[#8b949e]">
                  {item.label}
                </span>
                <span className="text-[13px] text-[#e6edf3]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="01"
            label="Índice"
            title={content.section1.title}
            subtitle={content.section1.subtitle}
            sectionKey="section1"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            {content.section1.items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#30363d] bg-[#161b22] px-5 py-5 flex flex-col gap-3"
              >
                <span
                  className="text-[24px] font-bold font-mono"
                  style={{ color: primaryColor }}
                >
                  {item.num}
                </span>
                <EditableText
                  tagName="h3"
                  className="text-[14px] font-semibold text-[#e6edf3]"
                  text={item.title}
                  onChange={(val) =>
                    updateContent(
                      ["section1", "items", idx.toString(), "title"],
                      val
                    )
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className="text-[13px] leading-relaxed text-[#8b949e]"
                  text={item.text}
                  onChange={(val) =>
                    updateContent(
                      ["section1", "items", idx.toString(), "text"],
                      val
                    )
                  }
                  editable={editable}
                />
              </div>
            ))}
          </div>

          <DarkFooter label="Conteúdo da Proposta" number="01" />
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="02"
            label="Valores & Sobre"
            title={content.section2.title}
            subtitle={content.section2.subtitle}
            sectionKey="section2"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-4">
              <h3 className="text-[14px] font-semibold text-[#e6edf3] uppercase tracking-wider">
                Nossos valores
              </h3>
              <ul className="flex flex-col gap-3">
                {content.section2.values.map((val, idx) => (
                  <li key={idx} className="flex gap-3 text-[13px] items-start">
                    <span
                      className="mt-[5px] w-[6px] h-[6px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="text-[#8b949e]">
                      <EditableText
                        tagName="span"
                        className="font-semibold text-[#e6edf3]"
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
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-4">
              <EditableText
                tagName="h3"
                className="text-[14px] font-semibold text-[#e6edf3] uppercase tracking-wider"
                text={content.section2.aboutTitle}
                onChange={(val) =>
                  updateContent(["section2", "aboutTitle"], val)
                }
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[13px] text-[#8b949e] leading-relaxed"
                text={content.section2.aboutText1}
                onChange={(val) =>
                  updateContent(["section2", "aboutText1"], val)
                }
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[13px] text-[#8b949e] leading-relaxed"
                text={content.section2.aboutText2}
                onChange={(val) =>
                  updateContent(["section2", "aboutText2"], val)
                }
                editable={editable}
              />
            </div>
          </div>

          <DarkFooter label="Nossos Valores & Sobre Nós" number="02" />
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="03"
            label="Etapas"
            title={content.section3.title}
            subtitle={content.section3.subtitle}
            sectionKey="section3"
          />

          <div className="relative flex flex-col gap-0 mt-2 pl-10">
            <div
              className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-[#30363d]"
              style={{ zIndex: 0 }}
            />

            {content.section3.steps.map((item, idx) => (
              <div
                key={idx}
                className="relative flex gap-6 pb-6 last:pb-0"
                style={{ zIndex: 1 }}
              >
                <div
                  className="absolute left-[-40px] w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold font-mono flex-shrink-0 border-2"
                  style={
                    item.highlight
                      ? {
                          backgroundColor: primaryColor,
                          borderColor: primaryColor,
                          color: "#0d1117",
                        }
                      : {
                          backgroundColor: "#0d1117",
                          borderColor: "#30363d",
                          color: primaryColor,
                        }
                  }
                >
                  {idx + 1}
                </div>

                <div
                  className="flex-1 rounded-xl border px-5 py-4 flex flex-col gap-2"
                  style={
                    item.highlight
                      ? {
                          backgroundColor: `${primaryColor}18`,
                          borderColor: primaryColor,
                        }
                      : {
                          backgroundColor: "#161b22",
                          borderColor: "#30363d",
                        }
                  }
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[11px] font-mono font-semibold"
                      style={{ color: primaryColor }}
                    >
                      {item.num}
                    </span>
                    <EditableText
                      tagName="h3"
                      className="text-[15px] font-semibold text-[#e6edf3]"
                      text={item.title}
                      onChange={(val) =>
                        updateContent(
                          ["section3", "steps", idx.toString(), "title"],
                          val
                        )
                      }
                      editable={editable}
                    />
                  </div>
                  <EditableText
                    tagName="p"
                    className="text-[13px] leading-relaxed text-[#8b949e]"
                    text={item.text}
                    onChange={(val) =>
                      updateContent(
                        ["section3", "steps", idx.toString(), "text"],
                        val
                      )
                    }
                    editable={editable}
                  />
                </div>
              </div>
            ))}
          </div>

          <DarkFooter label="Etapas de Criação" number="03" />
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="04"
            label="Descrição"
            title={content.section5.title}
            subtitle={content.section5.subtitle}
            sectionKey="section5"
          />

          <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-8 mt-2 relative overflow-hidden">
            <div
              className="absolute left-0 top-6 bottom-6 w-[4px] rounded-r-full"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="pl-6">
              <span
                className="text-[48px] font-serif leading-none select-none"
                style={{ color: primaryColor, opacity: 0.4 }}
              >
                &ldquo;
              </span>
              <EditableText
                tagName="p"
                className="text-[16px] text-[#e6edf3] leading-relaxed -mt-4"
                text={content.section5.description}
                onChange={(val) =>
                  updateContent(["section5", "description"], val)
                }
                editable={editable}
              />
            </div>
          </div>

          <DarkFooter label="Descrição da Proposta" number="04" />
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="05"
            label="Responsividade"
            title={content.section4.title}
            subtitle={content.section4.subtitle}
            sectionKey="section4"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
            {content.section4.features.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-3"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[18px] font-bold"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor,
                  }}
                >
                  {idx === 0 ? "⬜" : idx === 1 ? "✦" : "⚡"}
                </div>
                <EditableText
                  tagName="h3"
                  className="text-[15px] font-semibold text-[#e6edf3]"
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
                  className="text-[13px] text-[#8b949e] leading-relaxed"
                  text={item.text}
                  onChange={(val) =>
                    updateContent(
                      ["section4", "features", idx.toString(), "text"],
                      val
                    )
                  }
                  editable={editable}
                />
              </div>
            ))}
          </div>

          <DarkFooter label="Responsividade" number="05" />
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="06"
            label="Prazos"
            title={content.section6.title}
            subtitle={content.section6.subtitle}
            sectionKey="section6"
          />

          <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden mt-2">
            <div
              className="grid grid-cols-[1fr,2fr,auto] gap-4 px-6 py-3 text-[11px] uppercase tracking-widest text-[#8b949e]"
              style={{ borderBottom: "1px solid #30363d" }}
            >
              <span>Etapa</span>
              <span>Descrição</span>
              <span>Prazo</span>
            </div>

            {content.section6.timeline.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr,2fr,auto] gap-4 px-6 py-4 items-center"
                style={
                  idx < content.section6.timeline.length - 1
                    ? { borderBottom: "1px solid #21262d" }
                    : {}
                }
              >
                <EditableText
                  tagName="span"
                  className="text-[14px] font-semibold text-[#e6edf3]"
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
                  tagName="span"
                  className="text-[13px] text-[#8b949e]"
                  text={item.text}
                  onChange={(val) =>
                    updateContent(
                      ["section6", "timeline", idx.toString(), "text"],
                      val
                    )
                  }
                  editable={editable}
                />
                <div>
                  <EditableText
                    tagName="span"
                    className="text-[12px] font-mono font-semibold px-3 py-1 rounded-full"
                    style={{
                      color: primaryColor,
                      backgroundColor: `${primaryColor}18`,
                    }}
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

          <DarkFooter label="Prazos e Entregas" number="06" />
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="07"
            label="Tecnologias"
            title={content.section7.title}
            subtitle={content.section7.subtitle}
            sectionKey="section7"
          />

          {technologies.length > 0 ? (
            <div className="flex flex-wrap gap-3 mt-4">
              {technologies.map((tech) => (
                <div
                  key={tech}
                  className="flex items-center gap-2 rounded-full px-4 py-2 border border-[#30363d] bg-[#161b22]"
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                    style={{
                      backgroundColor: `${primaryColor}25`,
                      color: primaryColor,
                    }}
                  >
                    {tech[0]}
                  </span>
                  <span className="text-[13px] font-medium text-[#e6edf3]">
                    {tech}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8b949e] mt-4 italic">
              Nenhuma tecnologia informada. Você pode editar esta seção para
              listar as principais ferramentas do projeto.
            </p>
          )}

          <DarkFooter label="Ferramentas & Tecnologias" number="07" />
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            num="08"
            label="Investimento"
            title={content.section8.title}
            subtitle={content.section8.subtitle}
            sectionKey="section8"
          />

          <p className="text-[13px] text-[#8b949e] mb-2 max-w-2xl leading-relaxed">
            Os valores abaixo podem ser ajustados conforme o escopo final
            definido em conjunto. Todos os formatos incluem suporte básico
            pós-entrega por um período acordado.
          </p>

          <div className="flex flex-col gap-5">
            <div
              className="relative rounded-xl border overflow-hidden p-7"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}08 100%)`,
                borderColor: primaryColor,
              }}
            >
              <div
                className="absolute top-0 left-0 w-40 h-40 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${primaryColor}18 0%, transparent 70%)`,
                }}
              />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <span
                    className="inline-flex items-center self-start px-3 py-1 rounded-full text-[11px] font-semibold border"
                    style={{
                      color: primaryColor,
                      borderColor: `${primaryColor}40`,
                      backgroundColor: `${primaryColor}18`,
                    }}
                  >
                    1ª opção — Recomendada
                  </span>
                  <EditableText
                    tagName="h3"
                    className="text-[18px] font-semibold text-[#e6edf3] mt-1"
                    text={content.section8.options.option1.title}
                    onChange={(val) =>
                      updateContent(
                        ["section8", "options", "option1", "title"],
                        val
                      )
                    }
                    editable={editable}
                  />
                  <EditableText
                    tagName="p"
                    className="text-[13px] text-[#8b949e]"
                    text={content.section8.options.option1.text}
                    onChange={(val) =>
                      updateContent(
                        ["section8", "options", "option1", "text"],
                        val
                      )
                    }
                    editable={editable}
                  />
                </div>

                <div className="flex flex-col items-start md:items-end gap-1 flex-shrink-0">
                  {value != null && (
                    <p className="text-[14px] line-through text-[#8b949e]">
                      {formatCurrencyBRL(value)}
                    </p>
                  )}
                  <p
                    className="text-[32px] font-bold leading-none"
                    style={{ color: primaryColor }}
                  >
                    {formatCurrencyBRL(valueDiscount)}
                  </p>
                  <p className="text-[11px] text-[#8b949e]">pagamento único</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-3">
                <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-[11px] font-semibold border border-[#30363d] text-[#8b949e] bg-[#0d1117]">
                  2ª opção
                </span>
                <EditableText
                  tagName="h3"
                  className="text-[15px] font-semibold text-[#e6edf3]"
                  text={content.section8.options.option2.title}
                  onChange={(val) =>
                    updateContent(
                      ["section8", "options", "option2", "title"],
                      val
                    )
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className="text-[13px] text-[#8b949e] leading-relaxed"
                  text={content.section8.options.option2.text}
                  onChange={(val) =>
                    updateContent(
                      ["section8", "options", "option2", "text"],
                      val
                    )
                  }
                  editable={editable}
                />
                <p
                  className="text-[16px] font-semibold mt-auto pt-2"
                  style={{ color: primaryColor }}
                >
                  Total: {formatCurrencyBRL(value)}
                </p>
              </div>

              <div className="relative rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-3">
                <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-[11px] font-semibold border border-[#30363d] text-[#8b949e] bg-[#0d1117]">
                  3ª opção
                </span>
                <EditableText
                  tagName="h3"
                  className="text-[15px] font-semibold text-[#e6edf3]"
                  text={content.section8.options.option3.title}
                  onChange={(val) =>
                    updateContent(
                      ["section8", "options", "option3", "title"],
                      val
                    )
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className="text-[13px] text-[#8b949e] leading-relaxed"
                  text={content.section8.options.option3.text}
                  onChange={(val) =>
                    updateContent(
                      ["section8", "options", "option3", "text"],
                      val
                    )
                  }
                  editable={editable}
                />
                <p
                  className="text-[16px] font-semibold mt-auto pt-2"
                  style={{ color: primaryColor }}
                >
                  {formatCurrencyBRL(value12x)} / mês
                </p>
              </div>

              <div className="relative rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-3">
                <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-[11px] font-semibold border border-[#30363d] text-[#8b949e] bg-[#0d1117]">
                  4ª opção
                </span>
                <EditableText
                  tagName="h3"
                  className="text-[15px] font-semibold text-[#e6edf3]"
                  text={content.section8.options.option4.title}
                  onChange={(val) =>
                    updateContent(
                      ["section8", "options", "option4", "title"],
                      val
                    )
                  }
                  editable={editable}
                />
                <EditableText
                  tagName="p"
                  className="text-[13px] text-[#8b949e] leading-relaxed"
                  text={content.section8.options.option4.text}
                  onChange={(val) =>
                    updateContent(
                      ["section8", "options", "option4", "text"],
                      val
                    )
                  }
                  editable={editable}
                />
                <p
                  className="text-[16px] font-semibold mt-auto pt-2"
                  style={{ color: primaryColor }}
                >
                  {formatCurrencyBRL(value)} em parcelas a combinar
                </p>
              </div>
            </div>
          </div>

          <DarkFooter label="Investimento" number="08" />
        </div>
      </section>
    </div>
  );
}
