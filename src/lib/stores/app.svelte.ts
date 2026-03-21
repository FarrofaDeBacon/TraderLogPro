import { invoke } from "@tauri-apps/api/core";
import { fetch } from "@tauri-apps/plugin-http";
import { getLocalDatePart } from "$lib/utils";
import { validateLicenseKey, computeCustomerId, type LicenseData } from "$lib/utils/license";

// Mock Global Store for Settings (Simulating Backend DB)
// Using Svelte 5 Runes for reactivity outside components

import type {
    Account, Currency, Market, AssetType, RiskProfile, Modality, Indicator, Timeframe, ChartType, AssetRiskProfile, GrowthPlan
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




class AppFacadeStore {
    isLoadingData = $state<boolean>(false);

    constructor() {
        if (typeof window !== "undefined") {
            this.loadData();
        }
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

export const appStore = new AppFacadeStore();
