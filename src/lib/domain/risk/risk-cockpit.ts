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
 * 
 * @returns O estado consolidado com as três vertentes calculadas puramente
 */
export function buildRiskCockpitState(
    profile: RiskProfileConfig,
    trades: TradeRiskSnapshot[],
    growthPhase?: GrowthPhase,
    startingCapital?: number
): RiskCockpitState {
    
    // 1. Motor Financeiro Diário
    const dailyRiskStatus = calculateDailyRiskStatus(profile, trades);
    
    // 2. Motor Comportamental e Disciplinar
    const disciplineEvaluation = evaluateDiscipline(profile, trades);
    
    // 3. Motor de Plano de Crescimento
    let growthEvaluation: GrowthEvaluationResult | undefined;
    
    if (growthPhase && startingCapital !== undefined) {
        growthEvaluation = evaluateGrowthPhase(growthPhase, trades, startingCapital);
    }

    return {
        dailyRiskStatus,
        disciplineEvaluation,
        growthEvaluation
    };
}
