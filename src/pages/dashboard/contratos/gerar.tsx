"use client";

import { useEffect, useState } from "react";
import ContractEditorPage from "@/components/ContractEditorPage";

const DRAFT_KEY = "flowdesk_contract_draft";

type DraftData = {
  content: string;
  titulo: string;
  fontFamily: "times" | "arial";
  templateIdRef: string | null;
  clientId: string | null;
  varsData: Record<string, string>;
};

export default function GerarContratoPage() {
  const [data, setData] = useState<DraftData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) { setNotFound(true); return; }
    try {
      setData(JSON.parse(raw));
    } catch {
      setNotFound(true);
    }
  }, []);

  if (notFound) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">
          Nenhum rascunho encontrado.{" "}
          <a href="/dashboard/contratos" className="text-primary-400 hover:underline">Voltar aos contratos</a>
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <ContractEditorPage mode="generate" generateData={data} />;
}
