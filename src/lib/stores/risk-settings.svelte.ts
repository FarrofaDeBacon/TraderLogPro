import { invoke } from "@tauri-apps/api/core";
import type { RiskProfile, AssetRiskProfile, GrowthPlan } from "$lib/types";

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
        
        // Clone Global Growth Phases generating new IDs
        const clonedPhases = original.growth_phases?.map(p => ({
            ...p,
            id: crypto.randomUUID()
        })) || [];

        const clonedProfile: RiskProfile = {
            ...original,
            id: newProfileId,
            name: `${original.name} (Cópia)`,
            active: false,
            growth_phases: clonedPhases,
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
            growth_phases: base.growth_phases
                ? base.growth_phases.map((p) => ({ ...p, id: crypto.randomUUID() }))
                : [],
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
        return this.growthPlans.find(p => p.risk_profile_id === riskProfileId);
    }

    clearRiskSettings() {
        this.riskProfiles = [];
        this.assetRiskProfiles = [];
        this.growthPlans = [];
    }
}

export const riskSettingsStore = new RiskSettingsStore();

