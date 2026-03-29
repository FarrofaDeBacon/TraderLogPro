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
    phaseStartedAt?: string
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
    
    if (growthPhase && startingCapital !== undefined) {
        let phaseTrades = allTrades;
        if (phaseStartedAt) {
            const phaseStartTime = new Date(phaseStartedAt).getTime();
            phaseTrades = allTrades.filter(t => new Date(t.date).getTime() >= phaseStartTime);
        }

        growthEvaluation = evaluateGrowthPhase(
            growthPhase, 
            phaseTrades, 
            startingCapital,
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
        growthEvaluation
    };
}
