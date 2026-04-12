<script lang="ts">
    import { sectorsStore } from "$lib/stores/sectors.svelte";
    import {
        Plus,
        Pencil,
        Trash2,
        Layers,
        Building2,
        ChevronRight,
        X,
        Search,
    } from "lucide-svelte";
    import { slide } from "svelte/transition";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { t } from "svelte-i18n";
    import { SystemHeader, SystemInput, SystemSelect } from "$lib/components/ui/system";
    import { toast } from "svelte-sonner";
    import type { Sector } from "$lib/types";
    import { marketsStore } from "$lib/stores/markets.svelte";
    import { Globe } from "lucide-svelte";

    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";

    let isDialogOpen = $state(false);
    let editingId = $state<string | null>(null);
    let searchTerm = $state("");

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);
    let isProcessing = $state(false);

    let filteredItems = $derived(
        sectorsStore.sectors
            .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
    );

    let formData = $state<Omit<Sector, "id">>({
        name: "",
        market_id: ""
    });

    function resetForm() {
        formData = {
            name: "",
            market_id: ""
        };
        editingId = null;
    }

    function openNew() {
        resetForm();
        isDialogOpen = true;
    }

    function openEdit(sector: Sector) {
        editingId = sector.id;
        formData = { 
            name: sector.name,
            market_id: sector.market_id || ""
        };
        isDialogOpen = true;
    }

    async function saveSector() {
        if (!formData.name.trim()) {
            toast.error($t("general.error"));
            return;
        }
        
        if (isProcessing) return;
        isProcessing = true;
        
        try {
            await sectorsStore.saveSector({
                id: editingId || undefined,
                ...$state.snapshot(formData)
            });
            toast.success($t("general.saveSuccess"));
            isDialogOpen = false;
        } catch (e) {
            toast.error(String(e));
        } finally {
            isProcessing = false;
        }
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId && !isProcessing) {
            isProcessing = true;
            try {
                await sectorsStore.deleteSector(deleteId);
                toast.success($t("general.deleteSuccess"));
                isDeleteOpen = false;
                deleteId = null;
            } catch (e) {
                toast.error(String(e));
            } finally {
                isProcessing = false;
            }
        }
    }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <SystemHeader 
        title={$t("settings.sectors.title")}
        description={$t("settings.sectors.description")}
    >
        {#snippet actions()}
            <div class="flex items-center gap-4">
                <div class="relative hidden md:block">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    <input 
                        type="text" 
                        bind:value={searchTerm}
                        placeholder={$t("settings.sectors.searchPlaceholder")}
                        class="h-10 pl-10 pr-4 bg-muted/10 border border-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest focus:border-primary/30 outline-none w-64 transition-all focus:w-80"
                    />
                </div>
                <Button 
                    onclick={openNew} 
                    class="rounded-full px-8 h-10 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                    <Plus class="w-4 h-4 mr-2" />
                    {$t("settings.sectors.new")}
                </Button>
            </div>
        {/snippet}
    </SystemHeader>

    <div class="grid gap-4 pt-4">
        {#if filteredItems.length === 0}
            <div class="flex flex-col items-center justify-center p-32 border-2 border-dashed rounded-[3rem] border-white/5 bg-secondary/[0.02] text-muted-foreground animate-in zoom-in-95 duration-1000 shadow-2xl">
                <Layers class="w-20 h-20 opacity-5 animate-pulse mb-8" />
                <span class="text-[10px] font-bold uppercase tracking-[0.5em] opacity-30">{$t("settings.sectors.empty")}</span>
                <Button variant="link" class="mt-6 text-[11px] font-bold uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-colors" onclick={openNew}>
                    {searchTerm ? "LIMPAR BUSCA" : "CADASTRAR PRIMEIRO SETOR"}
                </Button>
            </div>
        {:else}
            <div class="flex flex-col gap-3">
                {#each filteredItems as sector (sector.id)}
                    <div 
                        class="group relative bg-card/40 dark:glass border border-white/5 rounded-3xl p-5 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-500 cursor-pointer flex items-center justify-between overflow-hidden shadow-sm hover:shadow-primary/5"
                        onclick={() => openEdit(sector)}
                        role="button"
                        tabindex={0}
                        onkeydown={(e) => e.key === 'Enter' && openEdit(sector)}
                    >
                        <!-- Card Background Glow -->
                        <div class="absolute inset-0 bg-gradient-to-br from-primary/0 to-blue-500/0 dark:group-hover:from-primary/[0.03] dark:group-hover:to-blue-500/[0.03] rounded-3xl transition-all duration-700 pointer-events-none"></div>

                        <div class="relative flex items-center gap-6">
                            <div class="p-1 bg-muted/20 rounded-xl group-hover:bg-primary/10 transition-colors border border-white/5 w-12 h-12 flex items-center justify-center shadow-sm shrink-0 leading-none">
                                <Building2 class="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
                            </div>
                            <div class="flex flex-col gap-0.5">
                                <div class="flex items-center gap-2">
                                    <h4 class="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors uppercase">
                                        {sector.name}
                                    </h4>
                                    {#if sector.market_id}
                                        <span class="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-wider">
                                            {marketsStore.markets.find(m => m.id === sector.market_id)?.code || '---'}
                                        </span>
                                    {/if}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                                        ID REGISTRO:
                                    </span>
                                    <span class="font-mono text-[10px] text-muted-foreground/60 tracking-tight">
                                        {sector.id.split(':').at(-1)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="relative flex items-center gap-6">
                            <!-- Actions Overlay -->
                            <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    class="h-9 w-9 rounded-full hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/20" 
                                    onclick={(e) => { e.stopPropagation(); requestDelete(sector.id); }}
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
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[450px] overflow-visible glass border-white/10 p-0 rounded-[2.5rem]">
        <Dialog.Header class="px-8 py-6 border-b border-white/5 bg-white/[0.02] rounded-t-[2.5rem]">
            <Dialog.Title class="text-[13px] font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-lg">
                    <Building2 class="w-5 h-5 text-primary" />
                </div>
                {editingId
                    ? $t("settings.sectors.edit")
                    : $t("settings.sectors.new")}
            </Dialog.Title>
            <Dialog.Description class="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-[44px]">
                {$t("settings.sectors.description")}
            </Dialog.Description>
        </Dialog.Header>

        <div class="px-8 py-8 space-y-6">
            <SystemInput 
                label={$t("settings.sectors.form.name") + "*"}
                bind:value={formData.name}
                placeholder={$t("settings.sectors.form.namePlaceholder")}
                class="font-bold uppercase tracking-widest text-lg h-12"
            />

            <SystemSelect 
                label={$t("settings.assets.form.market") || "Mercado"}
                bind:value={formData.market_id}
                options={[
                    { value: "", label: "Global / Nenhum" },
                    ...marketsStore.markets.map(m => ({ value: m.id, label: `${m.code} - ${m.name}` }))
                ]}
                placeholder="Selecione o Mercado"
            >
                {#snippet icon()}
                    <Globe class="w-4 h-4 text-primary" />
                {/snippet}
            </SystemSelect>
        </div>

        <Dialog.Footer class="px-8 py-6 border-t border-white/5 bg-white/[0.02] rounded-b-[2.5rem] gap-3">
            <Button variant="ghost" onclick={() => (isDialogOpen = false)} class="rounded-full px-6 h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >{$t("general.cancel")}</Button
            >
            <Button onclick={saveSector} disabled={isProcessing} class="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:scale-105 transition-all shadow-xl shadow-primary/20">
                {#if isProcessing}
                    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                {/if}
                {$t("settings.sectors.form.save")}
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
