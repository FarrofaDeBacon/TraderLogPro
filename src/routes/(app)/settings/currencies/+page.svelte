<script lang="ts">
    import { currenciesStore } from "$lib/stores/currencies.svelte";
    import {
        Plus,
        Pencil,
        Trash2,
        Coins,
        Search,
        RefreshCw,
        TrendingUp,
        Fingerprint,
        ChevronRight,
        ChevronDown
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { SystemHeader, SystemInput } from "$lib/components/ui/system";
    import { t } from "svelte-i18n";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { toast } from "svelte-sonner";
    import type { Currency } from "$lib/types";
    import { Badge } from "$lib/components/ui/badge";
    import { slide } from "svelte/transition";
    import { cn } from "$lib/utils";

    let isDialogOpen = $state(false);
    let isSyncing = $state(false);
    let editingId = $state<string | null>(null);
    let searchTerm = $state("");

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    let filteredItems = $derived(
        currenciesStore.currencies
            .filter(c => 
                c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                c.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.code.localeCompare(b.code))
    );

    let expandedGroups = $state<Record<string, boolean>>({
        "Base": true,
        "Estrangeira": true
    });

    function toggleGroup(group: string) {
        expandedGroups[group] = !expandedGroups[group];
    }

    let groupedCurrencies = $derived.by(() => {
        const groups: Record<string, Currency[]> = {
            "Base": [],
            "Estrangeira": []
        };
        for (const c of filteredItems) {
            if (c.code === 'BRL') {
                groups["Base"].push(c);
            } else {
                groups["Estrangeira"].push(c);
            }
        }
        return groups;
    });

    let formData = $state<Omit<Currency, "id">>({
        code: "",
        symbol: "",
        name: "",
        exchange_rate: 1.0,
    });

    function resetForm() {
        formData = { code: "", symbol: "", name: "", exchange_rate: 1.0 };
        editingId = null;
    }

    function openNew() {
        resetForm();
        isDialogOpen = true;
    }

    function openEdit(currency: Currency) {
        editingId = currency.id;
        formData = { ...$state.snapshot(currency) };
        isDialogOpen = true;
    }

    async function saveCurrency() {
        if (!formData.code || !formData.name) {
            toast.error($t("general.error"));
            return;
        }

        try {
            if (editingId) {
                await currenciesStore.updateCurrency(editingId, formData);
            } else {
                await currenciesStore.addCurrency(formData);
            }
            toast.success($t("general.saveSuccess"));
            isDialogOpen = false;
        } catch (e) {
            toast.error(String(e));
        }
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await currenciesStore.deleteCurrency(deleteId);
            if (!result.success) {
                toast.error(result.error || $t("general.error"));
            } else {
                toast.success($t("general.deleteSuccess"));
            }
            deleteId = null;
        }
    }

    async function handleSync() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const result = await currenciesStore.syncExchangeRates();
            if (result?.success) {
                toast.success(`Sincronizado! ${result.count} moedas atualizadas.`);
            } else {
                toast.error(result?.error || "Erro ao sincronizar moedas.");
            }
        } catch (e) {
            toast.error(String(e));
        } finally {
            isSyncing = false;
        }
    }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <SystemHeader 
        title={$t("settings.currencies.title")}
        description={$t("settings.currencies.description")}
    >
        {#snippet actions()}
            <div class="flex items-center gap-4">
                <div class="relative hidden md:block">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    <input 
                        type="text" 
                        bind:value={searchTerm}
                        placeholder="Buscar moeda..."
                        class="h-10 pl-10 pr-4 bg-muted/10 border border-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest focus:border-primary/30 outline-none w-64 transition-all focus:w-80"
                    />
                </div>

                <div class="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        class="rounded-full px-6 h-10 text-[10px] font-bold uppercase tracking-widest border border-white/5 bg-white/[0.02] hover:bg-white/5"
                        onclick={handleSync}
                        disabled={isSyncing}
                    >
                        <RefreshCw class="w-3 h-3 mr-2 {isSyncing ? 'animate-spin' : ''}" />
                        {isSyncing ? "SINC..." : "SINC. CÂMBIO"}
                    </Button>

                    <Button 
                        onclick={openNew} 
                        class="rounded-full px-8 h-10 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                    >
                        <Plus class="w-4 h-4 mr-2" />
                        {$t("settings.currencies.new")}
                    </Button>
                </div>
            </div>
        {/snippet}
    </SystemHeader>

    <div class="grid gap-10 pt-4">
        {#if filteredItems.length === 0}
            <div class="flex flex-col items-center justify-center p-32 border-2 border-dashed rounded-[3rem] border-white/5 bg-secondary/[0.02] text-muted-foreground animate-in zoom-in-95 duration-1000 shadow-2xl">
                <Coins class="w-20 h-20 opacity-5 animate-pulse mb-8" />
                <span class="text-[10px] font-bold uppercase tracking-[0.5em] opacity-30">{$t("settings.currencies.empty")}</span>
                <Button variant="link" class="mt-6 text-[11px] font-bold uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-colors" onclick={() => searchTerm = ""}>
                    LIMPAR BUSCA
                </Button>
            </div>
        {:else}
            {#each Object.keys(groupedCurrencies) as group}
                {#if groupedCurrencies[group].length > 0}
                    <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <button 
                            type="button" 
                            class="flex items-center gap-3 px-2 group w-full text-left outline-none" 
                            onclick={() => toggleGroup(group)}
                        >
                            <div class={cn(
                                "p-1.5 rounded-md transition-colors",
                                group === "Base" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                            )}>
                                <Coins class="w-3.5 h-3.5" />
                            </div>
                            <h4 class="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                                {group === "Base" ? "Moedas de Base" : "Moedas Estrangeiras"}
                            </h4>
                            <div class="h-[1px] flex-1 bg-white/5 mx-2"></div>
                            {#if expandedGroups[group]}
                                <ChevronDown class="w-4 h-4 text-muted-foreground/40" />
                            {:else}
                                <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
                            {/if}
                        </button>

                        {#if expandedGroups[group]}
                            <div transition:slide={{ duration: 200 }} class="flex flex-col gap-3">
                                {#each groupedCurrencies[group] as currency (currency.id)}
                                    <div
                                        class="group relative bg-card/40 dark:glass border border-white/5 rounded-3xl p-5 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-500 cursor-pointer flex items-center justify-between overflow-hidden shadow-sm hover:shadow-primary/5"
                                        onclick={() => openEdit(currency)}
                                        role="button"
                                        tabindex={0}
                                        onkeydown={(e) => e.key === 'Enter' && openEdit(currency)}
                                    >
                                        <div class="absolute inset-0 bg-gradient-to-br from-primary/0 to-blue-500/0 dark:group-hover:from-primary/[0.03] dark:group-hover:to-blue-500/[0.03] rounded-3xl transition-all duration-700 pointer-events-none"></div>

                                        <div class="relative flex items-center gap-6 shrink-0">
                                            <div class="p-1 bg-muted/20 rounded-xl group-hover:bg-primary/10 transition-colors border border-white/5 w-12 h-12 flex items-center justify-center shadow-sm shrink-0 leading-none">
                                                <span class="text-xl font-black text-primary/40 group-hover:text-primary transition-colors leading-none tracking-tighter">{currency.symbol}</span>
                                            </div>
                                            <div class="flex flex-col gap-0.5 min-w-[160px]">
                                                <div class="flex items-center gap-2">
                                                    <h4 class="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors uppercase">
                                                        {currency.code}
                                                    </h4>
                                                    <Badge variant="outline" class="text-[9px] h-4 font-bold uppercase tracking-tighter rounded-full border-none px-2 bg-white/5 text-muted-foreground/60">
                                                        {currency.code === 'BRL' ? 'SYNC' : 'FOREIGN'}
                                                    </Badge>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                                                        {currency.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="relative flex flex-col items-end gap-0.5 mr-auto ml-12">
                                            <span class="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] leading-none mb-1">
                                                CÂMBIO P/ BRL
                                            </span>
                                            <div class="flex items-center gap-2 tabular-nums font-bold text-xl text-foreground tracking-tighter group-hover:scale-105 transition-transform origin-right duration-500">
                                                <TrendingUp class="w-4 h-4 text-emerald-500/40" />
                                                <span>{currency.exchange_rate.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</span>
                                            </div>
                                        </div>

                                        <div class="relative flex items-center gap-6">
                                            <div class="hidden md:flex flex-col items-end gap-0.5 px-4 h-8 justify-center border-x border-white/5">
                                                <span class="text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">UNIQUE ID</span>
                                                <span class="font-mono text-[9px] text-muted-foreground/60 tracking-tight leading-none uppercase">{currency.id.split(':').at(-1) || currency.id}</span>
                                            </div>

                                            <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    class="h-9 w-9 rounded-full hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/20" 
                                                    onclick={(e) => { e.stopPropagation(); requestDelete(currency.id); }}
                                                >
                                                    <Trash2 class="w-4 h-4" />
                                                </Button>
                                                <div class="p-2 bg-white/10 rounded-full md:flex hidden group-hover:bg-primary/20 transition-colors">
                                                    <Pencil class="w-3.5 h-3.5 text-primary" />
                                                </div>
                                            </div>
                                            <ChevronRight class="w-5 h-5 text-muted-foreground/20 group-hover:text-primary/40 transition-colors hidden md:block" />
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            {/each}
        {/if}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[450px] overflow-visible bg-white dark:bg-[#0a0c10] border-white/5 p-0 rounded-[2.5rem] shadow-2xl">
        <Dialog.Header class="px-8 py-7 border-b border-white/5 bg-white/[0.02] rounded-t-[2.5rem]">
            <Dialog.Title class="text-[13px] font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-lg">
                    <Coins class="w-5 h-5 text-primary" />
                </div>
                {editingId
                    ? $t("settings.currencies.edit")
                    : $t("settings.currencies.new")}
            </Dialog.Title>
            <Dialog.Description class="text-[10px] font-bold uppercase tracking-widest opacity-30 ml-[44px]">
                Defina moedas e suas taxas de conversão básicas para o sistema analítico.
            </Dialog.Description>
        </Dialog.Header>

        <div class="px-8 py-8 space-y-6">
            <div class="grid grid-cols-2 gap-4">
                <SystemInput 
                    label="Código (ISO)"
                    bind:value={formData.code}
                    placeholder="Ex: USD"
                    maxlength={3}
                    class="font-black uppercase tracking-widest text-lg h-12"
                />
                <SystemInput 
                    label="Símbolo"
                    bind:value={formData.symbol}
                    placeholder="Ex: $"
                    class="font-black text-lg h-12"
                />
            </div>

            <SystemInput 
                label="Nome da Moeda"
                bind:value={formData.name}
                placeholder="Ex: Dólar Americano"
                class="font-bold uppercase tracking-widest"
            />

            <div class="space-y-3">
                <div class="flex items-center justify-between px-1">
                    <span class="text-[10px] uppercase font-bold tracking-widest text-white/20">Taxa de Conversão</span>
                    <Badge variant="outline" class="text-[8px] h-4 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-tighter">
                        PROPORÇÃO BRL
                    </Badge>
                </div>
                <div class="relative group">
                    <TrendingUp class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="number"
                        bind:value={formData.exchange_rate}
                        step="0.0001"
                        class="h-12 w-full bg-white/[0.03] border border-white/10 rounded-xl px-12 text-lg font-bold tracking-tight focus:border-primary/40 outline-none transition-all tabular-nums"
                    />
                </div>
                <p class="text-[9px] text-muted-foreground/30 font-bold uppercase tracking-widest px-1">Defina quanto 1 unidade desta moeda vale em reais (BRL).</p>
            </div>
        </div>

        <Dialog.Footer class="px-8 py-6 border-t border-white/5 bg-white/[0.02] rounded-b-[2.5rem] gap-3">
            <Button variant="ghost" onclick={() => (isDialogOpen = false)} class="rounded-full px-6 h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >{$t("general.cancel")}</Button
            >
            <Button onclick={saveCurrency} class="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:scale-105 transition-all shadow-xl shadow-primary/20">
                {$t("settings.currencies.form.save")}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    :global(.custom-scrollbar::-webkit-scrollbar) { width: 6px; }
    :global(.custom-scrollbar::-webkit-scrollbar-track) { background: transparent; }
    :global(.custom-scrollbar::-webkit-scrollbar-thumb) { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
    :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) { background: rgba(255, 255, 255, 0.1); }
</style>
