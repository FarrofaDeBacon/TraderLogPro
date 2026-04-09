<script lang="ts">
    import { assetTypesStore } from "$lib/stores/asset-types.svelte";
    import { assetsStore } from "$lib/stores/assets.svelte";
    import {
        Plus,
        Pencil,
        Trash2,
        Search,
        PieChart,
        CandlestickChart,
        Landmark,
        Bitcoin,
        Globe,
        Layers,
        Activity,
        Building2,
        FileSpreadsheet,
        Link,
        ChevronDown,
        ChevronRight,
        ShieldCheck,
        ShieldAlert
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { SystemHeader, SystemCard } from "$lib/components/ui/system";
    import { Badge } from "$lib/components/ui/badge";
    import { appStore } from "$lib/stores/app.svelte";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { workspaceStore } from "$lib/stores/workspace.svelte";
    import type { Asset } from "$lib/types";
    import { t } from "svelte-i18n";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import RTDImportDialog from "$lib/components/settings/RTDImportDialog.svelte";
    import Skeleton from "$lib/components/ui/skeleton.svelte";
    import { toast } from "svelte-sonner";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { slide } from "svelte/transition";
    import { cn } from "$lib/utils";

    let isDialogOpen = $state(false);
    let isImportOpen = $state(false);
    let editingId = $state<string | null>(null);

    // Accordion state
    let expandedGroups = $state<Record<string, boolean>>({});

    function toggleGroup(group: string) {
        expandedGroups[group] = !expandedGroups[group];
    }

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    let formData = $state<Omit<Asset, "id">>({
        symbol: "",
        name: "",
        asset_type_id: "",
        point_value: 1,
        contract_size: 1,
        default_fee_id: "",
        tax_profile_id: "",
        is_root: false,
        root_id: "none",
    });

    function getAssetTypeStyle(code: string = "") {
        const c = code.toUpperCase();
        if (c.includes("FUT")) return { icon: CandlestickChart, color: "text-blue-500", bg: "bg-blue-500/10" };
        if (c.includes("STK") || c.includes("AÇÃO") || c.includes("ACOES")) return { icon: Landmark, color: "text-green-500", bg: "bg-green-500/10" };
        if (c.includes("CRYPTO") || c.includes("CRIPTO") || c.includes("BTC")) return { icon: Bitcoin, color: "text-amber-500", bg: "bg-amber-500/10" };
        if (c.includes("FOREX") || c.includes("FX")) return { icon: Globe, color: "text-indigo-500", bg: "bg-indigo-500/10" };
        if (c.includes("FII")) return { icon: Building2, color: "text-orange-500", bg: "bg-orange-500/10" };
        return { icon: Layers, color: "text-muted-foreground", bg: "bg-muted" };
    }

    let filteredAssets = $derived(
        [...assetsStore.assets].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );

    let groupedAssets = $derived.by(() => {
        const groups: Record<string, Asset[]> = {};
        for (const type of assetTypesStore.assetTypes) {
            const assetsInType = filteredAssets.filter(a => 
                a.asset_type_id === type.id || a.asset_type_id.replace(/^asset_type:/, "") === type.id.replace(/^asset_type:/, "")
            );
            if (assetsInType.length > 0) groups[type.id] = assetsInType;
        }
        const unknown = filteredAssets.filter(a => !assetTypesStore.assetTypes.find(t => t.id === a.asset_type_id || t.id.replace(/^asset_type:/, "") === a.asset_type_id.replace(/^asset_type:/, "")));
        if (unknown.length > 0) groups["unknown"] = unknown;
        return groups;
    });

    $effect(() => {
        const keys = Object.keys(groupedAssets);
        if (keys.length > 0 && Object.keys(expandedGroups).length === 0) {
            keys.forEach(k => expandedGroups[k] = true);
        }
    });

    function getTypeName(typeId: string) {
        if (typeId === "unknown") return $t("settings.assets.groups.others") || "Outros";
        const type = assetTypesStore.assetTypes.find((t) => t.id === typeId);
        return type ? `${type.code} - ${type.name}` : $t("settings.assets.labels.unknown") || "Desconhecido";
    }

    function openNew() {
        editingId = null;
        formData = {
            symbol: "",
            name: "",
            asset_type_id: "",
            point_value: 1,
            contract_size: 1,
            default_fee_id: "",
            tax_profile_id: "",
            is_root: false,
            root_id: "none",
        };
        isDialogOpen = true;
    }

    function openEdit(item: Asset) {
        editingId = item.id;
        formData = {
            symbol: item.symbol || "",
            name: item.name || "",
            asset_type_id: item.asset_type_id || "",
            point_value: item.point_value ?? 1,
            contract_size: item.contract_size ?? 1,
            default_fee_id: item.default_fee_id || "",
            tax_profile_id: item.tax_profile_id || "",
            is_root: item.is_root || false,
            root_id: item.root_id || "none",
        };
        isDialogOpen = true;
    }

    async function save() {
        if (formData.point_value <= 0) {
            toast.error("O valor do ponto deve ser maior que zero.");
            return;
        }
        const dataToSave = { ...formData, root_id: formData.root_id === "none" ? undefined : formData.root_id } as Omit<Asset, "id">;
        if (editingId) await assetsStore.updateAsset(editingId, dataToSave);
        else await assetsStore.addAsset(dataToSave);
        isDialogOpen = false;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await assetsStore.deleteAsset(deleteId, workspaceStore.strategies);
            if (!result.success) toast.error(result.error || $t("general.error"));
            else toast.success($t("general.deleteSuccess"));
            deleteId = null;
        }
    }

    let rootAssets = $derived(assetsStore.assets.filter((a) => a.is_root && a.id !== editingId));
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <div class="flex items-start justify-between gap-4 mb-2">
        <div class="space-y-1">
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
                {$t("settings.assets.title")}
            </h1>
            <p class="text-sm text-muted-foreground">
                {$t("settings.assets.description")}
            </p>
        </div>
        <div class="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm"
                onclick={() => (isImportOpen = true)}
                class="h-9 px-4 font-bold border-white/10 hover:bg-white/5 transition-all rounded-full flex items-center gap-2"
            >
                <FileSpreadsheet class="w-4 h-4 text-emerald-500" />
                <span class="text-xs uppercase tracking-wider font-bold">Sincronizar RTD</span>
            </Button>
            <Button 
                onclick={openNew} 
                size="sm"
                class="h-9 px-4 font-bold bg-foreground text-background hover:bg-foreground/90 transition-all rounded-full"
            >
                <Plus class="w-4 h-4 mr-2" />
                {$t("settings.assets.new")}
            </Button>
        </div>
    </div>

    <Separator class="bg-white/5" />

    <RTDImportDialog bind:open={isImportOpen} />

    <!-- Asset List Grid -->
    <div class="grid gap-10 pt-8">
        {#if appStore.isLoadingData && Object.keys(groupedAssets).length === 0}
            <Skeleton class="h-10 w-64 rounded-xl bg-white/5" />
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {#each Array(3) as _}
                    <Skeleton class="h-48 rounded-[2.5rem] bg-white/5" />
                {/each}
            </div>
        {:else if Object.keys(groupedAssets).length > 0}
            {#each Object.entries(groupedAssets) as [typeId, assets]}
                {@const typeCode = assetTypesStore.getAssetTypeName(typeId)}
                {@const style = getAssetTypeStyle(typeCode)}
                {@const Icon = style.icon}
                <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button 
                        type="button" 
                        class="flex items-center gap-3 px-2 group w-full text-left outline-none" 
                        onclick={() => toggleGroup(typeId)}
                    >
                        <div class={cn("p-1.5 rounded-md transition-colors group-hover:bg-primary/20", style.bg.replace("bg-muted", "bg-primary/10"))}>
                            <Icon class={cn("w-3.5 h-3.5", style.color.includes("muted") ? "text-primary" : style.color)} />
                        </div>
                        <h4 class="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                            {getTypeName(typeId)}
                        </h4>
                        <div class="h-[1px] flex-1 bg-white/5"></div>
                        {#if expandedGroups[typeId]}
                            <ChevronDown class="w-4 h-4 text-muted-foreground/40" />
                        {:else}
                            <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
                        {/if}
                    </button>

                    {#if expandedGroups[typeId]}
                        <div transition:slide={{ duration: 200 }} class="flex flex-col gap-3">
                            {#each assets as asset}
                                <div 
                                    class="group flex items-center justify-between p-4 rounded-2xl border bg-card/40 border-white/5 hover:border-primary/50 transition-all cursor-pointer shadow-sm"
                                    onclick={() => openEdit(asset)}
                                    role="button"
                                    tabindex="0"
                                    onkeydown={(e) => e.key === 'Enter' && openEdit(asset)}
                                >
                                    <div class="flex items-center gap-4">
                                        <div class="p-2.5 bg-muted/20 rounded-xl group-hover:bg-primary/10 transition-colors border border-white/5">
                                            <PieChart class="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div class="flex flex-col gap-0.5">
                                            <div class="flex items-center gap-2">
                                                <h4 class="font-bold text-base tracking-tight">
                                                    {asset.symbol}
                                                </h4>
                                                <div class="h-4 w-[1px] bg-white/10 mx-1"></div>
                                                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                    {asset.name}
                                                </span>
                                            </div>
                                            <div class="flex items-center gap-4 text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">
                                                <span>PONTO: {asset.point_value}</span>
                                                <span class="opacity-30">•</span>
                                                <span>LOTE: {asset.contract_size}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-destructive hover:text-white" onclick={(e) => { e.stopPropagation(); requestDelete(asset.id); }}>
                                            <Trash2 class="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary" onclick={(e) => { e.stopPropagation(); openEdit(asset); }}>
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
                <Search class="w-20 h-20 opacity-5 animate-pulse mb-8" />
                <span class="text-sm font-black uppercase tracking-[0.5em] opacity-30 italic">Nenhum ativo mapeado</span>
                <Button variant="link" class="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-all" onclick={openNew}>
                    CADASTRAR PRIMEIRO ATIVO
                </Button>
            </div>
        {/if}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[600px] bg-[#0a0c10] border-white/5 rounded-[2rem] p-0 overflow-hidden shadow-2xl">
        <div class="p-8 pb-4">
            <Dialog.Header class="space-y-1">
                <Dialog.Title class="text-xl font-bold text-white">
                    {editingId ? $t("settings.assets.edit") : $t("settings.assets.new")}
                </Dialog.Title>
                <Dialog.Description class="text-xs text-muted-foreground">
                    {$t("settings.assets.description")}
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="px-8 py-2 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <!-- Row 1: Symbol & Name -->
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="symbol" class="text-sm text-white/70">Ticker / Símbolo</Label>
                    <Input id="symbol" bind:value={formData.symbol} placeholder="Ex: PETR4" class="bg-white/[0.03] border-white/10 rounded-xl h-12 uppercase text-white focus:ring-1 focus:ring-white/20" />
                </div>
                <div class="space-y-2">
                    <Label for="name" class="text-sm text-white/70">Nome da Mercadoria</Label>
                    <Input id="name" bind:value={formData.name} placeholder="Ex: Petróleo Brasileiro" class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white focus:ring-1 focus:ring-white/20" />
                </div>
            </div>

            <!-- Multipliers -->
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="point" class="text-sm text-white/70">Valor do Ponto</Label>
                    <Input id="point" type="number" step="0.0001" bind:value={formData.point_value} placeholder="1.00" class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white" />
                </div>
                <div class="space-y-2">
                    <Label for="lot" class="text-sm text-white/70">Tamanho do Lote</Label>
                    <Input id="lot" type="number" step="0.01" bind:value={formData.contract_size} placeholder="1.00" class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white" />
                </div>
            </div>

            <!-- Heirarchy -->
            <div class="space-y-4">
                <div class="flex items-center space-x-2 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <Checkbox id="is_root" bind:checked={formData.is_root} onCheckedChange={(v) => { if (v) formData.root_id = "none"; }} class="border-white/20" />
                    <Label for="is_root" class="text-sm text-white/70 font-medium cursor-pointer">Definir como Ativo Raiz</Label>
                </div>

                <div class={cn("space-y-2", formData.is_root && "opacity-30 pointer-events-none")}>
                    <Label class="text-sm text-white/70">Vincular a Ativo Raiz</Label>
                    <Select.Root type="single" value={formData.root_id} onValueChange={(v) => (formData.root_id = v)}>
                        <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                            {rootAssets.find(a => a.id === formData.root_id)?.symbol || (formData.root_id === "none" ? "Nenhum" : "Selecione...")}
                        </Select.Trigger>
                        <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                            <Select.Item value="none">Nenhum</Select.Item>
                            {#each rootAssets as root}
                                <Select.Item value={root.id}>{root.symbol}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            <!-- Asset Type & Profiles -->
            <div class="space-y-4 pb-4">
                <div class="space-y-2">
                    <Label class="text-sm text-white/70">Classe de Ativo</Label>
                    <Select.Root type="single" bind:value={formData.asset_type_id}>
                        <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                            {assetTypesStore.getAssetTypeName(formData.asset_type_id) || "Selecione a Classe"}
                        </Select.Trigger>
                        <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                            {#each assetTypesStore.assetTypes as t}
                                <Select.Item value={t.id}>{t.code} - {t.name}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label class="text-sm text-white/70">Perfil de Corretagem</Label>
                        <Select.Root type="single" bind:value={formData.default_fee_id}>
                            <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                                {financialConfigStore.fees.find((f) => f.id === formData.default_fee_id)?.name || "Herdar da Classe"}
                            </Select.Trigger>
                            <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                                <Select.Item value="">Herdar Padrão</Select.Item>
                                {#each financialConfigStore.fees as f}
                                    <Select.Item value={f.id}>{f.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm text-white/70">Perfil Fiscal</Label>
                        <Select.Root type="single" bind:value={formData.tax_profile_id}>
                            <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                                {financialConfigStore.taxProfiles.find((p) => p.id === formData.tax_profile_id)?.name || "Herdar da Classe"}
                            </Select.Trigger>
                            <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                                <Select.Item value="">Herdar Padrão</Select.Item>
                                {#each financialConfigStore.taxProfiles as p}
                                    <Select.Item value={p.id}>{p.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
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
