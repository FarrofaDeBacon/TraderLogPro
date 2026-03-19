import { invoke } from "@tauri-apps/api/core";
import type { RiskProfile, AssetRiskProfile, GrowthPlan, RiskRule } from "$lib/types";

export class RiskSettingsStore {
    riskProfiles = $state<RiskProfile[]>([]);
    assetRiskProfiles = $state<AssetRiskProfile[]>([]);
    growthPlans = $state<GrowthPlan[]>([]);

    get activeProfile() {
        return this.riskProfiles.find(p => p.active) || this.riskProfiles[0];
    }

    async saveRiskProfiles() {
        for (const profile of this.riskProfiles) {
            try {
                await invoke("save_risk_profile", { profile: $state.snapshot(profile) });
            } catch (e) {
                console.error("[RiskSettingsStore] Error saving risk profile:", e);
            }
        }
    }

    async saveAssetRiskProfiles() {
        for (const profile of this.assetRiskProfiles) {
            try {
                await invoke("save_asset_risk_profile", { profile: $state.snapshot(profile) });
            } catch (e) {
                console.error("[RiskSettingsStore] Error saving asset risk profile:", e);
            }
        }
    }

    async saveGrowthPlans() {
        for (const plan of this.growthPlans) {
            try {
                await invoke("save_growth_plan", { plan: $state.snapshot(plan) });
            } catch (e) {
                console.error("[RiskSettingsStore] Error saving growth plan:", e);
            }
        }
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
            await invoke("delete_risk_profile", { id });
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
        this.assetRiskProfiles.push({ ...item, id: crypto.randomUUID() });
        this.saveAssetRiskProfiles();
    }
    
    updateAssetRiskProfile(id: string, item: Partial<AssetRiskProfile>) {
        this.assetRiskProfiles = this.assetRiskProfiles.map(r => r.id === id ? { ...r, ...item } : r);
        this.saveAssetRiskProfiles();
    }
    
    async deleteAssetRiskProfile(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke("delete_asset_risk_profile", { id });
            this.assetRiskProfiles = this.assetRiskProfiles.filter(r => r.id !== id);
            return { success: true };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    // --- Growth Plans CRUD ---
    addGrowthPlan(item: Omit<GrowthPlan, "id">) {
        const plan: GrowthPlan = { ...item, id: crypto.randomUUID() };
        this.growthPlans.push(plan);
        this.saveGrowthPlans();
        return plan.id;
    }

    updateGrowthPlan(id: string, item: Partial<GrowthPlan>) {
        this.growthPlans = this.growthPlans.map(p => p.id === id ? { ...p, ...item } : p);
        this.saveGrowthPlans();
    }

    async deleteGrowthPlan(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke("delete_growth_plan", { id });
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
}

export const riskSettingsStore = new RiskSettingsStore();
