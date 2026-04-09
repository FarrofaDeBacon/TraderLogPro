<script lang="ts">
    import { assetTypesStore } from "$lib/stores/asset-types.svelte";
    import {
        Plus,
        Pencil,
        Trash2,
        ShieldCheck,
        Layers,
        Activity,
        Globe,
        Building2,
        CandlestickChart,
        Landmark,
        Bitcoin,
        ChevronDown,
        ChevronRight
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { SystemHeader, SystemCard } from "$lib/components/ui/system";
    import { appStore } from "$lib/stores/app.svelte";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import type { AssetType } from "$lib/types";
    import { t } from "svelte-i18n";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import Skeleton from "$lib/components/ui/skeleton.svelte";
    import { slide } from "svelte/transition";
    import { cn } from "$lib/utils";
    import { toast } from "svelte-sonner";

    let isDialogOpen = $state(false);
    let editingId = $state<string | null>(null);

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    let expandedGroups = $state<Record<string, boolean>>({});
    function toggleGroup(group: string) {
        expandedGroups[group] = !expandedGroups[group];
    }

    let formData = $state<Omit<AssetType, "id">>({
        code: "",
        name: "",
        market_id: "",
        default_fee_id: "",
        tax_profile_id: "",
        unit_label: "",
        result_type: "currency",
    });

    function getIconForType(code: string = "") {
        const c = code.toUpperCase();
        if (c.includes("FUT")) return CandlestickChart;
        if (c.includes("STK") || c.includes("AÇÃO") || c.includes("ACOES")) return Landmark;
        if (c.includes("CRYPTO") || c.includes("CRIPTO") || c.includes("BTC")) return Bitcoin;
        if (c.includes("FOREX") || c.includes("FX")) return Globe;
        if (c.includes("FII")) return Building2;
        return Layers;
    }

    function openNew() {
        editingId = null;
        formData = {
            code: "",
            name: "",
            market_id: "",
            default_fee_id: "",
            tax_profile_id: "",
            unit_label: "",
            result_type: "currency",
        };
        isDialogOpen = true;
    }

    function openEdit(item: AssetType) {
        editingId = item.id;
        formData = {
            code: item.code || "",
            name: item.name || "",
            market_id: item.market_id || "",
            default_fee_id: item.default_fee_id || "",
            tax_profile_id: item.tax_profile_id || "",
            unit_label: item.unit_label || "",
            result_type: item.result_type || "currency",
        };
        isDialogOpen = true;
    }

    async function save() {
        if (editingId) {
            await assetTypesStore.updateAssetType(editingId, $state.snapshot(formData));
        } else {
            await assetTypesStore.addAssetType($state.snapshot(formData));
        }
        isDialogOpen = false;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            await assetTypesStore.deleteAssetType(deleteId);
            toast.success($t("general.deleteSuccess"));
            deleteId = null;
        }
    }

    let assetTypes = $derived(assetTypesStore.assetTypes);
    let groupedTypes = $derived(
        assetTypes.reduce((acc, type) => {
            const marketName = marketsStore.getMarketName(type.market_id);
            if (!acc[marketName]) acc[marketName] = [];
            acc[marketName].push(type);
            return acc;
        }, {} as Record<string, AssetType[]>)
    );

    import { marketsStore } from "$lib/stores/markets.svelte";
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <div class="flex items-start justify-between gap-4 mb-2">
        <div class="space-y-1">
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
                {$t("settings.assetTypes.title")}
            </h1>
            <p class="text-sm text-muted-foreground">
                {$t("settings.assetTypes.description")}
            </p>
        </div>
        <Button 
            onclick={openNew} 
            size="sm"
            class="h-9 px-4 font-bold bg-foreground text-background hover:bg-foreground/90 transition-all rounded-full"
        >
            <Plus class="w-4 h-4 mr-2" />
            {$t("settings.assetTypes.new")}
        </Button>
    </div>

    <Separator class="bg-white/5" />

    <!-- Asset Types Grouped -->
    <div class="grid gap-10 pt-8">
        {#if appStore.isLoadingData && Object.keys(groupedTypes).length === 0}
            <div class="space-y-6">
                <Skeleton class="h-10 w-64 rounded-xl bg-white/5" />
                <div class="flex flex-col gap-3">
                    {#each Array(3) as _}
                        <Skeleton class="h-20 rounded-2xl bg-white/5" />
                    {/each}
                </div>
            </div>
        {:else if Object.keys(groupedTypes).length > 0}
            {#each Object.entries(groupedTypes) as [marketName, items]}
                <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <!-- Section Header (Accordion Trigger) -->
                    <button 
                        type="button" 
                        class="flex items-center gap-3 px-2 group w-full text-left outline-none" 
                        onclick={() => toggleGroup(marketName)}
                    >
                        <div class="p-1.5 rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
                            <Globe class="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h4 class="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                            {marketName}
                        </h4>
                        <div class="h-[1px] flex-1 bg-white/5"></div>
                        {#if expandedGroups[marketName]}
                            <ChevronDown class="w-4 h-4 text-muted-foreground/40" />
                        {:else}
                            <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
                        {/if}
                    </button>

                    {#if expandedGroups[marketName]}
                        <div transition:slide={{ duration: 200 }} class="flex flex-col gap-3">
                            {#each items as type}
                                {@const Icon = getIconForType(type.code)}
                                <div 
                                    class="group flex items-center justify-between p-4 rounded-2xl border bg-card/40 border-white/5 hover:border-primary/50 transition-all cursor-pointer shadow-sm"
                                    onclick={() => openEdit(type)}
                                    role="button"
                                    tabindex="0"
                                    onkeydown={(e) => e.key === 'Enter' && openEdit(type)}
                                >
                                    <div class="flex items-center gap-4">
                                        <div class="p-2.5 bg-muted/20 rounded-xl group-hover:bg-primary/10 transition-colors border border-white/5">
                                            <Icon class="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div class="flex flex-col gap-0.5">
                                            <div class="flex items-center gap-2">
                                                <h4 class="font-bold text-base tracking-tight">
                                                    {type.code}
                                                </h4>
                                                <div class="h-4 w-[1px] bg-white/10 mx-1"></div>
                                                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                    {type.name}
                                                </span>
                                            </div>
                                            <div class="flex items-center gap-4 text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">
                                                <span>
                                                    {financialConfigStore.fees.find(f => f.id === type.default_fee_id)?.name || 'FEES: ISENTO/CUSTOM'}
                                                </span>
                                                <span class="opacity-30">•</span>
                                                <span>
                                                    {financialConfigStore.taxProfiles.find(p => p.id === type.tax_profile_id)?.name || 'TAX: PADRÃO BR'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-destructive hover:text-white" onclick={(e) => { e.stopPropagation(); requestDelete(type.id); }}>
                                            <Trash2 class="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary" onclick={(e) => { e.stopPropagation(); openEdit(type); }}>
                                            <Pencil class="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        {:else}
            <div class="flex flex-col items-center justify-center p-32 border-2 border-dashed rounded-[3rem] border-white/5 bg-secondary/[0.02] text-muted-foreground animate-in zoom-in-95 duration-1000 shadow-2xl">
                <Layers class="w-20 h-20 opacity-5 animate-pulse mb-8" />
                <span class="text-sm font-bold uppercase tracking-[0.5em] opacity-30">{$t("settings.assetTypes.empty")}</span>
                <Button variant="link" class="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-colors" onclick={openNew}>
                    DEFINIR CLASSE ESTRUTURAL
                </Button>
            </div>
        {/if}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px] bg-[#0a0c10] border-white/5 rounded-[2rem] p-0 overflow-hidden shadow-2xl">
        <div class="p-8 pb-4">
            <Dialog.Header class="space-y-1">
                <Dialog.Title class="text-xl font-bold text-white">
                    {editingId ? "Editar Classe de Ativo" : "Nova Classe de Ativo"}
                </Dialog.Title>
                <Dialog.Description class="text-xs text-muted-foreground">
                    {$t("settings.assetTypes.description")}
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="px-8 py-2 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="code" class="text-sm text-white/70">Código da Classe</Label>
                    <Input id="code" bind:value={formData.code} placeholder="Ex: STK" class="bg-white/[0.03] border-white/10 rounded-xl h-12 uppercase text-white focus:ring-1 focus:ring-white/20" />
                </div>
                <div class="space-y-2">
                    <Label for="name" class="text-sm text-white/70">Nome Descritivo</Label>
                    <Input id="name" bind:value={formData.name} placeholder="Ex: Ações Brasileiras" class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white focus:ring-1 focus:ring-white/20" />
                </div>
            </div>

            <div class="space-y-2">
                <Label for="market" class="text-sm text-white/70">Mercado de Atuação</Label>
                <Select.Root type="single" bind:value={formData.market_id}>
                    <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                        {marketsStore.markets.find(m => m.id === formData.market_id)?.name || "Selecione o Mercado"}
                    </Select.Trigger>
                    <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                        {#each marketsStore.markets as m}
                            <Select.Item value={m.id}>{m.name} ({m.code})</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="fees" class="text-sm text-white/70">Perfil de Taxas</Label>
                    <Select.Root type="single" bind:value={formData.default_fee_id}>
                        <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                            {financialConfigStore.fees.find(f => f.id === formData.default_fee_id)?.name || "Selecione"}
                        </Select.Trigger>
                        <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                            {#each financialConfigStore.fees as f}
                                <Select.Item value={f.id}>{f.name}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
                <div class="space-y-2">
                    <Label for="tax" class="text-sm text-white/70">Perfil Fiscal</Label>
                    <Select.Root type="single" bind:value={formData.tax_profile_id}>
                        <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                            {financialConfigStore.taxProfiles.find(p => p.id === formData.tax_profile_id)?.name || "Selecione"}
                        </Select.Trigger>
                        <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                            {#each financialConfigStore.taxProfiles as p}
                                <Select.Item value={p.id}>{p.name}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 pb-4">
                <div class="space-y-2">
                    <Label for="unit" class="text-sm text-white/70">Unidade (Tag)</Label>
                    <Input id="unit" bind:value={formData.unit_label} placeholder="Ex: un, lot" class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white" />
                </div>
                <div class="space-y-2">
                    <Label for="result" class="text-sm text-white/70">Cálculo de Resultado</Label>
                    <Select.Root type="single" bind:value={formData.result_type}>
                        <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                            {formData.result_type === "currency" ? "Monetário" : "Pontos"}
                        </Select.Trigger>
                        <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                            <Select.Item value="currency">Monetário</Select.Item>
                            <Select.Item value="points">Pontos</Select.Item>
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>
        </div>

        <Dialog.Footer class="p-8 bg-black/20 border-t border-white/5">
            <div class="flex items-center justify-end gap-3 w-full">
                <Button variant="ghost" onclick={() => isDialogOpen = false} class="text-white/40 hover:text-white hover:bg-transparent">
                    {$t("general.cancel")}
                </Button>
                <Button onclick={save} class="rounded-full bg-white text-black hover:bg-neutral-200 px-8 font-bold">
                    {$t("general.save")}
                </Button>
            </div>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; border: 2px solid transparent; background-clip: padding-box; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); border: 2px solid transparent; background-clip: padding-box; }
</style>
