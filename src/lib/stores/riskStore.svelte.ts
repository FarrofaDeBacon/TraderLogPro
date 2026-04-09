import { get } from "svelte/store";
import { toast } from "svelte-sonner";
import { t } from "svelte-i18n";
import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
import { accountsStore } from "$lib/stores/accounts.svelte";
import { tradesStore } from "$lib/stores/trades.svelte";
import { assetsStore } from "$lib/stores/assets.svelte";

import { 
    type RiskCockpitState,
    buildRiskCockpitState
} from "$lib/domain/risk/risk-cockpit";

import { 
    type PositionSizingResult,
    calculatePositionSizing
} from "$lib/domain/risk/position-sizing-engine";

import { 
    type DeskValidationResult,
    type DeskAuditResult,
    calculateHistoricalAudit
} from "$lib/domain/risk/desk-validation-engine";

import { 
    type GrowthEvaluationResult,
    type GrowthPhase as DomainGrowthPhase
} from "$lib/domain/risk/types";

import { 
    resolveEffectiveRiskContext
} from "$lib/domain/risk/risk-resolver";

import { 
    adaptSettingsProfileToDomain, 
    adaptTradeToDomain, 
    adaptGrowthPhaseToDomain 
} from "$lib/domain/risk/risk-adapters";

import { adaptPositionSizingInput } from "$lib/domain/risk/position-sizing-adapter";
import type { DeskConfig, RiskProfile, GrowthPhase as AppGrowthPhase, ResolvedGrowthContext } from "$lib/types";

/**
 * REGRAS DE CONVERSÃO:
 * A Store lida com tipos do APP (AppGrowthPhase, RiskProfile).
 * O Domínio lida com tipos de LÓGICA (DomainGrowthPhase, RiskProfileConfig).
 */

export class RiskStore {
    private _activeAssetId = $state<string | null>(null);

    constructor() {
        if (typeof window !== 'undefined') {
            this._activeAssetId = localStorage.getItem("risk_active_asset_id");
        }
    }

    get activeAssetId() { return this._activeAssetId; }
    set activeAssetId(value: string | null) {
        this._activeAssetId = value;
        if (typeof window !== 'undefined') {
            if (value) localStorage.setItem("risk_active_asset_id", value);
            else localStorage.removeItem("risk_active_asset_id");
        }
    }

    get activeAsset() {
        if (!this.activeAssetId) return null;
        return assetsStore.assets.find(a => a.id === this.activeAssetId) || null;
    }

    get resolvedAssetRiskProfile() {
        if (!this.activeAssetId) return null;
        return riskSettingsStore.getScopeForAsset(this.activeAssetId);
    }

    /**
     * Resolve o estado completo do cockpit de risco usando os motores de domínio.
     * Realiza a ponte entre tipos do APP (DB/Store) e tipos de DOMÍNIO (Engines).
     */
    get riskCockpitState(): RiskCockpitState | null {
        const activeAssetId = this.activeAssetId;
        const activeProfile = riskSettingsStore.activeProfile;
        
        if (!activeAssetId || !activeProfile) return null;

        // 1. Resolver contexto efetivo (Decide qual plano e limites aplicar)
        const resolution = resolveEffectiveRiskContext(
            activeAssetId,
            riskSettingsStore.assetRiskProfiles,
            activeProfile,
            riskSettingsStore.growthPlans,
            assetsStore.assets
        );

        // 2. Localizar a fase ativa e ADAPTAR para o domínio
        let activeGrowthPhase: DomainGrowthPhase | undefined;
        const activePlan = riskSettingsStore.growthPlans.find(p => p.id === resolution.growthPlanId);
        
        let appPhase: AppGrowthPhase | undefined;
        if (resolution.source === 'scope') {
             const scope = riskSettingsStore.assetRiskProfiles.find(s => s.id === resolution.scopeId);
             if (scope?.growth_override_enabled && scope.growth_phases_override) {
                 appPhase = scope.growth_phases_override[resolution.currentPhaseIndex];
             } else if (activePlan && activePlan.phases) {
                 appPhase = activePlan.phases[resolution.currentPhaseIndex];
             }
        } else if (activePlan && activePlan.phases) {
            appPhase = activePlan.phases[resolution.currentPhaseIndex];
        }

        if (appPhase) {
            activeGrowthPhase = adaptGrowthPhaseToDomain(appPhase);
        }

        // 3. Adaptar Perfil de Risco e Trades para o domínio
        const domainProfile = adaptSettingsProfileToDomain(activeProfile);
        const domainTrades = tradesStore.trades.map(t => adaptTradeToDomain(t as any));

        // 4. Computar o estado consolidado (Agregação imutável dos motores)
        return buildRiskCockpitState(
            domainProfile,
            domainTrades,
            activeGrowthPhase,
            undefined, // startingCapital (resolution/engine cuidam)
            resolution.currentPhaseIndex,
            resolution.totalPhases,
            resolution.phaseStartedAt,
            resolution
        );
    }

    get resolvedGrowthContext(): ResolvedGrowthContext | null {
        const state = this.riskCockpitState;
        if (!state || !riskSettingsStore.activeProfile) return null;

        return {
            riskProfile: riskSettingsStore.activeProfile,
            growthSourceType: state.resolution?.source === "scope" ? "assetProfile" : "global",
            growthPhase: state.growthPhase,
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
            toast.error(get(t)('risk.messages.promoteCriteriaNotMet', { default: "Critérios de promoção não atingidos." }));
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
                toast.success(get(t)('risk.messages.promote', { values: { name: nextIndex + 1 } }));
            }
        } else if (res.source === "global" && res.growthPlanId) {
            const nextIndex = res.currentPhaseIndex + 1;
            if (nextIndex < res.totalPhases) {
                riskSettingsStore.updateGrowthPlan(res.growthPlanId, {
                    current_phase_index: nextIndex,
                    currentPhaseStartedAt: now
                });
                toast.success(get(t)('risk.messages.promote', { values: { name: nextIndex + 1 } }));
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
            toast.success(get(t)('risk.messages.restartSuccess'));
        } catch (e: any) {
            console.error("[RiskStore] Erro ao reiniciar plano:", e);
            toast.error(get(t)('risk.messages.restartError', { default: "Falha ao reiniciar plano." }));
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
            toast.info(get(t)('risk.messages.demote', { values: { name: res.currentPhaseIndex } }));
        } else if (res.source === "global" && res.growthPlanId && res.currentPhaseIndex > 0) {
            riskSettingsStore.updateGrowthPlan(res.growthPlanId, {
                current_phase_index: res.currentPhaseIndex - 1,
                currentPhaseStartedAt: now
            });
            toast.info(get(t)('risk.messages.demote', { values: { name: res.currentPhaseIndex } }));
        }
    }

    // --- Avaliações Computadas ---

    get globalGrowthEvaluation(): GrowthEvaluationResult | null {
        const state = this.riskCockpitState;
        return (state?.growthEvaluation as GrowthEvaluationResult) || null;
    }

    /**
     * Retorna a definição da próxima fase (preview) para o Cockpit.
     */
    get nextGrowthPhase(): any | null {
        const resolution = this.resolvedGrowthContext?.resolution;
        if (!resolution) return null;

        const activePlanId = resolution.growthPlanId;
        const activePlan = riskSettingsStore.growthPlans.find(p => p.id === activePlanId);

        if (resolution.source === 'scope') {
            const scope = riskSettingsStore.assetRiskProfiles.find(s => s.id === resolution.scopeId);
            if (scope?.growth_override_enabled && scope.growth_phases_override) {
                const nextIndex = resolution.currentPhaseIndex + 1;
                return scope.growth_phases_override[nextIndex] || null;
            }
        }

        if (activePlan && activePlan.phases) {
            const nextIndex = resolution.currentPhaseIndex + 1;
            return activePlan.phases[nextIndex] || null;
        }

        return null;
    }

    get deskValidationResult(): DeskValidationResult | null {
        const state = this.riskCockpitState;
        if (!state) return null;

        const regressionSlug = state.growthEvaluation?.regressionReasonMetric === 'drawdown' ? 'max_drawdown' : 
                               state.growthEvaluation?.regressionReasonMetric === 'daily_loss' ? 'max_daily_loss' : 
                               'max_drawdown';

        return {
            allowed: state.dailyRiskStatus.statusLabel !== 'LOCKED' && 
                     state.dailyRiskStatus.statusLabel !== 'LOSS_LIMIT_HIT' && 
                     !state.growthEvaluation?.shouldRegress,
            reasons: state.dailyRiskStatus.statusLabel === 'LOCKED' ? ["max_daily_loss"] : 
                     state.dailyRiskStatus.statusLabel === 'LOSS_LIMIT_HIT' ? ["max_daily_loss"] : 
                     state.growthEvaluation?.shouldRegress ? [regressionSlug] : [],
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
        const activeAsset = this.activeAsset;
        const assetProfile = this.resolvedAssetRiskProfile;
        
        if (!state || !activeAsset || !assetProfile || !riskSettingsStore.activeProfile) return null;

        let startingCapital: number | undefined = undefined;
        if (riskSettingsStore.activeProfile.capital_source === 'Fixed') {
            startingCapital = riskSettingsStore.activeProfile.fixed_capital || 0;
        } else if (riskSettingsStore.activeProfile.linked_account_id) {
            const linkedAccount = accountsStore.accounts.find(a => a.id === riskSettingsStore.activeProfile!.linked_account_id);
            startingCapital = linkedAccount ? linkedAccount.balance : undefined;
        }

        // Usando o ADAPTADOR para Position Sizing
        const input = adaptPositionSizingInput(
            riskSettingsStore.activeProfile,
            activeAsset,
            assetProfile,
            state.growthPhase as any, 
            startingCapital
        );

        return input ? calculatePositionSizing(input) : null;
    }

    /**
     * Valida se um novo trade pode ser aberto dado o contexto atual de risco.
     */
    validateTradeEntry(contracts: number): { canTrade: boolean; reasons: string[] } {
        const state = this.riskCockpitState;
        if (!state || !state.dailyRiskStatus) return { canTrade: false, reasons: ["Risco não inicializado"] };

        const canTrade = !state.dailyRiskStatus.isLocked;
        const reasons = canTrade ? [] : ["Limite diário atingido ou bloqueado"];
        
        if (state.growthPhase && contracts > state.growthPhase.maxContracts) {
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
        
        const desk: DeskConfig = {
            enabled: true,
            plan_name: 'Auditoria'
        };

        // Passando trades adaptados e mock de config desk
        return calculateHistoricalAudit(tradesStore.trades as any, desk);
    }
}

export const riskStore = new RiskStore();
