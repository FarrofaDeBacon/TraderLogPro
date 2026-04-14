<script lang="ts">
    import { assetTypesStore } from "$lib/stores/asset-types.svelte";
    import { assetsStore } from "$lib/stores/assets.svelte";
    import { sectorsStore } from "$lib/stores/sectors.svelte";
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
        ShieldAlert,
        Factory,
        LineChart,
        Cpu,
        ShoppingCart,
        Shovel,
        HeartPulse,
        Droplets,
        Zap,
        Wallet,
        Palette,
        Smile
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
    import { cn, normalizeAssetTypeId, compareAssetTypeIds } from "$lib/utils";

    let isDialogOpen = $state(false);
    let isImportOpen = $state(false);
    let editingId = $state<string | null>(null);

    // Accordion state
    let expandedTypes = $state<Record<string, boolean>>({});
    let expandedSectors = $state<Record<string, boolean>>({});

    function toggleType(typeId: string) {
        expandedTypes[typeId] = !expandedTypes[typeId];
    }

    function toggleSector(typeId: string, sectorId: string) {
        const key = `${typeId}::${sectorId}`;
        expandedSectors[key] = !expandedSectors[key];
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
        sector_id: "",
        subsector_id: "",
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
        const groups: Record<string, { 
            name: string, 
            icon: any, 
            color: string, 
            sectors: Record<string, { 
                name: string, 
                icon: any, 
                color: string, 
                subsectors: Record<string, { name: string, assets: Asset[] }> 
            }> 
        }> = {};
        
        const allAssets = [...assetsStore.assets].sort((a, b) => a.symbol.localeCompare(b.symbol));

        for (const asset of allAssets) {
            // Level 1: Asset Type
            const typeId = asset.asset_type_id || "unclassified";
            const type = assetTypesStore.assetTypes.find(t => t.id === typeId);
            const style = getAssetTypeStyle(type?.code || "");
            
            if (!groups[typeId]) {
                groups[typeId] = {
                    name: type?.name || (typeId === "unclassified" ? "Sem Classe" : "Tipo Desconhecido"),
                    icon: style.icon,
                    color: style.color.replace('text-', ''),
                    sectors: {}
                };
            }
            
            // Level 2: Sector
            const sectorId = asset.sector_id || "unclassified";
            const sector = sectorsStore.sectors.find(s => s.id === sectorId);
            
            if (!groups[typeId].sectors[sectorId]) {
                groups[typeId].sectors[sectorId] = {
                    name: sector?.name || (sectorId === "unclassified" ? "Geral / Sem Setor" : "Setor Desconhecido"),
                    icon: sectorsStore.getSectorIcon(sectorId),
                    color: sectorsStore.getSectorColor(sectorId),
                    subsectors: {}
                };
            }

            // Level 3: Subsector
            const subId = asset.subsector_id || "none";
            const sub = sectorsStore.subsectors.find(s => s.id === subId);

            if (!groups[typeId].sectors[sectorId].subsectors[subId]) {
                groups[typeId].sectors[sectorId].subsectors[subId] = {
                    name: sub?.name || (subId === "none" ? "Geral" : "Subsetor Desconhecido"),
                    assets: []
                };
            }
            
            groups[typeId].sectors[sectorId].subsectors[subId].assets.push(asset);
        }
        
        return groups;
    });

    $effect(() => {
        const keys = Object.keys(groupedAssets);
        if (keys.length > 0 && Object.keys(expandedTypes).length === 0) {
            keys.forEach(k => expandedTypes[k] = true);
            
            // Auto expand sectors too for first load
            keys.forEach(typeKey => {
                Object.keys(groupedAssets[typeKey].sectors).forEach(secKey => {
                    expandedSectors[`${typeKey}::${secKey}`] = true;
                });
            });
        }
    });

    function getSectorHeaderStyle(color: string) {
        if (color === 'emerald') return "text-emerald-500 bg-emerald-500/10";
        if (color === 'rose') return "text-rose-500 bg-rose-500/10";
        if (color === 'sky') return "text-sky-500 bg-sky-500/10";
        if (color === 'amber') return "text-amber-500 bg-amber-500/10";
        if (color === 'indigo') return "text-indigo-500 bg-indigo-500/10";
        if (color === 'slate') return "text-slate-500 bg-slate-500/10";
        return "text-muted-foreground bg-muted/20";
    }

    // Derived values for inheritance and sectors
    let selectedAssetType = $derived(
        assetTypesStore.assetTypes.find(t => t.id === formData.asset_type_id)
    );

    let inheritedTaxProfileId = $derived(selectedAssetType?.tax_profile_id || "");
    let inheritedFeeProfileId = $derived(selectedAssetType?.default_fee_id || "");

    let availableSubsectors = $derived(
        formData.sector_id ? sectorsStore.getSubsectorsBySector(formData.sector_id) : []
    );

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
            sector_id: "",
            subsector_id: "",
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
            sector_id: item.sector_id || "",
            subsector_id: item.subsector_id || "",
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

    <div class="grid gap-6 pt-8">
        {#if appStore.isLoadingData && Object.keys(groupedAssets).length === 0}
            <Skeleton class="h-10 w-64 rounded-xl bg-white/5" />
            <div class="space-y-4">
                {#each Array(3) as _}
                    <Skeleton class="h-16 rounded-3xl bg-white/5" />
                {/each}
            </div>
        {:else if Object.keys(groupedAssets).length > 0}
            {#each Object.entries(groupedAssets) as [typeId, typeGroup]}
                <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <!-- Level 1: Asset Type Accordion -->
                    <button 
                        type="button" 
                        class="flex items-center gap-5 px-6 py-5 group w-full text-left outline-none bg-white/[0.02] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.04] transition-all" 
                        onclick={() => toggleType(typeId)}
                    >
                        <div class={cn("p-3 rounded-2xl border border-white/10 transition-all group-hover:scale-110", getAssetTypeStyle(assetTypesStore.assetTypes.find(t => t.id === typeId)?.code).bg)}>
                           <svelte:component this={typeGroup.icon} class={cn("w-6 h-6", getAssetTypeStyle(assetTypesStore.assetTypes.find(t => t.id === typeId)?.code).color)} />
                        </div>
                        <div class="flex flex-col">
                            <h4 class="text-sm font-black uppercase tracking-[0.35em] text-foreground leading-none">
                                {typeGroup.name}
                            </h4>
                            <span class="text-[9px] font-bold text-muted-foreground/30 mt-2 uppercase tracking-[0.2em]">
                                {Object.values(typeGroup.sectors).reduce((acc, s) => acc + Object.values(s.subsectors).reduce((a, sub) => a + sub.assets.length, 0), 0)} Ativos em {Object.keys(typeGroup.sectors).length} Setores
                            </span>
                        </div>
                        <div class="h-[1px] flex-1 bg-white/5 mx-6"></div>
                        <div class={cn("transition-transform duration-300", expandedTypes[typeId] ? "rotate-180" : "")}>
                            <ChevronDown class="w-5 h-5 text-muted-foreground/20" />
                        </div>
                    </button>

                    {#if expandedTypes[typeId]}
                        <div transition:slide={{ duration: 400 }} class="pl-8 pr-4 space-y-4 pb-4">
                            {#each Object.entries(typeGroup.sectors) as [sectorId, sector]}
                                {@const sectorKey = `${typeId}::${sectorId}`}
                                <div class="space-y-3">
                                    <!-- Level 2: Sector Accordion -->
                                    <button 
                                        type="button" 
                                        class="flex items-center gap-4 px-5 py-3 group/sector w-full text-left outline-none bg-white/[0.01] border border-white/5 rounded-[2rem] hover:bg-white/[0.02] transition-all" 
                                        onclick={() => toggleSector(typeId, sectorId)}
                                    >
                                        {#if sector.icon === 'Building2'}<Building2 class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'Factory'}<Factory class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'LineChart'}<LineChart class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'Cpu'}<Cpu class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'ShoppingCart'}<ShoppingCart class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'Shovel'}<Shovel class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'HeartPulse'}<HeartPulse class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'Droplets'}<Droplets class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'Zap'}<Zap class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'Wallet'}<Wallet class="w-4 h-4 text-muted-foreground/40" />
                                        {:else if sector.icon === 'Landmark'}<Landmark class="w-4 h-4 text-muted-foreground/40" />
                                        {:else}<Building2 class="w-4 h-4 text-muted-foreground/40" />{/if}
                                        
                                        <span class="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/70">{sector.name}</span>
                                        <div class="h-[1px] flex-1 bg-white/5 opacity-50 mx-2"></div>
                                        <div class={cn("transition-transform duration-300", expandedSectors[sectorKey] ? "rotate-90" : "")}>
                                            <ChevronRight class="w-4 h-4 text-muted-foreground/20" />
                                        </div>
                                    </button>

                                    {#if expandedSectors[sectorKey]}
                                        <div transition:slide={{ duration: 300 }} class="pl-6 space-y-6 pt-2 pb-4">
                                            {#each Object.entries(sector.subsectors) as [subId, subGroup]}
                                                <div class="space-y-3">
                                                    <!-- Level 3: Subsector Header -->
                                                    <div class="flex items-center gap-3 px-2">
                                                        <div class="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                                                        <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{subGroup.name}</span>
                                                        <div class="h-[1px] flex-1 bg-white/5"></div>
                                                        <span class="text-[8px] font-bold text-muted-foreground/20">{subGroup.assets.length} ATIVOS</span>
                                                    </div>

                                                    <!-- Level 4: Asset List Rows -->
                                                    <div class="space-y-2">
                                                        {#each subGroup.assets as asset}
                                                            <div 
                                                                class="group relative flex items-center justify-between p-3.5 px-6 rounded-2xl border bg-white/[0.01] border-white/5 hover:border-primary/40 hover:bg-white/[0.03] transition-all cursor-pointer shadow-sm"
                                                                onclick={() => openEdit(asset)}
                                                                role="button"
                                                                tabindex="0"
                                                                onkeydown={(e) => e.key === 'Enter' && openEdit(asset)}
                                                            >
                                                                <div class="flex items-center gap-6">
                                                                    <!-- Symbol Box -->
                                                                    <div class="w-28 py-1.5 px-3 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-primary/20 transition-all">
                                                                        <span class="font-black text-xs tracking-widest text-foreground group-hover:text-primary transition-colors">
                                                                            {asset.symbol}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <!-- Name Info -->
                                                                    <div class="flex flex-col min-w-[180px]">
                                                                        <span class="text-[9px] font-black text-foreground/80 uppercase tracking-widest leading-none">
                                                                            {asset.name}
                                                                        </span>
                                                                        <div class="flex items-center gap-3 mt-1.5 opacity-40">
                                                                            <div class="flex items-center gap-1">
                                                                                <span class="text-[7px] font-bold uppercase tracking-tighter">PT:</span>
                                                                                <span class="text-[8px] font-black uppercase">{asset.point_value}</span>
                                                                            </div>
                                                                            <div class="w-1 h-1 rounded-full bg-white/20"></div>
                                                                            <div class="flex items-center gap-1">
                                                                                <span class="text-[7px] font-bold uppercase tracking-tighter">LT:</span>
                                                                                <span class="text-[8px] font-black uppercase">{asset.contract_size}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <!-- Trailing Actions (Standardized) -->
                                                                <div class="flex items-center gap-3">
                                                                    <div class="hidden lg:flex items-center gap-4 mr-4 px-4 border-r border-white/5">
                                                                        <div class="flex flex-col items-end">
                                                                            <span class="text-[7px] font-bold text-muted-foreground/20 uppercase tracking-[0.1em]">CUSTOS</span>
                                                                            <Badge variant="outline" class="text-[7px] font-black bg-blue-500/10 border-blue-500/20 text-blue-500 py-0 h-3.5 px-1.5 uppercase">
                                                                                {asset.default_fee_id ? 'OVERRIDE' : 'HERDADO'}
                                                                            </Badge>
                                                                        </div>
                                                                        <div class="flex flex-col items-end">
                                                                            <span class="text-[7px] font-bold text-muted-foreground/20 uppercase tracking-[0.1em]">FISCAL</span>
                                                                            <Badge variant="outline" class="text-[7px] font-black bg-emerald-500/10 border-emerald-500/20 text-emerald-500 py-0 h-3.5 px-1.5 uppercase">
                                                                                {asset.tax_profile_id ? 'OVERRIDE' : 'HERDADO'}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>

                                                                    <div class="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-x-2 md:group-hover:translate-x-0">
                                                                        <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full hover:bg-rose-500/10 hover:text-rose-500" onclick={(e) => { e.stopPropagation(); requestDelete(asset.id); }}>
                                                                            <Trash2 class="w-3.5 h-3.5" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary" onclick={(e) => { e.stopPropagation(); openEdit(asset); }}>
                                                                            <Pencil class="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        {:else}
            <!-- Empty State -->
            <div class="flex flex-col items-center justify-center py-20 px-8 rounded-[3rem] border border-dashed border-white/5 bg-white/[0.01]">
                <div class="p-6 rounded-full bg-white/5 mb-6">
                    <Activity class="w-12 h-12 text-muted-foreground/20" />
                </div>
                <h3 class="text-lg font-black uppercase tracking-[0.4em] text-foreground/40 text-center">Nenhum Ativo Mapeado</h3>
                <p class="text-xs text-muted-foreground/30 mt-4 text-center max-w-sm uppercase tracking-widest font-bold">
                    Use o botão superior para cadastrar seu primeiro ativo ou sincronize via RTD.
                </p>
                <Button variant="link" class="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-all" onclick={openNew}>
                    CADASTRAR PRIMEIRO ATIVO
                </Button>
            </div>
        {/if}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[600px] bg-white dark:bg-[#0a0c10] border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div class="px-8 py-6 bg-white/[0.02] border-b border-white/5">
            <Dialog.Header class="space-y-1">
                <Dialog.Title class="text-[13px] font-extrabold uppercase tracking-[0.3em] flex items-center gap-3 text-foreground">
                    <div class="p-2 bg-primary/10 rounded-lg">
                        <CandlestickChart class="w-5 h-5 text-primary" />
                    </div>
                    {editingId ? $t("settings.assets.edit") : $t("settings.assets.new")}
                </Dialog.Title>
                <Dialog.Description class="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-[44px]">
                    {$t("settings.assets.description")}
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="px-8 py-2 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar mt-6">
            <!-- Row 1: Symbol & Name -->
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="symbol" class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">Ticker / Símbolo</Label>
                    <Input id="symbol" bind:value={formData.symbol} placeholder="Ex: PETR4" class="bg-muted/10 border-white/10 rounded-xl h-12 uppercase text-foreground font-bold focus:ring-1 focus:ring-primary/20" />
                </div>
                <div class="space-y-2">
                    <Label for="name" class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">Nome da Mercadoria</Label>
                    <Input id="name" bind:value={formData.name} placeholder="Ex: Petróleo Brasileiro" class="bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold focus:ring-1 focus:ring-primary/20" />
                </div>
            </div>

            <!-- Multipliers -->
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="point" class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">Valor do Ponto</Label>
                    <Input id="point" type="number" step="0.0001" bind:value={formData.point_value} placeholder="1.00" class="bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4" />
                </div>
                <div class="space-y-2">
                    <Label for="lot" class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">Tamanho do Lote</Label>
                    <Input id="lot" type="number" step="0.01" bind:value={formData.contract_size} placeholder="1.00" class="bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4" />
                </div>
            </div>

            <!-- Hierarchy -->
            <div class="space-y-4">
                <div class="flex items-center space-x-2 p-4 rounded-xl border border-white/5 bg-muted/5">
                    <Checkbox id="is_root" bind:checked={formData.is_root} onCheckedChange={(v) => { if (v) formData.root_id = "none"; }} class="border-white/20" />
                    <Label for="is_root" class="text-[11px] uppercase font-bold tracking-widest text-foreground/70 cursor-pointer px-1">Definir como Ativo Raiz</Label>
                </div>

                <div class={cn("space-y-2 transition-opacity", formData.is_root && "opacity-30 pointer-events-none")}>
                    <Label class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">Vincular a Ativo Raiz</Label>
                    <Select.Root type="single" value={formData.root_id} onValueChange={(v) => (formData.root_id = v)} portal={null}>
                        <Select.Trigger class="w-full bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4">
                            {rootAssets.find(a => a.id === formData.root_id)?.symbol || (formData.root_id === "none" ? "Nenhum" : "Selecione...")}
                        </Select.Trigger>
                        <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl shadow-2xl">
                            <Select.Item value="none" class="rounded-lg text-xs font-bold uppercase tracking-widest">Nenhum</Select.Item>
                            {#each rootAssets as root}
                                <Select.Item value={root.id} class="rounded-lg text-xs font-bold uppercase tracking-widest">{root.symbol}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            <!-- Asset Type -->
            <div class="space-y-4">
                <div class="space-y-2">
                    <Label class="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60 block px-1">Estrutura Operacional (Asset Type)</Label>
                    <Select.Root type="single" bind:value={formData.asset_type_id} portal={null}>
                        <Select.Trigger class="w-full bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4">
                            {assetTypesStore.getAssetTypeName(formData.asset_type_id) || "Selecione a Classe"}
                        </Select.Trigger>
                        <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl shadow-2xl">
                            {#each assetTypesStore.assetTypes as t}
                                <Select.Item value={t.id} class="rounded-lg text-xs font-bold uppercase tracking-widest">{t.code} - {t.name}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            <Separator class="bg-white/5 opacity-50" />

            <!-- Economic Classification -->
            <div class="space-y-4">
                <div class="flex items-center gap-2 px-1 border-b border-emerald-500/20 pb-2">
                    <Globe class="w-3.5 h-3.5 text-emerald-500" />
                    <Label class="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-500/60">Classificação Econômica</Label>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/30 block px-1">Setor</Label>
                        <Select.Root type="single" bind:value={formData.sector_id} onValueChange={() => formData.subsector_id = ""} portal={null}>
                            <Select.Trigger class="w-full bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4">
                                {sectorsStore.getSectorName(formData.sector_id) || "Selecione o Setor"}
                            </Select.Trigger>
                            <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl shadow-2xl">
                                <Select.Item value="" class="rounded-lg text-xs font-bold uppercase tracking-widest">Nenhum</Select.Item>
                                {#each sectorsStore.sectors as s}
                                    <Select.Item value={s.id} class="rounded-lg text-xs font-bold uppercase tracking-widest">{s.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/30 block px-1">Subsetor</Label>
                        <Select.Root type="single" bind:value={formData.subsector_id} disabled={!formData.sector_id} portal={null}>
                            <Select.Trigger class="w-full bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4 disabled:opacity-20 transition-opacity">
                                {sectorsStore.getSubsectorName(formData.subsector_id) || "Selecione o Subsetor"}
                            </Select.Trigger>
                            <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl shadow-2xl">
                                <Select.Item value="" class="rounded-lg text-xs font-bold uppercase tracking-widest">Nenhum</Select.Item>
                                {#each availableSubsectors as ss}
                                    <Select.Item value={ss.id} class="rounded-lg text-xs font-bold uppercase tracking-widest">{ss.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
            </div>

            <Separator class="bg-white/5 opacity-50" />

            <!-- Fiscal & Fee Overrides -->
            <div class="space-y-4 pb-4">
                <div class="flex items-center gap-2 px-1 border-b border-blue-500/20 pb-2">
                    <ShieldCheck class="w-3.5 h-3.5 text-blue-500" />
                    <Label class="text-[10px] uppercase font-black tracking-[0.2em] text-blue-500/60">Governança & Custos</Label>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between px-1 mb-2">
                            <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/30">Perfil de Taxas</Label>
                            {#if !formData.default_fee_id}
                                <Badge variant="outline" class="text-[8px] h-4 bg-muted/10 border-white/10 text-muted-foreground/40 font-bold uppercase tracking-tighter">HERDADO</Badge>
                            {:else}
                                <Badge variant="outline" class="text-[8px] h-4 bg-blue-500/10 border-blue-500/20 text-blue-500 font-bold uppercase tracking-tighter">OVERRIDE</Badge>
                            {/if}
                        </div>
                        <Select.Root type="single" bind:value={formData.default_fee_id} portal={null}>
                            <Select.Trigger class="w-full bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4">
                                {financialConfigStore.fees.find((f) => f.id === (formData.default_fee_id || inheritedFeeProfileId))?.name || "Padrão Global"}
                                {#if !formData.default_fee_id && inheritedFeeProfileId === ""}
                                    <span class="ml-1 text-[10px] opacity-20">(Global)</span>
                                {/if}
                            </Select.Trigger>
                            <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl shadow-2xl">
                                <Select.Item value="" class="rounded-lg text-xs font-bold uppercase tracking-widest">Herdar da Classe</Select.Item>
                                {#each financialConfigStore.fees as f}
                                    <Select.Item value={f.id} class="rounded-lg text-xs font-bold uppercase tracking-widest">{f.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between px-1 mb-2">
                            <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/30">Perfil Fiscal</Label>
                            {#if !formData.tax_profile_id}
                                <Badge variant="outline" class="text-[8px] h-4 bg-muted/10 border-white/10 text-muted-foreground/40 font-bold uppercase tracking-tighter">HERDADO</Badge>
                            {:else}
                                <Badge variant="outline" class="text-[8px] h-4 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-tighter">OVERRIDE</Badge>
                            {/if}
                        </div>
                        <Select.Root type="single" bind:value={formData.tax_profile_id} portal={null}>
                            <Select.Trigger class="w-full bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold px-4 text-left truncate overflow-hidden">
                                {financialConfigStore.taxProfiles.find((p) => p.id === (formData.tax_profile_id || inheritedTaxProfileId))?.name || "Padrão Global"}
                                {#if !formData.tax_profile_id && inheritedTaxProfileId === ""}
                                    <span class="ml-1 text-[10px] opacity-20">(Global)</span>
                                {/if}
                            </Select.Trigger>
                            <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl shadow-2xl">
                                <Select.Item value="" class="rounded-lg text-xs font-bold uppercase tracking-widest">Herdar da Classe</Select.Item>
                                {#each financialConfigStore.taxProfiles as p}
                                    <Select.Item value={p.id} class="rounded-lg text-xs font-bold uppercase tracking-widest">{p.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
            </div>
        </div>

        <Dialog.Footer class="p-8 bg-white/[0.02] border-t border-white/5 flex flex-row items-center justify-end gap-3">
            <Button variant="ghost" onclick={() => isDialogOpen = false} class="rounded-full px-6 h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                {$t("general.cancel")}
            </Button>
            <Button onclick={save} class="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-12 h-12 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                {$t("general.save")}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; border: 2px solid transparent; background-clip: padding-box; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); border: 2px solid transparent; background-clip: padding-box; }
</style>
