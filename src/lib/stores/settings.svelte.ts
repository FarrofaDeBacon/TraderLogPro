import { invoke } from "@tauri-apps/api/core";
import { fetch } from "@tauri-apps/plugin-http";
import { getLocalDatePart } from "$lib/utils";
import { validateLicenseKey, computeCustomerId, type LicenseData } from "$lib/utils/license";

// Mock Global Store for Settings (Simulating Backend DB)
// Using Svelte 5 Runes for reactivity outside components

import type {
    TradingSession, Market, AssetType, Asset, Currency, Account,
    JournalEntry, Trade, EmotionalState, Strategy, UserProfile,
    FeeProfile, RiskProfile, Modality, Tag, Indicator, Timeframe,
    ChartType, ApiConfig, CashTransaction, TaxRule, TaxMapping, TaxProfile, TaxProfileEntry, AssetRiskProfile, GrowthPlan
} from "$lib/types";
import { riskSettingsStore } from "./risk-settings.svelte";
import { assetsStore } from "./assets.svelte";
import { accountsStore } from "./accounts.svelte";
import { currenciesStore } from "./currencies.svelte";
import { marketsStore } from "./markets.svelte";
import { assetTypesStore } from "./asset-types.svelte";
import { modalitiesStore } from "./modalities.svelte";
import { indicatorsStore } from "./indicators.svelte";
import { timeframesStore } from "./timeframes.svelte";
import { chartTypesStore } from "./chart-types.svelte";
import { financialConfigStore } from "./financial-config.svelte";
import { userProfileStore } from "./user-profile.svelte";
import { workspaceStore } from "./workspace.svelte";
import { integrationsStore } from "./integrations.svelte";
export type {
    TradingSession, Market, AssetType, Asset, Currency, Account,
    JournalEntry, Trade, EmotionalState, Strategy, UserProfile,
    FeeProfile, RiskProfile, Modality, Tag, Indicator, Timeframe,
    ChartType, ApiConfig, CashTransaction, TaxRule, TaxMapping, TaxProfile, TaxProfileEntry, AssetRiskProfile
} from "$lib/types";

class SettingsStore {
    // User Profile, Device ID, and Auth migrated to userProfileStore
    // Integrations properties removed
    get emotionalStates() { return workspaceStore.emotionalStates; }
    get tags() { return workspaceStore.tags; }
    get journalEntries() { return workspaceStore.journalEntries; }
    get strategies() { return workspaceStore.strategies; }

    isLoadingData = $state<boolean>(false);
    
    // --- FINANCIAL DELEGATES (TEMPORARY FOR COMPATIBILITY) ---
    get fees() { return financialConfigStore.fees; }
    get taxRules() { return financialConfigStore.taxRules; }
    get taxMappings() { return financialConfigStore.taxMappings; }
    get taxProfiles() { return financialConfigStore.taxProfiles; }
    get taxProfileEntries() { return financialConfigStore.taxProfileEntries; }
    get cashTransactions() { return financialConfigStore.cashTransactions; }
    // ---------------------------------------------------------
    
    // --- USER PROFILE DELEGATES (TEMPORARY FOR COMPATIBILITY) ---
    get userProfile() { return userProfileStore.userProfile; }
    set userProfile(val: UserProfile) { userProfileStore.userProfile = val; }
    get hardwareId() { return userProfileStore.hardwareId; }
    get licenseDetails() { return userProfileStore.licenseDetails; }
    get isLoggedIn() { return userProfileStore.isLoggedIn; }
    get licenseStatus() { return userProfileStore.licenseStatus; }
    get trialDaysLeft() { return userProfileStore.trialDaysLeft; }
    get licensePlanName() { return userProfileStore.licensePlanName; }
    get licenseTotalDays() { return userProfileStore.licenseTotalDays; }
    get licenseDaysRemaining() { return userProfileStore.licenseDaysRemaining; }
    
    login(email: string, pass: string) { return userProfileStore.login(email, pass); }
    logout() { return userProfileStore.logout(); }
    updateUserProfile(data: Partial<UserProfile>) { return userProfileStore.updateUserProfile(data); }
    saveUserProfile() { return userProfileStore.saveUserProfile(); }
    refreshLicenseStatus() { return userProfileStore.refreshLicenseStatus(); }
    deactivateLicense() { return userProfileStore.deactivateLicense(); }
    // ---------------------------------------------------------


    constructor() {
        if (typeof window !== "undefined") {
            this.loadData();
        }
    }

    async loadCashTransactions() {
        return financialConfigStore.loadCashTransactions();
    }



    async loadData(silent: boolean = false) {
        if (this.isLoadingData) {
            console.log("[SettingsStore] loadData already in progress, skipping.");
            return;
        }
        if (!silent) this.isLoadingData = true;
        console.log("[SettingsStore] Starting loadData...");

        try {
            const safeInvoke = async <T>(command: string, label: string): Promise<T | null> => {
                try {
                    const result = await invoke(command) as T;
                    return result;
                } catch (e) {
                    console.error(`[SettingsStore] ERROR loading ${label}:`, e);
                    return null;
                }
            };

            const [
                _userProfileSignal,
                accountsRes,
                currenciesRes,
                marketsRes,
                assetTypesRes,
                assetsRes,
                riskProfilesRes,
                modalitiesRes,
                indicatorsRes,
                timeframesRes,
                chartTypesRes,
                assetRiskProfilesRes,
                growthPlansRes,
                _financialSignal,
                _workspaceSignal,
                _integrationsSignal
            ] = await Promise.all([
                userProfileStore.loadData().then(() => null),
                safeInvoke<Account[]>("get_accounts", "Accounts"),
                safeInvoke<Currency[]>("get_currencies", "Currencies"),
                safeInvoke<Market[]>("get_markets", "Markets"),
                safeInvoke<AssetType[]>("get_asset_types", "Asset Types"),
                assetsStore.loadAssets().then(() => null),
                safeInvoke<RiskProfile[]>("get_risk_profiles", "Risk Profiles"),
                safeInvoke<Modality[]>("get_modalities", "Modalities"),
                safeInvoke<Indicator[]>("get_indicators", "Indicators"),
                safeInvoke<Timeframe[]>("get_timeframes", "Timeframes"),
                safeInvoke<ChartType[]>("get_chart_types", "Chart Types"),
                safeInvoke<AssetRiskProfile[]>("get_asset_risk_profiles", "Asset Risk Profiles"),
                safeInvoke<GrowthPlan[]>("get_growth_plans", "Growth Plans"),
                financialConfigStore.loadData().then(() => null),
                workspaceStore.loadData().then(() => null),
                integrationsStore.loadData().then(() => null)
            ]);

            // Assign results
            if (accountsRes) accountsStore.accounts = accountsRes;
            if (currenciesRes) currenciesStore.currencies = currenciesRes;
            if (marketsRes) marketsStore.markets = marketsRes;
            if (assetTypesRes) assetTypesStore.assetTypes = assetTypesRes;
            
            if (riskProfilesRes) {
                riskSettingsStore.riskProfiles = riskProfilesRes.map(rp => ({
                    ...rp,
                    account_ids: rp.account_ids ?? []
                }));
            }
            if (modalitiesRes) modalitiesStore.modalities = modalitiesRes;
            if (indicatorsRes) indicatorsStore.indicators = indicatorsRes;
            if (timeframesRes) timeframesStore.timeframes = timeframesRes;
            if (chartTypesRes) chartTypesStore.chartTypes = chartTypesRes;
            if (assetRiskProfilesRes) riskSettingsStore.assetRiskProfiles = assetRiskProfilesRes;
            if (growthPlansRes) riskSettingsStore.growthPlans = growthPlansRes;

            // Integrations and UI state are now initialized inside integrationsStore.loadData()

            // Run legacy risk/growth migration if needed
            await riskSettingsStore.migrateLegacyRiskRules();

            console.log("[SettingsStore] loadData completed.");
        } catch (e) {
            console.error("[SettingsStore] CRITICAL error in loadData:", e);
        } finally {
            this.isLoadingData = false;
        }
    }

    // APIs now handled in integrationsStore







    

    async saveAssets() {
        return assetsStore.saveAssets();
    }

    // Private workspace sync methods have been removed.




    // Public Logic Methods

    // Deduplication relocated to workspaceStore

    // (Domain proxies migrated to domain stores)

    // --- RESTORED NATIVE METHODS (Etapa 2 migrará isto) ---
    // Fees
    addFeeProfile(item: Omit<FeeProfile, "id">) { return financialConfigStore.addFeeProfile(item); }
    updateFeeProfile(id: string, item: Partial<FeeProfile>) { return financialConfigStore.updateFeeProfile(id, item); }
    deleteFeeProfile(id: string) { return financialConfigStore.deleteFeeProfile(id); }
    saveFees() { return financialConfigStore.saveFees(); }

    // Tax Rules
    addTaxRule(item: Omit<TaxRule, "id">) { return financialConfigStore.addTaxRule(item); }
    updateTaxRule(id: string, item: Partial<TaxRule>) { return financialConfigStore.updateTaxRule(id, item); }
    deleteTaxRule(id: string) { return financialConfigStore.deleteTaxRule(id); }

    // Fiscal Module (Tax Profiles - New Option B)
    // Tax Profiles
    addTaxProfile(item: Omit<TaxProfile, "id">) { return financialConfigStore.addTaxProfile(item); }
    updateTaxProfile(id: string, item: Partial<TaxProfile>) { return financialConfigStore.updateTaxProfile(id, item); }
    deleteTaxProfile(id: string) { return financialConfigStore.deleteTaxProfile(id); }

    // Fiscal Module (Tax Profile Entries)
    // Tax Profile Entries
    addTaxProfileEntry(item: Omit<TaxProfileEntry, "id">) { return financialConfigStore.addTaxProfileEntry(item); }
    deleteTaxProfileEntry(id: string) { return financialConfigStore.deleteTaxProfileEntry(id); }
    getEntriesForProfile(profileId: string) { return financialConfigStore.getEntriesForProfile(profileId); }


    // Fiscal Module (Mappings)
    // Tax Mappings
    addTaxMapping(item: Omit<TaxMapping, "id">) { return financialConfigStore.addTaxMapping(item); }
    updateTaxMapping(id: string, item: Partial<TaxMapping>) { return financialConfigStore.updateTaxMapping(id, item); }
    deleteTaxMapping(id: string) { return financialConfigStore.deleteTaxMapping(id); }

    // Cash Transactions
    addCashTransaction(item: Omit<CashTransaction, "id"> & { id?: string }) { return financialConfigStore.addCashTransaction(item); }
    removeCashTransaction(id: string) { return financialConfigStore.removeCashTransaction(id); }
    transferFunds(options: any) { return financialConfigStore.transferFunds(options); }


    // Indicators
    addIndicator(item: Omit<Indicator, "id">) {
        return indicatorsStore.addIndicator(item);
    }
    updateIndicator(id: string, item: Partial<Indicator>) {
        return indicatorsStore.updateIndicator(id, item);
    }
    async deleteIndicator(id: string): Promise<{ success: boolean; error?: string }> {
        return indicatorsStore.deleteIndicator(id);
    }

    // Timeframes
    addTimeframe(item: Omit<Timeframe, "id">) {
        return timeframesStore.addTimeframe(item);
    }
    updateTimeframe(id: string, item: Partial<Timeframe>) {
        return timeframesStore.updateTimeframe(id, item);
    }
    async deleteTimeframe(id: string): Promise<{ success: boolean; error?: string }> {
        return timeframesStore.deleteTimeframe(id);
    }

    // Chart Types
    addChartType(item: Omit<ChartType, "id">) {
        return chartTypesStore.addChartType(item);
    }
    updateChartType(id: string, item: Partial<ChartType>) {
        return chartTypesStore.updateChartType(id, item);
    }
    async deleteChartType(id: string): Promise<{ success: boolean; error?: string }> {
        return chartTypesStore.deleteChartType(id);
    }

    // APIs and RTD have been moved completely to integrationsStore

    // Debug / Seed
    async seedDatabase() {
        if (workspaceStore.strategies.length === 0) {
            await invoke("save_strategy", { strategy: {
                id: crypto.randomUUID(),
                name: "Default Setup (Seed)",
                description: "Automatically generated strategy.",
                market_ids: ["m1"],
                timeframes: ["5m"],
                asset_types: ["Futuros"],
                indicators: ["VWAP"],
                specific_assets: ["WIN"],
                entry_criteria: "Cross",
                exit_criteria: "Stop",
                management_criteria: "None",
                has_partial: false,
                partial_description: "",
                images: []
            } });
        }
    }

    clearDatabase() {
        marketsStore.clearMarkets(); assetTypesStore.clearAssetTypes(); assetsStore.clearAssets(); accountsStore.clearAccounts(); currenciesStore.clearCurrencies();
        workspaceStore.clearWorkspace(); riskSettingsStore.clearRiskSettings(); modalitiesStore.clearModalities();
        indicatorsStore.clearIndicators(); timeframesStore.clearTimeframes();
        chartTypesStore.clearChartTypes();
    }


    async hasClosureForDate(date: string, accountId: string): Promise<boolean> {
        return financialConfigStore.hasClosureForDate(date, accountId);
    }
}

export const settingsStore = new SettingsStore();
