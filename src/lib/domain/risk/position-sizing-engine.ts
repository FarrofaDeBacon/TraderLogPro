/**
 * Interface de entrada limpa, independente de stores, UI ou banco de dados.
 */
export interface PositionSizingInput {
    // Valores Fundamentais Obrigatórios (Risco vs Conta)
    capital: number;
    riskPerTradePercent: number; // ex: 1.0 = 1%
    
    // Parâmetros do Trade (Asset rules + Setup rules)
    stopPoints: number;          // Exigido. Sem stop, não há como calcular risco.
    pointValue: number;          // Exigido.
    
    // Limitadores Opcionais (Vindos da Fase, do Ativo, etc)
    maxContractsPhase?: number;
    minContracts?: number;
    maxContracts?: number;
}

export interface PositionSizingResult {
    allowedContracts: number;
    allowedRisk: number;
    riskPerContract: number;
    isValid: boolean;
    reasons: string[];
}

/**
 * Motor central de dimensionamento de posição. Função Pura.
 * Aplica fórmulas de risco e clipa pelos bounds (min/max).
 * 
 * Regras:
 * 1. riskPerContract = stopPoints * pointValue
 * 2. allowedRisk = capital * (percent / 100)
 * 3. rawContracts = allowedRisk / riskPerContract
 */
export function calculatePositionSizing(input: PositionSizingInput): PositionSizingResult {
    const reasons: string[] = [];

    // 1. Validar entradas vitais
    if (!input.capital || input.capital <= 0) {
        reasons.push("Capital inválido ou zerado.");
    }
    if (!input.riskPerTradePercent || input.riskPerTradePercent <= 0) {
        reasons.push("Risco por trade não configurado ou zerado no Perfil.");
    }
    if (!input.stopPoints || input.stopPoints <= 0) {
        reasons.push("Distância do Stop (stopPoints) deve ser maior que zero.");
    }
    if (!input.pointValue || input.pointValue <= 0) {
        reasons.push("Valor do Ponto (pointValue) do ativo não configurado.");
    }

    if (reasons.length > 0) {
        return {
            allowedContracts: 0,
            allowedRisk: 0,
            riskPerContract: 0,
            isValid: false,
            reasons
        };
    }

    // 2. Fórmulas Base
    const allowedRisk = input.capital * (input.riskPerTradePercent / 100);
    const riskPerContract = input.stopPoints * input.pointValue;

    // Se o stop for gigantesco ou point value gigante e não dá nem pra 1 operando
    // Tratativo numérico para não dar Infinity se bugs de runtime vazarem zero.
    if (riskPerContract === 0) {
        return {
            allowedContracts: 0,
            allowedRisk,
            riskPerContract,
            isValid: false,
            reasons: ["Risco por contrato é 0 (falha matemática)."]
        };
    }

    let rawContracts = Math.floor(allowedRisk / riskPerContract);

    // 3. Clip por Mínimo do Ativo (ex: não dá pra operar 0.5 contratos)
    // Se o Ativo exige 1 lote no mínimo, e o raw deu 0, o risco não paga a entrada.
    if (input.minContracts && input.minContracts > 0) {
        if (allowedRisk < (input.minContracts * riskPerContract)) {
            // Nem o limite mínimo o capital aguenta!
            reasons.push(`Risco financeiro permitido (${allowedRisk.toFixed(2)}) é insuficiente para cobrir o lote mínimo do Ativo (${input.minContracts} contratos = ${(input.minContracts * riskPerContract).toFixed(2)}).`);
            return {
                allowedContracts: 0,
                allowedRisk,
                riskPerContract,
                isValid: false,
                reasons
            };
        }
        
        // Se aguenta, mas a fração arrendondou pra baixo, fixar no piso (caso raro mas seguro)
        if (rawContracts < input.minContracts) {
             rawContracts = input.minContracts;
        }
    } else if (rawContracts < 1) {
        // Se minContracts não for fornecido, assumimos o mínimo matemático (1) logicamente.
        if (allowedRisk < riskPerContract) {
            reasons.push(`Risco financeiro permitido (${allowedRisk.toFixed(2)}) é insuficiente para cobrir sequer 1 contrato (${riskPerContract.toFixed(2)}).`);
            return {
                allowedContracts: 0,
                allowedRisk,
                riskPerContract,
                isValid: false,
                reasons
            };
        }
        rawContracts = 1;
    }

    // 4. Clip por Máximos
    if (input.maxContractsPhase !== undefined && input.maxContractsPhase > 0) {
        if (rawContracts > input.maxContractsPhase) {
            rawContracts = Math.min(rawContracts, input.maxContractsPhase);
            reasons.push(`Limitado pelo máximo de contratos da Fase de Crescimento (${input.maxContractsPhase}).`);
        }
    }

    if (input.maxContracts !== undefined && input.maxContracts > 0) {
        if (rawContracts > input.maxContracts) {
            rawContracts = Math.min(rawContracts, input.maxContracts);
            reasons.push(`Limitado pelo máximo de contratos permitido pelo Ativo (${input.maxContracts}).`);
        }
    }

    // Final sanity check for negatives
    if (rawContracts < 0) rawContracts = 0;

    return {
        allowedContracts: rawContracts,
        allowedRisk,
        riskPerContract,
        isValid: true,
        reasons
    };
}
