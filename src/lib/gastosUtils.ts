export type TipoGasto = "variavel" | "fixo" | "parcelado";

export interface Gasto {
    id: string;
    user_id: string;
    descricao: string;
    categoria: string;
    tipo: TipoGasto;
    valor: number;
    data_inicio: string; // YYYY-MM-DD
    total_parcelas: number | null;
    data_fim: string | null;
    created_at: string;
    updated_at: string;
}

export interface GastoDoMes extends Gasto {
    parcela_atual: number | null;
}

function parseAnoMes(dataStr: string): { ano: number; mes: number } {
    const [ano, mes] = dataStr.split("-").map(Number);
    return { ano, mes };
}

function mesIndex(ano: number, mes: number): number {
    return ano * 12 + mes;
}

export function getGastosDoMes(gastos: Gasto[], ano: number, mes: number): GastoDoMes[] {
    const alvo = mesIndex(ano, mes);
    const resultado: GastoDoMes[] = [];

    for (const gasto of gastos) {
        const inicio = parseAnoMes(gasto.data_inicio);
        const inicioIndex = mesIndex(inicio.ano, inicio.mes);

        if (gasto.tipo === "variavel") {
            if (inicioIndex === alvo) {
                resultado.push({ ...gasto, parcela_atual: null });
            }
            continue;
        }

        if (gasto.tipo === "fixo") {
            if (alvo < inicioIndex) continue;
            if (gasto.data_fim) {
                const fim = parseAnoMes(gasto.data_fim);
                if (alvo > mesIndex(fim.ano, fim.mes)) continue;
            }
            resultado.push({ ...gasto, parcela_atual: null });
            continue;
        }

        if (gasto.tipo === "parcelado") {
            const totalParcelas = gasto.total_parcelas ?? 0;
            const offset = alvo - inicioIndex;
            if (offset >= 0 && offset < totalParcelas) {
                resultado.push({ ...gasto, parcela_atual: offset + 1 });
            }
        }
    }

    return resultado;
}

export function getGastosPorPeriodo(
    gastos: Gasto[],
    meses: { ano: number; mes: number }[]
): Record<string, GastoDoMes[]> {
    const resultado: Record<string, GastoDoMes[]> = {};
    for (const { ano, mes } of meses) {
        const key = `${ano}-${String(mes).padStart(2, "0")}`;
        resultado[key] = getGastosDoMes(gastos, ano, mes);
    }
    return resultado;
}

export function totalGastosDoMes(gastosDoMes: GastoDoMes[]): number {
    return Math.round(gastosDoMes.reduce((acc, g) => acc + Number(g.valor || 0), 0) * 100) / 100;
}

export type StatusGasto = "ativo" | "encerrado" | "unico";

export interface SituacaoGasto {
    status: StatusGasto;
    fimEstimado: string | null;
}

export function getSituacaoGasto(gasto: Gasto, hoje: Date = new Date()): SituacaoGasto {
    const hojeIndex = mesIndex(hoje.getFullYear(), hoje.getMonth() + 1);

    if (gasto.tipo === "variavel") {
        return { status: "unico", fimEstimado: null };
    }

    if (gasto.tipo === "fixo") {
        if (!gasto.data_fim) return { status: "ativo", fimEstimado: null };
        const fim = parseAnoMes(gasto.data_fim);
        const fimIndex = mesIndex(fim.ano, fim.mes);
        return { status: hojeIndex > fimIndex ? "encerrado" : "ativo", fimEstimado: gasto.data_fim };
    }

    const inicio = parseAnoMes(gasto.data_inicio);
    const inicioIndex = mesIndex(inicio.ano, inicio.mes);
    const totalParcelas = gasto.total_parcelas ?? 0;
    const fimIndex = inicioIndex + totalParcelas - 1;
    const fimAno = Math.floor((fimIndex - 1) / 12);
    const fimMes = fimIndex - fimAno * 12;
    const fimEstimado = `${fimAno}-${String(fimMes).padStart(2, "0")}-01`;
    return { status: hojeIndex > fimIndex ? "encerrado" : "ativo", fimEstimado };
}

export const CATEGORIAS_GASTO = [
    "Moradia/Aluguel",
    "Software/Assinaturas",
    "Marketing",
    "Impostos",
    "Equipamentos",
    "Transporte",
    "Alimentação",
    "Outros",
] as const;
