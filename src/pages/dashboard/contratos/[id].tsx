import type { GetServerSideProps } from "next";
import ContractEditorPage from "@/components/ContractEditorPage";

interface Props {
  id: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id;
  if (!id || typeof id !== "string") return { notFound: true };
  return { props: { id } };
};

export default function EditarContratoPage({ id }: Props) {
  return <ContractEditorPage mode="edit" templateId={id} />;
}
