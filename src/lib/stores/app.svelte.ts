import { fetch } from "@tauri-apps/plugin-http";
import { getLocalDatePart } from "$lib/utils";
import { safeInvoke } from "$lib/services/tauri";
import { validateLicenseKey, type LicenseData } from "$lib/utils/license";

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
import { tradesStore } from "./trades.svelte";
import { invokeWithTimeout } from "../utils";




class AppFacadeStore {
    isLoadingData = $state<boolean>(false);
    isInitialLoadComplete = $state<boolean>(false);

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
        console.log("[SettingsStore] Starting prioritized loadData...");

        const startTime = performance.now();

        try {

            // BATCH 1: INSTANT SHELL DATA (Menu, Header & Profile context)
            console.log("[SettingsStore] Loading Batch 1 (Instant Shell)...");
            const [userProfileRes, accountsRes] = await Promise.all([
                userProfileStore.loadData().catch(() => null),
                safeInvoke<Account[]>("get_accounts", "Accounts")
            ]);

            if (accountsRes) accountsStore.accounts = accountsRes;
            console.log("[SettingsStore] Batch 1 complete. Unblocking UI...");

            // UNBLOCK UI IMMEDIATELY
            this.isLoadingData = false;
            const shellDuration = (performance.now() - startTime).toFixed(0);
            console.log(`[SettingsStore] UI Shell unblocked in ${shellDuration}ms.`);

            // PIPELINE DE BACKGROUND: Load heavy data without blocking UI
            const loadRemainingData = async () => {
                const bgStartTime = performance.now();
                
                // BATCH 2: CORE DOMAIN & TRADES
                console.log("[SettingsStore] Background: Loading Trades & Core Domain...");
                const [
                    _tradesSignal,
                    currenciesRes,
                    riskProfilesRes,
                    assetsRes,
                    assetRiskProfilesRes,
                    growthPlansRes,
                    _financialSignal
                ] = await Promise.all([
                    tradesStore.loadTrades().catch(() => null),
                    safeInvoke<Currency[]>("get_currencies", "Currencies"),
                    safeInvoke<RiskProfile[]>("get_risk_profiles", "Risk Profiles"),
                    assetsStore.loadAssets().catch(() => null),
                    safeInvoke<AssetRiskProfile[]>("get_asset_risk_profiles", "Asset Risk Profiles"),
                    safeInvoke<GrowthPlan[]>("get_growth_plans", "Growth Plans"),
                    financialConfigStore.loadData().catch(() => null)
                ]);

                if (currenciesRes) currenciesStore.currencies = currenciesRes;
                if (riskProfilesRes) {
                    riskSettingsStore.riskProfiles = riskProfilesRes.map(rp => ({
                        ...rp,
                        account_ids: rp.account_ids ?? []
                    }));
                }
                if (assetRiskProfilesRes) riskSettingsStore.assetRiskProfiles = assetRiskProfilesRes;
                if (growthPlansRes) riskSettingsStore.growthPlans = growthPlansRes;

                // BATCH 3: SECONDARY / WORKSPACE DATA
                console.log("[SettingsStore] Background: Loading Secondary modules...");
                const [
                    marketsRes,
                    assetTypesRes,
                    modalitiesRes,
                    indicatorsRes,
                    timeframesRes,
                    chartTypesRes,
                    _workspaceSignal,
                    _integrationsSignal
                ] = await Promise.all([
                    safeInvoke<Market[]>("get_markets", "Markets"),
                    safeInvoke<AssetType[]>("get_asset_types", "Asset Types"),
                    safeInvoke<Modality[]>("get_modalities", "Modalities"),
                    safeInvoke<Indicator[]>("get_indicators", "Indicators"),
                    safeInvoke<Timeframe[]>("get_timeframes", "Timeframes"),
                    safeInvoke<ChartType[]>("get_chart_types", "Chart Types"),
                    workspaceStore.loadData().catch(() => null),
                    integrationsStore.loadData().catch(() => null)
                ]);

                if (marketsRes) marketsStore.markets = marketsRes;
                if (assetTypesRes) assetTypesStore.assetTypes = assetTypesRes;
                if (modalitiesRes) modalitiesStore.modalities = modalitiesRes;
                if (indicatorsRes) indicatorsStore.indicators = indicatorsRes;
                if (timeframesRes) timeframesStore.timeframes = timeframesRes;
                if (chartTypesRes) chartTypesStore.chartTypes = chartTypesRes;

                // Final sync/migrations
                await riskSettingsStore.migrateLegacyRiskRules();
                await riskSettingsStore.migrateAssetScopes();
                
                const totalDuration = (performance.now() - startTime).toFixed(0);
                console.log(`[SettingsStore] Hydra pipeline complete. Total load time: ${totalDuration}ms.`);
                this.isInitialLoadComplete = true;
            };

            // Run Background Pipeline
            loadRemainingData();

        } catch (e) {
            console.error("[SettingsStore] CRITICAL error in loadData:", e);
            this.isLoadingData = false; // Ensure UI is not stuck
        }
    }

    // APIs now handled in integrationsStore







    



    // APIs and RTD have been moved completely to integrationsStore

    // Debug / Seed
    async seedDatabase() {
        if (workspaceStore.strategies.length === 0) {
            await safeInvoke("save_strategy", { strategy: {
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
