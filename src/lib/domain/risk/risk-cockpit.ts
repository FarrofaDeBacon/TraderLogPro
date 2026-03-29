import type { 
    RiskProfileConfig, 
    TradeRiskSnapshot, 
    GrowthPhase,
    DailyRiskStatus,
    GrowthEvaluationResult,
    DisciplineEvaluationResult
} from './types';

import { calculateDailyRiskStatus } from './risk-engine';
import { evaluateGrowthPhase } from './growth-engine';
import { evaluateDiscipline } from './discipline-engine';
import { parseSafeDate } from '../../utils';

/**
 * Representa o estado agregado de todo o Cockpit de Risco.
 */
export interface RiskCockpitState {
    profile: RiskProfileConfig;
    trades: TradeRiskSnapshot[];
    growthPhase?: GrowthPhase;
    dailyRiskStatus: DailyRiskStatus;
    disciplineEvaluation: DisciplineEvaluationResult;
    growthEvaluation?: GrowthEvaluationResult;
    resolution?: any; // Contexto de resolução original
}

/**
 * Constrói o estado unificado do Cockpit de Risco agregando os três motores de domínio.
 * 
 * @param profile - Configuração do perfil de risco atual
 * @param trades - Histórico completo ou parcial de trades
 * @param growthPhase - Fase de crescimento atual (se aplicável ao momento)
 * @param startingCapital - Capital inicial para cálculo de drawdown da fase
 * @param isLastPhase - Indica se é a última fase do plano para travar promoções
 * 
 * @returns O estado consolidado com as três vertentes calculadas puramente
 */
export function buildRiskCockpitState(
    profile: RiskProfileConfig,
    allTrades: TradeRiskSnapshot[],
    growthPhase?: GrowthPhase,
    startingCapital?: number,
    phaseIndex: number = 0,
    totalPhases: number = 1,
    phaseStartedAt?: string,
    resolution?: any
): RiskCockpitState {
    // 1. Motor Financeiro Diário (Usa TODOS os trades pra filtrar por HOJE)
    const dailyRiskStatus = calculateDailyRiskStatus(
        profile, 
        allTrades,
        growthPhase
    );
    
    // 2. Motor Comportamental e Disciplinar (Usa TODOS os trades do dia/sessão)
    const disciplineEvaluation = evaluateDiscipline(
        profile, 
        allTrades
    );
    
    // 3. Motor de Plano de Crescimento (Usa apenas trades da Fase)
    let growthEvaluation: GrowthEvaluationResult | undefined;
    
    if (growthPhase) {
        let phaseTrades = allTrades;
        if (phaseStartedAt) {
            // Normaliza a data de início da fase para meia-noite (início do dia) para evitar ocultar trades do mesmo dia
            const phaseDateObj = parseSafeDate(phaseStartedAt);
            const phaseStartDateStr = phaseDateObj.toISOString().split('T')[0];
            const phaseStartTime = new Date(`${phaseStartDateStr}T00:00:00Z`).getTime();
            
            phaseTrades = allTrades.filter(t => {
                const tradeDateObj = parseSafeDate(t.date);
                const tradeDateStr = tradeDateObj.toISOString().split('T')[0];
                return new Date(`${tradeDateStr}T00:00:00Z`).getTime() >= phaseStartTime;
            });
            console.log(`[Cockpit Engine] Filter PhaseStartedAt (${phaseStartedAt}): Retained ${phaseTrades.length} of ${allTrades.length} trades.`);
        } else {
            console.log(`[Cockpit Engine] Sem phaseStartedAt. Usando os ${phaseTrades.length} trades.`);
        }

        console.log(`[Cockpit Engine] Avaliando GrowthPhase com capital base: ${startingCapital ?? "undefined (fallback 0)"} e trades: ${phaseTrades.length}`);
        growthEvaluation = evaluateGrowthPhase(
            growthPhase, 
            phaseTrades, 
            startingCapital ?? 0,
            phaseIndex,
            totalPhases
        );
    }


    return {
        profile,
        trades: allTrades,
        growthPhase,
        dailyRiskStatus,
        disciplineEvaluation,
        growthEvaluation,
        resolution
    };
}
