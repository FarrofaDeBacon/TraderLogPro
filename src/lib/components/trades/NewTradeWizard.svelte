<script lang="ts">
  import { currenciesStore } from "$lib/stores/currencies.svelte";
  import { assetTypesStore } from "$lib/stores/asset-types.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { assetsStore } from "$lib/stores/assets.svelte";
  import { timeframesStore } from "$lib/stores/timeframes.svelte";
  import { modalitiesStore } from "$lib/stores/modalities.svelte";
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
    import { t, locale, _ } from "svelte-i18n";
    import { invoke } from "@tauri-apps/api/core";
    import { emit } from "@tauri-apps/api/event";
    import { toast } from "svelte-sonner";
    import { onMount, untrack } from "svelte";
    import { appStore } from "$lib/stores/app.svelte";
    import { userProfileStore } from "$lib/stores/user-profile.svelte";
    import { integrationsStore } from "$lib/stores/integrations.svelte";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { workspaceStore } from "$lib/stores/workspace.svelte";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import { rtdStore } from "$lib/stores/rtd.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as Card from "$lib/components/ui/card";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import AssetSelect from "./AssetSelect.svelte";
    import PartialExitsManager from "./PartialExitsManager.svelte";
    import ImageUploader from "./ImageUploader.svelte";
    import DailyChecklist from "./DailyChecklist.svelte";
    import { riskEngine } from "$lib/logic/riskEngine.svelte";
    import { AlertCircle } from "lucide-svelte";
    import {
        ChevronLeft,
        ChevronRight,
        Save,
        X,
        Brain,
        ShieldCheck,
        LayoutDashboard,
        Target,
        Camera,
        RotateCcw,
        TrendingUp,
        TrendingDown,
        Calendar,
        Lock,
        RefreshCw,
        Plus,
        Coins,
        ExternalLink,
        Maximize2,
        Image as ImageIcon,
        FileCheck,
    } from "lucide-svelte";
    import { ensureLocalOffset } from "$lib/utils";

    let {
        trade = null,
        editTradeId = undefined,
        close = () => {},
        onsave = () => {},
        detached = false,
    } = $props<{
        trade?: any;
        editTradeId?: string;
        close: () => void;
        onsave?: () => void;
        detached?: boolean;
    }>();

    // Multi-window utility
    const detach = async () => {
        try {
            // Save current state to localStorage for the new window to pick up
            const stateToPass = $state.snapshot(formData);
            localStorage.setItem(
                "pending_trade_wizard_state",
                JSON.stringify(stateToPass),
            );

            await invoke("open_detached_trade_window", {
                theme: userProfileStore.userProfile.theme,
            });
            close(); // Close the modal in the main window
        } catch (e) {
            console.error("Failed to detach window:", e);
        }
    };

    let currentStep = $state(1);
    let isSubmitting = $state(false);

    // Helper to get current time with user's configured offset
    const getNowWithOffset = () => {
        const now = new Date();
        // CRITICAL: Untrack profile to avoid reactive loop if settings update
        const offsetMinutes = untrack(
            () => userProfileStore.userProfile?.utc_offset || 0,
        );
        const offsetMillis = offsetMinutes * 60000;
        return new Date(now.getTime() + offsetMillis)
            .toISOString()
            .slice(0, 16);
    };

    // Form Data - Modern Schema alignment with Historical refinements (d5398093)
    let formData = $state({
        account_id: "",
        strategy_id: "",
        timeframe: "",
        volatility: "",
        asset: "",
        direction: "buy",
        entry_date: getNowWithOffset() as string,
        entry_price: 0,
        quantity: 1,
        modality_id: "",
        entry_emotional_state_id: "",
        stop_loss: null as number | null,
        take_profit: null as number | null,
        intensity: 10,
        fees: 0,
        partial_exits: [] as any[],
        status: "open",
        exit_price: null as number | null,
        exit_date: null as string | null, // Explicit type for lint
        exit_reason: "",
        exit_emotional_state_id: "",
        entry_rationale: "",
        confirmation_signals: "",
        market_context: "",
        relevant_news: "",
        psychology_analysis_during: "",
        followed_plan: true,
        what_worked: "",
        mistakes_improvements: "",
        lessons_learned: "",
        images: [] as string[],
        base_currency: "BRL",
    });

    let selectedAsset = $derived.by(() => {
        const symbol = formData.asset;
        return untrack(() => {
            const allAssets = [...assetsStore.assets, ...rtdAssets];
            return allAssets.find((a) => a.symbol === symbol);
        });
    });

    let selectedAccount = $derived.by(() => {
        const id = formData.account_id;
        return untrack(() => accountsStore.accounts.find((a) => a.id === id));
    });

    let activeRiskProfile = $derived.by(() => {
        const account = selectedAccount;
        if (!account) return riskSettingsStore.riskProfiles[0] || null;

        // Find profile for specific account type or "All"
        return (
            riskSettingsStore.riskProfiles.find(
                (p) =>
                    p.account_type_applicability === account.account_type ||
                    p.account_type_applicability === "All",
            ) ||
            riskSettingsStore.riskProfiles[0] ||
            null
        );
    });

    const suggestedLotMultiplier = $derived(
        riskEngine.getSuggestedLotMultiplier(activeRiskProfile),
    );
    const riskWarnings = $derived(
        riskEngine.getProactiveWarnings(activeRiskProfile),
    );

    const steps = [
        {
            id: 1,
            label: $t("trades.wizard.steps.basic"),
            icon: Target,
        },
        {
            id: 2,
            label: $t("trades.wizard.steps.conduction"),
            icon: ShieldCheck,
        },
        {
            id: 3,
            label: $t("trades.wizard.steps.psychology"),
            icon: Brain,
        },
        {
            id: 4,
            label: $t("trades.wizard.steps.media"),
            icon: ImageIcon,
        },
        {
            id: 5,
            label: $t("trades.wizard.steps.review"),
            icon: FileCheck,
        },
    ];

    // Auto-apply lot adjustment if user clicks
    function applyLotAdjustment() {
        if (suggestedLotMultiplier < 1.0) {
            formData.quantity = Math.floor(
                formData.quantity * suggestedLotMultiplier,
            );
            toast.success($t("trades.wizard.risk.toast_lot_adjusted"));
        }
    }

    let priceHasFocus = $state(false);

    let lastSyncedTradeId = $state<string | undefined>(undefined);
    let lastSyncedDraftKey = $state<string | undefined>(undefined);
    let closureAlreadyExists = $state(false);

    // Track original result for DARF increase warning (Fiscal Guard)
    let originalResult = $state(0);
    let originalData = $state<any>(null);
    let showDarfWarning = $state(false);

    $effect(() => {
        // Only check if we are editing an existing trade that was already closed
        if (editTradeId && originalData?.exit_price !== null) {
            const currentNet = calculationResult.netCurrency;
            const diff = currentNet - originalResult;
            // Using 100 as a threshold for "significant" increase
            showDarfWarning = diff >= 100;
        }
    });

    // Check if a daily closure already exists for data/account to warn the user
    $effect(() => {
        const dateStr = formData.entry_date;
        const accId = formData.account_id;
        if (dateStr && accId) {
            financialConfigStore
                .hasClosureForDate(dateStr, accId)
                .then((exists: boolean) => (closureAlreadyExists = exists));
        } else {
            closureAlreadyExists = false;
        }
    });

    // Reactive synchronization when trade prop changes (CRITICAL for Edit flow)
    $effect(() => {
        // Track only trade prop and ID
        const currentTrade = trade;
        const tradeId = trade?.id;

        // Optimization: only re-sync if the trade ID has actually changed
        // This prevents re-running on every parent re-render if the prop is technically a new object
        if (tradeId && tradeId !== lastSyncedTradeId) {
            console.log(
                "[NewTradeWizard] Syncing formData with trade:",
                tradeId,
                "symbol:",
                currentTrade.asset_symbol,
            );

            lastSyncedTradeId = tradeId;

            // We use untrack to avoid formData dependency loop
            const baseData = untrack(() => formData);

            formData = {
                ...baseData,
                ...currentTrade,
                asset: currentTrade.asset_symbol,
                direction: (currentTrade.direction || "buy").toLowerCase(),
                // Robust date parsing for datetime-local (YYYY-MM-DDTHH:MM)
                entry_date: currentTrade.date
                    ? currentTrade.date.replace(" ", "T").slice(0, 16)
                    : getNowWithOffset(),
                exit_date: currentTrade.exit_date
                    ? currentTrade.exit_date.replace(" ", "T").slice(0, 16)
                    : null,

                // Numerical values with forced precision parsing
                entry_price: parseFloat(currentTrade.entry_price as any) || 0,
                exit_price: currentTrade.exit_price
                    ? parseFloat(currentTrade.exit_price as any)
                    : null,
                quantity: parseFloat(currentTrade.quantity as any) || 1,
                stop_loss: currentTrade.stop_loss
                    ? parseFloat(currentTrade.stop_loss as any)
                    : null,
                take_profit: currentTrade.take_profit
                    ? parseFloat(currentTrade.take_profit as any)
                    : null,
                intensity:
                    parseFloat(currentTrade.intensity as any) !== undefined
                        ? parseFloat(currentTrade.intensity as any)
                        : 10,
                fees: parseFloat(currentTrade.fee_total as any) || 0,
                status:
                    currentTrade.exit_price !== null &&
                    currentTrade.exit_price !== undefined
                        ? "closed"
                        : "open",

                images: currentTrade.images || [],
                partial_exits: (currentTrade.partial_exits || []).map(
                    (p: any) => ({
                        ...p,
                        price: parseFloat(p.price) || 0,
                        quantity: parseFloat(p.quantity) || 0,
                    }),
                ),
            };

            // Capture original result for Fiscal Guard comparison
            originalResult = parseFloat(currentTrade.result as any) || 0;
            originalData = JSON.parse(JSON.stringify(currentTrade)); // Capture full original data

            // AUTO-PARTIAL DETECTION (NEW): If we are editing an open trade and
            // the detection triggered this, auto-add a partial entry.
            if (currentTrade._isAutoPartial) {
                console.log(
                    "[NewTradeWizard] Automatic partial detected. Appending to exits...",
                );
                const autoPrice =
                    parseFloat(currentTrade._autoPrice as any) ||
                    currentTrade.entry_price;
                const rtdMode = currentTrade._autoType === "partial_entry" ? "addition" : "exit";

                formData.partial_exits.push({
                    date: currentTrade.date
                        ? currentTrade.date.replace(" ", "T").slice(0, 16)
                        : getNowWithOffset(),
                    price: autoPrice,
                    quantity: 1,
                    type: rtdMode === "addition" ? "entry" : "exit",
                    notes:
                        rtdMode === "addition"
                            ? $t("trades.wizard.messages.rtd_position_addition")
                            : $t("trades.wizard.messages.rtd_partial_exit"),
                });
                currentStep = 2; // Move to the partials manager step immediately
            }
        } else if (currentTrade) {
            // NEW: Support for DRAFT trades (from RTD detection pop-up)
            const draftKey = `${currentTrade.asset_symbol}-${currentTrade.entry_price}-${currentTrade.account_id}`;

            if (draftKey !== lastSyncedDraftKey) {
                console.log(
                    "[NewTradeWizard] Syncing formData with DRAFT trade from RTD:",
                    currentTrade.asset_symbol,
                    "Key:",
                    draftKey,
                );
                lastSyncedDraftKey = draftKey;

                const baseData = untrack(() => formData);
                formData = {
                    ...baseData,
                    asset: currentTrade.asset_symbol || baseData.asset,
                    entry_price:
                        parseFloat(currentTrade.entry_price as any) || 0,
                    account_id: currentTrade.account_id || baseData.account_id,
                    entry_date: currentTrade.date
                        ? currentTrade.date.replace(" ", "T").slice(0, 16)
                        : getNowWithOffset(),
                };
            }
        } else if (
            lastSyncedTradeId !== undefined ||
            lastSyncedDraftKey !== undefined
        ) {
            // Reset to defaults ONLY if we previously had a synced trade
            console.log(
                "[NewTradeWizard] Resetting form to defaults (transition to new trade)",
            );

            lastSyncedTradeId = undefined;
            lastSyncedDraftKey = undefined;

            formData = {
                account_id: "",
                strategy_id: "",
                timeframe: "",
                volatility: "",
                asset: "",
                direction: "buy",
                entry_date: untrack(() => getNowWithOffset()),
                entry_price: 0,
                quantity: 1,
                modality_id: "",
                entry_emotional_state_id: "",
                stop_loss: null,
                take_profit: null,
                intensity: 10,
                fees: 0,
                partial_exits: [],
                status: "open",
                exit_price: null,
                exit_date: null,
                exit_reason: "",
                exit_emotional_state_id: "",
                entry_rationale: "",
                confirmation_signals: "",
                market_context: "",
                relevant_news: "",
                psychology_analysis_during: "",
                followed_plan: true,
                what_worked: "",
                mistakes_improvements: "",
                lessons_learned: "",
                images: [],
                base_currency: "BRL",
            };

            originalResult = 0;
            originalData = null;
        }
    });

    // --- STABILITY LAYER (Svelte 5) ---
    // We create local snapshots of settings data to avoid "reactive noise"
    // caused by RTD updates triggering re-renders of the entire form.
    let accountsList = $state<any[]>([]);
    let strategiesList = $state<any[]>([]);
    let assetTypesList = $state<any[]>([]);
    let timeframeList = $state<any[]>([]);
    let assetsList = $state<any[]>([]);

    // Reactive sync for snapshots (for detached windows or slow loads)
    $effect(() => {
        if (!appStore.isLoadingData) {
            if (
                accountsList.length === 0 &&
                accountsStore.accounts.length > 0
            ) {
                accountsList = [...accountsStore.accounts];
            }
            if (
                strategiesList.length === 0 &&
                workspaceStore.strategies.length > 0
            ) {
                strategiesList = [...workspaceStore.strategies];
            }
            if (
                assetTypesList.length === 0 &&
                assetTypesStore.assetTypes.length > 0
            ) {
                assetTypesList = [...assetTypesStore.assetTypes];
            }
            if (assetsList.length !== assetsStore.assets.length && assetsStore.assets.length > 0) {
                assetsList = [...assetsStore.assets];
            }
            if (
                timeframeList.length === 0 &&
                timeframesStore.timeframes.length > 0
            ) {
                timeframeList = [...timeframesStore.timeframes];
            }
        }
    });

    onMount(() => {
        // --- RESTORE DETACHED STATE ---
        if (detached) {
            const savedState = localStorage.getItem(
                "pending_trade_wizard_state",
            );
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    formData = { ...formData, ...parsed };
                    console.log(
                        "[NewTradeWizard] Restored state in detached window.",
                    );
                    // Clear it so it doesn't leak to future windows
                    localStorage.removeItem("pending_trade_wizard_state");
                } catch (e) {
                    console.error("Failed to restore detached state:", e);
                }
            }
        }

        // Capture initial snapshots from store
        if (!appStore.isLoadingData) {
            accountsList = [...accountsStore.accounts];
            strategiesList = [...workspaceStore.strategies];
            assetTypesList = [...assetTypesStore.assetTypes];
            assetsList = [...assetsStore.assets];
            timeframeList =
                timeframesStore.timeframes.length > 0
                    ? [...timeframesStore.timeframes]
                    : [
                          {
                              value: "1m",
                              name: $t("trades.wizard.timeframe_options.1m"),
                          },
                          {
                              value: "5m",
                              name: $t("trades.wizard.timeframe_options.5m"),
                          },
                          {
                              value: "15m",
                              name: $t("trades.wizard.timeframe_options.15m"),
                          },
                          {
                              value: "60m",
                              name: $t("trades.wizard.timeframe_options.60m"),
                          },
                          {
                              value: "D",
                              name: $t("trades.wizard.timeframe_options.d"),
                          },
                      ];
        }

        console.log(
            "[NewTradeWizard] UI Snapshots captured for performance stability.",
        );
    });

    // Filtering logic (04/02/2026)
    let selectedAssetTypeId = $state("");
    let userManuallySelectedType = $state(false); // Track manual selection

    // Robust Initialization and auto-selection
    $effect(() => {
        // We need to wait for assetsStore.assets to be populated
        if (assetsStore.assets.length === 0) return;

        // Priority 1: Use trade.asset_type_id if editing and not already set
        if (trade && !selectedAssetTypeId) {
            console.log(
                "[NewTradeWizard] Attempting to initialize asset type for trade:",
                trade.id,
                "symbol:",
                trade.asset_symbol,
            );
            if (trade.asset_type_id) {
                const type = assetTypesStore.assetTypes.find(
                    (t) =>
                        t.id === trade.asset_type_id ||
                        t.id.replace(/^asset_type:/, "") ===
                            trade.asset_type_id.replace(/^asset_type:/, ""),
                );
                selectedAssetTypeId = type ? type.id : trade.asset_type_id;
                console.log(
                    "[NewTradeWizard] Initialized from trade.asset_type_id:",
                    selectedAssetTypeId,
                );
            }
            // Priority 2: Force symbol lookup for editing trades without asset_type_id
            else if (trade.asset_symbol) {
                const asset = assetsList.find(
                    (a) =>
                        a.symbol.toUpperCase() ===
                        trade.asset_symbol.toUpperCase(),
                );
                if (asset) {
                    const type = assetTypesList.find(
                        (t) =>
                            t.id === asset.asset_type_id ||
                            t.id.replace(/^asset_type:/, "") ===
                                asset.asset_type_id.replace(/^asset_type:/, ""),
                    );
                    selectedAssetTypeId = type ? type.id : asset.asset_type_id;
                    console.log(
                        "[NewTradeWizard] Initialized from symbol lookup (edit):",
                        selectedAssetTypeId,
                        "for",
                        trade.asset_symbol,
                    );
                } else {
                    console.warn(
                        "[NewTradeWizard] Symbol lookup failed for",
                        trade.asset_symbol,
                        "Total assets in store:",
                        assetsStore.assets.length,
                    );
                }
            }
        }

        // Priority 3: Auto-select based on formData.asset changes (for new trades or when changing symbol)
        // But don't override if user manually selected a type
        if (!userManuallySelectedType && formData.asset) {
            const allAssets = [...assetsStore.assets, ...rtdAssets];
            const asset = allAssets.find(
                (a) => a.symbol.toUpperCase() === formData.asset.toUpperCase(),
            );
            if (asset) {
                const type = assetTypesStore.assetTypes.find(
                    (t) =>
                        t.id === asset.asset_type_id ||
                        t.id.replace(/^asset_type:/, "") ===
                            asset.asset_type_id.replace(/^asset_type:/, ""),
                );
                if (type && type.id !== selectedAssetTypeId) {
                    selectedAssetTypeId = type.id;
                    console.log(
                        "[NewTradeWizard] Auto-syncing from asset symbol (direct store access):",
                        selectedAssetTypeId,
                        "for",
                        formData.asset,
                    );
                }
            }
        }
    });

    // Stable list of extra assets from RTD
    let rtdAssets = $derived.by(() => {
        const symbols = rtdStore.symbols;
        if (symbols.length === 0) return [];

        // Cache external lookups for performance
        const assetSymbolsSet = new Set(
            assetsStore.assets.map((a) => a.symbol),
        );

        const futType =
            assetTypesStore.assetTypes.find(
                (t) =>
                    t.name.toLowerCase().includes("future") ||
                    t.name.toLowerCase().includes("futuro"),
            )?.id || "";
        const indType =
            assetTypesStore.assetTypes.find(
                (t) =>
                    t.name.toLowerCase().includes("index") ||
                    t.name.toLowerCase().includes("indice"),
            )?.id || "";
        const stockType =
            assetTypesStore.assetTypes.find(
                (t) =>
                    t.name.toLowerCase().includes("stock") ||
                    t.name.toLowerCase().includes("ação") ||
                    t.name.toLowerCase().includes("aç"),
            )?.id || "";

        return symbols
            .filter((sym) => !assetSymbolsSet.has(sym))
            .map((sym) => {
                let guessedTypeId = "rtd";
                let pointValue = 1.0;

                const safeId = (typeObj: any) => typeObj ? typeObj.id || typeObj : undefined;

                // Better detection for Brazilian Mini-Futures (WIN/WDO)
                const upperSym = sym.toUpperCase();
                if (upperSym.startsWith("WDO")) {
                    guessedTypeId = safeId(futType) || safeId(indType) || "rtd";
                    pointValue = 10.0;
                } else if (
                    upperSym.startsWith("WIN") ||
                    upperSym.startsWith("IND")
                ) {
                    guessedTypeId = safeId(futType) || safeId(indType) || "rtd";
                    pointValue = 0.2;
                } else if (upperSym.startsWith("DOL")) {
                    guessedTypeId = safeId(futType) || safeId(indType) || "rtd";
                    pointValue = 10.0;
                } else if (/^[A-Z]{4}\d/i.test(sym)) {
                    guessedTypeId = safeId(stockType) || "rtd";
                }

                return {
                    id: `rtd:${sym}`,
                    symbol: sym,
                    name: `${$t("trades.wizard.messages.rtd_profit_asset_active")} (${sym})`,
                    asset_type_id: guessedTypeId,
                    point_value: pointValue,
                    default_fee_id: undefined,
                    tax_profile_id: undefined,
                };
            });
    });

    let filteredAssets = $derived.by(() => {
        const assets = [...assetsStore.assets, ...rtdAssets];
        if (!selectedAssetTypeId) return assets;

        const typeId = selectedAssetTypeId.replace(/^asset_type:/, "");
        return assets.filter(
            (a) => (a.asset_type_id || "").replace(/^asset_type:/, "") === typeId,
        );
    });

    // AUTO-SYNC Price: Removed as per user request to avoid lag
    // Price synchronization is now manual via the Refresh button.

    // Calculation Engine (c5a63810)
    let calculationResult = $derived.by(() => {
        const asset = selectedAsset;
        const assetTypes = assetTypesList;
        const assetType =
            assetTypes.find((at) => at.id === asset?.asset_type_id) ||
            assetTypes.find((at) => at.id === "rtd") ||
            assetTypes[0];
        const account = selectedAccount;
        const currencySymbol = account
            ? currenciesStore.getCurrencySymbol(account.currency)
            : "R$";

        const pointValue = (() => {
            if (asset?.point_value) return asset.point_value;
            const upperSym = (formData.asset || "").toUpperCase();
            if (upperSym.startsWith("WIN") || upperSym.startsWith("IND"))
                return 0.2;
            if (upperSym.startsWith("WDO")) return 10.0;
            if (upperSym.startsWith("DOL")) return 50.0;
            return 1.0;
        })();

        const multiplier =
            (formData.direction || "").toLowerCase() === "buy" ? 1 : -1;
        const isPoints = assetType?.result_type === "points";

        // MOVING AVERAGE logic:
        // 1. Additions update the current average price.
        // 2. Partials realize P&L based on the average price at that moment.
        let currentAvgPrice = formData.entry_price || 0;
        let currentQty = formData.quantity || 0;
        let totalEntryQty = formData.quantity || 0;
        let totalExitQty = 0;
        let grossCurrencyTotal = 0;
        let memoryItems: any[] = [];

        // Sort parciais by date to ensure chronological processing
        const sortedPartials = [...formData.partial_exits].sort((a, b) => {
            return (
                new Date(a.date || 0).getTime() -
                new Date(b.date || 0).getTime()
            );
        });

        let calculatedFees = 0;

        // 1. Process All Realizations (Partials)
        sortedPartials.forEach((p: any) => {
            const qty = p.quantity || 0;
            const price = p.price || 0;
            const isEntry = p.type === "entry";

            if (isEntry) {
                const newQty = currentQty + qty;
                if (newQty > 0) {
                    currentAvgPrice =
                        (currentAvgPrice * currentQty + price * qty) / newQty;
                }
                currentQty = newQty;
                totalEntryQty += qty;
                memoryItems.push({
                    label: `${$t("trades.wizard.summary.addition")} (+${qty} ${assetType?.unit_label || "ctr"}) @ ${price}`,
                    resultCurrency: 0,
                    resultPoints: 0,
                    type: "addition",
                    unit: "currency",
                });
            } else {
                // Realize profit based on CURRENT average price
                const diff = price - currentAvgPrice;
                const resultCurrency = diff * qty * pointValue * multiplier;
                grossCurrencyTotal += resultCurrency;
                currentQty -= qty;
                totalExitQty += qty;

                memoryItems.push({
                    label: `${$t("trades.wizard.summary.partial_exit")} (-${qty} ${assetType?.unit_label || "ctr"}) @ ${price}`,
                    resultCurrency: resultCurrency,
                    resultPoints: resultCurrency / pointValue,
                    type: "exit",
                    unit: isPoints ? "points" : "currency",
                });
            }
        });

        // 2. Final Exit Calculation
        const remainingQty = totalEntryQty - totalExitQty;
        const finalExitPrice =
            formData.exit_price !== null ? Number(formData.exit_price) : null;

        if (finalExitPrice !== null && remainingQty > 0) {
            const diff = finalExitPrice - currentAvgPrice;
            const resultCurrency =
                diff * remainingQty * pointValue * multiplier;
            grossCurrencyTotal += resultCurrency;
            memoryItems.push({
                label: `${$t("trades.wizard.summary.final_exit")} (-${remainingQty} ${assetType?.unit_label || "ctr"}) @ ${finalExitPrice}`,
                resultCurrency: resultCurrency,
                resultPoints: resultCurrency / pointValue,
                type: "exit",
                unit: isPoints ? "points" : "currency",
            });
        }

        // 3. Automatic Fee Calculation
        const feeProfile = financialConfigStore.fees.find(
            (f) => f.id === asset?.default_fee_id,
        );

        if (feeProfile) {
            // Fee calculation on total volume
            // Re-calculate total entry value for fee purposes
            let totalEntryValForFees = formData.entry_price * formData.quantity;
            sortedPartials.forEach((p: any) => {
                if (p.type === "entry")
                    totalEntryValForFees += (p.price || 0) * (p.quantity || 0);
            });
            const entryValue = totalEntryValForFees * pointValue;

            if (feeProfile.fixed_fee > 0) {
                const fixed = feeProfile.fixed_fee * totalEntryQty;
                calculatedFees += fixed;
                memoryItems.push({
                    label: $t("trades.wizard.summary.fixed_fee"),
                    resultCurrency: -fixed,
                    resultPoints: -fixed / pointValue,
                    unit: "currency",
                });
            }

            if (feeProfile.percentage_fee > 0) {
                const perc = entryValue * (feeProfile.percentage_fee / 100);
                calculatedFees += perc;
                memoryItems.push({
                    label: `${$t("trades.wizard.summary.variable_fee")} (${feeProfile.percentage_fee}%)`,
                    resultCurrency: -perc,
                    resultPoints: -perc / pointValue,
                    unit: "currency",
                });
            }

            if (feeProfile.exchange_fee > 0) {
                const exch = entryValue * (feeProfile.exchange_fee / 100);
                calculatedFees += exch;
                memoryItems.push({
                    label: `${$t("trades.wizard.summary.exchange_fees")} (${feeProfile.exchange_fee}%)`,
                    resultCurrency: -exch,
                    resultPoints: -exch / pointValue,
                    unit: "currency",
                });
            }

            if (feeProfile.withholding_tax > 0 && grossCurrencyTotal > 0) {
                const irrf =
                    grossCurrencyTotal * (feeProfile.withholding_tax / 100);
                calculatedFees += irrf;
                memoryItems.push({
                    label: `${$t("trades.wizard.summary.irrf_estimated")} (${feeProfile.withholding_tax}%)`,
                    resultCurrency: -irrf,
                    resultPoints: -irrf / pointValue,
                    unit: "currency",
                });
            }
        }

        const finalFees = calculatedFees || formData.fees || 0;

        // Add Gross Header
        if (memoryItems.length > 0) {
            memoryItems.push({
                label: $t("trades.wizard.summary.gross_result"),
                resultCurrency: grossCurrencyTotal,
                resultPoints: grossCurrencyTotal / pointValue,
                unit: isPoints ? "points" : "currency",
                isHeader: true,
            });
        }

        return {
            grossCurrency: grossCurrencyTotal,
            grossPoints: grossCurrencyTotal / pointValue,
            netCurrency: grossCurrencyTotal - finalFees,
            netPoints: (grossCurrencyTotal - finalFees) / pointValue,
            fees: finalFees,
            remainingQty: totalEntryQty - totalExitQty,
            memoryItems,
            assetType,
            currencySymbol,
            totalEntryQty,
            globalAvgPrice: currentAvgPrice,
        };
    });

    function handleNext() {
        if (currentStep === 1) {
            if (
                !formData.account_id ||
                !formData.asset ||
                !formData.strategy_id ||
                !formData.modality_id
            ) {
                toast.error($t("trades.wizard.messages.required_fields"));
                return;
            }
            if (formData.entry_price <= 0) {
                toast.error($t("trades.wizard.messages.entry_price_required"));
                return;
            }
        }
        if (currentStep < steps.length) currentStep++;
    }

    function handlePrev() {
        if (currentStep > 1) currentStep--;
    }

    function sanitize(val: any): any {
        if (typeof val === "string") return val.trim().slice(0, 1000); // Limit long strings
        return val;
    }

    async function handleSubmit() {
        // CRITICAL: Use editTradeId PROP (passed from parent at mount time via {#key}) as the
        // submission mode indicator. This is immune to Svelte $effect re-evaluation during async saves.
        // lastSyncedTradeId can be reset mid-save if the trade prop changes reactively.
        const submissionId = editTradeId;
        console.log(
            "[NewTradeWizard] Submitting form. Mode:",
            submissionId ? "Edit" : "New",
            "Target ID (editTradeId prop):",
            submissionId,
            "lastSyncedTradeId at submit time:",
            lastSyncedTradeId,
            "trade?.id at submit time:",
            trade?.id,
        );
        console.log(
            "[NewTradeWizard] Form Data Snapshot:",
            $state.snapshot(formData),
        );

        // CRITICAL: Ensure asset_type_id is set before saving
        if (!selectedAssetTypeId && formData.asset) {
            const asset = assetsList.find(
                (a) => a.symbol.toUpperCase() === formData.asset.toUpperCase(),
            );
            if (asset) {
                const type = assetTypesList.find(
                    (t) =>
                        t.id === asset.asset_type_id ||
                        t.id.replace(/^asset_type:/, "") ===
                            asset.asset_type_id.replace(/^asset_type:/, ""),
                );
                selectedAssetTypeId = type ? type.id : asset.asset_type_id;
                console.log(
                    "[NewTradeWizard] Auto-filled asset_type_id from asset:",
                    selectedAssetTypeId,
                );
            } else {
                toast.error($t("trades.wizard.messages.valid_asset_type"));
                return;
            }
        }

        if (!selectedAssetTypeId) {
            toast.error($t("trades.wizard.messages.asset_type_required"));
            return;
        }

        // --- SECURITY & VALIDATION LAYER ---
        const cleanAsset = sanitize(formData.asset).toUpperCase();
        if (cleanAsset.length < 2 || cleanAsset.length > 20) {
            toast.error($t("trades.wizard.messages.invalid_asset_symbol"));
            return;
        }

        const qty = Number(formData.quantity);
        if (isNaN(qty) || qty <= 0 || qty > 1000000000) {
            toast.error($t("trades.wizard.messages.invalid_quantity"));
            return;
        }

        const ePrice = Number(formData.entry_price);
        if (isNaN(ePrice) || ePrice <= 0) {
            toast.error($t("trades.wizard.messages.invalid_entry_price"));
            return;
        }

        if (formData.status === "closed" || formData.exit_price !== null) {
            const exPrice = Number(formData.exit_price);
            if (isNaN(exPrice) || exPrice <= 0) {
                toast.error($t("trades.wizard.messages.invalid_exit_price"));
                return;
            }
        }

        isSubmitting = true;
        try {
            const tradeData: any = {
                // Use ensureLocalOffset to preserve local time intent and avoid timezone shifts
                date: ensureLocalOffset(formData.entry_date as string),
                asset_symbol: cleanAsset,
                asset_type_id: selectedAssetTypeId,
                strategy_id: formData.strategy_id,
                account_id: formData.account_id,
                result: calculationResult.netCurrency,
                quantity: formData.quantity,
                direction: formData.direction === "buy" ? "Buy" : "Sell",
                entry_price: formData.entry_price,
                exit_price: formData.exit_price,
                exit_date: formData.exit_date
                    ? ensureLocalOffset(formData.exit_date as string)
                    : formData.exit_price !== null
                      ? ensureLocalOffset(new Date().toISOString()) // Current local ISO with offset
                      : null,
                fee_total: formData.fees,
                notes: formData.entry_rationale,

                timeframe: formData.timeframe,
                volatility: formData.volatility,
                modality_id: formData.modality_id,
                stop_loss: formData.stop_loss,
                take_profit: formData.take_profit,
                intensity: formData.intensity,

                entry_emotional_state_id: formData.entry_emotional_state_id,

                exit_reason: formData.exit_reason,
                exit_emotional_state_id: formData.exit_emotional_state_id,

                entry_rationale: formData.entry_rationale,
                confirmation_signals: formData.confirmation_signals,
                market_context: formData.market_context,
                relevant_news: formData.relevant_news,

                followed_plan: !!formData.followed_plan,
                what_worked: formData.what_worked,
                mistakes_improvements: formData.mistakes_improvements,
                lessons_learned: formData.lessons_learned,

                images: formData.images,
                partial_exits: formData.partial_exits,
            };

            console.log(
                "[NewTradeWizard] Submission tradeData:",
                JSON.stringify(tradeData, null, 2),
            );

            if (submissionId) {
                // FISCAL GUARD (d5398093): Warn if profit increase might require complementary DARF
                const currentNetResult = calculationResult.netCurrency;
                if (
                    originalResult !== null &&
                    activeRiskProfile?.id !== "demo"
                ) {
                    const month = formData.entry_date.substring(0, 7);
                    const nowMonth = new Date().toISOString().substring(0, 7);

                    // Significant increase (> R$ 10.0 or 20% relative to month total?)
                    // Simple threshold: if new result > original + 10.0 (minimum DARF trigger)
                    const profitIncrease = currentNetResult - originalResult;

                    if (profitIncrease > 10.0 && month < nowMonth) {
                        const confirmed = confirm(
                            $t("fiscal.darf.complementary_warning"),
                        );
                        if (!confirmed) {
                            isSubmitting = false;
                            return;
                        }
                    }
                }

                // DARF Warning Logic (as per instruction)
                if (
                    editTradeId &&
                    calculationResult.netCurrency > originalResult + 100
                ) {
                    toast.error(
                        $t("fiscal.darf.complementary_warning"),
                        {
                            duration: 6000,
                            position: "top-center",
                            style: "background: #1a1a1a; color: #ff4b4b; border: 1px solid #ff4b4b22; font-weight: 600;",
                        },
                    );
                }

                console.log(
                    "[NewTradeWizard] Calling updateTrade for ID:",
                    submissionId,
                );
                const result = await tradesStore.updateTrade(
                    submissionId,
                    tradeData,
                );
                if (result.success) {
                    toast.success($t("trades.wizard.messages.update_success"));
                    currentStep = 1;
                    emit("trade-saved", { mode: "update" }).catch(() => {});
                    onsave();
                    close();
                } else {
                    console.error(
                        "[NewTradeWizard] Backend Update Error:",
                        result.error,
                    );
                    toast.error(
                        result.error ||
                            $t("trades.wizard.messages.update_error"),
                    );
                }
            } else {
                console.log("[NewTradeWizard] Calling addTrade");
                const result = await tradesStore.addTrade(tradeData);
                if (result.success) {
                    if (closureAlreadyExists && !submissionId) {
                        toast.success(
                            $t("trades.wizard.messages.save_success_with_sync"),
                        );
                    } else {
                        toast.success(
                            $t("trades.wizard.messages.save_success"),
                        );
                    }
                    currentStep = 1;
                    emit("trade-saved", { mode: "new" }).catch(() => {});
                    onsave();
                    close();
                } else {
                    console.error(
                        "[NewTradeWizard] Backend Save Error:",
                        result.error,
                    );
                    toast.error(
                        result.error || $t("trades.wizard.messages.save_error"),
                    );
                }
            }
        } catch (e) {
            console.error("[NewTradeWizard] CRITICAL CLIENT CRASH:", e);
            toast.error($t("trades.wizard.messages.save_error"));
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="flex flex-col h-full bg-background overflow-hidden">
    <!-- Header with Modern Stepper -->
    <div class="px-6 py-4 border-b border-border bg-card/30">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h2 class="text-lg font-bold tracking-tight">
                    {trade?.id
                        ? $t("trades.wizard.title_edit")
                        : $t("trades.wizard.title_new")}
                </h2>
                <p
                    class="text-[10px] text-muted-foreground uppercase tracking-widest"
                >
                    {$t("trades.wizard.subtitle")}
                </p>
            </div>

            <div class="flex items-center gap-2">
                {#if !detached}
                    <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-muted-foreground hover:text-primary"
                        onclick={detach}
                        title={$t("trades.wizard.tooltips.open_in_separate_window")}
                    >
                        <ExternalLink class="w-4 h-4" />
                    </Button>
                {/if}
            </div>
        </div>

        <div class="relative flex justify-between max-w-2xl mx-auto">
            <div class="absolute top-4 left-0 w-full h-0.5 bg-muted -z-0"></div>
            {#each steps as step}
                {@const Icon = step.icon}
                {@const isCurrent = currentStep === step.id}
                {@const isPast = currentStep > step.id}
                <button
                    class="relative z-10 group flex flex-col items-center gap-1.5"
                    onclick={() => (currentStep = step.id)}
                >
                    <div
                        class="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                        {isCurrent
                            ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.25)]'
                            : isPast
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-background border-muted text-muted-foreground'}"
                    >
                        {#if isPast}
                            <ShieldCheck class="w-4 h-4" />
                        {:else}
                            <Icon class="w-4 h-4" />
                        {/if}
                    </div>
                    <span
                        class="text-[9px] font-bold uppercase tracking-widest {isCurrent
                            ? 'text-primary'
                            : 'text-muted-foreground'}">{step.label}</span
                    >
                </button>
            {/each}
        </div>
    </div>

    <!-- Main Content Area (Glassmorphism inspired) -->
    <div class="flex-1 overflow-y-auto p-4 bg-muted/40 backdrop-blur-md">
        <div class="max-w-3xl mx-auto space-y-4">
            {#if currentStep === 1}
                <div class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <!-- Context Section Card (Image 1 inspired) -->
                    <section class="bg-secondary/10 border border-border/30 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden group/card">
                        <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 blur-[50px] rounded-full"></div>
                        
                        <div class="flex items-center gap-3 mb-6 border-b border-border/10 pb-4">
                            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Target class="w-4 h-4 text-primary" />
                            </div>
                            <h3 class="text-[11px] font-black text-foreground uppercase tracking-[0.2em]">
                                {$t("trades.wizard.sections.context")}
                            </h3>
                        </div>

                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
                            <!-- Selects (Image 2 style) -->
                            <div class="space-y-2">
                                <Label for="account-select" class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.account")}</Label>
                                <Select.Root type="single" bind:value={formData.account_id}>
                                    <Select.Trigger id="account-select" class="h-11 bg-black/40 border-border/60 rounded-xl focus:ring-1 focus:ring-primary/40 text-xs font-bold text-foreground w-full hover:bg-black/60 transition-all">
                                        {accountsList.find(a => a.id === formData.account_id)?.nickname || $t("trades.wizard.placeholders.select")}
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40">
                                        {#each accountsList as acc}
                                            <Select.Item value={acc.id} class="text-xs focus:bg-primary/20">{acc.nickname}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>

                            <div class="space-y-2">
                                <Label for="strategy-select" class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.strategy")}</Label>
                                <Select.Root type="single" bind:value={formData.strategy_id}>
                                    <Select.Trigger id="strategy-select" class="h-11 bg-black/40 border-border/60 rounded-xl focus:ring-1 focus:ring-primary/40 text-xs font-bold text-foreground w-full hover:bg-black/60 transition-all">
                                        {strategiesList.find(s => s.id === formData.strategy_id)?.name || $t("trades.wizard.placeholders.select")}
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40">
                                        {#each strategiesList as strategy}
                                            <Select.Item value={strategy.id} class="text-xs focus:bg-primary/20">{strategy.name}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>

                            <div class="space-y-2">
                                <Label for="timeframe-select" class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.timeframe")}</Label>
                                <Select.Root type="single" bind:value={formData.timeframe}>
                                    <Select.Trigger id="timeframe-select" class="h-11 bg-black/40 border-border/60 rounded-xl focus:ring-1 focus:ring-primary/40 text-xs font-bold text-foreground w-full hover:bg-black/60 transition-all">
                                        {formData.timeframe || $t("trades.wizard.placeholders.select")}
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40">
                                        {#each timeframeList as tf}
                                            <Select.Item value={tf.value} class="text-xs focus:bg-primary/20">{tf.name}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>

                            <div class="space-y-2">
                                <Label for="volatility-select" class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.volatility")}</Label>
                                <Select.Root type="single" bind:value={formData.volatility}>
                                    <Select.Trigger id="volatility-select" class="h-11 bg-black/40 border-border/60 rounded-xl focus:ring-1 focus:ring-primary/40 text-xs font-bold text-foreground w-full hover:bg-black/60 transition-all">
                                        {formData.volatility || $t("trades.wizard.placeholders.select")}
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40">
                                        {#each [{val: 'baixa', key: 'low'}, {val: 'normal', key: 'normal'}, {val: 'alta', key: 'high'}, {val: 'extrema', key: 'extreme'}] as vol}
                                            <Select.Item value={vol.val} class="text-xs focus:bg-primary/20 uppercase">{$t(`trades.wizard.volatility_options.${vol.key}`)}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-6 pt-6 border-t border-border/5">
                            <!-- Asset Type (Image 2 style) -->
                            <div class="space-y-2 lg:col-span-2">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.asset_type")}</Label>
                                <Select.Root type="single" bind:value={selectedAssetTypeId} onValueChange={() => { userManuallySelectedType = true; }}>
                                    <Select.Trigger class="h-11 bg-black/40 border-border/60 rounded-xl text-xs font-black uppercase w-full">
                                        {assetTypesList.find(t => t.id === selectedAssetTypeId)?.name || $t("trades.wizard.placeholders.all_types")}
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40">
                                        <Select.Item value="">{$t("trades.wizard.placeholders.all_types")}</Select.Item>
                                        {#each assetTypesList as type}
                                            <Select.Item value={type.id} class="text-xs">{type.name}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>

                            <!-- Direction Buttons (Image 2 style) -->
                            <div class="space-y-2 lg:col-span-2">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.direction")}</Label>
                                <div class="grid grid-cols-2 gap-3 h-11">
                                    <button type="button" class="rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 {formData.direction === 'buy' ? 'bg-emerald-500 text-[#064e3b] shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}" onclick={() => (formData.direction = "buy")}>
                                        <TrendingUp class="w-4 h-4" />
                                        {$t("trades.wizard.fields.buy")}
                                    </button>
                                    <button type="button" class="rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 {formData.direction === 'sell' ? 'bg-rose-500 text-[#4c0519] shadow-lg shadow-rose-500/20' : 'bg-rose-500/5 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10'}" onclick={() => (formData.direction = "sell")}>
                                        <TrendingDown class="w-4 h-4" />
                                        {$t("trades.wizard.fields.sell")}
                                    </button>
                                </div>
                            </div>

                            <!-- Emotional State (Image 2 style) -->
                            <div class="space-y-2">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                    <Brain class="w-3.5 h-3.5 text-pink-400" /> {$t("trades.wizard.fields.emotional_state")}
                                </Label>
                                <Select.Root type="single" bind:value={formData.entry_emotional_state_id}>
                                    <Select.Trigger class="h-11 bg-black/40 border-border/60 rounded-xl text-xs font-black uppercase w-full">
                                        {workspaceStore.emotionalStates.find(e => e.id === formData.entry_emotional_state_id)?.name || $t("trades.wizard.placeholders.select")}
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40">
                                        {#each workspaceStore.emotionalStates as state}
                                            <Select.Item value={state.id} class="text-xs">{state.name}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>

                            <!-- Modality (Image 2 style) -->
                            <div class="space-y-2">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">Modalidade</Label>
                                <Select.Root type="single" bind:value={formData.modality_id}>
                                    <Select.Trigger class="h-11 bg-black/40 border-border/60 rounded-xl text-xs font-black uppercase w-full">
                                        {modalitiesStore.modalities.find(m => m.id === formData.modality_id)?.name || $t("trades.wizard.placeholders.select")}
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40">
                                        {#each modalitiesStore.modalities as mod}
                                            <Select.Item value={mod.id} class="text-xs">{mod.name}</Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>

                            <!-- New Asset Select (Image 2 style) -->
                            <div class="space-y-2 lg:col-span-2">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.asset")}</Label>
                                <Select.Root type="single" bind:value={formData.asset}>
                                    <Select.Trigger class="h-11 bg-black/30 border border-border/60 rounded-xl text-xs font-black uppercase w-full">
                                        <div class="flex items-center gap-2">
                                            {#if formData.asset}
                                                <span class="text-emerald-400">{formData.asset}</span>
                                                <span class="opacity-40 text-[9px]">- {assetsList.find(a => a.symbol === formData.asset)?.name || ''}</span>
                                            {:else}
                                                <span class="opacity-30">{$t("trades.wizard.placeholders.select")}</span>
                                            {/if}
                                        </div>
                                    </Select.Trigger>
                                    <Select.Content class="bg-slate-900 border-border/40 max-h-[300px]">
                                        {#each filteredAssets as asset}
                                            <Select.Item value={asset.symbol} class="text-xs">
                                                <span class="font-black text-emerald-400 mr-2">{asset.symbol}</span>
                                                <span class="opacity-50 text-[10px]">{asset.name}</span>
                                            </Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>

                        <!-- Execution Details (Image 2 Footer Pattern) -->
                        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-8 pt-8 border-t border-border/10">
                            <!-- Date -->
                            <div class="space-y-2 lg:col-span-2">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.date_time")}</Label>
                                <div class="relative">
                                    <Input type="datetime-local" bind:value={formData.entry_date} class="h-11 bg-black/40 border-border/60 rounded-xl text-[10px] font-black uppercase text-foreground/80 pl-4 pr-10" />
                                    <Calendar class="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 opacity-30" />
                                </div>
                            </div>

                            <!-- Entry Price -->
                            <div class="space-y-2 lg:col-span-1">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.entry_price")}</Label>
                                <div class="relative">
                                    <Input type="number" bind:value={formData.entry_price} class="h-11 bg-black/40 border-border/60 rounded-xl text-[11px] font-black text-emerald-400 pl-4 pr-8" />
                                    <button class="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 transition-opacity" onclick={() => { /* Sync logic */ }}>
                                        <RefreshCw class="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <!-- Qty -->
                            <div class="space-y-2">
                                <Label class="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">{$t("trades.wizard.fields.quantity")}</Label>
                                <Input type="number" bind:value={formData.quantity} class="h-11 bg-black/40 border-border/60 rounded-xl text-[11px] font-black text-foreground pl-4" />
                            </div>

                            <!-- Risk/Reward -->
                            <div class="space-y-2 flex flex-col justify-end pb-1">
                                <div class="flex items-center gap-2">
                                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span class="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Gestão Ativa</span>
                                </div>
                                <span class="text-[11px] font-black text-primary uppercase tracking-widest mt-1">Auditado v4.0</span>
                            </div>
                        </div>
                    </section>
                </div>
            {:else if currentStep === 2}
                <div
                    class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
                >
                    <section class="space-y-4">
                        <h3
                            class="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            {$t(
                                "trades.wizard.sections.partial_management.title",
                            )}
                        </h3>
                        {#if true}
                            {@const selectedAsset = assetsStore.assets.find(
                                (a) => a.symbol === formData.asset,
                            )}
                            {@const resolvedPointValue = (() => {
                                if (selectedAsset?.point_value)
                                    return selectedAsset.point_value;
                                const upperSym = (
                                    formData.asset || ""
                                ).toUpperCase();
                                if (
                                    upperSym.startsWith("WIN") ||
                                    upperSym.startsWith("IND")
                                )
                                    return 0.2;
                                if (upperSym.startsWith("WDO")) return 10.0;
                                if (upperSym.startsWith("DOL")) return 50.0;
                                return 1.0;
                            })()}
                            <PartialExitsManager
                                bind:partials={formData.partial_exits}
                                entryPrice={formData.entry_price}
                                totalQuantity={formData.quantity}
                                direction={formData.direction}
                                pointValue={resolvedPointValue}
                                currencySymbol={calculationResult.currencySymbol}
                                unitLabel={calculationResult.assetType
                                    ?.unit_label ||
                                    $t("trades.wizard.unit_labels.contracts")}
                                resultSuffix={calculationResult.assetType
                                    ?.result_type === "points"
                                    ? $t("trades.wizard.units.points")
                                    : ""}
                                resultPrefix={calculationResult.assetType
                                    ?.result_type === "currency"
                                    ? calculationResult.currencySymbol + " "
                                    : ""}
                            />
                        {/if}
                    </section>

                    <section class="space-y-4 pt-4 border-t border-muted/30">
                        <div class="flex items-center justify-between">
                            <Label
                                class="text-[10px] uppercase font-bold text-muted-foreground tracking-tight flex items-center gap-1"
                            >
                                <Lock class="w-3 h-3" />
                                {$t("trades.wizard.sections.closing_data")}
                            </Label>
                            <div class="flex items-center gap-2">
                                <span
                                    class="text-[10px] font-bold uppercase tracking-tighter {formData.status ===
                                    'open'
                                        ? 'text-primary'
                                        : 'text-muted-foreground'}"
                                    >{$t("trades.list.table.status_open")}</span
                                >
                                <button
                                    class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors bg-muted/40 border border-border/40"
                                    type="button"
                                    role="switch"
                                    aria-label="Toggle trade status"
                                    aria-checked={formData.status === "closed"}
                                    onclick={(e) => {
                                        e.preventDefault();
                                        formData.status =
                                            formData.status === "open"
                                                ? "closed"
                                                : "open";
                                        if (formData.status === "open") {
                                            formData.exit_price = null;
                                            formData.exit_date = null;
                                            formData.exit_reason = "";
                                            formData.exit_emotional_state_id =
                                                "";
                                        }
                                    }}
                                >
                                    <span
                                        class="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 {formData.status ===
                                        'closed'
                                            ? 'translate-x-4 bg-emerald-500'
                                            : 'translate-x-0'}"
                                    ></span>
                                </button>
                                <span
                                    class="text-[10px] font-bold uppercase tracking-tighter {formData.status ===
                                    'closed'
                                        ? 'text-emerald-500'
                                        : 'text-muted-foreground'}"
                                    >{$t("trades.list.table.status_closed")}</span
                                >
                            </div>
                        </div>

                        {#if formData.status === "closed"}
                            <div
                                class="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <div class="space-y-1.5">
                                    <Label
                                        class="text-[10px] uppercase font-bold text-muted-foreground tracking-tight"
                                        >{$t(
                                            "trades.wizard.fields.exit_price",
                                        )}</Label
                                    >
                                    <Input
                                        type="number"
                                        step="any"
                                        bind:value={formData.exit_price}
                                        class="bg-muted/30 border-border/40 h-8 text-xs font-mono font-bold text-foreground"
                                    />
                                </div>
                                <div class="space-y-1.5">
                                    <Label
                                        class="text-[10px] uppercase font-bold text-muted-foreground tracking-tight"
                                        >{$t(
                                            "trades.wizard.fields.exit_date",
                                        )}</Label
                                    >
                                    <div class="relative">
                                        <Input
                                            type="datetime-local"
                                            bind:value={formData.exit_date}
                                            class="bg-muted/30 border-border/40 pr-8 h-10 text-xs w-full text-foreground"
                                        />
                                        <Calendar
                                            class="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                        />
                                    </div>
                                </div>
                                <div class="space-y-1.5">
                                    <Label
                                        class="text-[10px] uppercase font-bold text-muted-foreground tracking-tight"
                                        >{$t(
                                            "trades.wizard.fields.exit_reason",
                                        )}</Label
                                    >
                                    <Select.Root
                                        type="single"
                                        bind:value={formData.exit_reason}
                                    >
                                        <Select.Trigger
                                            class="h-8 bg-muted/30 border-border/40 focus:ring-1 focus:ring-primary/40 text-xs text-left"
                                        >
                                            {formData.exit_reason ||
                                                $t(
                                                    "trades.wizard.placeholders.select",
                                                )}
                                        </Select.Trigger>
                                        <Select.Content>
                                            <Select.Item value="Take Profit"
                                                >{$t(
                                                    "trades.wizard.exit_reasons.take_profit",
                                                )}</Select.Item
                                            >
                                            <Select.Item value="Stop Loss"
                                                >{$t(
                                                    "trades.wizard.exit_reasons.stop_loss",
                                                )}</Select.Item
                                            >
                                            <Select.Item value="Manual"
                                                >{$t(
                                                    "trades.wizard.exit_reasons.manual",
                                                )}</Select.Item
                                            >
                                            <Select.Item value="Time"
                                                >{$t(
                                                    "trades.wizard.exit_reasons.time",
                                                )}</Select.Item
                                            >
                                            <Select.Item value="Strategy"
                                                >{$t(
                                                    "trades.wizard.exit_reasons.strategy",
                                                )}</Select.Item
                                            >
                                        </Select.Content>
                                    </Select.Root>
                                </div>
                                <div class="space-y-1.5">
                                    <Label
                                        class="text-[10px] uppercase font-bold text-muted-foreground tracking-tight flex items-center gap-1"
                                    >
                                        <Brain class="w-3 h-3 text-pink-400" />
                                        {$t(
                                            "trades.wizard.fields.emotional_state",
                                        )}
                                    </Label>
                                    <Select.Root
                                        type="single"
                                        bind:value={
                                            formData.exit_emotional_state_id
                                        }
                                    >
                                        <Select.Trigger
                                            class="h-8 bg-input/20 border-border/20 focus:ring-1 focus:ring-primary/40 text-xs"
                                        >
                                            {workspaceStore.emotionalStates.find(
                                                (e) =>
                                                    e.id ===
                                                    formData.exit_emotional_state_id,
                                            )?.name ||
                                                $t(
                                                    "trades.wizard.placeholders.select",
                                                )}
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each workspaceStore.emotionalStates as state}
                                                <Select.Item value={state.id}
                                                    >{state.name}</Select.Item
                                                >
                                            {:else}
                                                <Select.Item value="" disabled
                                                    >{$t(
                                                        "trades.wizard.placeholders.no_states",
                                                    )}</Select.Item
                                                >
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                </div>
                            </div>
                        {/if}
                    </section>

                    <!-- Financial Summary Display -->
                    <div
                        class="mt-4 p-4 rounded-xl bg-card border border-border/40 shadow-lg overflow-hidden relative group"
                    >
                        <div
                            class="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                            <div class="flex items-center gap-3">
                                <div
                                    class="p-3 rounded-lg bg-primary/10 border border-primary/20"
                                >
                                    <TrendingUp class="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h4
                                            class="text-base font-bold tracking-tight text-foreground"
                                        >
                                            {formData.asset}
                                        </h4>
                                        <span
                                            class="px-1.5 py-0.5 rounded text-[9px] font-bold {formData.direction ===
                                            'buy'
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : 'bg-red-500/10 text-red-500'} uppercase"
                                        >
                                            {formData.direction === "buy"
                                                ? $t("trades.wizard.fields.buy")
                                                : $t(
                                                      "trades.wizard.fields.sell",
                                                  )}
                                        </span>
                                    </div>
                                    <p
                                        class="text-[9px] text-primary/80 font-bold uppercase tracking-tighter"
                                    >
                                        {$t("trades.wizard.fields.entry")}:
                                        <span
                                            class="text-foreground font-mono font-bold"
                                            >{formData.entry_price}</span
                                        >
                                        |
                                        <span
                                            class="text-primary font-mono font-bold"
                                            >{formData.quantity}
                                            {$t(
                                                "trades.wizard.unit_labels.contracts",
                                            )}</span
                                        >
                                        {#if calculationResult.totalEntryQty > formData.quantity}
                                            <span class="ml-2 text-primary/60">
                                                / {$t("trades.wizard.fields.average").toUpperCase()}: <span
                                                    class="text-foreground font-mono font-bold"
                                                    >{(
                                                        formData.entry_price ||
                                                        0
                                                    ).toLocaleString(
                                                        $locale || "pt-BR",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}</span
                                                >
                                            </span>
                                        {/if}
                                    </p>
                                </div>
                            </div>
                            <div class="w-full md:w-auto text-right">
                                <p
                                    class="text-[9px] text-muted-foreground uppercase font-bold tracking-widest"
                                >
                                    {$t("trades.wizard.summary.net_result")}
                                </p>
                                <h3
                                    class="text-2xl font-black {calculationResult.netCurrency >=
                                    0
                                        ? 'text-emerald-400'
                                        : 'text-red-400'}"
                                >
                                    {#if calculationResult.assetType?.result_type === "points"}
                                        {calculationResult.netPoints.toLocaleString(
                                            $locale || "pt-BR",
                                            { maximumFractionDigits: 2 },
                                        )}
                                        <span
                                            class="text-xs uppercase font-bold text-muted-foreground mr-1"
                                            >{$t("trades.wizard.units.points")}</span
                                        >
                                        <span
                                            class="text-xs text-muted-foreground font-medium block md:inline md:ml-2"
                                        >
                                            {calculationResult.currencySymbol}
                                            {calculationResult.netCurrency.toLocaleString(
                                                $locale || "pt-BR",
                                                { minimumFractionDigits: 2 },
                                            )}
                                        </span>
                                    {:else}
                                        {calculationResult.currencySymbol}
                                        {calculationResult.netCurrency.toLocaleString(
                                            $locale || "pt-BR",
                                            { minimumFractionDigits: 2 },
                                        )}
                                    {/if}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>
            {:else if currentStep === 3}
                <div
                    class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
                >
                    <section class="space-y-4">
                        <Label
                            class="text-[10px] uppercase font-bold text-muted-foreground tracking-tight"
                            >{$t(
                                "trades.wizard.sections.psychology_analysis",
                            )}</Label
                        >
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <Label
                                    for="entry-rationale-text"
                                    class="text-xs"
                                    >{$t(
                                        "trades.wizard.fields.entry_rationale",
                                    )}</Label
                                >
                                <Textarea
                                    id="entry-rationale-text"
                                    bind:value={formData.entry_rationale}
                                    placeholder={$t(
                                        "trades.wizard.placeholders.rationale",
                                    )}
                                    class="bg-muted/30 border-border/40 h-24 text-sm resize-none"
                                />
                            </div>
                            <div class="space-y-2">
                                <Label
                                    for="confirmation-signals-text"
                                    class="text-xs"
                                    >{$t(
                                        "trades.wizard.fields.confirmation_signals",
                                    )}</Label
                                >
                                <Textarea
                                    id="confirmation-signals-text"
                                    bind:value={formData.confirmation_signals}
                                    placeholder={$t(
                                        "trades.wizard.placeholders.signals",
                                    )}
                                    class="bg-input/20 border-border/20 h-24 text-sm resize-none"
                                />
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <Label for="market-context-text" class="text-xs"
                                    >{$t(
                                        "trades.wizard.fields.market_context",
                                    )}</Label
                                >
                                <Textarea
                                    id="market-context-text"
                                    bind:value={formData.market_context}
                                    placeholder={$t(
                                        "trades.wizard.placeholders.context",
                                    )}
                                    class="bg-input/20 border-border/20 h-24 text-sm resize-none"
                                />
                            </div>
                            <div class="space-y-2">
                                <Label for="improvements-text" class="text-xs"
                                    >{$t(
                                        "trades.wizard.fields.improvements",
                                    )}</Label
                                >
                                <Textarea
                                    id="improvements-text"
                                    bind:value={formData.mistakes_improvements}
                                    placeholder={$t(
                                        "trades.wizard.placeholders.improvements",
                                    )}
                                    class="bg-muted/30 border-border/40 h-24 text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div class="pt-4 border-t border-white/5 space-y-4">
                            <div class="flex items-center justify-between">
                                <div class="space-y-0.5">
                                    <Label
                                        for="emotion-intensity-range"
                                        class="text-xs font-bold text-foreground uppercase tracking-tight flex items-center gap-2"
                                    >
                                        <Brain
                                            class="w-3.5 h-3.5 text-primary"
                                        />
                                        {$t(
                                            "trades.wizard.emotions.intensity_label",
                                        )}
                                    </Label>
                                    <p
                                        class="text-[10px] text-muted-foreground uppercase"
                                    >
                                        {$t(
                                            "trades.wizard.emotions.intensity_hint",
                                        )}
                                    </p>
                                </div>
                                <span
                                    class="text-xl font-black text-primary font-mono"
                                    >{formData.intensity}</span
                                >
                            </div>
                            <input
                                id="emotion-intensity-range"
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                bind:value={formData.intensity}
                                class="w-full h-1.5 bg-muted/40 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div
                                class="flex justify-between text-[8px] text-zinc-500 font-bold uppercase tracking-widest px-1"
                            >
                                <span>{$t("trades.wizard.emotions.light")}</span
                                >
                                <span
                                    >{$t(
                                        "trades.wizard.emotions.moderate",
                                    )}</span
                                >
                                <span
                                    >{$t(
                                        "trades.wizard.emotions.extreme",
                                    )}</span
                                >
                            </div>
                        </div>
                    </section>
                </div>
            {:else if currentStep === 4}
                <div
                    class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
                >
                    <section class="space-y-4 text-center py-12">
                        <h3
                            class="text-sm font-bold text-foreground tracking-tight uppercase"
                        >
                            {$t("trades.wizard.sections.visual_evidence.title")}
                        </h3>
                        <p
                            class="text-[10px] text-muted-foreground max-w-xs mx-auto uppercase"
                        >
                            {$t("trades.wizard.placeholders.visual_desc")}
                        </p>

                        <div
                            class="mt-4 text-left bg-muted/30 rounded-xl p-4 border border-border/40"
                        >
                            <ImageUploader bind:images={formData.images} />
                        </div>
                    </section>
                </div>
            {:else if currentStep === 5}
                <div
                    class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300"
                >
                    <div
                        class="group relative overflow-hidden rounded-2xl bg-card p-4 border border-border/40 shadow-xl"
                    >
                        <div
                            class="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                        ></div>
                        <div class="relative flex flex-col md:flex-row gap-6">
                            <div class="flex-1 space-y-6">
                                <div class="space-y-2">
                                    <h3
                                        class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2"
                                    >
                                        <ShieldCheck
                                            class="w-4 h-4 text-primary"
                                        />
                                        {$t(
                                            "trades.wizard.sections.final_summary",
                                        )}
                                    </h3>
                                    <div
                                        class="h-0.5 w-12 bg-primary rounded-full"
                                    ></div>
                                </div>

                                <div class="grid grid-cols-2 gap-6 pt-2">
                                    <div class="space-y-0.5">
                                        <p
                                            class="text-[9px] text-muted-foreground uppercase font-bold tracking-widest"
                                        >
                                            {$t(
                                                "trades.wizard.fields.asset_direction",
                                            )}
                                        </p>
                                        <div class="flex items-center gap-2">
                                            <span
                                                class="text-base font-mono font-bold text-foreground"
                                                >{formData.asset}</span
                                            >
                                            {#if calculationResult.totalEntryQty > formData.quantity}
                                                <span
                                                    class="text-[10px] text-muted-foreground"
                                                >
                                                    ({$t("trades.wizard.fields.average")}: {(
                                                        formData.entry_price ||
                                                        0
                                                    ).toLocaleString(
                                                        $locale || "pt-BR",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )})
                                                </span>
                                            {/if}
                                            <span
                                                class="px-1.5 py-0.5 rounded text-[8px] font-black {formData.direction ===
                                                'buy'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/20 text-red-400'}"
                                            >
                                                {formData.direction === "buy"
                                                    ? $t(
                                                      "trades.wizard.fields.buy",
                                                  ).toUpperCase()
                                                    : $t(
                                                      "trades.wizard.fields.sell",
                                                  ).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="space-y-0.5">
                                        <p
                                            class="text-[9px] text-muted-foreground uppercase font-bold tracking-widest"
                                        >
                                            {$t("trades.wizard.summary.net_result")}
                                        </p>
                                        <p
                                            class="text-xl font-black {calculationResult.netCurrency >=
                                            0
                                                ? 'text-emerald-400'
                                                : 'text-red-400'}"
                                        >
                                            {#if calculationResult.assetType?.result_type === "points"}
                                                {calculationResult.netPoints.toLocaleString(
                                                    $locale || "pt-BR",
                                                    {
                                                        maximumFractionDigits: 2,
                                                    },
                                                )} {$t("trades.wizard.units.points")}
                                                <span
                                                    class="text-[10px] text-muted-foreground block font-bold"
                                                >
                                                    {calculationResult.currencySymbol}
                                                    {calculationResult.netCurrency.toLocaleString(
                                                        $locale || "pt-BR",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </span>
                                            {:else}
                                                {calculationResult.currencySymbol}
                                                {calculationResult.netCurrency.toLocaleString(
                                                    $locale || "pt-BR",
                                                    {
                                                        minimumFractionDigits: 2,
                                                    },
                                                )}
                                            {/if}
                                        </p>
                                    </div>
                                    <div class="space-y-0.5">
                                        <p
                                            class="text-[9px] text-muted-foreground uppercase font-bold tracking-widest"
                                        >
                                            {$t("trades.wizard.fields.date_time")}
                                        </p>
                                        <p
                                            class="text-xs font-medium text-foreground/80"
                                        >
                                            {new Date(
                                                formData.entry_date,
                                            ).toLocaleTimeString(
                                                $locale || "pt-BR",
                                                {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                },
                                            )}
                                        </p>
                                    </div>
                                    <div class="space-y-0.5">
                                        <p
                                            class="text-[9px] text-muted-foreground uppercase font-bold tracking-widest"
                                        >
                                            {$t("trades.wizard.fields.strategy")}
                                        </p>
                                        <p
                                            class="text-xs font-medium text-foreground/80 truncate"
                                        >
                                            {workspaceStore.strategies.find(
                                                (s) =>
                                                    s.id ===
                                                    formData.strategy_id,
                                            )?.name ||
                                                $t("trades.wizard.summary.na")}
                                        </p>
                                    </div>
                                </div>

                                <!-- Memória de Cálculo -->
                                <div
                                    class="space-y-3 pt-6 border-t border-border/40"
                                >
                                    <h4
                                        class="text-[10px] font-black tracking-widest text-primary uppercase flex items-center gap-2"
                                    >
                                        <div
                                            class="w-1 h-1 bg-primary rounded-full"
                                        ></div>
                                        {$t(
                                            "trades.wizard.sections.calc_memory",
                                        )}
                                    </h4>

                                    <div class="space-y-2">
                                        <div
                                            class="flex justify-between items-center text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tighter"
                                        >
                                            <span
                                                >{$t(
                                                    "trades.wizard.fields.notes",
                                                )}</span
                                            >
                                            <span
                                                >{$t(
                                                    "trades.wizard.sections.calc_memory",
                                                )}</span
                                            >
                                        </div>

                                        <div class="space-y-1">
                                            {#each calculationResult.memoryItems as item}
                                                <div
                                                    class="flex justify-between items-center bg-muted/30 rounded p-2 border border-border/40 transition-colors hover:bg-muted/40"
                                                >
                                                    <div
                                                        class="flex items-center gap-2"
                                                    >
                                                        {#if item.type === "addition"}
                                                            <span
                                                                class="px-1 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 text-[8px] font-black border border-emerald-500/20 uppercase tracking-tighter"
                                                                >{$t(
                                                                    "trades.wizard.fields.entry",
                                                                )}</span
                                                            >
                                                        {:else if item.type === "exit"}
                                                            <span
                                                                class="px-1 py-0.5 rounded-[4px] bg-blue-500/10 text-blue-400 text-[8px] font-black border border-blue-500/20 uppercase tracking-tighter"
                                                                >{$t(
                                                                    "trades.wizard.fields.exit_price",
                                                                )}</span
                                                            >
                                                        {/if}
                                                        <span
                                                            class="text-[10px] font-medium text-foreground/70"
                                                            >{item.label}</span
                                                        >
                                                    </div>
                                                    <span
                                                        class="text-[10px] font-mono font-bold {item.resultCurrency >=
                                                        0
                                                            ? 'text-emerald-400'
                                                            : 'text-red-400'}"
                                                    >
                                                        {#if item.resultCurrency !== 0}
                                                            {item.resultPoints >=
                                                            0
                                                                ? "+"
                                                                : ""}{item.resultPoints.toLocaleString(
                                                                $locale ||
                                                                    "pt-BR",
                                                                {
                                                                    maximumFractionDigits: 2,
                                                                },
                                                            )} {$t("trades.wizard.units.points")}
                                                            <span
                                                                class="text-[9px] opacity-60 ml-1"
                                                            >
                                                                ({calculationResult.currencySymbol}
                                                                {Math.abs(
                                                                    item.resultCurrency,
                                                                ).toLocaleString(
                                                                    $locale ||
                                                                        "pt-BR",
                                                                    {
                                                                        minimumFractionDigits: 2,
                                                                    },
                                                                )})
                                                            </span>
                                                        {:else}
                                                            -
                                                        {/if}
                                                    </span>
                                                </div>
                                            {/each}
                                        </div>

                                        <div
                                            class="flex justify-between items-center pt-2 px-2"
                                        >
                                            <span
                                                >{$t(
                                                    "trades.wizard.summary.gross_result",
                                                )}</span
                                            >
                                            <span
                                                class="text-xs font-mono font-black text-foreground"
                                            >
                                                {#if calculationResult.assetType?.result_type === "points"}
                                                    {calculationResult.grossPoints.toLocaleString(
                                                        $locale || "pt-BR",
                                                        {
                                                            maximumFractionDigits: 2,
                                                        },
                                                    )} {$t("trades.wizard.units.points")}
                                                    <span
                                                        class="text-[9px] text-muted-foreground ml-1"
                                                    >
                                                        ({calculationResult.currencySymbol}
                                                        {calculationResult.grossCurrency.toLocaleString(
                                                            $locale || "pt-BR",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            },
                                                        )})
                                                    </span>
                                                {:else}
                                                    {calculationResult.currencySymbol}
                                                    {calculationResult.grossCurrency.toLocaleString(
                                                        $locale || "pt-BR",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                {/if}
                                            </span>
                                        </div>
                                        <div
                                            class="flex justify-between items-center px-2"
                                        >
                                            <span
                                                >{$t(
                                                    "trades.wizard.summary.exchange_fees",
                                                )}</span
                                            >
                                            <span
                                                class="text-xs font-mono font-black text-red-400"
                                            >
                                                - {calculationResult.currencySymbol}
                                                {(
                                                    calculationResult.fees || 0
                                                ).toLocaleString(
                                                    $locale || "pt-BR",
                                                    {
                                                        minimumFractionDigits: 2,
                                                    },
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="w-full md:w-56 space-y-4">
                                <div
                                    class="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-4 shadow-inner"
                                >
                                    <div
                                        class="flex justify-between items-center"
                                    >
                                        <span
                                            class="text-[9px] text-muted-foreground uppercase font-bold"
                                            >{$t(
                                                "trades.wizard.summary.images",
                                            )}</span
                                        >
                                        <span
                                            class="text-lg font-black text-foreground"
                                            >{formData.images.length}</span
                                        >
                                    </div>
                                    <div
                                        class="flex justify-between items-center pt-2 border-t border-border/20"
                                    >
                                        <span
                                            class="text-[9px] text-muted-foreground uppercase font-bold"
                                            >{$t(
                                                "trades.wizard.fields.followed_plan",
                                            )}</span
                                        >
                                        <span
                                            class="px-2 py-0.5 rounded-full text-[8px] font-black {formData.followed_plan
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'} border border-border/20"
                                        >
                                            {formData.followed_plan
                                                ? $t("trades.wizard.summary.s")
                                                : $t("trades.wizard.summary.n")}
                                        </span>
                                    </div>
                                    <button
                                        class="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50"
                                        onclick={handleSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {#if isSubmitting}
                                            <RotateCcw
                                                class="w-4 h-4 animate-spin"
                                            />
                                        {:else}
                                            {$t("trades.wizard.summary.finish").toUpperCase()}
                                            <Save
                                                class="w-4 h-4 transition-transform group-hover:scale-110"
                                            />
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- Navigation Footer (Flat Design) -->
    <div
        class="px-6 py-4 border-t border-border bg-card/60 flex items-center justify-between"
    >
        <Button
            variant="outline"
            onclick={close}
            class="border-muted text-muted-foreground hover:bg-muted/10"
        >
            <X class="w-4 h-4 mr-2" />
            {$t("common.cancel")}
        </Button>

        <div class="flex gap-3">
            {#if currentStep > 1}
                <Button variant="ghost" onclick={handlePrev}>
                    <ChevronLeft class="w-4 h-4 mr-2" />
                    {$t("trades.wizard.summary.back")}
                </Button>
            {/if}

            {#if currentStep < steps.length}
                <Button onclick={handleNext} class="min-w-[120px]">
                    {$t("trades.wizard.summary.next")}
                    <ChevronRight class="w-4 h-4 ml-2" />
                </Button>
            {:else}
                <Button
                    onclick={handleSubmit}
                    disabled={isSubmitting}
                    class="bg-primary text-primary-foreground min-w-[150px] font-bold shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                >
                    <Save class="w-4 h-4 mr-2" />
                    {isSubmitting ? $t("common.saving") : $t("trades.wizard.summary.finish")}
                </Button>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Make native calendar picker transparent and fill the input area to ensure clickability */
    :global(input[type="datetime-local"]::-webkit-calendar-picker-indicator) {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        cursor: pointer;
        background: transparent !important;
        color: transparent !important;
        appearance: none !important;
    }
</style>
