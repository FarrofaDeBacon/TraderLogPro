// --- RISK STORE (Position Sizing Enabled) ---
// This file serves as the reactive bindings for the pure risk domains.

import { assetsStore } from "$lib/stores/assets.svelte";
import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
import { accountsStore } from "$lib/stores/accounts.svelte";
import { appStore } from "./app.svelte";
import { tradesStore } from './trades.svelte';
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
        const closedTrades = tradesStore.trades.filter(t => (t.exit_price !== null && t.exit_price !== undefined) || (Number(t.result) !== 0));
        
        // --- FILTRAGEM POR ATIVOS DO ESCOPO ---
        let filteredTrades = closedTrades;
        if (resolution.assetIds.length > 0) {
            filteredTrades = closedTrades.filter(t => resolution.assetIds.includes(t.asset_id || ""));
        }

        const domainTrades = filteredTrades
            .map(adaptTradeToDomain)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 3. Estruturar Parâmetros de GrowthPhase (Mock do Domínio a partir da Resolução)
        const domainGrowthPhase: DomainGrowthPhase = {
            id: crypto.randomUUID(),
            name: resolution.currentPhaseName,
            maxContracts: resolution.currentPhaseLotLimit,
            minTrades: 0,
            minWinRate: 0,
            minProfitFactor: 0,
            minExpectancyR: 0,
            minNetPnL: resolution.currentPhaseTarget,
            maxDrawdownPercent: 0,
            maxDrawdownAmount: resolution.currentPhaseDrawdown,
            allowPromotion: true,
            allowRegression: true,
            conditionsToAdvance: resolution.advanceConditions ? resolution.advanceConditions.map(c => ({ metric: c.metric, operator: c.operator, value: Number(c.value) })) : [],
            conditionsToDemote: resolution.demoteConditions ? resolution.demoteConditions.map(c => ({ metric: c.metric, operator: c.operator, value: Number(c.value) })) : []
        };

        // 6. Determinar Capital Base (para drawdowns)
        let startingCapital: number | undefined = undefined;
        if (domainProfile.fixedCapital) {
            startingCapital = domainProfile.fixedCapital;
        } else if (activeProfile.linked_account_id) {
            const linkedAccount = accountsStore.accounts.find(a => a.id === activeProfile.linked_account_id);
            startingCapital = linkedAccount ? linkedAccount.balance : undefined;
        }

        // 7. Acionar o Agregador Central Puro do Domínio
        return buildRiskCockpitState(
            domainProfile,
            domainTrades,
            domainGrowthPhase,
            startingCapital,
            resolution.currentPhaseIndex,
            resolution.totalPhases,
            resolution.phaseStartedAt
        );
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

    /**
     * Resolve o contexto exato de crescimento (fase, plano, ativo).
     */
    get resolvedGrowthContext(): ResolvedGrowthContext | null {
        const activeProfile = riskSettingsStore.activeProfile;
        if (!activeProfile) return null;

        const resolution = resolveEffectiveRiskContext(
            this.activeAssetId ?? null,
            riskSettingsStore.assetRiskProfiles,
            activeProfile,
            riskSettingsStore.growthPlans,
            assetsStore.assets
        );

        const rawPhase: DBGrowthPhase = {
            id: crypto.randomUUID(),
            name: resolution.currentPhaseName,
            level: resolution.currentPhaseIndex + 1,
            lot_size: resolution.currentPhaseLotLimit,
            conditions_to_advance: [
                { metric: "PnL", operator: ">=", value: resolution.currentPhaseTarget }
            ],
            conditions_to_demote: [
                { metric: "Drawdown", operator: ">=", value: resolution.currentPhaseDrawdown }
            ]
        };

        const context: ResolvedGrowthContext = {
            riskProfile: activeProfile,
            growthSourceType: resolution.source === "scope" ? "assetProfile" : "global",
            growthPhase: rawPhase,
            resolution: resolution
        };

        if (resolution.source === "scope" && resolution.scopeId) {
            context.assetRiskProfile = riskSettingsStore.assetRiskProfiles.find(p => p.id === resolution.scopeId);
        } else if (resolution.source === "global" && resolution.growthPlanId) {
            context.growthPlan = riskSettingsStore.growthPlans.find(p => p.id === resolution.growthPlanId);
        }

        if (this.activeAssetId) {
            context.asset = assetsStore.assets.find(a => a.id === this.activeAssetId);
        }

        return context;
    }

    // --- Computed Evaluations ---

    get globalGrowthEvaluation(): GrowthEvaluationResult | null {
        const state = this.riskCockpitState;
        return state?.growthEvaluation || null;
    }

    /**
     * Retorna a definição da próxima fase (preview) para o Cockpit.
     */
    get nextGrowthPhase(): DBGrowthPhase | null {
        const resolution = resolveEffectiveRiskContext(
            this.activeAssetId ?? null,
            riskSettingsStore.assetRiskProfiles,
            riskSettingsStore.activeProfile,
            riskSettingsStore.growthPlans,
            assetsStore.assets
        );

        const activePlan = riskSettingsStore.growthPlans.find(p => p.id === resolution.growthPlanId);
        
        // Se estiver em modo de override, a lógica de "próxima fase" é baseada no override do escopo
        if (resolution.source === 'scope') {
            const scope = riskSettingsStore.assetRiskProfiles.find(s => s.id === resolution.scopeId);
            if (scope?.growth_override_enabled && scope.growth_phases_override) {
                 const nextIndex = resolution.currentPhaseIndex + 1;
                 return scope.growth_phases_override[nextIndex] || null;
            }
        }

        // Caso contrário, busca no plano (global ou vinculado)
        if (activePlan && activePlan.phases) {
            const nextIndex = resolution.currentPhaseIndex + 1;
            return activePlan.phases[nextIndex] || null;
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

        return calculatePositionSizing(input);
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
        // DeskConfig as per types.ts
        const desk: DeskConfig = {
            enabled: true,
            plan_name: 'Auditoria'
        };

        const trades = tradesStore.trades.map(adaptTradeToDomain);
        return calculateHistoricalAudit(trades, desk);
    }
}

export const riskStore = new RiskStore();
