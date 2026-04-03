import { safeInvoke } from "$lib/services/tauri";
import { toast } from "svelte-sonner";
import type { RiskProfile, AssetRiskProfile, GrowthPlan, RiskRule } from "$lib/types";

export class RiskSettingsStore {
    riskProfiles = $state<RiskProfile[]>([]);
    assetRiskProfiles = $state<AssetRiskProfile[]>([]);
    growthPlans = $state<GrowthPlan[]>([]);

    get activeProfile() {
        return this.riskProfiles.find(p => p.active) || this.riskProfiles[0];
    }

    /**
     * Resolução Única de Contexto: Encontra o escopo (perfil de grupo) que governa um ativo.
     * Fonte de verdade única para Cockpit e Engines.
     */
    getScopeForAsset(assetId: string | null): AssetRiskProfile | undefined {
        if (!assetId) return undefined;
        return this.assetRiskProfiles.find(p => p.asset_ids?.includes(assetId));
    }

    async loadData() {
        try {
            console.log("[RiskSettingsStore] Loading all risk data...");
            this.riskProfiles = await safeInvoke<RiskProfile[]>("get_risk_profiles") || [];
            this.assetRiskProfiles = await safeInvoke<AssetRiskProfile[]>("get_asset_risk_profiles") || [];
            this.growthPlans = await safeInvoke<GrowthPlan[]>("get_growth_plans") || [];
            
            console.log("[RiskSettingsStore] Data loaded: ", {
                profiles: this.riskProfiles.length,
                assets: this.assetRiskProfiles.length,
                plans: this.growthPlans.length
            });
            
            // Auto-migrações redundantes para garantir integridade
            await this.migrateLegacyRiskRules();
            await this.migrateAssetScopes();
        } catch (e) {
            console.error("[RiskSettingsStore] Error loading risk data:", e);
        }
    }

    async saveRiskProfiles() {
        for (const profile of this.riskProfiles) {
            try {
                await safeInvoke("save_risk_profile", { profile: $state.snapshot(profile) });
            } catch (e) {
                console.error("[RiskSettingsStore] Error saving risk profile:", e);
                toast.error("Erro ao salvar perfil de risco");
            }
        }
    }

    async saveAssetRiskProfiles() {
        for (const profile of this.assetRiskProfiles) {
            try {
                await safeInvoke("save_asset_risk_profile", { profile: $state.snapshot(profile) });
            } catch (e) {
                console.error("[RiskSettingsStore] Error saving asset risk profile:", e);
                toast.error("Erro ao salvar perfil por ativo");
            }
        }
    }

    async saveGrowthPlans() {
        for (const plan of this.growthPlans) {
            try {
                await safeInvoke("save_growth_plan", { plan: $state.snapshot(plan) });
            } catch (e) {
                console.error("[RiskSettingsStore] Error saving growth plan:", e);
                toast.error("Erro ao salvar plano de crescimento");
            }
        }
        // toast.success("Sincronizado com sucesso");
    }

    // --- Risk Profiles CRUD ---
    addRiskProfile(item: Omit<RiskProfile, "id">) {
        this.riskProfiles.push({ ...item, id: crypto.randomUUID() });
        this.saveRiskProfiles();
    }
    
    updateRiskProfile(id: string, item: Partial<RiskProfile>) {
        this.riskProfiles = this.riskProfiles.map(r => r.id === id ? { ...r, ...item } : r);
        this.saveRiskProfiles();
    }
    
    async deleteRiskProfile(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await safeInvoke("delete_risk_profile", { id });
            this.riskProfiles = this.riskProfiles.filter(r => r.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }
    
    updateRiskProfilePhase(id: string, newPhaseIndex: number) {
        this.riskProfiles = this.riskProfiles.map(r => r.id === id ? { ...r, current_phase_index: newPhaseIndex } : r);
        this.saveRiskProfiles();
    }
    
    async duplicateRiskProfile(id: string): Promise<string | null> {
        const original = this.riskProfiles.find(r => r.id === id);
        if (!original) return null;

        const newProfileId = crypto.randomUUID();
        const clonedProfile: RiskProfile = {
            ...original,
            id: newProfileId,
            name: `${original.name} (Cópia)`,
            active: false,
            linked_asset_risk_profile_ids: [...(original.linked_asset_risk_profile_ids || [])]
        };

        this.riskProfiles.push(clonedProfile);
        this.saveRiskProfiles();
        return newProfileId;
    }

    createRiskProfileTemplate(baseId: string): Omit<RiskProfile, "id"> | null {
        const base = this.riskProfiles.find((r) => r.id === baseId);
        if (!base) return null;

        return {
            ...base,
            name: `${base.name} (Template)`,
            active: false,
            linked_account_id: null,
            linked_asset_risk_profile_ids: [...(base.linked_asset_risk_profile_ids || [])],
        } as Omit<RiskProfile, "id">;
    }

    setActiveRiskProfile(id: string) {
        this.riskProfiles = this.riskProfiles.map(r => ({
            ...r,
            active: r.id === id
        }));
        this.saveRiskProfiles();
    }

    // --- Asset Risk Profiles CRUD ---
    addAssetRiskProfile(item: Omit<AssetRiskProfile, "id">) {
        // Garantir que asset_ids existe
        const newItem = { 
            ...item, 
            id: crypto.randomUUID(),
            asset_ids: item.asset_ids || []
        };
        this.assetRiskProfiles.push(newItem);
        this.saveAssetRiskProfiles();
    }
    
    updateAssetRiskProfile(id: string, item: Partial<AssetRiskProfile>) {
        this.assetRiskProfiles = this.assetRiskProfiles.map(r => {
            if (r.id === id) {
                // Se o índice da fase mudou, atualizamos o timestamp de início
                const phaseChanged = item.current_phase_index !== undefined && item.current_phase_index !== r.current_phase_index;
                
                // Validação de Integridade: Um ativo não pode estar em dois escopos
                if (item.asset_ids) {
                    for (const aid of item.asset_ids) {
                        const otherScope = this.assetRiskProfiles.find(p => p.id !== id && p.asset_ids?.includes(aid));
                        if (otherScope) {
                            console.warn(`[RiskSettingsStore] Asset ${aid} already belongs to scope ${otherScope.name}. Dual membership prevented.`);
                            toast.error(`Ativo ${aid} já pertence ao grupo "${otherScope.name}".`);
                            return r; // Cancela atualização
                        }
                    }
                }

                return { 
                    ...r, 
                    ...item,
                    currentPhaseStartedAt: phaseChanged ? new Date().toISOString() : r.currentPhaseStartedAt 
                };
            }
            return r;
        });
        this.saveAssetRiskProfiles();
    }
    
    async deleteAssetRiskProfile(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await safeInvoke("delete_asset_risk_profile", { id });
            this.assetRiskProfiles = this.assetRiskProfiles.filter(r => r.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    // --- Growth Plans CRUD ---
    addGrowthPlan(item: Omit<GrowthPlan, "id">) {
        const plan: GrowthPlan = { 
            ...item, 
            id: crypto.randomUUID(),
            current_phase_index: 0,
            enabled: true,
            currentPhaseStartedAt: new Date().toISOString()
        };
        this.growthPlans.push(plan);
        this.saveGrowthPlans();
        return plan.id;
    }

    updateGrowthPlan(id: string, item: Partial<GrowthPlan>) {
        this.growthPlans = this.growthPlans.map(p => {
            if (p.id === id) {
                const phasesCount = item.phases?.length ?? p.phases?.length ?? 0;
                let newIndex = item.current_phase_index;

                if (newIndex !== undefined && phasesCount > 0) {
                    // Proteção Férrea: Trava entre 0 e a última fase (Modo Manutenção)
                    newIndex = Math.max(0, Math.min(newIndex, phasesCount - 1));
                }

                const phaseChanged = newIndex !== undefined && newIndex !== p.current_phase_index;
                
                const updated = { 
                    ...p, 
                    ...item,
                    current_phase_index: newIndex ?? p.current_phase_index,
                    currentPhaseStartedAt: phaseChanged ? new Date().toISOString() : p.currentPhaseStartedAt 
                };

                if (phaseChanged) {
                    console.log(`[RiskSettings] GrowthPlan Phase changed to index ${updated.current_phase_index}. StartedAt: ${updated.currentPhaseStartedAt}`);
                }

                return updated;
            }
            return p;
        });
        this.saveGrowthPlans();
    }

    async deleteGrowthPlan(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await safeInvoke("delete_growth_plan", { id });
            this.growthPlans = this.growthPlans.filter(p => p.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }



    getGrowthPlanForProfile(riskProfileId: string): GrowthPlan | undefined {
        const profile = this.riskProfiles.find((r) => r.id === riskProfileId);
        if (!profile || !profile.growth_plan_id) return undefined;
        return this.growthPlans.find(p => p.id === profile.growth_plan_id);
    }

    async clearRiskSettings() {
        this.riskProfiles = [];
        this.assetRiskProfiles = [];
        this.growthPlans = [];
        await this.saveRiskProfiles();
        await this.saveAssetRiskProfiles();
        await this.saveGrowthPlans();
    }

    // --- Legacy Risk Rules Migration (Etapa 3) ---
    async migrateLegacyRiskRules() {
        let migratedCount = 0;

        for (const profile of this.riskProfiles) {
            if (!profile.risk_rules) {
                profile.risk_rules = [];
            }
            
            // Helper for idempotency check
            const hasRule = (type: string, scope: string, assets?: string[]) => {
                return profile.risk_rules!.some(r => {
                    const matchTypeScope = r.target_type === type && r.scope === scope;
                    if (!matchTypeScope) return false;
                    
                    if (assets && assets.length > 0) {
                        const rAssets = r.asset_risk_profile_ids || [];
                        if (rAssets.length !== assets.length) return false;
                        return assets.every(a => rAssets.includes(a));
                    }
                    return true;
                });
            };

            let profileUpdated = false;

            const addRule = (rule: Omit<RiskRule, 'id'>) => {
                profile.risk_rules!.push({ ...rule, id: crypto.randomUUID() });
                profileUpdated = true;
            };

            // 1. max_daily_loss
            if (profile.max_daily_loss > 0 && !hasRule('max_daily_loss', 'global')) {
                addRule({
                    name: 'Limite Diário Base (Migrado)',
                    enabled: true,
                    target_type: 'max_daily_loss',
                    operator: '<=',
                    value: profile.max_daily_loss,
                    scope: 'global'
                });
            }

            // 2. daily_target
            if (profile.daily_target > 0 && !hasRule('profit_target', 'global')) {
                addRule({
                    name: 'Meta Diária Base (Migrada)',
                    enabled: true,
                    target_type: 'profit_target',
                    operator: '>=',
                    value: profile.daily_target,
                    scope: 'global'
                });
            }

            // 3. max_trades_per_day
            if (profile.max_trades_per_day > 0 && !hasRule('max_trades_per_day', 'global')) {
                addRule({
                    name: 'Máx Trades/Dia (Migrado)',
                    enabled: true,
                    target_type: 'max_trades_per_day',
                    operator: '<=',
                    value: profile.max_trades_per_day,
                    scope: 'global'
                });
            }

            // --- Desk Config Redundancies ---
            if (profile.desk_config) {
                const dc = profile.desk_config;
                // 4. profit_target (desk) - only if it differs from base or base is 0
                if (dc.profit_target && dc.profit_target > 0 && !hasRule('profit_target', 'global')) {
                    addRule({
                        name: 'Meta Diária da Mesa (Migrada)',
                        enabled: true,
                        target_type: 'profit_target',
                        operator: '>=',
                        value: dc.profit_target,
                        scope: 'global'
                    });
                }
                
                // 5. max_total_loss (desk)
                if (dc.max_total_loss && dc.max_total_loss > 0 && !hasRule('max_daily_loss', 'global')) {
                    addRule({
                        name: 'Perda Máxima da Mesa (Migrada)',
                        enabled: true,
                        target_type: 'max_daily_loss',
                        operator: '<=',
                        value: dc.max_total_loss,
                        scope: 'global'
                    });
                }

                // 6. max_combined_exposure
                if (dc.max_combined_exposure && dc.max_combined_exposure > 0 && !hasRule('sum_contracts', 'combined', dc.allowed_asset_ids)) {
                    addRule({
                        name: 'Exposição Máxima Global (Migrada)',
                        enabled: true,
                        target_type: 'sum_contracts',
                        operator: '<=',
                        value: dc.max_combined_exposure,
                        scope: 'combined',
                        asset_risk_profile_ids: dc.allowed_asset_ids || []
                    });
                }

                // 7. day_trade_only
                if (dc.day_trade_only && !hasRule('day_trade_only', 'global')) {
                    addRule({
                        name: 'Apenas Day Trade (Migrado)',
                        enabled: true,
                        target_type: 'day_trade_only',
                        operator: '=',
                        value: true,
                        scope: 'global'
                    });
                }

                // 8. close_before_market_close_minutes
                if (dc.close_before_market_close_minutes && dc.close_before_market_close_minutes > 0 && !hasRule('close_before_close', 'global')) {
                    addRule({
                        name: 'Horário Limite Fechamento (Migrado)',
                        enabled: true,
                        target_type: 'close_before_close',
                        operator: '>=',
                        value: dc.close_before_market_close_minutes,
                        scope: 'global'
                    });
                }

                // 9. consistency_mode
                if (dc.consistency_mode && dc.consistency_mode !== 'none' && !hasRule('consistency', 'global')) {
                    addRule({
                        name: `Regra de Consistência: ${dc.consistency_mode}`,
                        enabled: true,
                        target_type: 'consistency',
                        operator: '>=',
                        value: dc.consistency_mode === '5days_3positive' ? 3 : 5,
                        value_secondary: dc.consistency_mode === '5days_3positive' ? 5 : 10,
                        scope: 'global'
                    });
                }

                // 10. max_single_day_profit_share
                if (dc.max_single_day_profit_share && dc.max_single_day_profit_share > 0 && !hasRule('rule_50_percent', 'global')) {
                    const percentValue = dc.max_single_day_profit_share <= 1.0 ? dc.max_single_day_profit_share * 100 : dc.max_single_day_profit_share;
                    addRule({
                        name: `Regra dos ${percentValue}% (Migrada)`,
                        enabled: true,
                        target_type: 'rule_50_percent',
                        operator: '<=',
                        value: percentValue,
                        scope: 'global'
                    });
                }
            }

            // 11. combined_rules
            if (profile.combined_rules && profile.combined_rules.length > 0) {
                for (const cr of profile.combined_rules) {
                    if (!hasRule('sum_contracts', 'combined', cr.asset_risk_profile_ids)) {
                        addRule({
                            name: `Combinada: ${cr.name}`,
                            enabled: cr.enabled,
                            target_type: 'sum_contracts',
                            operator: cr.operator !== '=' ? cr.operator : '<=',
                            value: cr.limit_value,
                            scope: 'combined',
                            asset_risk_profile_ids: cr.asset_risk_profile_ids || []
                        });
                    }
                }
            }

            if (profileUpdated) {
                migratedCount++;
            }
        }

        if (migratedCount > 0) {
            await this.saveRiskProfiles();
            console.log(`[RiskSettingsStore] Legacy Operational Rules migration completed. Migrated ${migratedCount} profiles.`);
        }
    }

    /**
     * Automigração Idempotente: asset_id -> asset_ids[] + asset_type_id
     * Garante que perfis individuais antigos funcionem na nova arquitetura de escopo e categorização.
     */
    async migrateAssetScopes() {
        // We need the assetsStore to resolve the asset_type_id
        const { assetsStore } = await import("./assets.svelte");
        
        let migratedCount = 0;
        this.assetRiskProfiles = this.assetRiskProfiles.map(p => {
            let updated = { ...p };
            let profileUpdated = false;

            // 1. Migrar asset_id -> asset_ids[]
            if (p.asset_id && (!p.asset_ids || p.asset_ids.length === 0)) {
                updated.asset_ids = [p.asset_id];
                profileUpdated = true;
            }

            // 2. Preencher asset_type_id se estiver faltando (usando o primeiro ativo do grupo)
            if (!updated.asset_type_id && updated.asset_ids && updated.asset_ids.length > 0) {
                const firstAsset = assetsStore.assets.find(a => a.id === updated.asset_ids[0]);
                if (firstAsset) {
                    updated.asset_type_id = firstAsset.asset_type_id;
                    profileUpdated = true;
                }
            }

            if (profileUpdated) {
                migratedCount++;
                return updated;
            }
            return p;
        });

        if (migratedCount > 0) {
            console.log(`[RiskSettingsStore] Asset Scope migration: Migrated ${migratedCount} profiles to hierarchical structure.`);
            await this.saveAssetRiskProfiles();
        }
    }

    /**
     * Motor de Validação em Tempo Real para Perfis de Risco
     */
    createRiskValidationState(formData: Omit<RiskProfile, "id">) {
        const self = this;
        return {
            get errors(): { message: string, section: string }[] {
                const errs: { message: string, section: string }[] = [];
                if (!formData.name?.trim()) errs.push({ message: "risk.validation.error.name_empty", section: "foundation" });
                
                if (formData.capital_source === "Fixed" && (formData.fixed_capital || 0) <= 0) {
                    errs.push({ message: "risk.validation.error.capital_undefined", section: "foundation" });
                }
                
                if (formData.capital_source === "LinkedAccount" && !formData.linked_account_id) {
                    errs.push({ message: "risk.validation.error.account_not_linked", section: "foundation" });
                }
                
                // Operacional
                if (formData.max_daily_loss <= 0) errs.push({ message: "Perda máxima diária deve ser maior que zero.", section: "operational" });
                if (formData.daily_target <= 0) errs.push({ message: "Meta de lucro diária deve ser maior que zero.", section: "operational" });

                // Ecossistema
                if (!formData.linked_asset_risk_profile_ids || formData.linked_asset_risk_profile_ids.length === 0) {
                    errs.push({ message: "risk.validation.error.no_assets_linked", section: "ecosystem" });
                }

                if (formData.growth_plan_id) {
                    const plan = self.growthPlans.find(p => p.id === formData.growth_plan_id);
                    if (!plan) errs.push({ message: "risk.validation.error.growth_plan_not_found", section: "ecosystem" });
                }

                if (formData.linked_asset_risk_profile_ids) {
                    const exists = formData.linked_asset_risk_profile_ids.every(id => 
                        self.assetRiskProfiles.some(ap => ap.id === id)
                    );
                    if (!exists) errs.push({ message: "risk.validation.error.orphan_asset_reference", section: "ecosystem" });
                }
                
                return errs;
            },
            get warnings(): { message: string, section: string }[] {
                const warns: { message: string, section: string }[] = [];
                
                // Risco alto (>10% do capital fixo)
                if (formData.capital_source === "Fixed" && formData.max_daily_loss > (formData.fixed_capital * 0.1)) {
                    warns.push({ message: "risk.validation.warning.high_risk", section: "operational" });
                }
                
                // Meta desproporcional (>5x o risco)
                if (formData.max_daily_loss > 0 && formData.daily_target > (formData.max_daily_loss * 5)) {
                    warns.push({ message: "risk.validation.warning.meta_disproportionate", section: "operational" });
                }
                
                if (!formData.psychological_coupling_enabled) {
                    warns.push({ message: "risk.validation.warning.no_psych_filters", section: "intelligence" });
                }
                
                if (!formData.use_advanced_rules || (formData.risk_rules?.length === 0)) {
                    warns.push({ message: "risk.validation.warning.no_blocking_rules", section: "intelligence" });
                }
                
                return warns;
            },
            get isValid(): boolean {
                return this.errors.length === 0;
            },
            get sectionStatus() {
                const sections = ["foundation", "operational", "intelligence", "ecosystem"];
                const status: Record<string, { errors: number, warnings: number }> = {};
                
                sections.forEach(s => {
                    status[s] = {
                        errors: this.errors.filter(e => e.section === s).length,
                        warnings: this.warnings.filter(w => w.section === s).length
                    };
                });
                
                return status;
            }
        };
    }
}

export const riskSettingsStore = new RiskSettingsStore();
