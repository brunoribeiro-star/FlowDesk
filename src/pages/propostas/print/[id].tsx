import type { GetServerSideProps } from "next";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";
import Template1, {
  ProposalContent,
  DEFAULT_CONTENT,
} from "@/components/proposals/Template1";
import Template2 from "@/components/proposals/Template2";
import Template3 from "@/components/proposals/Template3";
import { validatePrintToken } from "@/lib/printToken";

interface Props {
  proposal: any;
  content: ProposalContent;
}

export default function ProposalPrintView({ proposal, content }: Props) {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}</style>
      </Head>

      <div className="w-full">
        {(() => {
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
            content,
            technologies: proposal.description?.technologies || [],
          };
          if (tpl === "template2") return <Template2 {...sharedProps} />;
          if (tpl === "template3") return <Template3 {...sharedProps} />;
          return <Template1 {...sharedProps} />;
        })()}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  const id = params?.id as string;
  const token = query.token as string | undefined;

  if (!token || !validatePrintToken(token, id)) {
    return { notFound: true };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { notFound: true };
  }

  const content: ProposalContent =
    data.description?.content ?? DEFAULT_CONTENT;

  return {
    props: {
      proposal: data,
      content,
    },
  };
};
