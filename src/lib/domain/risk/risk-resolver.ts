import type { 
    Asset, 
    AssetRiskProfile, 
    RiskProfile, 
    GrowthPlan, 
    RiskContextResolution,
    GrowthPhase,
    RiskCondition
} from "../../types";
import { extractMetricValue } from './risk-utils';

/**
 * RESOLVEDOR CENTRALIZADO DE CONTEXTO DE RISCO
 * 
 * Regra de Ouro: Uma única fonte de verdade para decidir se um ativo 
 * é governado por um Escopo (Grupo) ou pelo Plano Global.
 */
export function resolveEffectiveRiskContext(
    activeAssetId: string | null,
    scopes: AssetRiskProfile[],
    globalProfile: RiskProfile,
    allGrowthPlans: GrowthPlan[],
    assets: Asset[]
): RiskContextResolution {
    const now = new Date().toISOString();
    
    // 1. Tentar resolver por Escopo Ativo (Grupo de Ativos)
    if (activeAssetId) {
        const activeScope = scopes.find(s => s.asset_ids?.includes(activeAssetId));
        
        if (activeScope) {
            let phase: GrowthPhase | undefined;
            let phaseIndex = activeScope.current_phase_index || 0;
            let phasesCount = 0;
            let phaseName = "N/A";
            let phaseTarget = 0;
            let phaseDrawdown = 0;
            let phaseMaxDailyLoss = 0;
            let phaseLotLimit = 0;
            let growthPlanId: string | undefined = undefined;

            // Cenário A: Escopo com Sobrescrita (Override)
            if (activeScope.growth_override_enabled && activeScope.growth_phases_override && activeScope.growth_phases_override.length > 0) {
                phasesCount = activeScope.growth_phases_override.length;
                phase = activeScope.growth_phases_override[phaseIndex] || activeScope.growth_phases_override[0];
            } 
            // Cenário B: Escopo sem Sobrescrita -> Usa Plano Global do Perfil Ativo
            else {
                const globalGrowthPlan = allGrowthPlans.find(p => p.id === globalProfile.growth_plan_id);
                if (globalGrowthPlan && globalGrowthPlan.phases && globalGrowthPlan.phases.length > 0) {
                    phasesCount = globalGrowthPlan.phases.length;
                    phaseIndex = globalGrowthPlan.current_phase_index || 0;
                    phase = globalGrowthPlan.phases[phaseIndex] || globalGrowthPlan.phases[0];
                    growthPlanId = globalGrowthPlan.id;
                }
            }

            if (phase) {
                phaseName = phase.name;
                phaseTarget = extractMetricValue(phase.conditions_to_advance, "profit_target");
                phaseDrawdown = extractMetricValue(phase.conditions_to_demote, "max_drawdown") || extractMetricValue(phase.conditions_to_advance, "max_drawdown");
                phaseMaxDailyLoss = extractMetricValue(phase.conditions_to_demote, "loss") || extractMetricValue(phase.conditions_to_demote, "drawdown");
                phaseLotLimit = phase.lot_size;
            }

            return {
                source: "scope",
                sourceReason: `Ativo ${activeAssetId} pertence ao grupo "${activeScope.name}"`,
                scopeId: activeScope.id,
                scopeName: activeScope.name,
                growthPlanId,
                currentPhaseIndex: phaseIndex,
                totalPhases: phasesCount,
                currentPhaseName: phaseName,
                currentPhaseTarget: phaseTarget,
                currentPhaseDrawdown: phaseDrawdown,
                currentPhaseMaxDailyLoss: phaseMaxDailyLoss,
                currentPhaseLotLimit: phaseLotLimit,
                assetIds: activeScope.asset_ids,
                conditionsToAdvance: phase?.conditions_to_advance,
                conditionsToDemote: phase?.conditions_to_demote,
                phaseStartedAt: activeScope.currentPhaseStartedAt,
                resolvedAt: now
            };
        }
    }

    // 2. Fallback: Plano Global
    const globalGrowthPlan = allGrowthPlans.find(p => p.id === globalProfile.growth_plan_id);
    
    if (globalGrowthPlan && globalGrowthPlan.phases && globalGrowthPlan.phases.length > 0) {
        const phaseIndex = globalGrowthPlan.current_phase_index || 0;
        const phase = globalGrowthPlan.phases[phaseIndex] || globalGrowthPlan.phases[0];
        
        return {
            source: "global",
            sourceReason: activeAssetId 
                ? `Ativo ${activeAssetId} não possui escopo. Usando Plano Global.`
                : "Nenhum ativo selecionado. Usando Plano Global.",
            growthPlanId: globalGrowthPlan.id,
            growthPlanName: globalGrowthPlan.name,
            currentPhaseIndex: phaseIndex,
            totalPhases: globalGrowthPlan.phases.length,
            currentPhaseName: phase.name,
            currentPhaseTarget: extractMetricValue(phase.conditions_to_advance, "profit_target"),
            currentPhaseDrawdown: extractMetricValue(phase.conditions_to_demote, "max_drawdown") || extractMetricValue(phase.conditions_to_advance, "max_drawdown"),
            currentPhaseMaxDailyLoss: extractMetricValue(phase.conditions_to_demote, "loss") || extractMetricValue(phase.conditions_to_demote, "drawdown"),
            currentPhaseLotLimit: phase.lot_size,
            assetIds: [], 
            conditionsToAdvance: phase.conditions_to_advance,
            conditionsToDemote: phase.conditions_to_demote,
            phaseStartedAt: globalGrowthPlan.currentPhaseStartedAt,
            resolvedAt: now
        };
    }

    // 3. Fallback de Segurança
    return {
        source: "global",
        sourceReason: "Configuração incompleta. Usando valores zerados de segurança.",
        currentPhaseIndex: 0,
        totalPhases: 1,
        currentPhaseName: "Inativo",
        currentPhaseTarget: 0,
        currentPhaseDrawdown: 0,
        currentPhaseMaxDailyLoss: 0,
        currentPhaseLotLimit: 0,
        assetIds: [],
        resolvedAt: now
    };
}
