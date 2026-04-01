<script lang="ts">
  import { assetTypesStore } from "$lib/stores/asset-types.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
    import { t } from "svelte-i18n";
    import { untrack } from "svelte";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import { appStore } from "$lib/stores/app.svelte";
    import { workspaceStore } from "$lib/stores/workspace.svelte";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import { getLiveIntervention } from "$lib/domain/insights/insights-engine";
    import type { LiveIntervention } from "$lib/domain/insights/insights-engine";
    import { Zap, TrendingUp, TrendingDown, CheckSquare, Loader2, AlertCircle, AlertTriangle } from "lucide-svelte";
    import { toast } from "svelte-sonner";

    let intervention = $derived.by(() => {
        return getLiveIntervention(
            tradesStore.trades,
            new Date(),
            (trade) => parseFloat(trade.result?.toString() || "0"),
            riskStore.riskCockpitState
        );
    });

    // O Quick Log preenche o mínimo e deduz o máximo
    let asset = $state("");
    let direction = $state<"Buy" | "Sell">("Buy");
    let resultInput = $state("");
    let quantityInput = $state("1");
    let isSubmitting = $state(false);

    // Refs for keyboard nav
    let assetInputRef = $state<HTMLInputElement | null>(null);
    let resultInputRef = $state<HTMLInputElement | null>(null);
    
    let inlineFeedback = $state<{ message: string, type: 'success' | 'error' } | null>(null);

    // Smart Auto-focus and Last Asset memory
    $effect(() => {
        untrack(() => {
            const last = localStorage.getItem("quicklog_last_asset");
            if (last && !asset) {
                asset = last;
                // If we remembered the asset, jump straight to the result input
                setTimeout(() => { if (resultInputRef) resultInputRef.focus(); }, 150);
            } else if (!asset) {
                setTimeout(() => { if (assetInputRef) assetInputRef.focus(); }, 150);
            }
        });
    });

    async function handleQuickSubmit() {
        if (!asset || !resultInput) {
            toast.error($t("wizard.errors.required"));
            return;
        }

        const rawResult = parseFloat(resultInput.replace(",", "."));
        if (isNaN(rawResult)) {
            toast.error($t("messages.invalid_result"));
            return;
        }

        const rawQty = parseInt(quantityInput) || 1;

        isSubmitting = true;

        try {
            // Memory Context (The System guesses the environment to bypass heavy selects)
            const today = new Date().toISOString().slice(0, 16);
            const defaultAccount = accountsStore.accounts[0]?.id || "";
            const defaultStrategy = workspaceStore.strategies[0]?.id || "";
            
            // Find Asset Type silently
            let assetTypeId = "rtd";
            const upperAsset = asset.toUpperCase();
            if (upperAsset.startsWith("WDO") || upperAsset.startsWith("WIN")) {
                const futType = assetTypesStore.assetTypes.find(t => t.name.toLowerCase().includes("future") || t.name.toLowerCase().includes("futuro"));
                if (futType) assetTypeId = futType.id;
            } else if (upperAsset.length >= 4) {
                const stockType = assetTypesStore.assetTypes.find(t => t.name.toLowerCase().includes("stock") || t.name.toLowerCase().includes("aç"));
                if (stockType) assetTypeId = stockType.id;
            }

            // Fire
            const res = await tradesStore.addTrade({
                date: today,
                asset_symbol: upperAsset,
                asset_type_id: assetTypeId,
                strategy_id: defaultStrategy,
                account_id: defaultAccount,
                result: rawResult,
                quantity: rawQty,
                direction,
                modality_id: "",
                stop_loss: null,
                take_profit: null,
                intensity: 10,
                entry_price: 0,
                exit_price: 0,
                exit_date: today,
                fee_total: 0,
                notes: $t("messages.quick_log_note"),
                timeframe: "1m",
                volatility: "",
                entry_emotional_state_id: null,
                entry_emotional_state_name: null,
                exit_reason: null,
                exit_emotional_state_id: null,
                exit_emotional_state_name: null,
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
                partial_exits: []
            });

            if (res.success) {
                const signal = rawResult >= 0 ? '+' : '';
                const style = rawResult >= 0 ? 'success' : 'error';
                inlineFeedback = { message: `${$t("messages.registered")}: ${upperAsset} ${signal}${rawResult.toFixed(2)}`, type: style };
                setTimeout(() => inlineFeedback = null, 4000);

                localStorage.setItem("quicklog_last_asset", upperAsset);
                
                // Ultra-fast clean state
                resultInput = "";
                quantityInput = "1";
                // Keep asset populated and jump focal point to result again
                setTimeout(() => { if (resultInputRef) resultInputRef.focus(); }, 50);
            } else {
                inlineFeedback = { message: `${$t("common.error")}: ${res.error}`, type: 'error' };
                setTimeout(() => inlineFeedback = null, 5000);
            }
        } catch (e) {
            inlineFeedback = { message: $t("messages.submission_fail"), type: 'error' };
            setTimeout(() => inlineFeedback = null, 5000);
        } finally {
            isSubmitting = false;
        }
    }

    // Keyboard Accessibility
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleQuickSubmit();
        }
    }
</script>

<div class="w-full flex flex-col gap-2">
    {#if intervention}
        <div class="flex items-center gap-2 p-2 rounded-lg text-xs font-bold border animate-in fade-in slide-in-from-top-2 {intervention.type === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}">
            {#if intervention.type === 'danger'}
                <AlertCircle class="w-4 h-4 shrink-0" />
            {:else}
                <AlertTriangle class="w-4 h-4 shrink-0" />
            {/if}
            <div class="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-2">
                <span>{intervention.message}</span>
                {#if intervention.action}
                    <span class="opacity-70 font-mono tracking-widest text-[9px] uppercase border px-1.5 py-0.5 rounded {intervention.type === 'danger' ? 'border-rose-500/30' : 'border-amber-500/30'}">{intervention.action}</span>
                {/if}
            </div>
        </div>
    {/if}

    <div class="flex flex-col md:flex-row items-center gap-3 p-3 bg-zinc-950/40 border-y md:border border-border/10 md:rounded-xl shadow-inner w-full">
    <div class="flex items-center gap-1.5 pr-3 border-r border-border/10 justify-center min-w-max hidden md:flex">
        <Zap class="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
        <span class="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{$t("common.log", { default: "Log" })}</span>
    </div>

    <!-- Active Grid -->
    <div class="grid grid-cols-4 md:flex items-center gap-2 w-full flex-1">
        
        <!-- Asset -->
        <div class="col-span-2 md:col-span-1 md:w-24 relative">
            <span class="absolute -top-2 left-2 px-1 bg-zinc-950 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{$t("list.table.asset")}</span>
            <Input 
                bind:ref={assetInputRef}
                bind:value={asset}
                placeholder={$t("placeholders.quick_asset")}
                class="uppercase bg-transparent border-dashed border-border/30 h-10 text-xs font-bold font-mono px-3"
                onkeydown={handleKeydown}
            />
        </div>

        <!-- Direction Toggle -->
        <div class="col-span-2 md:col-span-1 flex items-center bg-zinc-900/50 p-1 rounded-lg border border-border/5">
            <button 
                onclick={() => direction = "Buy"}
                class="flex-1 flex items-center justify-center gap-1 h-8 px-2 rounded-md transition-all {direction === 'Buy' ? 'bg-emerald-500/10 text-emerald-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
            >
                <TrendingUp class="w-3 h-3" />
                <span class="text-[10px] font-black uppercase">{$t("list.table.buy").charAt(0)}</span>
            </button>
            <button 
                onclick={() => direction = "Sell"}
                class="flex-1 flex items-center justify-center gap-1 h-8 px-2 rounded-md transition-all {direction === 'Sell' ? 'bg-rose-500/10 text-rose-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
            >
                <TrendingDown class="w-3 h-3" />
                <span class="text-[10px] font-black uppercase">{$t("list.table.sell").charAt(0)}</span>
            </button>
        </div>

        <!-- Quantity -->
        <div class="col-span-2 md:col-span-1 md:w-16 relative">
            <span class="absolute -top-2 left-2 px-1 bg-zinc-950 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{$t("wizard.fields.quantity")}</span>
            <Input 
                type="number"
                bind:value={quantityInput}
                min="1"
                class="bg-transparent border-dashed border-border/30 h-10 text-xs font-bold font-mono text-center"
                onkeydown={handleKeydown}
            />
        </div>

        <!-- Result -->
        <div class="col-span-2 md:w-28 relative flex-1 md:flex-none">
            <span class="absolute -top-2 left-2 px-1 bg-zinc-950 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                {$t("list.table.pl")} ({accountsStore.accounts.find(a => a.id === (accountsStore.accounts[0]?.id))?.currency || "R$"})
            </span>
            <Input 
                bind:ref={resultInputRef}
                bind:value={resultInput}
                placeholder={$t("placeholders.quick_result")}
                class="bg-transparent border-solid border-border/20 h-10 text-sm font-black tabular-nums {resultInput.startsWith('-') ? 'text-rose-400 focus-visible:ring-rose-500' : 'text-emerald-400 focus-visible:ring-emerald-500'}"
                onkeydown={handleKeydown}
            />
        </div>

    </div>

    <!-- Submit Action -->
    <div class="w-full md:w-auto mt-2 md:mt-0 flex flex-col items-center justify-center relative">
        {#if inlineFeedback}
            <span class="absolute -top-7 right-0 text-[10px] font-black tracking-widest uppercase animate-in fade-in slide-in-from-bottom-2 {inlineFeedback.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}">
                {inlineFeedback.message}
            </span>
        {/if}
        <Button 
            disabled={isSubmitting || !asset || !resultInput}
            onclick={handleQuickSubmit}
            class="w-full relative overflow-hidden h-10 px-4 font-bold bg-zinc-100 hover:bg-white text-zinc-900 shadow-xl shadow-white/5 group"
        >
            {#if isSubmitting}
                <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
                <div class="flex items-center gap-2">
                    <span>{$t("common.add")}</span>
                    <div class="hidden md:flex items-center gap-1 opacity-40 ml-2">
                        <span class="text-[9px] px-1 py-0.5 border border-zinc-900/20 rounded font-mono">↵</span>
                    </div>
                </div>
            {/if}
        </Button>
    </div>
</div>
</div>
