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
import { toLocalDateStr } from './risk-utils';

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
    resolution?: any,
    modes: { 
        daily_loss_mode?: 'accumulate' | 'recover', 
        phase_drawdown_mode?: 'accumulate' | 'recover',
        phase_target_mode?: 'cumulative' | 'reset_each_phase',
        target_unit?: 'financial' | 'points',
        drawdown_unit?: 'financial' | 'points'
    } = {}
): RiskCockpitState {
    const { 
        daily_loss_mode = 'accumulate', 
        phase_drawdown_mode = 'accumulate', 
        phase_target_mode = 'cumulative',
        target_unit = 'financial',
        drawdown_unit = 'financial'
    } = modes;
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
        
        // Se o modo for reset_each_phase, filtramos trades apenas da fase atual.
        // Se for cumulative, usamos todos os trades do contexto (plano todo).
        if (phase_target_mode === 'reset_each_phase' && phaseStartedAt) {
            const phaseStartDateStr = toLocalDateStr(phaseStartedAt);
            
            phaseTrades = allTrades.filter(t => {
                const tradeDateStr = toLocalDateStr(t.date);
                return tradeDateStr >= phaseStartDateStr;
            });
            console.log(`[Cockpit Engine] RESET_EACH_PHASE mode: Retained ${phaseTrades.length} trades since ${phaseStartDateStr}.`);
        } else {
            console.log(`[Cockpit Engine] CUMULATIVE mode: Using all ${phaseTrades.length} trades.`);
        }

        growthEvaluation = evaluateGrowthPhase(
            growthPhase, 
            phaseTrades, 
            startingCapital ?? 0,
            phaseIndex,
            totalPhases,
            daily_loss_mode,
            phase_drawdown_mode,
            target_unit,
            drawdown_unit
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
