<script lang="ts">
    import { assetTypesStore } from "$lib/stores/asset-types.svelte";
    import { assetsStore } from "$lib/stores/assets.svelte";
    import { accountsStore } from "$lib/stores/accounts.svelte";
    import { t } from "svelte-i18n";
    import { untrack } from "svelte";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import { workspaceStore } from "$lib/stores/workspace.svelte";
    import { riskStore } from "$lib/stores/riskStore.svelte";
    import { getLiveIntervention } from "$lib/domain/insights/insights-engine";
    import { toLocalDateStr } from "$lib/domain/risk/risk-utils";
    import {
        Zap,
        TrendingUp,
        TrendingDown,
        Loader2,
        AlertCircle,
        Plus,
    } from "lucide-svelte";
    import { toast } from "svelte-sonner";

    let dateInput = $state(toLocalDateStr(new Date()) + "T" + `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`);
    let selectedAssetTypeId = $state("");
    let asset = $state("");
    let direction = $state<"Buy" | "Sell">("Buy");
    let resultInput = $state("");
    let quantityInput = $state("1");
    let entryPriceInput = $state("");
    let isSubmitting = $state(false);
    let resultInputRef = $state<HTMLInputElement | null>(null);

    // Auto-calculate exit price from entry price + result
    let computedExitPrice = $derived.by(() => {
        const entry = parseFloat(entryPriceInput.replace(",", "."));
        const result = parseFloat(resultInput.replace(",", "."));
        const qty = parseInt(quantityInput) || 1;
        if (isNaN(entry) || entry <= 0 || isNaN(result) || qty <= 0) return null;
        const perUnit = result / qty;
        return direction === "Buy" ? entry + perUnit : entry - perUnit;
    });

    let filteredAssets = $derived.by(() => {
        if (!selectedAssetTypeId) return assetsStore.assets;
        return assetsStore.assets.filter(a => a.asset_type_id === selectedAssetTypeId);
    });

    let intervention = $derived.by(() => {
        const trades = tradesStore.trades;
        const cockpit = untrack(() => riskStore.riskCockpitState);
        return getLiveIntervention(trades, new Date(), (trade) => parseFloat(trade.result?.toString() || "0"), cockpit);
    });

    async function handleQuickSubmit() {
        if (!asset || !resultInput) {
            toast.error($t("trades.wizard.messages.required_fields"));
            return;
        }
        const rawResult = parseFloat(resultInput.replace(",", "."));
        if (isNaN(rawResult)) {
            toast.error($t("trades.messages.invalid_result"));
            return;
        }
        isSubmitting = true;
        try {
            const entryPrice = parseFloat(entryPriceInput.replace(",", ".")) || 0;
            const exitPrice = computedExitPrice || 0;
            const res = await tradesStore.addTrade({
                date: dateInput,
                asset_symbol: asset.toUpperCase(),
                asset_type_id: selectedAssetTypeId || "",
                strategy_id: workspaceStore.strategies[0]?.id || "",
                account_id: accountsStore.accounts[0]?.id || "",
                result: rawResult,
                quantity: parseInt(quantityInput) || 1,
                direction,
                entry_price: entryPrice > 0 ? entryPrice : undefined,
                exit_price: exitPrice > 0 ? exitPrice : undefined,
                exit_date: dateInput,
                intensity: 10,
                followed_plan: true
            });
            if (res.success) {
                toast.success(`${asset.toUpperCase()} ${rawResult >= 0 ? "+" : ""}${rawResult.toFixed(2)}`);
                resultInput = "";
                quantityInput = "1";
                entryPriceInput = "";
            }
        } catch (e) {
            toast.error($t("trades.messages.submission_fail"));
        } finally {
            isSubmitting = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleQuickSubmit();
        }
    }
</script>

<div class="w-full bg-background/20 border-l-4 border-l-emerald-500 border-y border-r border-border/40 rounded-r-xl h-14 flex items-center px-4 gap-4 group/card transition-all hover:bg-background/40 relative overflow-hidden shadow-2xl backdrop-blur-xl">
    <!-- Identity Section (Integrated Inline) -->
    <div class="flex items-center gap-2 shrink-0 border-r border-border/20 pr-4 h-8">
        <div class="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Zap class="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />
        </div>
        <div class="flex flex-col justify-center">
            <h3 class="text-[9px] font-black tracking-[0.15em] text-foreground uppercase leading-none">REGISTRO</h3>
            <p class="text-[7px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none mt-0.5">TERMINAL</p>
        </div>
    </div>

    <!-- Inputs Strip (SINGLE ROW FLOW) -->
    <div class="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        <!-- Date/Time Pill -->
        <div class="h-9 px-2.5 bg-black/40 border border-border/40 rounded-lg flex flex-col justify-center min-w-[130px] relative hover:border-primary/40 transition-all">
            <span class="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 absolute top-1 left-2.5">DATA/HORA</span>
            <input type="datetime-local" bind:value={dateInput} class="bg-transparent border-none p-0 mt-3 text-[9px] font-black uppercase outline-none focus:ring-0 w-full text-foreground/70 cursor-pointer inv-input" />
        </div>

        <!-- Asset Type Pill -->
        <div class="h-9 px-2.5 bg-black/40 border border-border/40 rounded-lg flex flex-col justify-center min-w-[100px] relative hover:border-primary/40 transition-all cursor-pointer">
            <span class="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 absolute top-1 left-2.5">TIPO</span>
            <select bind:value={selectedAssetTypeId} class="bg-transparent border-none p-0 mt-3 text-[9px] font-black uppercase outline-none focus:ring-0 cursor-pointer w-full appearance-none pr-4 text-foreground/70">
                <option value="" class="bg-slate-900">TODOS</option>
                {#each assetTypesStore.assetTypes as type}
                    <option value={type.id} class="bg-slate-900">{type.name}</option>
                {/each}
            </select>
        </div>

        <!-- Asset Pill -->
        <div class="h-9 px-2.5 bg-black/40 border border-border/40 rounded-lg flex flex-col justify-center min-w-[100px] relative hover:border-primary/40 transition-all">
            <span class="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 absolute top-1 left-2.5">ATIVO</span>
            <select bind:value={asset} class="bg-transparent border-none p-0 mt-3 text-[9px] font-black uppercase outline-none focus:ring-0 cursor-pointer w-full appearance-none pr-4 text-foreground/70 uppercase">
                <option value="" class="bg-slate-900">SELEC</option>
                {#each filteredAssets as a}
                    <option value={a.symbol} class="bg-slate-900">{a.symbol}</option>
                {/each}
            </select>
        </div>

        <!-- Direction Toggle (Ultra Compact) -->
        <div class="h-9 p-0.5 bg-black/40 border border-border/40 rounded-lg flex items-center gap-0.5 shrink-0">
            <button onclick={() => (direction = "Buy")} class="h-full px-2.5 rounded flex items-center gap-1.5 transition-all {direction === 'Buy' ? 'bg-emerald-500 text-[#064e3b] font-black shadow-lg shadow-emerald-500/20' : 'text-muted-foreground/30 hover:text-emerald-400'}">
                <TrendingUp class="w-3 h-3" />
                <span class="text-[8px] font-black">COMPRA</span>
            </button>
            <button onclick={() => (direction = "Sell")} class="h-full px-2.5 rounded flex items-center gap-1.5 transition-all {direction === 'Sell' ? 'bg-rose-500 text-[#4c0519] font-black shadow-lg shadow-rose-500/20' : 'text-muted-foreground/30 hover:text-rose-400'}">
                <TrendingDown class="w-3 h-3" />
                <span class="text-[8px] font-black">VENDA</span>
            </button>
        </div>

        <!-- Qty Pill -->
        <div class="h-9 px-2.5 bg-black/40 border border-border/40 rounded-lg flex flex-col justify-center min-w-[60px] relative hover:border-primary/40 transition-all">
            <span class="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 absolute top-1 left-2.5">QTD</span>
            <input type="number" bind:value={quantityInput} min="1" class="bg-transparent border-none p-0 mt-3 text-[9px] font-black outline-none focus:ring-0 w-full text-foreground/70" />
        </div>

        <!-- Entry Price Pill -->
        <div class="h-9 px-2.5 bg-black/40 border border-border/40 rounded-lg flex flex-col justify-center min-w-[90px] relative hover:border-primary/40 transition-all">
            <span class="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 absolute top-1 left-2.5">ENTRADA</span>
            <input bind:value={entryPriceInput} placeholder="0.00" class="bg-transparent border-none p-0 mt-3 text-[9px] font-black tabular-nums outline-none focus:ring-0 w-full text-foreground/70" onkeydown={handleKeydown} />
        </div>

        <!-- PL Pill -->
        <div class="h-9 px-2.5 bg-black/40 border border-border/40 rounded-lg flex flex-col justify-center min-w-[110px] relative hover:border-emerald-500/40 transition-all">
            <span class="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 absolute top-1 left-2.5">RESULTADO</span>
            <div class="flex items-center gap-1 mt-3">
                <span class="text-[8px] font-black opacity-20">R$</span>
                <input bind:value={resultInput} bind:this={resultInputRef} placeholder="0.00" class="bg-transparent border-none p-0 text-[9px] font-black tabular-nums outline-none focus:ring-0 w-full {resultInput.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}" onkeydown={handleKeydown} />
            </div>
        </div>

        <!-- Computed Exit Price (Read-only indicator) -->
        {#if computedExitPrice !== null}
        <div class="h-9 px-2.5 bg-black/20 border border-dashed border-border/30 rounded-lg flex flex-col justify-center min-w-[80px] relative shrink-0">
            <span class="text-[7px] font-black uppercase tracking-widest text-muted-foreground/30 absolute top-1 left-2.5">SAÍDA</span>
            <span class="mt-3 text-[9px] font-black tabular-nums {computedExitPrice > parseFloat(entryPriceInput.replace(',','.')) ? 'text-emerald-400' : 'text-rose-400'}">{computedExitPrice.toFixed(2)}</span>
        </div>
        {/if}
    </div>

    <!-- Submit Button (Fixed at right) -->
    <button disabled={isSubmitting || !asset || !resultInput} onclick={handleQuickSubmit} class="h-9 px-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 text-[#064e3b] rounded-lg font-black uppercase text-[9px] tracking-widest transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0">
        {#if isSubmitting}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
        {:else}
            <Plus class="w-3.5 h-3.5" />
            ADICIONAR
        {/if}
    </button>
</div>

{#if intervention}
    <div class="mt-2 flex items-center gap-2 px-3 py-1 bg-rose-500/5 border-l-2 border-rose-500 rounded-r text-rose-500 animate-in fade-in slide-in-from-top-1">
        <AlertCircle class="w-3 h-3 shrink-0" />
        <span class="text-[8px] font-black uppercase tracking-widest">{intervention.message}</span>
    </div>
{/if}

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .inv-input::-webkit-calendar-picker-indicator {
        filter: invert(1);
        opacity: 0.1;
        cursor: pointer;
        position: absolute;
        right: 0;
        top: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }
</style>
