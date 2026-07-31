import type { GetServerSideProps } from "next";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";
import Template1, {
  ProposalContent,
  DEFAULT_CONTENT,
} from "@/components/proposals/Template1";
import Template2 from "@/components/proposals/Template2";
import Template3 from "@/components/proposals/Template3";

interface Props {
  status: "ok" | "expired" | "not_found";
  proposal?: any;
  content?: ProposalContent;
}

function StatusCard({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen bg-primary-900 text-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-primary-800 border border-primary-700 rounded-2xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center gap-4 text-center">
          {icon}
          <h1 className="text-[20px] font-semibold text-gray-100">{title}</h1>
          <p className="text-gray-400 text-[14px]">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicProposalView({ status, proposal, content }: Props) {
  if (status === "not_found") {
    return (
      <StatusCard
        icon={
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
        }
        title="Link inválido"
        message="Este link de proposta não existe ou foi removido."
      />
    );
  }

  if (status === "expired") {
    return (
      <StatusCard
        icon={
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
        }
        title="Link expirado"
        message="Esta proposta venceu. Entre em contato com quem enviou o link para receber uma versão atualizada."
      />
    );
  }

  const tpl = proposal.description?.template;
  const sharedProps = {
    projectName: proposal.title,
    clientName: proposal.description?.clientName || "Cliente",
    companyName: "FlowDesk",
    primaryColor: proposal.primary_color,
    secondaryColor: proposal.secondary_color,
    bannerUrl: proposal.banner_url,
    logoUrl: proposal.company_logo_url,
    value: proposal.value,
    valueDiscount: proposal.value_discount,
    value12x: proposal.value_12x,
    dueDate: proposal.due_date
      ? new Date(proposal.due_date + "T00:00:00").toLocaleDateString("pt-BR")
      : "",
    date: new Date(proposal.created_at).toLocaleDateString("pt-BR"),
    editable: false,
    content: content as ProposalContent,
    technologies: proposal.description?.technologies || [],
  };

  return (
    <>
      <Head>
        <title>{`${proposal.title} — Proposta comercial`}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="w-full border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-center">
          <span className="text-[13px] font-semibold tracking-tight text-slate-500">
            Proposta comercial via <span className="text-slate-900">FlowDesk</span>
          </span>
        </div>

        <div className="w-full">
          {tpl === "template2" ? (
            <Template2 {...sharedProps} />
          ) : tpl === "template3" ? (
            <Template3 {...sharedProps} />
          ) : (
            <Template1 {...sharedProps} />
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const token = params?.token as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("public_token", token)
    .single();

  if (error || !data) {
    return { props: { status: "not_found" } };
  }

  if (data.due_date && new Date(data.due_date + "T00:00:00") < new Date()) {
    return { props: { status: "expired" } };
  }

  const content: ProposalContent = data.description?.content ?? DEFAULT_CONTENT;

  return {
    props: {
      status: "ok",
      proposal: data,
      content,
    },
  };
};
