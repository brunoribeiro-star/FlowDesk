import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { ProposalContent } from "./Template1";

function formatBRL(v?: number | null) {
  if (v == null || isNaN(v)) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type PageSize = { width: number; height: number };

export type ProposalPDFProps = {
  projectName?: string;
  clientName?: string;
  technologies?: string[];
  primaryColor?: string;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  value?: number | null;
  valueDiscount?: number | null;
  value12x?: number | null;
  dueDate?: string | null;
  date?: string | null;
  content: ProposalContent;
  pageSizes?: PageSize[];
};

const W = 900;
const H_DEFAULT = 595;

const s = StyleSheet.create({
  page: {
    width: W,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    flexDirection: "column",
    padding: "36 48 28 48",
  },
  sectionHeaderWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: "#475569",
    textAlign: "center",
    maxWidth: 480,
    lineHeight: 1.5,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 10,
    padding: "14 16",
    backgroundColor: "#ffffff",
  },
  body: {
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.5,
  },
  small: {
    fontSize: 9,
    color: "#64748b",
    lineHeight: 1.4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 7,
    marginTop: 14,
  },
  footerText: {
    fontSize: 9,
    color: "#ffffff",
    fontFamily: "Helvetica",
  },
  optionBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  optionBadgeText: {
    fontSize: 8,
  },
});

function SectionHeader({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <View style={s.sectionHeaderWrap}>
      <Text style={[s.sectionTitle, { color: accent }]}>{title}</Text>
      {subtitle ? (
        <Text style={s.sectionSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function Footer({
  label,
  num,
  accent,
}: {
  label: string;
  num: string;
  accent: string;
}) {
  return (
    <View style={[s.footer, { backgroundColor: accent }]}>
      <Text style={s.footerText}>{label}</Text>
      <Text style={s.footerText}>{num}</Text>
    </View>
  );
}

export default function ProposalPDF({
  projectName = "Nome do projeto",
  clientName = "Cliente",
  technologies = [],
  primaryColor = "#22c55e",
  bannerUrl,
  logoUrl,
  value,
  valueDiscount,
  value12x,
  dueDate,
  date,
  content,
  pageSizes,
}: ProposalPDFProps) {
  const accent = primaryColor;
  const accentCardBg = "#f8fafc";

  const sz = (i: number): [number, number] => [
    pageSizes?.[i]?.width ?? W,
    pageSizes?.[i]?.height ?? H_DEFAULT,
  ];

  return (
    <Document>
      <Page size={sz(0)} style={{ fontFamily: "Helvetica", flexDirection: "column" }}>
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: accent,
            }}
          />
        )}

        <View
          style={{
            margin: "28 36",
            backgroundColor: "#f9fdf9",
            borderRadius: 16,
            padding: "28 36",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <View>
            {logoUrl ? (
              <Image
                src={logoUrl}
                style={{ height: 38, maxWidth: 140, objectFit: "contain" }}
              />
            ) : (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: accent,
                }}
              />
            )}
          </View>

          <View>
            <Text
              style={{
                fontSize: 34,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              {projectName}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Proposta comercial para {clientName}
            </Text>
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#e2e8f0",
              borderTopStyle: "solid",
              paddingTop: 14,
              flexDirection: "row",
              gap: 32,
            }}
          >
            {[
              { label: "CLIENTE", value: clientName },
              { label: "VENCIMENTO", value: dueDate || "--/--/----" },
              { label: "DATA DA PROPOSTA", value: date || "--/--/----" },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: "column", gap: 3 }}>
                <Text
                  style={{
                    fontSize: 8,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </Text>
                <Text style={{ fontSize: 10, color: "#0f172a" }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      <Page size={sz(1)} style={s.page}>
        <SectionHeader
          title={content.section1.title}
          subtitle={content.section1.subtitle}
          accent={accent}
        />
        <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
          {content.section1.items.map((item, i) => (
            <View
              key={i}
              style={[
                s.card,
                {
                  flex: 1,
                  backgroundColor: accentCardBg,
                  borderColor: accent + "44",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Helvetica-Bold",
                  color: accent,
                  marginBottom: 5,
                }}
              >
                {item.num}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Helvetica-Bold",
                  color: "#0f172a",
                  marginBottom: 4,
                }}
              >
                {item.title}
              </Text>
              <Text style={s.body}>{item.text}</Text>
            </View>
          ))}
        </View>
        <Footer label="Conteúdo da Proposta" num="01" accent={accent} />
      </Page>

      <Page size={sz(2)} style={s.page}>
        <SectionHeader
          title={content.section2.title}
          subtitle={content.section2.subtitle}
          accent={accent}
        />
        <View style={{ flexDirection: "row", gap: 16, flex: 1 }}>
          <View style={[s.card, { flex: 1 }]}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
                marginBottom: 10,
              }}
            >
              Nossos valores
            </Text>
            {content.section2.values.map((v, i) => (
              <View key={i} style={{ marginBottom: 7 }}>
                <Text style={{ fontSize: 10, color: "#0f172a", lineHeight: 1.5 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{v.title}</Text>
                  {"  "}
                  {v.text}
                </Text>
              </View>
            ))}
          </View>

          <View style={[s.card, { flex: 1 }]}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
                marginBottom: 10,
              }}
            >
              {content.section2.aboutTitle}
            </Text>
            <Text style={[s.body, { marginBottom: 8 }]}>
              {content.section2.aboutText1}
            </Text>
            <Text style={s.body}>{content.section2.aboutText2}</Text>
          </View>
        </View>
        <Footer label="Nossos Valores & Sobre Nós" num="02" accent={accent} />
      </Page>

      <Page size={sz(3)} style={s.page}>
        <SectionHeader
          title={content.section3.title}
          subtitle={content.section3.subtitle}
          accent={accent}
        />
        <View style={{ flexDirection: "row", gap: 14, flex: 1 }}>
          {content.section3.steps.map((step, i) => (
            <View
              key={i}
              style={[
                s.card,
                {
                  flex: 1,
                  backgroundColor: step.highlight ? accent : "#ffffff",
                  borderColor: step.highlight ? accent : "#e2e8f0",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Helvetica-Bold",
                  color: step.highlight ? "#ffffff" : "#0f172a",
                  marginBottom: 6,
                }}
              >
                {step.num}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Helvetica-Bold",
                  color: step.highlight ? "#ffffff" : "#0f172a",
                  marginBottom: 5,
                }}
              >
                {step.title}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: step.highlight ? "#ffffffcc" : "#64748b",
                  lineHeight: 1.5,
                }}
              >
                {step.text}
              </Text>
            </View>
          ))}
        </View>
        <Footer label="Etapas de Criação" num="03" accent={accent} />
      </Page>

      <Page size={sz(4)} style={s.page}>
        <SectionHeader
          title={content.section4.title}
          subtitle={content.section4.subtitle}
          accent={accent}
        />
        <View
          style={{
            flexDirection: "row",
            gap: 28,
            flex: 1,
            alignItems: "center",
          }}
        >
          <View style={{ width: 110, alignItems: "center" }}>
            <View
              style={{
                width: 78,
                height: 148,
                borderRadius: 18,
                backgroundColor: "#0f172a",
                padding: 5,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  flex: 1,
                  width: "100%",
                  borderRadius: 13,
                  backgroundColor: accent,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 7,
                    color: "#ffffff",
                    textAlign: "center",
                    lineHeight: 1.4,
                  }}
                >
                  Layout adaptado{"\n"}para qualquer{"\n"}tela
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1, gap: 14 }}>
            {content.section4.features.map((f, i) => (
              <View
                key={i}
                style={{
                  paddingLeft: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: accent,
                  borderLeftStyle: "solid",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Helvetica-Bold",
                    color: "#0f172a",
                    marginBottom: 3,
                  }}
                >
                  {f.title}
                </Text>
                <Text style={s.body}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
        <Footer label="Responsividade" num="04" accent={accent} />
      </Page>

      <Page size={sz(5)} style={s.page}>
        <SectionHeader
          title={content.section5.title}
          subtitle={content.section5.subtitle}
          accent={accent}
        />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text
            style={{
              fontSize: 12,
              color: "#334155",
              textAlign: "center",
              maxWidth: 560,
              lineHeight: 1.7,
            }}
          >
            {content.section5.description}
          </Text>
        </View>
        <Footer label="Descrição da Proposta" num="05" accent={accent} />
      </Page>

      <Page size={sz(6)} style={s.page}>
        <SectionHeader
          title={content.section6.title}
          subtitle={content.section6.subtitle}
          accent={accent}
        />
        <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
          {content.section6.timeline.map((item, i) => (
            <View
              key={i}
              style={[
                s.card,
                { flex: 1, flexDirection: "column", justifyContent: "space-between" },
              ]}
            >
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Helvetica-Bold",
                    color: "#0f172a",
                    marginBottom: 5,
                  }}
                >
                  {item.title}
                </Text>
                <Text style={s.body}>{item.text}</Text>
              </View>
              <View>
                <View
                  style={{
                    height: 2,
                    backgroundColor: accent,
                    borderRadius: 2,
                    marginBottom: 6,
                  }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Helvetica-Bold",
                    color: "#0f172a",
                  }}
                >
                  {item.day}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Footer label="Prazos e Entregas" num="06" accent={accent} />
      </Page>

      <Page size={sz(7)} style={s.page}>
        <SectionHeader
          title={content.section7.title}
          subtitle={content.section7.subtitle}
          accent={accent}
        />
        {technologies.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              flex: 1,
              alignContent: "flex-start",
            }}
          >
            {technologies.map((tech) => (
              <View key={tech} style={[s.card, { width: 155 }]}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: accent,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Helvetica-Bold",
                      color: "#ffffff",
                    }}
                  >
                    {tech[0].toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Helvetica-Bold",
                    color: "#0f172a",
                    marginBottom: 3,
                  }}
                >
                  {tech}
                </Text>
                <Text style={s.small}>Tecnologia utilizada no projeto.</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={s.body}>Nenhuma tecnologia informada.</Text>
          </View>
        )}
        <Footer label="Ferramentas & Tecnologias" num="07" accent={accent} />
      </Page>

      <Page size={sz(8)} style={s.page}>
        <SectionHeader
          title={content.section8.title}
          subtitle={content.section8.subtitle}
          accent={accent}
        />
        <Text
          style={{
            fontSize: 9,
            color: "#64748b",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Os valores abaixo podem ser ajustados conforme o escopo final definido em conjunto.
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            flex: 1,
            alignContent: "flex-start",
          }}
        >
          <View
            style={{
              width: "48%",
              backgroundColor: accent,
              borderRadius: 10,
              padding: "14 16",
            }}
          >
            <View
              style={[
                s.optionBadge,
                { backgroundColor: "#ffffff33" },
              ]}
            >
              <Text style={[s.optionBadgeText, { color: "#ffffff" }]}>
                1ª opção
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Helvetica-Bold",
                color: "#ffffff",
                marginBottom: 3,
              }}
            >
              {content.section8.options.option1.title}
            </Text>
            <Text
              style={{ fontSize: 9, color: "#ffffffcc", marginBottom: 10 }}
            >
              {content.section8.options.option1.text}
            </Text>
            {value != null && (
              <Text
                style={{
                  fontSize: 10,
                  color: "#ffffffaa",
                  textDecoration: "line-through",
                  marginBottom: 2,
                }}
              >
                {formatBRL(value)}
              </Text>
            )}
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Helvetica-Bold",
                color: "#ffffff",
              }}
            >
              {formatBRL(valueDiscount)}
            </Text>
          </View>

          <View style={[s.card, { width: "48%" }]}>
            <View style={[s.optionBadge, { backgroundColor: "#f1f5f9" }]}>
              <Text style={[s.optionBadgeText, { color: "#334155" }]}>
                2ª opção
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
                marginBottom: 3,
              }}
            >
              {content.section8.options.option2.title}
            </Text>
            <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 8 }}>
              {content.section8.options.option2.text}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
              }}
            >
              Total: {formatBRL(value)}
            </Text>
          </View>

          <View style={[s.card, { width: "48%" }]}>
            <View style={[s.optionBadge, { backgroundColor: "#f1f5f9" }]}>
              <Text style={[s.optionBadgeText, { color: "#334155" }]}>
                3ª opção
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
                marginBottom: 3,
              }}
            >
              {content.section8.options.option3.title}
            </Text>
            <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 8 }}>
              {content.section8.options.option3.text}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
              }}
            >
              {formatBRL(value12x)} / mês
            </Text>
          </View>

          <View style={[s.card, { width: "48%" }]}>
            <View style={[s.optionBadge, { backgroundColor: "#f1f5f9" }]}>
              <Text style={[s.optionBadgeText, { color: "#334155" }]}>
                4ª opção
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
                marginBottom: 3,
              }}
            >
              {content.section8.options.option4.title}
            </Text>
            <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 8 }}>
              {content.section8.options.option4.text}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Helvetica-Bold",
                color: "#0f172a",
              }}
            >
              {formatBRL(value)} em parcelas a combinar
            </Text>
          </View>
        </View>

        <Footer label="Investimento" num="08" accent={accent} />
      </Page>
    </Document>
  );
}
