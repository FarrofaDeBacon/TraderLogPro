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
    import { SystemCard } from "$lib/components/ui/system";
    import {
        Zap,
        TrendingUp,
        TrendingDown,
        Loader2,
        AlertCircle,
        Plus,
    } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import * as Select from "$lib/components/ui/select";

    let dateInput = $state(toLocalDateStr(new Date()) + "T" + `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`);
    let selectedAccountId = $state("");
    let selectedAssetTypeId = $state("");
    let asset = $state("");
    let direction = $state<"Buy" | "Sell">("Buy");
    let resultInput = $state("");
    let quantityInput = $state("1");
    let entryPriceInput = $state("");
    let isSubmitting = $state(false);
    let resultInputRef = $state<HTMLInputElement | null>(null);

    // Initialize selections from stores if available
    $effect(() => {
        if (!selectedAccountId && accountsStore.accounts.length > 0) {
            selectedAccountId = accountsStore.accounts[0].id;
        }
    });

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
                account_id: selectedAccountId || accountsStore.accounts[0]?.id || "",
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

<SystemCard status="success" class="w-full !overflow-visible py-3 flex items-center px-6 gap-6 relative z-[100] min-h-[72px] transition-all hover:bg-card/80">
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
    <div class="flex-1 flex items-end gap-3 py-1">
        <!-- Date/Time Field -->
        <div class="flex flex-col gap-1.5 min-w-[130px] shrink-0">
            <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">{$t("common.date")}</span>
            <div class="h-8 px-4 bg-white/[0.03] border border-white/5 rounded-full flex items-center hover:border-white/20 transition-all">
                <input type="datetime-local" bind:value={dateInput} class="bg-transparent border-none p-0 text-[10px] font-black outline-none focus:ring-0 w-full text-foreground/70 cursor-pointer inv-input" />
            </div>
        </div>

        <!-- Account Slot/Pill -->
        <div class="flex flex-col gap-1.5 min-w-[140px] shrink-0">
            <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">{$t("common.account")}</span>
            <Select.Root type="single" bind:value={selectedAccountId}>
                <Select.Trigger class="h-8 px-4 bg-white/[0.03] border border-white/5 rounded-full hover:border-white/20 transition-all text-[9px] font-black shadow-inner flex items-center justify-between gap-1 w-full text-foreground/70 ring-0 focus:ring-0">
                    <span class="truncate">{accountsStore.accounts.find(a => a.id === selectedAccountId)?.nickname ?? $t('common.select_ellipsis')}</span>
                </Select.Trigger>
                <Select.Content class="bg-[#0c0d10] border-white/5 backdrop-blur-xl">
                    {#each accountsStore.accounts as acc}
                        <Select.Item value={acc.id} class="text-[9px] font-black">{acc.nickname}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        </div>

        <!-- Asset Type Slot/Pill -->
        <div class="flex flex-col gap-1.5 min-w-[140px] shrink-0">
            <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">{$t("common.type")}</span>
            <Select.Root type="single" bind:value={selectedAssetTypeId}>
                <Select.Trigger class="h-8 px-4 bg-white/[0.03] border border-white/5 rounded-full hover:border-white/20 transition-all text-[9px] font-black shadow-inner flex items-center justify-between gap-1 w-full text-foreground/70 ring-0 focus:ring-0">
                    <span class="truncate">{assetTypesStore.assetTypes.find(t => t.id === selectedAssetTypeId)?.name ?? "Todos"}</span>
                </Select.Trigger>
                <Select.Content class="bg-[#0c0d10] border-white/5 backdrop-blur-xl">
                    <Select.Item value="" class="text-[9px] font-black">Todos</Select.Item>
                    {#each assetTypesStore.assetTypes as type}
                        <Select.Item value={type.id} class="text-[9px] font-black">{type.name}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        </div>

        <!-- Asset Selector Slot -->
        <div class="flex flex-col gap-1.5 min-w-[130px] shrink-0">
            <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">{$t("common.asset")}</span>
            <Select.Root type="single" bind:value={asset}>
                <Select.Trigger class="h-8 px-5 bg-white/[0.03] border border-white/5 rounded-full hover:border-white/20 transition-all text-[10px] font-black shadow-inner flex items-center justify-between gap-2 w-full text-foreground/70 ring-0 focus:ring-0">
                    <span class="truncate">{asset || $t('common.select_ellipsis')}</span>
                </Select.Trigger>
                <Select.Content class="bg-[#0c0d10] border-white/5 backdrop-blur-xl max-h-[300px] overflow-y-auto">
                    <Select.Item value="" class="text-[10px] font-black">Selecionar</Select.Item>
                    {#each filteredAssets as a}
                        <Select.Item value={a.symbol} class="text-[10px] font-black">{a.symbol}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        </div>

        <!-- Direction Toggle -->
        <div class="flex flex-col gap-1.5 shrink-0">
            <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">{$t("LIST.TABLE.DIRECTION")}</span>
            <div class="h-8 p-1 bg-white/[0.02] border border-white/5 rounded-full flex items-center gap-1 shadow-inner">
                <button onclick={() => (direction = "Buy")} class="h-full px-4 rounded-full flex items-center gap-2 transition-all {direction === 'Buy' ? 'bg-emerald-500 text-[#064e3b]' : 'text-muted-foreground/20 hover:text-emerald-400'}">
                    <TrendingUp class="w-3.5 h-3.5" />
                    <span class="text-[10px] font-black uppercase">COMPRA</span>
                </button>
                <button onclick={() => (direction = "Sell")} class="h-full px-4 rounded-full flex items-center gap-2 transition-all {direction === 'Sell' ? 'bg-rose-500 text-[#4c0519]' : 'text-muted-foreground/20 hover:text-rose-400'}">
                    <TrendingDown class="w-3.5 h-3.5" />
                    <span class="text-[10px] font-black uppercase">VENDA</span>
                </button>
            </div>
        </div>

        <!-- Result Field -->
        <div class="flex flex-col gap-1.5 min-w-[120px] shrink-0">
            <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">{$t("common.result")}</span>
            <div class="h-8 px-5 bg-white/[0.03] border border-white/5 rounded-full flex items-center hover:border-emerald-500/20 transition-all group/res {resultInput.startsWith('-') ? 'focus-within:border-rose-500/40' : 'focus-within:border-emerald-500/40'}">
                <div class="flex items-center gap-2 w-full">
                    <span class="text-[10px] font-black opacity-20">R$</span>
                    <input bind:value={resultInput} bind:this={resultInputRef} placeholder="0.00" class="bg-transparent border-none p-0 text-[11px] font-bold tabular-nums outline-none focus:ring-0 w-full {resultInput.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}" onkeydown={handleKeydown} />
                </div>
            </div>
        </div>

        <!-- Quantity Field -->
        <div class="flex flex-col gap-1.5 min-w-[80px] shrink-0">
            <span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">{$t("common.quantity")}</span>
            <div class="h-8 px-4 bg-white/[0.03] border border-white/5 rounded-full flex items-center hover:border-white/20 transition-all">
                <input type="number" bind:value={quantityInput} min="1" class="bg-transparent border-none p-0 text-[10px] font-black outline-none focus:ring-0 w-full text-foreground/70 text-center" />
            </div>
        </div>
    </div>

    <!-- Submit Button (Fixed at right) -->
    <button disabled={isSubmitting || !asset || !resultInput} onclick={handleQuickSubmit} class="h-9 px-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 text-[#064e3b] rounded-full font-black uppercase text-[9px] tracking-widest transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0">
        {#if isSubmitting}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
        {:else}
            <Plus class="w-3.5 h-3.5" />
            ADICIONAR
        {/if}
    </button>
</SystemCard>

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
