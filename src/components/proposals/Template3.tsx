import React from "react";
import {
  ProposalContent,
  DEFAULT_CONTENT,
  formatCurrencyBRL,
} from "./Template1";

type Template3Props = {
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

export default function Template3({
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
}: Template3Props) {
  const safeProject = projectName || "Nome do projeto";
  const safeClient = clientName || "Nome do cliente";
  const safeCompany = companyName || "Sua empresa";
  const safeDate = date || "__/__/____";
  const safeDue = dueDate || "__/__/____";

  const updateContent = (path: string[], value: string) => {
    if (!onContentChange) return;
    const newContent = JSON.parse(JSON.stringify(content));
    let current: any = newContent;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onContentChange(newContent);
  };

  const accentStyle: React.CSSProperties = { color: primaryColor };
  const accentBorderStyle: React.CSSProperties = {
    borderLeftColor: primaryColor,
  };
  const accentBgLightStyle: React.CSSProperties = {
    backgroundColor: `${primaryColor}08`,
  };
  const accentUnderlineStyle: React.CSSProperties = {
    borderBottomColor: primaryColor,
  };
  const accentBgStyle: React.CSSProperties = { backgroundColor: primaryColor };

  const pageClass =
    "w-full flex justify-center py-16 md:py-20 bg-white text-[#111827]";
  const pageAltClass =
    "w-full flex justify-center py-16 md:py-20 bg-[#f9fafb] text-[#111827]";
  const pageInnerClass =
    "w-full max-w-[1200px] px-6 md:px-10 flex flex-col gap-8 font-[var(--font-dm-sans)]";

  const SectionHeader = ({
    displayNum,
    title,
    subtitle,
    sectionKey,
  }: {
    displayNum: string;
    title: string;
    subtitle?: string;
    sectionKey: keyof ProposalContent;
  }) => (
    <div className="flex flex-col gap-0 pb-4 border-b border-[#e5e7eb]">
      <div className="flex items-end gap-4 leading-none">
        <span
          className="text-[80px] font-black leading-none select-none"
          style={{ color: "#f3f4f6" }}
        >
          {displayNum}
        </span>
        <div className="flex flex-col gap-1 pb-2">
          <EditableText
            tagName="h2"
            className="text-[22px] md:text-[24px] font-semibold tracking-tight"
            style={accentStyle}
            text={title}
            onChange={(val) => updateContent([sectionKey, "title"], val)}
            editable={editable}
          />
          {subtitle && (
            <EditableText
              tagName="p"
              className="text-[13px] md:text-[14px] text-[#6b7280] leading-relaxed"
              text={subtitle}
              onChange={(val) => updateContent([sectionKey, "subtitle"], val)}
              editable={editable}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white text-[#111827]">
      <section className="w-full flex flex-col bg-white pdf-section">
        {bannerUrl && (
          <div
            className="w-full"
            style={{
              height: "260px",
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <div className="flex justify-center py-16 md:py-20">
          <div className={pageInnerClass}>
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
                  <div
                    className="w-10 h-10 rounded-xl border-2"
                    style={{ borderColor: primaryColor }}
                  />
                )}
              </div>
              <span className="text-[13px] text-[#6b7280] mt-1">
                {safeDate}
              </span>
            </div>

            <div className="relative flex flex-col gap-0 mt-4">
              <span
                className="text-[160px] font-black leading-none select-none pointer-events-none"
                style={{ color: "#f3f4f6", marginBottom: "-60px" }}
              >
                00
              </span>
              <div className="relative z-10 flex flex-col gap-3">
                <h1
                  className="text-[52px] font-light tracking-tight text-[#111827] border-b-[3px] pb-3"
                  style={accentUnderlineStyle}
                >
                  {safeProject}
                </h1>
                <p className="text-[15px] text-[#6b7280]">
                  Proposta comercial para{" "}
                  <span className="font-medium text-[#111827]">
                    {safeClient}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#e5e7eb] flex flex-wrap gap-8">
              {[
                { label: "Cliente", value: safeClient },
                { label: "Empresa", value: safeCompany },
                { label: "Vencimento", value: safeDue },
                { label: "Data da proposta", value: safeDate },
              ].map((item, idx) => (
                <div className="flex flex-col gap-1" key={idx}>
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-[#6b7280]">
                    {item.label}
                  </span>
                  <span className="text-[14px] font-medium text-[#111827]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${pageAltClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="01"
            title={content.section5.title}
            subtitle={content.section5.subtitle}
            sectionKey="section5"
          />

          <div
            className="border-l-[4px] pl-6 py-2"
            style={accentBorderStyle}
          >
            <EditableText
              tagName="p"
              className="text-[16px] text-[#111827] leading-[1.85] max-w-3xl"
              text={content.section5.description}
              onChange={(val) =>
                updateContent(["section5", "description"], val)
              }
              editable={editable}
            />
          </div>
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="02"
            title={content.section8.title}
            subtitle={content.section8.subtitle}
            sectionKey="section8"
          />

          <div
            className="border-l-[4px] pl-6 py-4 flex flex-col gap-2 rounded-r-xl"
            style={{ ...accentBorderStyle, ...accentBgLightStyle }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-[11px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full text-white"
                style={accentBgStyle}
              >
                Melhor oferta
              </span>
              <EditableText
                tagName="span"
                className="text-[15px] font-semibold text-[#111827]"
                text={content.section8.options.option1.title}
                onChange={(val) =>
                  updateContent(
                    ["section8", "options", "option1", "title"],
                    val
                  )
                }
                editable={editable}
              />
            </div>
            <EditableText
              tagName="p"
              className="text-[13px] text-[#6b7280]"
              text={content.section8.options.option1.text}
              onChange={(val) =>
                updateContent(["section8", "options", "option1", "text"], val)
              }
              editable={editable}
            />
            <div className="flex items-baseline gap-4 mt-1">
              {value != null && (
                <span className="text-[15px] text-[#6b7280] line-through">
                  {formatCurrencyBRL(value)}
                </span>
              )}
              <span
                className="text-[40px] font-black tracking-tight leading-none"
                style={accentStyle}
              >
                {formatCurrencyBRL(valueDiscount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-semibold">
                2ª opção
              </span>
              <EditableText
                tagName="h3"
                className="text-[16px] font-semibold text-[#111827]"
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
                className="text-[13px] text-[#6b7280] leading-relaxed"
                text={content.section8.options.option2.text}
                onChange={(val) =>
                  updateContent(
                    ["section8", "options", "option2", "text"],
                    val
                  )
                }
                editable={editable}
              />
              <span
                className="text-[22px] font-bold mt-auto pt-3"
                style={accentStyle}
              >
                {formatCurrencyBRL(value)}
              </span>
            </div>

            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-semibold">
                3ª opção
              </span>
              <EditableText
                tagName="h3"
                className="text-[16px] font-semibold text-[#111827]"
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
                className="text-[13px] text-[#6b7280] leading-relaxed"
                text={content.section8.options.option3.text}
                onChange={(val) =>
                  updateContent(
                    ["section8", "options", "option3", "text"],
                    val
                  )
                }
                editable={editable}
              />
              <span
                className="text-[22px] font-bold mt-auto pt-3"
                style={accentStyle}
              >
                {formatCurrencyBRL(value12x)}
                <span className="text-[14px] font-normal text-[#6b7280]">
                  {" "}
                  / mês
                </span>
              </span>
            </div>

            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-semibold">
                4ª opção
              </span>
              <EditableText
                tagName="h3"
                className="text-[16px] font-semibold text-[#111827]"
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
                className="text-[13px] text-[#6b7280] leading-relaxed"
                text={content.section8.options.option4.text}
                onChange={(val) =>
                  updateContent(
                    ["section8", "options", "option4", "text"],
                    val
                  )
                }
                editable={editable}
              />
              <span
                className="text-[22px] font-bold mt-auto pt-3"
                style={accentStyle}
              >
                {formatCurrencyBRL(value)}
                <span className="text-[14px] font-normal text-[#6b7280]">
                  {" "}
                  a combinar
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${pageAltClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="03"
            title={content.section3.title}
            subtitle={content.section3.subtitle}
            sectionKey="section3"
          />

          <div className="flex flex-col">
            {content.section3.steps.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-6 py-6 border-b border-[#e5e7eb] ${
                  item.highlight ? "border-l-[4px] pl-5" : ""
                }`}
                style={
                  item.highlight
                    ? { ...accentBorderStyle, ...accentBgLightStyle }
                    : {}
                }
              >
                <span
                  className="text-[36px] font-black leading-none shrink-0 w-16 text-center"
                  style={accentStyle}
                >
                  {item.num}
                </span>
                <div className="flex flex-col gap-1">
                  <EditableText
                    tagName="h3"
                    className="text-[17px] font-semibold text-[#111827]"
                    text={item.title}
                    onChange={(val) =>
                      updateContent(
                        ["section3", "steps", idx.toString(), "title"],
                        val
                      )
                    }
                    editable={editable}
                  />
                  <EditableText
                    tagName="p"
                    className="text-[14px] text-[#6b7280] leading-relaxed"
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
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="04"
            title={content.section6.title}
            subtitle={content.section6.subtitle}
            sectionKey="section6"
          />

          <div className="flex flex-col">
            {content.section6.timeline.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-6 py-5 border-b border-[#e5e7eb]"
              >
                <div className="flex flex-col gap-1 flex-1">
                  <EditableText
                    tagName="h3"
                    className="text-[16px] font-semibold text-[#111827]"
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
                    className="text-[13px] text-[#6b7280] leading-relaxed"
                    text={item.text}
                    onChange={(val) =>
                      updateContent(
                        ["section6", "timeline", idx.toString(), "text"],
                        val
                      )
                    }
                    editable={editable}
                  />
                </div>
                <EditableText
                  tagName="div"
                  className="text-[15px] font-bold shrink-0"
                  style={accentStyle}
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
            ))}
          </div>
        </div>
      </section>

      <section
        className={`${pageAltClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="05"
            title={content.section2.title}
            subtitle={content.section2.subtitle}
            sectionKey="section2"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-2 items-start">
            <div className="flex flex-col gap-5">
              <h3 className="text-[12px] uppercase font-semibold tracking-widest text-[#6b7280]">
                Nossos valores
              </h3>
              <ul className="flex flex-col gap-5">
                {content.section2.values.map((val, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      className="text-[12px] font-black mt-0.5 shrink-0 w-5 text-right leading-relaxed"
                      style={accentStyle}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[14px] text-[#111827] leading-relaxed">
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
                        className="text-[#6b7280]"
                        text={val.text}
                        onChange={(v) =>
                          updateContent(
                            ["section2", "values", idx.toString(), "text"],
                            v
                          )
                        }
                        editable={editable}
                      />
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <EditableText
                tagName="h3"
                className="text-[12px] uppercase font-semibold tracking-widest text-[#6b7280]"
                text={content.section2.aboutTitle}
                onChange={(val) =>
                  updateContent(["section2", "aboutTitle"], val)
                }
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[15px] text-[#111827] leading-[1.8]"
                text={content.section2.aboutText1}
                onChange={(val) =>
                  updateContent(["section2", "aboutText1"], val)
                }
                editable={editable}
              />
              <EditableText
                tagName="p"
                className="text-[15px] text-[#6b7280] leading-[1.8]"
                text={content.section2.aboutText2}
                onChange={(val) =>
                  updateContent(["section2", "aboutText2"], val)
                }
                editable={editable}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="06"
            title={content.section7.title}
            subtitle={content.section7.subtitle}
            sectionKey="section7"
          />

          {technologies.length > 0 ? (
            <div className="flex flex-wrap gap-3 mt-2">
              {technologies.map((tech) => (
                <div
                  key={tech}
                  className="flex items-center gap-2 border border-[#e5e7eb] rounded-full px-4 py-2 bg-white"
                >
                  <span
                    className="text-[13px] font-black"
                    style={accentStyle}
                  >
                    {tech[0]}
                  </span>
                  <span className="text-[14px] text-[#111827] font-medium">
                    {tech}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[#6b7280] mt-4 italic">
              Nenhuma tecnologia informada. Você pode editar esta seção para
              listar as principais ferramentas do projeto.
            </p>
          )}
        </div>
      </section>

      <section
        className={`${pageAltClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="07"
            title={content.section4.title}
            subtitle={content.section4.subtitle}
            sectionKey="section4"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
            {content.section4.features.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#e5e7eb] rounded-xl p-6 flex flex-col gap-3"
              >
                <span
                  className="text-[28px] font-black leading-none"
                  style={accentStyle}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <EditableText
                  tagName="h3"
                  className="text-[16px] font-semibold text-[#111827]"
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
                  className="text-[13px] text-[#6b7280] leading-relaxed"
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
        </div>
      </section>

      <section
        className={`${pageClass} pdf-section`}
        style={{ pageBreakBefore: "always" }}
      >
        <div className={pageInnerClass}>
          <SectionHeader
            displayNum="08"
            title="O que cobrimos"
            subtitle={content.section1.subtitle}
            sectionKey="section1"
          />

          <div className="flex flex-col mt-2">
            {content.section1.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-6 py-5 border-b border-[#e5e7eb]"
              >
                <span
                  className="text-[15px] font-black shrink-0 w-8"
                  style={accentStyle}
                >
                  {item.num}
                </span>
                <div className="flex flex-col gap-1 flex-1">
                  <EditableText
                    tagName="h3"
                    className="text-[15px] font-semibold text-[#111827]"
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
                    className="text-[13px] text-[#6b7280] leading-relaxed"
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
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
