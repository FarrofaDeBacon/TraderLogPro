// --- RISK STORE (Position Sizing Enabled) ---
// This file serves as the reactive bindings for the pure risk domains.

import { assetsStore } from "$lib/stores/assets.svelte";
import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
import { accountsStore } from "$lib/stores/accounts.svelte";
import { appStore } from "./app.svelte";
import { tradesStore } from './trades.svelte';
import { parseSafeDate } from "$lib/utils";
import { 
    buildRiskCockpitState, 
    type RiskCockpitState,
    adaptPositionSizingInput,
    calculatePositionSizing,
    type PositionSizingInput,
    type PositionSizingResult,
    validateTradeContext,
    calculateHistoricalAudit,
    type DeskValidationContext,
    type DeskValidationResult,
    type DeskAuditResult,
    evaluateDeskStageProgression,
    generateDeskProgressFeedback,
    type GrowthEvaluationResult,
    evaluateGrowthPhase
} from '$lib/domain/risk';
import { 
    adaptSettingsProfileToDomain, 
    adaptTradeToDomain, 
    adaptGrowthPhaseToDomain 
} from "../domain/risk/risk-adapters";
import { toast } from "svelte-sonner";
import type { 
    ResolvedGrowthContext, 
    AssetRiskProfile, 
    RiskProfile, 
    Trade, 
    Asset, 
    RiskContextResolution, 
    GrowthPhase as DBGrowthPhase,
    DeskConfig
} from '$lib/types';
import type { 
    GrowthPhase as DomainGrowthPhase,
    RiskProfileConfig
} from '$lib/domain/risk/types';
import { resolveEffectiveRiskContext } from "$lib/domain/risk/risk-resolver";

export class RiskStore {
    // --- Reactive State ---
    activeAssetId = $state<string | undefined>(undefined);
    activeTradeId = $state<string | undefined>(undefined);

    constructor() {
        // Observability moved to UI layer (+page.svelte) to comply with Svelte 5 lifecycle rules
    }

    get activeAsset(): Asset | undefined {
        return assetsStore.assets.find(a => a.id === this.activeAssetId);
    }

    /**
     * Getter principal do Cockpit que agrega toda a lógica de negócio.
     */
    get riskCockpitState(): RiskCockpitState | null {
        const activeProfile = riskSettingsStore.activeProfile;
        if (!activeProfile || !activeProfile.active) return null;

        // 1. RESOLUÇÃO ÚNICA DE CONTEXTO (FONTE DE VERDADE)
        const resolution = resolveEffectiveRiskContext(
            this.activeAssetId ?? null,
            riskSettingsStore.assetRiskProfiles,
            activeProfile,
            riskSettingsStore.growthPlans,
            assetsStore.assets
        );

        // 2. Adaptação para o Domínio
        const domainProfile = adaptSettingsProfileToDomain(activeProfile);
        const closedTrades = tradesStore.trades.filter(t => 
            (t.exit_price !== null && t.exit_price !== undefined) || 
            (t.processed_result_brl !== undefined && t.processed_result_brl !== 0) || 
            (Number(t.result) !== 0)
        );
        
        console.log(`[Cockpit Debug] Total Trades na Store: ${tradesStore.trades.length} | Fechados: ${closedTrades.length}`);
        
        // --- FILTRAGEM POR ATIVOS DO ESCOPO ---
        let filteredTrades = closedTrades;
        if (resolution.assetIds.length > 0) {
            const scopeSymbols = resolution.assetIds
                .map(id => assetsStore.assets.find(a => a.id === id)?.symbol)
                .filter(Boolean);

            filteredTrades = closedTrades.filter(t => 
                resolution.assetIds.includes(t.asset_id || "") || 
                (t.asset_symbol && scopeSymbols.includes(t.asset_symbol))
            );
        }

        const domainTrades = filteredTrades
            .map(adaptTradeToDomain)
            .sort((a, b) => parseSafeDate(a.date as string).getTime() - parseSafeDate(b.date as string).getTime());

        console.log(`[Cockpit Debug] Trades após adaptação Domínio (para o cockpit):`, domainTrades.map(t => ({ id: t.tradeId, pnl: t.pnl, date: t.date })));
        
        // 3. Estruturar Parâmetros de GrowthPhase (Mock do Domínio a partir da Resolução)
        const domainGrowthPhase: DomainGrowthPhase = {
            id: crypto.randomUUID(),
            index: resolution.currentPhaseIndex,
            level: (resolution.currentPhaseIndex || 0) + 1,
            name: resolution.currentPhaseName,
            maxContracts: resolution.currentPhaseLotLimit,
            minTrades: 0,
            minWinRate: 0,
            minProfitFactor: 0,
            minExpectancyR: 0,
            minNetPnL: resolution.currentPhaseTarget,
            maxDrawdownPercent: 0,
            maxDrawdownAmount: resolution.currentPhaseDrawdown,
            allowPromotion: (resolution.currentPhaseIndex || 0) < (resolution.totalPhases || 1) - 1,
            allowRegression: (resolution.currentPhaseIndex || 0) > 0,
            // Mapeamento Robusto para suportar nomes de propriedades tanto Snake quanto Camel
            conditionsToAdvance: (resolution.conditionsToAdvance || []).map((c: any) => ({
                metric: c.metric || c.metric_name || "unknown",
                operator: c.operator || c.condition_operator || ">=",
                value: Number(c.value !== undefined ? c.value : (c.target_value || 0))
            })),
            conditionsToDemote: (resolution.conditionsToDemote || [])?.map((c: any) => ({
                metric: c.metric || c.metric_name || "unknown",
                operator: c.operator || c.condition_operator || ">=",
                value: Number(c.value !== undefined ? c.value : (c.target_value || 0))
            }))
        };

        // 6. Determinar Capital Base (para drawdowns)
        let startingCapital: number | undefined = undefined;
        if (domainProfile.fixedCapital) {
            startingCapital = domainProfile.fixedCapital;
        } else if (activeProfile.linked_account_id) {
            const linkedAccount = accountsStore.accounts.find(a => a.id === activeProfile.linked_account_id);
            startingCapital = linkedAccount ? linkedAccount.balance : undefined;
        }

        // 7. Resolver Plano Ativo para extrair os Modos
        const activeGrowthPlan = resolution.growthPlanId 
            ? riskSettingsStore.growthPlans.find(p => p.id === resolution.growthPlanId)
            : undefined;

        // 8. Acionar o Agregador Central Puro do Domínio
        const state = buildRiskCockpitState(
            domainProfile,
            domainTrades,
            domainGrowthPhase,
            startingCapital,
            resolution.currentPhaseIndex,
            resolution.totalPhases,
            resolution.phaseStartedAt,
            resolution,
            {
                daily_loss_mode: activeGrowthPlan?.daily_loss_mode,
                phase_drawdown_mode: activeGrowthPlan?.phase_drawdown_mode,
                phase_target_mode: activeGrowthPlan?.phase_target_mode
            }
        );

        console.log("[CockpitState] Resolution Conditions Raw:", resolution.conditionsToAdvance);
        console.log("[CockpitState] Domain Conditions:", domainGrowthPhase.conditionsToAdvance?.length || 0);
        
        return state;
    }

    get resolvedGrowthContext(): ResolvedGrowthContext | null {
        const state = this.riskCockpitState;
        if (!state || !state.growthPhase) return null;

        return {
            riskProfile: riskSettingsStore.activeProfile!,
            growthSourceType: (state.resolution?.source === "scope" ? "assetProfile" : "global") as any,
            growthPhase: (state.growthPhase as any),
            resolution: state.resolution
        };
    }

    /**
     * Promove o usuário para a próxima fase do Growth Plan.
     */
    async promotePhase() {
        const ctx = this.resolvedGrowthContext;
        if (!ctx) return;

        const evalResult = this.globalGrowthEvaluation;
        if (!evalResult?.canPromote) {
            toast.error("Critérios de promoção não atingidos.");
            return;
        }

        const res = ctx.resolution;
        const now = new Date().toISOString();

        if (res.source === "scope" && res.scopeId) {
            const nextIndex = res.currentPhaseIndex + 1;
            if (nextIndex < res.totalPhases) {
                riskSettingsStore.updateAssetRiskProfile(res.scopeId, {
                    current_phase_index: nextIndex,
                    currentPhaseStartedAt: now
                });
                toast.success(`Promovido para fase ${nextIndex + 1}`);
            }
        } else if (res.source === "global" && res.growthPlanId) {
            const nextIndex = res.currentPhaseIndex + 1;
            if (nextIndex < res.totalPhases) {
                riskSettingsStore.updateGrowthPlan(res.growthPlanId, {
                    current_phase_index: nextIndex,
                    currentPhaseStartedAt: now
                });
                toast.success(`Promovido para fase ${nextIndex + 1}`);
            }
        }
    }

    /**
     * Reinicia o plano de crescimento atual para a fase 1 e reseta a data de início.
     */
    async restartGrowthPlan() {
        const ctx = this.resolvedGrowthContext;
        if (!ctx) return;

        const res = ctx.resolution;
        const now = new Date().toISOString();

        try {
            if (res.source === "scope" && res.scopeId) {
                await riskSettingsStore.updateAssetRiskProfile(res.scopeId, {
                    current_phase_index: 0,
                    currentPhaseStartedAt: now
                });
            } else if (res.source === "global" && res.growthPlanId) {
                await riskSettingsStore.updateGrowthPlan(res.growthPlanId, {
                    current_phase_index: 0,
                    currentPhaseStartedAt: now
                });
            }
            toast.success("Plano reiniciado com sucesso.");
        } catch (e: any) {
            console.error("[RiskStore] Erro ao reiniciar plano:", e);
            toast.error("Falha ao reiniciar plano.");
        }
    }

    /**
     * Regride o usuário para a fase anterior.
     */
    async regressPhase() {
        const ctx = this.resolvedGrowthContext;
        if (!ctx) return;

        const res = ctx.resolution;
        const now = new Date().toISOString();

        if (res.source === "scope" && res.scopeId && res.currentPhaseIndex > 0) {
            riskSettingsStore.updateAssetRiskProfile(res.scopeId, {
                current_phase_index: res.currentPhaseIndex - 1,
                currentPhaseStartedAt: now
            });
            toast.info(`Regredido para fase ${res.currentPhaseIndex}`);
        } else if (res.source === "global" && res.growthPlanId && res.currentPhaseIndex > 0) {
            riskSettingsStore.updateGrowthPlan(res.growthPlanId, {
                current_phase_index: res.currentPhaseIndex - 1,
                currentPhaseStartedAt: now
            });
            toast.info(`Regredido para fase ${res.currentPhaseIndex}`);
        }
    }

    // --- Computed Evaluations ---

    get globalGrowthEvaluation(): GrowthEvaluationResult | null {
        const state = this.riskCockpitState;
        return state?.growthEvaluation || null;
    }

    /**
     * Retorna a definição da próxima fase (preview) para o Cockpit.
     */
    get nextGrowthPhase(): DomainGrowthPhase | null {
        const resolution = this.resolvedGrowthContext?.resolution;
        if (!resolution) return null;

        const activePlanId = resolution.growthPlanId;
        const activePlan = riskSettingsStore.growthPlans.find(p => p.id === activePlanId);

        // Se estiver num escopo com sobrescrita, busca na lista de fases sobrescritas
        if (resolution.source === 'scope') {
            const scope = riskSettingsStore.assetRiskProfiles.find(s => s.id === resolution.scopeId);
            if (scope?.growth_override_enabled && scope.growth_phases_override) {
                const nextIndex = resolution.currentPhaseIndex + 1;
                const dbNext = (scope.growth_phases_override[nextIndex] as DBGrowthPhase);
                return dbNext ? adaptGrowthPhaseToDomain(dbNext) || null : null;
            }
        }

        // Caso contrário, busca no plano (global ou vinculado)
        if (activePlan && activePlan.phases) {
            const nextIndex = resolution.currentPhaseIndex + 1;
            const dbNext = (activePlan.phases[nextIndex] as DBGrowthPhase);
            return dbNext ? adaptGrowthPhaseToDomain(dbNext) || null : null;
        }

        return null;
    }

    get deskValidationResult(): DeskValidationResult | null {
        const state = this.riskCockpitState;
        if (!state) return null;

        // O motor de validação de desk usa uma lógica diferente para progressão histórica
        // Aqui adaptamos para o contrato do Dashboard que espera um DeskValidationResult simplificado
        return {
            allowed: state.dailyRiskStatus.statusLabel !== 'LOCKED' && state.dailyRiskStatus.statusLabel !== 'LOSS_LIMIT_HIT',
            reasons: state.dailyRiskStatus.statusLabel === 'LOCKED' ? ["locked"] : 
                     state.dailyRiskStatus.statusLabel === 'LOSS_LIMIT_HIT' ? ["daily_loss_hit"] : [],
            warnings: [],
            checks: {
                allowedAsset: true,
                combinedExposure: true,
                dayTradeOnly: true,
                closeBeforeMarketClose: true
            }
        };
    }

    get deskStageProgressionState(): GrowthEvaluationResult | null {
        return this.globalGrowthEvaluation;
    }

    get deskProgressFeedback(): string[] {
        const state = this.riskCockpitState;
        if (!state || !state.growthEvaluation) return [];
        return state.growthEvaluation.advanceConditions
            .filter(c => !c.isMet)
            .map(c => `Falta atingir ${c.metric}: ${c.current}/${c.target}`);
    }

    get positionSizingResult(): PositionSizingResult | null {
        const state = this.riskCockpitState;
        const activeAsset = assetsStore.assets.find(a => a.id === this.activeAssetId);
        if (!state || !activeAsset || !state.growthPhase) return null;

        // Using cast to Domain Types for Position Sizing (to be refined in Phase 5)
        const input = adaptPositionSizingInput(
            state.profile as any,
            activeAsset,
            state.growthEvaluation?.metrics as any,
            state.growthEvaluation?.metrics as any,
            state.growthPhase as any
        );

        return input ? calculatePositionSizing(input) : null;
    }

    /**
     * Valida se um novo trade pode ser aberto dado o contexto atual de risco.
     */
    validateTradeEntry(contracts: number): { canTrade: boolean; reasons: string[] } {
        const state = this.riskCockpitState;
        if (!state || !state.growthPhase) return { canTrade: false, reasons: ["Risco não inicializado"] };

        // Simulamos a regra de validação via Engine Diária
        const canTrade = !state.dailyRiskStatus.isLocked;
        const reasons = canTrade ? [] : ["Limite diário atingido ou bloqueado"];
        
        // Adiciona validação de lote da fase
        if (contracts > state.growthPhase.maxContracts) {
            return { canTrade: false, reasons: [`Limite de lotes da fase excedido (${state.growthPhase.maxContracts})`] };
        }

        return { canTrade, reasons };
    }

    /**
     * Audita o histórico completo para reconstruir a evolução do trader.
     */
    get historicalAudit(): DeskAuditResult | null {
        const state = this.riskCockpitState;
        const activeProfile = riskSettingsStore.activeProfile;
        if (!state || !activeProfile) return null;
        
        // DeskConfig opcional para auditoria
        const desk: DeskConfig = {
            enabled: true,
            plan_name: 'Auditoria'
        };

        const trades = tradesStore.trades; // Historical audit expects raw App trades
        return calculateHistoricalAudit(trades, desk);
    }
}

export const riskStore = new RiskStore();
