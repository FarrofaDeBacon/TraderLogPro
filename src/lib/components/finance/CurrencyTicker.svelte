<script lang="ts">
  import { currenciesStore } from "$lib/stores/currencies.svelte";
    import { onMount } from "svelte";
    import { appStore } from "$lib/stores/app.svelte";
    import { TrendingUp, TrendingDown } from "lucide-svelte";

    // Filtering only currencies that have a rate and are not BRL
    let tickerItems = $derived(
        currenciesStore.currencies
            .filter((c) => c.code !== "BRL" && c.exchange_rate > 0)
            .map((c) => ({
                pair: `${c.code}/BRL`,
                rate: c.exchange_rate,
                symbol: c.symbol,
            })),
    );

    // Default items if none exist to avoid empty bar
    const defaultItems = [
        { pair: "USD/BRL", rate: 5.42 },
        { pair: "EUR/BRL", rate: 5.85 },
        { pair: "GBP/BRL", rate: 6.92 },
        { pair: "USDT/BRL", rate: 5.43 },
        { pair: "BTC/BRL", rate: 564231.0 },
    ];

    let displayItems = $derived(
        (tickerItems.length > 0 ? tickerItems : defaultItems).slice(0, 5),
    );

    const formatRate = (rate: number) => {
        return rate.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        });
    };

    onMount(() => {
        currenciesStore.syncExchangeRates();
        const interval = setInterval(() => {
            currenciesStore.syncExchangeRates();
        }, 120000);
        return () => clearInterval(interval);
    });
</script>

<div class="w-full py-2 px-4 overflow-hidden select-none border-b border-white/5">
    <div class="max-w-7xl mx-auto flex items-center justify-center gap-x-8 md:gap-x-12 opacity-80 hover:opacity-100 transition-opacity duration-500">
        {#each displayItems as item}
            <div class="flex items-center gap-2 text-xs font-medium">
                <span class="text-white/70 uppercase tracking-wider">{item.pair}</span>
                <span class="font-mono tabular-nums text-white/90">
                    {formatRate(item.rate)}
                </span>
                <div class="shrink-0 flex items-center">
                    {#if item.rate > 5}
                        <TrendingUp class="w-3 h-3 text-emerald-400" />
                    {:else}
                        <TrendingDown class="w-3 h-3 text-rose-400" />
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    /* Minimalist Ticker - No Animation as per Stage 1 requirements */
</style>
