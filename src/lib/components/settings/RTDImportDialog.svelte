<script lang="ts">
    import { assetTypesStore } from "$lib/stores/asset-types.svelte";
    import { assetsStore } from "$lib/stores/assets.svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import * as Table from "$lib/components/ui/table";
    import * as Select from "$lib/components/ui/select";
    import { rtdStore } from "$lib/stores/rtd.svelte";
    import { appStore } from "$lib/stores/app.svelte";
    import { t } from "svelte-i18n";
    import { RefreshCcw, FileSpreadsheet, Check, Activity, Search, ShieldCheck } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import { untrack } from "svelte";
    import { cn } from "$lib/utils";

    let { open = $bindable(false) } = $props();

    interface ImportItem {
        symbol: string;
        name: string;
        typeId: string;
        selected: boolean;
        exists: boolean;
    }

    let items = $state<ImportItem[]>([]);

    $effect(() => {
        if (open) {
            const quotes = rtdStore.quotes;
            const currentAssets = assetsStore.assets;

            untrack(() => {
                const currentSymbols = currentAssets.map((a) => a.symbol);
                const rtdSymbols = Object.keys(quotes);

                items = rtdSymbols.map((sym) => {
                    const exists = currentSymbols.includes(sym);
                    const existingItem = items.find((i) => i.symbol === sym);

                    return {
                        symbol: sym,
                        name: existingItem?.name || sym,
                        typeId: existingItem?.typeId || detectType(sym),
                        selected: existingItem?.selected ?? !exists,
                        exists,
                    };
                });
            });
        } else if (items.length > 0) {
            untrack(() => {
                items = [];
            });
        }
    });

    function detectType(symbol: string): string {
        const sym = symbol.toUpperCase();
        const typeMatches = (pattern: string) =>
            assetTypesStore.assetTypes.find((t) =>
                t.name.toLowerCase().includes(pattern.toLowerCase()),
            );

        if (/^(WIN|WDO|WSP|DI1|BGI|CCM|IND|DOL)/i.test(sym)) {
            return typeMatches("Futuro")?.id || assetTypesStore.assetTypes[0]?.id || "";
        }

        if (/^[A-Z]{4}\d/i.test(sym)) {
            return typeMatches("Aç")?.id || typeMatches("Stock")?.id || assetTypesStore.assetTypes[1]?.id || "";
        }

        return assetTypesStore.assetTypes[0]?.id ?? "";
    }

    let allSelected = $derived(
        items.filter((i) => !i.exists).length > 0 &&
            items.filter((i) => !i.exists).every((i) => i.selected),
    );
    let selectedCount = $derived(
        items.filter((i) => i.selected && !i.exists).length,
    );

    function toggleAll() {
        const target = !allSelected;
        items = items.map((i) => (i.exists ? i : { ...i, selected: target }));
    }

    async function handleImport() {
        const toImport = items.filter((i) => i.selected && !i.exists);
        if (toImport.length === 0) return;

        for (const item of toImport) {
            let pointValue = 1.0;
            if (item.symbol.startsWith("WDO")) pointValue = 10.0;
            else if (item.symbol.startsWith("WIN")) pointValue = 0.2;
            else if (item.symbol.startsWith("DOL")) pointValue = 50.0;
            else if (item.symbol.startsWith("IND")) pointValue = 1.0;

            await assetsStore.addAsset({
                symbol: item.symbol.toUpperCase(),
                name: item.name === item.symbol ? `${item.symbol} (RTD)` : item.name,
                asset_type_id: item.typeId,
                point_value: pointValue,
                default_fee_id: "",
                is_root: false,
            }, false);
        }

        await assetsStore.saveAssets();
        await appStore.loadData(true);
        toast.success($t("settings.assets.importDialog.success", { values: { count: toImport.length } }));
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[1000px] h-[85vh] flex flex-col overflow-hidden bg-card/95 backdrop-blur-3xl border-white/10 p-0 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
        <!-- Premium Header -->
        <div class="p-10 pb-6">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-xl shadow-primary/5">
                        <Activity class="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <Dialog.Title class="text-[11px] font-black uppercase tracking-[0.4em] text-primary/80 italic mb-1">Hub de Importação RTD</Dialog.Title>
                        <h2 class="text-3xl font-black uppercase tracking-tighter italic leading-none">Sincronização Ativa</h2>
                    </div>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-pulse">
                     <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                     <span class="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic">Streaming Online</span>
                </div>
            </div>
            <Dialog.Description class="text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.2em] px-1">
                Detectamos ativos em streaming no seu RTD (Toro/Profitchart). Selecione quais deseja integrar ao seu cockpit.
            </Dialog.Description>
        </div>

        <div class="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
            {#if items.length === 0}
                <div class="flex flex-col items-center justify-center py-32 text-center space-y-6">
                    <div class="p-8 bg-muted/20 rounded-full border border-white/5 shadow-inner">
                        <RefreshCcw class="w-12 h-12 text-muted-foreground/40 animate-spin-slow" />
                    </div>
                    <div class="max-w-md space-y-3">
                        <p class="text-xl font-black uppercase tracking-tighter italic text-foreground/60">
                            Aguardando sinal RTD...
                        </p>
                        <p class="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-loose italic">
                            Certifique-se que seu RTD está conectado e enviando cotações via DDE/RTD para o sistema.
                        </p>
                    </div>
                </div>
            {:else}
                <div class="border rounded-3xl bg-muted/10 overflow-hidden border-white/5 shadow-inner">
                    <Table.Root>
                        <Table.Header class="bg-muted/30">
                            <Table.Row class="hover:bg-transparent border-white/5">
                                <Table.Head class="w-16 pl-6">
                                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} class="rounded-md border-white/20" />
                                </Table.Head>
                                <Table.Head class="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Ticker</Table.Head>
                                <Table.Head class="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Identificação Sugerida</Table.Head>
                                <Table.Head class="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Classe Estrutural</Table.Head>
                                <Table.Head class="w-40 text-right pr-6"></Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each items as item}
                                <Table.Row class={cn("group hover:bg-white/[0.02] border-white/5 transition-colors", item.exists && "opacity-40 grayscale")}>
                                    <Table.Cell class="pl-6">
                                        <Checkbox bind:checked={item.selected} disabled={item.exists} class="rounded-md border-white/20" />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 bg-muted/50 rounded-lg border border-white/5">
                                                 <Search class="w-3.5 h-3.5 opacity-40 group-hover:text-primary transition-colors" />
                                            </div>
                                            <span class="font-mono text-base font-black tracking-tighter tabular-nums uppercase">{item.symbol}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <input
                                            type="text"
                                            bind:value={item.name}
                                            class="w-full bg-muted/20 border-white/5 focus:border-primary/50 text-xs font-bold italic tracking-tight rounded-lg h-9 px-3 transition-colors uppercase outline-none"
                                            placeholder={item.symbol}
                                            disabled={item.exists}
                                        />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Select.Root type="single" bind:value={item.typeId} disabled={item.exists}>
                                            <Select.Trigger class="h-9 bg-muted/20 border-white/5 text-[10px] font-black uppercase tracking-widest rounded-lg italic text-left pl-3">
                                                {assetTypesStore.getAssetTypeName(item.typeId)}
                                            </Select.Trigger>
                                            <Select.Content class="bg-card/98 backdrop-blur-3xl border-white/10 rounded-xl shadow-2xl p-1">
                                                {#each assetTypesStore.assetTypes as type}
                                                    <Select.Item value={type.id} class="text-[10px] font-black uppercase tracking-widest italic rounded-lg">
                                                        {type.name}
                                                    </Select.Item>
                                                {/each}
                                            </Select.Content>
                                        </Select.Root>
                                    </Table.Cell>
                                    <Table.Cell class="text-right pr-6">
                                        {#if item.exists}
                                            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                <Check class="w-3 h-3 text-emerald-500" />
                                                <span class="text-[9px] font-black uppercase tracking-widest text-emerald-500">Já Ativo</span>
                                            </div>
                                        {/if}
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>
            {/if}
        </div>

        <!-- Professional Footer Card -->
        <div class="p-8 bg-muted/40 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center opacity-40">
                    <ShieldCheck class="w-5 h-5 text-primary" />
                </div>
                <div class="flex-col hidden md:flex">
                    <span class="text-[9px] font-black uppercase tracking-widest opacity-40 italic">Mapeamento em Tempo Real</span>
                    <span class="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">
                         {selectedCount} Tickers Prontos para Inteface
                    </span>
                </div>
            </div>
            <div class="w-full md:w-auto flex items-center gap-4">
                <Button variant="ghost" onclick={() => (open = false)} class="h-14 px-8 rounded-none underline underline-offset-8 font-black uppercase tracking-[0.2em] italic text-muted-foreground hover:text-foreground hover:bg-transparent transition-all">
                    {$t("general.cancel")}
                </Button>
                <Button
                    disabled={selectedCount === 0}
                    onclick={handleImport}
                    class="h-14 px-12 rounded-none bg-primary text-primary-foreground font-black uppercase tracking-tighter italic shadow-2xl shadow-primary/30 hover:scale-[1.05] transition-all overflow-hidden relative group"
                >
                    <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <div class="relative z-10 flex items-center gap-3">
                         <FileSpreadsheet class="w-5 h-5" />
                         SINCRONIZAR {selectedCount} ATIVOS
                    </div>
                </Button>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; border: 2px solid transparent; background-clip: padding-box; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); border: 2px solid transparent; background-clip: padding-box; }
    :global(.animate-spin-slow) { animation: spin 8s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
