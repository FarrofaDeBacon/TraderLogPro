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
export type {
    TradingSession, Market, AssetType, Asset, Currency, Account,
    JournalEntry, Trade, EmotionalState, Strategy, UserProfile,
    FeeProfile, RiskProfile, Modality, Tag, Indicator, Timeframe,
    ChartType, ApiConfig, CashTransaction, TaxRule, TaxMapping, TaxProfile, TaxProfileEntry, AssetRiskProfile
} from "$lib/types";

class SettingsStore {
    userProfile = $state<UserProfile>({
        id: "main",
        name: "",
        email: "",
        phone: "",
        cpf: "",
        theme: "",
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
        main_currency: "BRL",
        avatar: null,
        convert_all_to_main: false,
        onboarding_completed: false,
        currency_api_url: "https://economia.awesomeapi.com.br/last/",
        birth_date: null,
        trial_start_date: null,
        license_key: null,
        utc_offset: -180, // Default to Brasilia
    });

    psychologyApiId = $state<string>("none");
    marketDataApiId = $state<string>("none");
    rtdEnabled = $state<boolean>(false);
    rtdExcelPath = $state<string>("");

    emotionalStates = $state<EmotionalState[]>([]);
    tags = $state<Tag[]>([]);
    journalEntries = $state<JournalEntry[]>([]);
    apiConfigs = $state<ApiConfig[]>([]);

    // (Growth Plans Methods migrated to riskSettingsStore)
    // (Financial Methods migrated to financialConfigStore)

    strategies = $state<Strategy[]>([]);
    hardwareId = $state<string>("");
    licenseDetails = $state<LicenseData | null>(null);
    isLoadingData = $state<boolean>(false);

    // --- FINANCIAL DELEGATES (TEMPORARY FOR COMPATIBILITY) ---
    get fees() { return financialConfigStore.fees; }
    get taxRules() { return financialConfigStore.taxRules; }
    get taxMappings() { return financialConfigStore.taxMappings; }
    get taxProfiles() { return financialConfigStore.taxProfiles; }
    get taxProfileEntries() { return financialConfigStore.taxProfileEntries; }
    get cashTransactions() { return financialConfigStore.cashTransactions; }
    // ---------------------------------------------------------
    
    get activeProfile() { return riskSettingsStore.activeProfile; }
    isLoggedIn = $state<boolean>(
        typeof window !== "undefined" ? localStorage.getItem("isLoggedIn") === "true" : false
    );


    // Computed license info
    licenseStatus = $derived.by(() => {
        if (this.licenseDetails?.valid) {
            return "active";
        }

        if (!this.userProfile.trial_start_date) return "trial";

        const start = new Date(this.userProfile.trial_start_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 7 ? "expired" : "trial";
    });

    trialDaysLeft = $derived.by(() => {
        if (!this.userProfile.trial_start_date) return 7;
        const start = new Date(this.userProfile.trial_start_date);
        const now = new Date();
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, 7 - diffDays);
    });

    licensePlanName = $derived(this.licenseDetails?.plan || "Trial");

    licenseTotalDays = $derived.by(() => {
        if (this.licensePlanName === "Lifetime") return null;
        if (!this.licenseDetails?.expiration || !this.licenseDetails?.createdAt) return null;
        const start = new Date(this.licenseDetails.createdAt);
        const end = new Date(this.licenseDetails.expiration);
        const diffTime = end.getTime() - start.getTime();
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    });

    licenseDaysRemaining = $derived.by(() => {
        if (this.licensePlanName === "Lifetime") return null;
        if (!this.licenseDetails?.expiration) return null;
        const end = new Date(this.licenseDetails.expiration);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    });


    constructor() {
        if (typeof window !== "undefined") {
            this.loadData();
        }
    }

    async loadCashTransactions() {
        return financialConfigStore.loadCashTransactions();
    }

    async refreshLicenseStatus() {
        if (!this.userProfile.license_key) {
            console.log("[SettingsStore] No license key found, skipping refresh.");
            return;
        }

        console.log("[SettingsStore] Refreshing license status for key:", this.userProfile.license_key.substring(0, 10) + "...");

        try {
            const customerId = await computeCustomerId({
                name: this.userProfile.name,
                cpf: this.userProfile.cpf,
                birthDate: this.userProfile.birth_date || "",
                hardwareId: this.hardwareId
            });

            console.log("[SettingsStore] Computed Customer ID:", customerId);

            const result = await validateLicenseKey(this.userProfile.license_key, customerId);
            console.log("[SettingsStore] License Validation Result:", result);
            this.licenseDetails = result;
        } catch (e) {
            console.error("[SettingsStore] Error refreshing license:", e);
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
                profile,
                hwid,
                apiConfigsRes,
                accountsRes,
                currenciesRes,
                marketsRes,
                assetTypesRes,
                assetsRes,
                emotionalStatesRes,
                strategiesRes,
                journalEntriesRes,
                riskProfilesRes,
                modalitiesRes,
                tagsRes,
                indicatorsRes,
                timeframesRes,
                chartTypesRes,
                assetRiskProfilesRes,
                growthPlansRes,
                _financialSignal
            ] = await Promise.all([
                safeInvoke<UserProfile>("get_user_profile", "User Profile"),
                safeInvoke<string>("get_machine_id_cmd", "Hardware ID"),
                safeInvoke<ApiConfig[]>("get_api_configs", "API Configs"),
                safeInvoke<Account[]>("get_accounts", "Accounts"),
                safeInvoke<Currency[]>("get_currencies", "Currencies"),
                safeInvoke<Market[]>("get_markets", "Markets"),
                safeInvoke<AssetType[]>("get_asset_types", "Asset Types"),
                assetsStore.loadAssets().then(() => null),
                safeInvoke<EmotionalState[]>("get_emotional_states", "Emotional States"),
                safeInvoke<Strategy[]>("get_strategies", "Strategies"),
                safeInvoke<JournalEntry[]>("get_journal_entries", "Journal Entries"),
                safeInvoke<RiskProfile[]>("get_risk_profiles", "Risk Profiles"),
                safeInvoke<Modality[]>("get_modalities", "Modalities"),
                safeInvoke<Tag[]>("get_tags", "Tags"),
                safeInvoke<Indicator[]>("get_indicators", "Indicators"),
                safeInvoke<Timeframe[]>("get_timeframes", "Timeframes"),
                safeInvoke<ChartType[]>("get_chart_types", "Chart Types"),
                safeInvoke<AssetRiskProfile[]>("get_asset_risk_profiles", "Asset Risk Profiles"),
                safeInvoke<GrowthPlan[]>("get_growth_plans", "Growth Plans"),
                financialConfigStore.loadData().then(() => null)
            ]);

            // Assign results
            if (hwid) this.hardwareId = hwid;
            if (apiConfigsRes) this.apiConfigs = apiConfigsRes;
            if (accountsRes) accountsStore.accounts = accountsRes;
            if (currenciesRes) currenciesStore.currencies = currenciesRes;
            if (marketsRes) marketsStore.markets = marketsRes;
            if (assetTypesRes) assetTypesStore.assetTypes = assetTypesRes;
            
            if (emotionalStatesRes) {
                this.emotionalStates = emotionalStatesRes;
            }
            if (strategiesRes) {
                this.strategies = strategiesRes;
            }
            if (riskProfilesRes) {
                riskSettingsStore.riskProfiles = riskProfilesRes.map(rp => ({
                    ...rp,
                    account_ids: rp.account_ids ?? []
                }));
            }
            if (modalitiesRes) modalitiesStore.modalities = modalitiesRes;
            if (tagsRes) this.tags = tagsRes;
            if (indicatorsRes) indicatorsStore.indicators = indicatorsRes;
            if (timeframesRes) timeframesStore.timeframes = timeframesRes;
            if (chartTypesRes) chartTypesStore.chartTypes = chartTypesRes;
            if (assetRiskProfilesRes) riskSettingsStore.assetRiskProfiles = assetRiskProfilesRes;
            if (growthPlansRes) riskSettingsStore.growthPlans = growthPlansRes;

            if (journalEntriesRes) {
                this.journalEntries = journalEntriesRes;
                await this.deduplicateJournalEntries();
            }

            if (profile) {
                this.userProfile = { ...this.userProfile, ...profile };
                console.log("[SettingsStore] User Profile loaded and processed.");
            } else {
                console.warn("[SettingsStore] No profile found, using defaults.");
            }

            // LocalStorage fallbacks for UI state
            const savedBindings = localStorage.getItem("service_api_bindings");
            if (savedBindings) {
                const parsed = JSON.parse(savedBindings);
                this.psychologyApiId = parsed.psychology || "mock";
                this.marketDataApiId = parsed.market_data || "mock";
            }
            this.rtdEnabled = localStorage.getItem("rtd_enabled") === "true";
            this.rtdExcelPath = localStorage.getItem("rtd_excel_path") || "";

            if (this.userProfile.license_key && this.hardwareId) {
                this.refreshLicenseStatus();
            }

            if (this.rtdEnabled) {
                invoke("start_rtd_monitor_cmd", { excelPath: this.rtdExcelPath || null }).catch(e => console.error(e));
            }

            // Run legacy risk/growth migration if needed
            await riskSettingsStore.migrateLegacyRiskRules();

            console.log("[SettingsStore] loadData completed.");
        } catch (e) {
            console.error("[SettingsStore] CRITICAL error in loadData:", e);
        } finally {
            this.isLoadingData = false;
        }
    }

    async saveUserProfile() {
        try {
            await invoke("save_user_profile", { profile: $state.snapshot(this.userProfile) });
        } catch (e) {
            console.error("[SettingsStore] Error saving user profile:", e);
        }
    }

    async deactivateLicense() {
        this.userProfile.license_key = null;
        this.licenseDetails = null;
        await this.saveUserProfile();
        console.log("[SettingsStore] License deactivated.");
    }

    private async saveApiConfigs() {
        for (const config of this.apiConfigs) {
            try {
                await invoke("save_api_config", { config: $state.snapshot(config) });
            } catch (e) {
                console.error("[SettingsStore] Error saving api config:", e);
            }
        }
    }







    

    async saveAssets() {
        return assetsStore.saveAssets();
    }

    private async saveEmotionalStates() {
        for (const state of this.emotionalStates) {
            try {
                await invoke("save_emotional_state", { state: $state.snapshot(state) });
            } catch (e) {
                console.error("[SettingsStore] Error saving emotional state:", e);
            }
        }
    }

    private async saveStrategies() {
        for (const strategy of this.strategies) {
            try {
                await invoke("save_strategy", { strategy: $state.snapshot(strategy) });
            } catch (e) {
                console.error("[SettingsStore] Error saving strategy:", e);
            }
        }
    }



    private async saveTags() {
        for (const tag of this.tags) {
            try {
                await invoke("save_tag", { tag: $state.snapshot(tag) });
            } catch (e) {
                console.error("[SettingsStore] Error saving tag:", e);
            }
        }
    }







    private async saveJournal() {
        for (const entry of this.journalEntries) {
            await this.saveSingleJournalEntry(entry);
        }
    }

    async saveSingleJournalEntry(entry: JournalEntry) {
        try {
            await invoke("save_journal_entry", { entry: $state.snapshot(entry) });
        } catch (e) {
            console.error("[SettingsStore] Error saving journal entry:", e);
        }
    }




    // --- Public Logic Methods ---

    getJournalEntryByDate(date: string) {
        console.log("[SettingsStore] getJournalEntryByDate checking:", date);
        const searchDate = getLocalDatePart(date);

        const match = this.journalEntries.find(e => {
            if (!e.date) return false;
            return getLocalDatePart(e.date) === searchDate;
        });

        if (match) console.log("  found match!", match.id);
        else console.log("  no match found.");
        return match;
    }

    /**
     * Proactively removes duplicate journal entries for the same date.
     * Keeps the most recent or the first one found.
     */
    async deduplicateJournalEntries() {
        if (this.journalEntries.length === 0) return;

        const dateMap = new Map<string, JournalEntry>();
        const toDeleteIds: string[] = [];
        const uniqueEntries: JournalEntry[] = [];

        // Identify duplicates by date
        for (const entry of this.journalEntries) {
            const dateStr = getLocalDatePart(entry.date);
            if (dateMap.has(dateStr)) {
                // Duplicate found: Mark it for deletion
                toDeleteIds.push(entry.id);
                console.log(`[SettingsStore] Duplicate journal found for ${dateStr} (ID: ${entry.id}). Marking for deletion.`);
            } else {
                dateMap.set(dateStr, entry);
                uniqueEntries.push(entry);
            }
        }

        if (toDeleteIds.length > 0) {
            this.journalEntries = uniqueEntries;
            console.log(`[SettingsStore] Consolidated ${toDeleteIds.length} duplicate journal entries.`);

            // Proactively clean the backend
            for (const id of toDeleteIds) {
                try {
                    await invoke("delete_journal_entry", { id });
                } catch (e) {
                    console.error(`[SettingsStore] FAILED to clean duplicate ${id} from backend:`, e);
                }
            }
        }
    }

    // (Domain proxies migrated to domain stores)

    // --- RESTORED NATIVE METHODS (Etapa 2 migrará isto) ---
    // Fees
    addFeeProfile(item: Omit<FeeProfile, "id">) { return financialConfigStore.addFeeProfile(item); }
    updateFeeProfile(id: string, item: Partial<FeeProfile>) { return financialConfigStore.updateFeeProfile(id, item); }
    deleteFeeProfile(id: string) { return financialConfigStore.deleteFeeProfile(id); }
    saveFees() { return financialConfigStore.saveFees(); }

    // Strategies
    addStrategy(item: Omit<Strategy, "id">) {
        this.strategies.push({ ...item, id: crypto.randomUUID() });
        this.saveStrategies();
    }
    updateStrategy(id: string, item: Partial<Strategy>) {
        this.strategies = this.strategies.map(s => s.id === id ? { ...s, ...item } : s);
        this.saveStrategies();
    }
    async deleteStrategy(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_strategy", { id });
        this.strategies = this.strategies.filter(s => s.id !== id);
        return { success: true };
    }
    // --- END RESTORED ---
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

    // User Profile
    updateUserProfile(data: Partial<UserProfile>) {
        this.userProfile = { ...this.userProfile, ...data };
        this.saveUserProfile();
        if (typeof window !== "undefined" && data.language) {
            localStorage.setItem("locale", data.language);
        }
        if (data.license_key !== undefined || data.name || data.cpf || data.birth_date) {
            this.refreshLicenseStatus();
        }
    }

    // Psychology / Emotional States
    addEmotionalState(item: Omit<EmotionalState, "id">) {
        this.emotionalStates.push({ ...item, id: crypto.randomUUID() });
        this.saveEmotionalStates();
    }
    updateEmotionalState(id: string, item: Partial<EmotionalState>) {
        this.emotionalStates = this.emotionalStates.map(e => e.id === id ? { ...e, ...item } : e);
        this.saveEmotionalStates();
    }
    async deleteEmotionalState(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_emotional_state", { id });
        this.emotionalStates = this.emotionalStates.filter(e => e.id !== id);
        return { success: true };
    }

    // Tags
    addTag(item: Omit<Tag, "id">) {
        this.tags.push({ ...item, id: crypto.randomUUID() });
        this.saveTags();
    }
    updateTag(id: string, item: Partial<Tag>) {
        this.tags = this.tags.map(t => t.id === id ? { ...t, ...item } : t);
        this.saveTags();
    }
    async deleteTag(id: string): Promise<{ success: boolean; error?: string }> {
        await invoke("delete_tag", { id });
        this.tags = this.tags.filter(t => t.id !== id);
        return { success: true };
    }

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

    // API & RTD
    addApiConfig(item: Omit<ApiConfig, "id">) {
        this.apiConfigs.push({ ...item, id: crypto.randomUUID() });
        this.saveApiConfigs();
    }
    updateApiConfig(id: string, item: Partial<ApiConfig>) {
        this.apiConfigs = this.apiConfigs.map(c => c.id === id ? { ...c, ...item } : c);
        this.saveApiConfigs();
    }
    async deleteApiConfig(id: string): Promise<{ success: boolean; error?: string }> {
        this.apiConfigs = this.apiConfigs.filter(c => c.id !== id);
        this.saveApiConfigs();
        return { success: true };
    }

    saveServiceBindings(psychology: string, marketData: string) {
        this.psychologyApiId = psychology;
        this.marketDataApiId = marketData;
        if (typeof window !== "undefined") {
            localStorage.setItem("service_api_bindings", JSON.stringify({ psychology, market_data: marketData }));
        }
    }

    setRtdEnabled(enabled: boolean) {
        this.rtdEnabled = enabled;
        if (typeof window !== "undefined") localStorage.setItem("rtd_enabled", enabled.toString());
    }

    setRtdExcelPath(path: string) {
        this.rtdExcelPath = path;
        if (typeof window !== "undefined") localStorage.setItem("rtd_excel_path", path);
    }

    // Journaling
    async addJournalEntry(item: Omit<JournalEntry, "id">) {
        const searchDate = getLocalDatePart(item.date);

        // Find ALL entries for this date to handle potential pre-existing duplicates
        const existingEntries = this.journalEntries.filter(e => e.date && getLocalDatePart(e.date) === searchDate);

        // Primary entry to update or create
        let id = existingEntries.length > 0 ? existingEntries[0].id : (crypto.randomUUID() as any);

        // Mark others for background cleanup
        const redundantIds = existingEntries.slice(1).map(e => e.id);

        const entry = {
            id,
            date: item.date,
            content: item.content,
            emotional_state_id: item.emotional_state_id || null,
            intensity: item.intensity ?? 5,
            followed_plan: item.followed_plan ?? false,
            risk_accepted: item.risk_accepted ?? false,
            market_context: item.market_context ?? "",
            daily_score: item.daily_score ?? 5
        };

        // Update local state: swap or push
        const existingIndex = this.journalEntries.findIndex(e => e.id === id);
        if (existingIndex >= 0) {
            this.journalEntries[existingIndex] = entry;
        } else {
            this.journalEntries.push(entry);
        }

        // Proactively remove other clones from local state
        if (redundantIds.length > 0) {
            this.journalEntries = this.journalEntries.filter(e => !redundantIds.includes(e.id));
        }

        try {
            await invoke("save_journal_entry", { entry: $state.snapshot(entry) });

            // Proactively clean the backend redundant clones
            for (const rid of redundantIds) {
                console.log(`[SettingsStore] Cleaning redundant clone ${rid} for date ${searchDate}`);
                await invoke("delete_journal_entry", { id: rid });
            }
        } catch (e) {
            console.error("[SettingsStore] Error saving journal entry:", e);
            // We don't rollback redundant deletions as they were stale anyway,
            // but we might want to reload if state is inconsistent.
            throw e;
        }
    }

    async removeJournalEntry(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke("delete_journal_entry", { id });
            this.journalEntries = this.journalEntries.filter(j => j.id !== id);
            return { success: true };
        } catch (e: any) {
            console.error("[SettingsStore] Error deleting journal entry:", e);
            return { success: false, error: e.toString() };
        }
    }

    async updateJournalEntry(id: string, item: Partial<JournalEntry>) {
        const originalEntries = [...this.journalEntries];
        this.journalEntries = this.journalEntries.map(j => j.id === id ? { ...j, ...item } : j);
        const entry = this.journalEntries.find(j => j.id === id);
        if (entry) {
            try {
                await invoke("save_journal_entry", { entry: $state.snapshot(entry) });
            } catch (e) {
                console.error("[SettingsStore] Error updating journal entry:", e);
                // Rollback local change on error
                this.journalEntries = originalEntries;
                throw e;
            }
        }
    }


    // Debug / Seed
    async seedDatabase() {
        if (this.strategies.length === 0) {
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
        this.strategies = []; riskSettingsStore.clearRiskSettings(); modalitiesStore.clearModalities();
        this.emotionalStates = []; this.tags = []; indicatorsStore.clearIndicators(); timeframesStore.clearTimeframes();
        chartTypesStore.clearChartTypes();
    }

    async login(_email: string, pass: string): Promise<boolean> {
        try {
            const isValid = await invoke<boolean>("verify_password", { password: pass });
            if (isValid) {
                this.isLoggedIn = true;
                localStorage.setItem("isLoggedIn", "true");
            }
            return isValid;
        } catch (e) {
            console.error("[SettingsStore] Login failed:", e);
            throw e;
        }
    }

    logout() {
        this.isLoggedIn = false;
        localStorage.removeItem("isLoggedIn");
        console.log("[SettingsStore] User logged out");
        window.location.href = "/login";
    }
    async hasClosureForDate(date: string, accountId: string): Promise<boolean> {
        const targetDate = getLocalDatePart(date);
        const normalize = (id: string) => id.split(':').pop()?.replace(/[⟨⟩`\s]/g, '') || id;
        const targetAcc = normalize(accountId);

        return this.cashTransactions.some(ct =>
            ct.system_linked &&
            getLocalDatePart(ct.date) === targetDate &&
            normalize(ct.account_id) === targetAcc
        );
    }
}

export const settingsStore = new SettingsStore();
