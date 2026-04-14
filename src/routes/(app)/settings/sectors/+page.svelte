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
        Fingerprint,
        Factory,
        LineChart,
        Cpu,
        ShoppingCart,
        Shovel,
        HeartPulse,
        Droplets,
        Zap,
        Wallet,
        Landmark,
        Palette,
        Smile,
        Globe
    } from "lucide-svelte";
    import { slide } from "svelte/transition";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { t } from "svelte-i18n";
    import { SystemHeader, SystemInput, SystemSelect } from "$lib/components/ui/system";
    import { toast } from "svelte-sonner";
    import type { Sector, Subsector } from "$lib/types";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { Badge } from "$lib/components/ui/badge";
    import { Label } from "$lib/components/ui/label";
    import { cn } from "$lib/utils";
    import { safeInvoke } from "$lib/services/tauri";
    import { onMount } from "svelte";

    onMount(() => {
        sectorsStore.loadData();
    });

    let isDialogOpen = $state(false);
    let editingId = $state<string | null>(null);
    let searchTerm = $state("");

    // Subsector State
    let isSubsectorDialogOpen = $state(false);
    let editingSubsectorId = $state<string | null>(null);
    let parentSectorId = $state<string | null>(null);

    // Accordion state
    let expandedSectors = $state<Record<string, boolean>>({});

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);
    let deleteType = $state<"sector" | "subsector">("sector");
    let isProcessing = $state(false);

    let filteredItems = $derived(
        sectorsStore.sectors
            .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
    );

    let formData = $state<Omit<Sector, "id">>({
        name: "",
        macro_sector: "",
        icon: "Building2",
        color: "emerald",
        description: ""
    });

    let subsectorFormData = $state<Omit<Subsector, "id">>({
        name: "",
        sector_id: "",
        segment: ""
    });

    function resetForm() {
        formData = {
            name: "",
            macro_sector: "",
            icon: "Building2",
            color: "emerald",
            description: ""
        };
        editingId = null;
        newSubsectorName = "";
    }

    let newSubsectorName = $state("");
    async function addSubsectorInside() {
        if (!newSubsectorName.trim() || !editingId) return;
        try {
            await sectorsStore.saveSubsector({
                name: newSubsectorName,
                sector_id: editingId,
                segment: "" // Default empty segment
            });
            newSubsectorName = "";
            toast.success("Subsetor adicionado");
        } catch (e) {
            toast.error(String(e));
        }
    }

    function openNew() {
        resetForm();
        isDialogOpen = true;
    }

    function openEdit(sector: Sector) {
        editingId = sector.id;
        formData = { 
            name: sector.name,
            macro_sector: sector.macro_sector || "",
            icon: sector.icon || "Building2",
            color: sector.color || "emerald",
            description: sector.description || ""
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
            // Snapshot essential for Svelte 5 + Tauri serialization
            const data = $state.snapshot(formData);
            await sectorsStore.saveSector({
                id: editingId || undefined,
                ...data
            });
            toast.success($t("general.saveSuccess"));
            isDialogOpen = false;
        } catch (e) {
            toast.error(String(e));
        } finally {
            isProcessing = false;
        }
    }

    // --- Subsector Actions ---
    function openNewSubsector(sectorId: string) {
        parentSectorId = sectorId;
        editingSubsectorId = null;
        subsectorFormData = { name: "", sector_id: sectorId, segment: "" };
        isSubsectorDialogOpen = true;
    }

    function openEditSubsector(ss: Subsector) {
        parentSectorId = ss.sector_id;
        editingSubsectorId = ss.id;
        subsectorFormData = { name: ss.name, sector_id: ss.sector_id, segment: ss.segment || "" };
        isSubsectorDialogOpen = true;
    }

    async function saveSubsector() {
        if (!subsectorFormData.name.trim()) {
            toast.error($t("general.error"));
            return;
        }
        if (isProcessing) return;
        isProcessing = true;
        try {
            await sectorsStore.saveSubsector({
                id: editingSubsectorId || undefined,
                ...$state.snapshot(subsectorFormData)
            });
            toast.success($t("general.saveSuccess"));
            isSubsectorDialogOpen = false;
        } catch (e) {
            toast.error(String(e));
        } finally {
            isProcessing = false;
        }
    }

    function requestDelete(id: string, type: "sector" | "subsector" = "sector") {
        deleteId = id;
        deleteType = type;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId && !isProcessing) {
            isProcessing = true;
            try {
                if (deleteType === "sector") {
                    await sectorsStore.deleteSector(deleteId);
                } else {
                    await sectorsStore.deleteSubsector(deleteId);
                }
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

    function toggleSector(id: string) {
        expandedSectors[id] = !expandedSectors[id];
    }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <SystemHeader 
        title={$t("settings.sectors.title")}
        subtitle={$t("settings.sectors.description")}
        variant="page"
    >
        {#snippet actions()}
            <div class="flex items-center gap-4">
                <div class="relative hidden md:block">
                    <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                    <input 
                        type="text" 
                        bind:value={searchTerm}
                        placeholder={$t("settings.sectors.searchPlaceholder")}
                        class="h-11 pl-11 pr-4 bg-muted/10 dark:bg-muted/10 border border-white/5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] focus:border-primary/30 focus:bg-muted/15 outline-none w-64 transition-all focus:w-80 text-foreground placeholder:text-muted-foreground/40"
                    />
                </div>
                <div class="flex items-center gap-2">
                    <Button 
                        onclick={openNew} 
                        size="sm"
                        class="h-11 px-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-full text-[10px] uppercase tracking-wider shadow-xl shadow-primary/20"
                    >
                        <Plus class="w-4 h-4 mr-2" />
                        {$t("settings.sectors.new")}
                    </Button>
                </div>
            </div>
        {/snippet}
    </SystemHeader>

    <div class="grid gap-4 pt-4">
        {#if filteredItems.length === 0}
            <div class="flex flex-col items-center justify-center p-32 border border-dashed rounded-[4rem] border-white/5 bg-white/[0.01] text-muted-foreground animate-in zoom-in-95 duration-1000 shadow-3xl">
                <div class="p-8 bg-white/5 dark:bg-white/[0.02] rounded-full mb-8 ring-1 ring-white/10 shadow-inner">
                    <Layers class="w-20 h-20 opacity-25 dark:opacity-10 animate-pulse text-primary" />
                </div>
                <span class="text-[10px] font-black uppercase tracking-[0.5em] opacity-50 dark:opacity-30 text-center">
                    {searchTerm ? "NENHUM RESULTADO ENCONTRADO" : $t("settings.sectors.empty")}
                </span>
                <Button 
                    variant="link" 
                    class="mt-8 text-[11px] font-black uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-all hover:scale-110" 
                    onclick={() => { if (searchTerm) searchTerm = ""; else openNew(); }}
                >
                    {searchTerm ? "LIMPAR FILTROS" : "DEFINIR MATRIZ ECONÔMICA"}
                </Button>
            </div>
        {:else}
            <div class="flex flex-col gap-4">
                {#each filteredItems as sector (sector.id)}
                    {@const subsectors = sectorsStore.getSubsectorsBySector(sector.id)}
                    <div class="space-y-3">
                        <div 
                            class="group relative bg-card dark:glass border border-white/5 rounded-[2rem] p-6 hover:border-primary/30 hover:bg-white/[0.02] transition-all duration-700 cursor-pointer flex items-center justify-between overflow-hidden shadow-xl"
                            onclick={() => toggleSector(sector.id)}
                            role="button"
                            tabindex={0}
                            onkeydown={(e) => e.key === 'Enter' && toggleSector(sector.id)}
                        >
                            <!-- Card Background Glow -->
                            <div class="absolute inset-0 bg-gradient-to-br from-primary/0 to-blue-500/0 dark:group-hover:from-primary/[0.03] dark:group-hover:to-blue-500/[0.03] rounded-3xl transition-all duration-700 pointer-events-none"></div>

                             <div class="relative flex items-center gap-6">
                                <div class={cn(
                                    "p-1 rounded-2xl transition-all duration-500 border border-white/5 w-14 h-14 flex items-center justify-center shadow-xl shrink-0 leading-none",
                                    sector.color === 'emerald' && "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20",
                                    sector.color === 'rose' && "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20",
                                    sector.color === 'sky' && "bg-sky-500/10 text-sky-500 group-hover:bg-sky-500/20",
                                    sector.color === 'amber' && "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20",
                                    sector.color === 'indigo' && "bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20",
                                    sector.color === 'slate' && "bg-slate-500/10 text-slate-500 group-hover:bg-slate-500/20",
                                    !sector.color && "bg-muted/20 text-primary/40 group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                    {#if sector.icon === 'Building2'}<Building2 class="w-6 h-6" />
                                    {:else if sector.icon === 'Factory'}<Factory class="w-6 h-6" />
                                    {:else if sector.icon === 'LineChart'}<LineChart class="w-6 h-6" />
                                    {:else if sector.icon === 'Cpu'}<Cpu class="w-6 h-6" />
                                    {:else if sector.icon === 'ShoppingCart'}<ShoppingCart class="w-6 h-6" />
                                    {:else if sector.icon === 'Shovel'}<Shovel class="w-6 h-6" />
                                    {:else if sector.icon === 'HeartPulse'}<HeartPulse class="w-6 h-6" />
                                    {:else if sector.icon === 'Droplets'}<Droplets class="w-6 h-6" />
                                    {:else if sector.icon === 'Zap'}<Zap class="w-6 h-6" />
                                    {:else if sector.icon === 'Wallet'}<Wallet class="w-6 h-6" />
                                    {:else if sector.icon === 'Landmark'}<Landmark class="w-6 h-6" />
                                    {:else}<Building2 class="w-6 h-6" />{/if}
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <div class="flex items-center gap-3">
                                        <h4 class="font-black text-lg tracking-tight text-foreground group-hover:text-primary transition-colors uppercase">
                                            {sector.name}
                                        </h4>
                                        <Badge variant="outline" class="text-[8px] font-black py-0 h-4 bg-white/5 border-white/10 opacity-60">
                                            {sector.macro_sector || 'MACRO SETOR NÃO DEF.'}
                                        </Badge>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">SUBSETORES:</span>
                                            <span class="text-[10px] font-black text-foreground/60">{subsectors.length}</span>
                                        </div>
                                        <div class="w-1 h-1 rounded-full bg-white/10"></div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">ID:</span>
                                            <span class="font-mono text-[9px] text-muted-foreground/60 uppercase">{sector.id.split(':').at(-1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="relative flex items-center gap-4">
                                <!-- Actions Overlay -->
                                <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        class="h-9 w-9 rounded-full hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/20" 
                                        onclick={(e) => { e.stopPropagation(); requestDelete(sector.id, "sector"); }}
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        class="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary text-muted-foreground/20" 
                                        onclick={(e) => { e.stopPropagation(); openEdit(sector); }}
                                    >
                                        <Pencil class="w-4 h-4 text-primary" />
                                    </Button>
                                    <div class="w-[1px] h-4 bg-white/5 mx-1"></div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        class="h-9 w-9 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500 text-muted-foreground/20" 
                                        onclick={(e) => { e.stopPropagation(); openNewSubsector(sector.id); }}
                                        title="Adicionar Subsetor"
                                    >
                                        <Plus class="w-4 h-4 text-emerald-500" />
                                    </Button>
                                </div>
                                <div class={cn("transition-transform duration-300", expandedSectors[sector.id] && "rotate-90")}>
                                    <ChevronRight class="w-5 h-5 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                                </div>
                            </div>
                        </div>

                        {#if expandedSectors[sector.id]}
                            <div transition:slide class="pl-14 pr-4 py-2 space-y-2">
                                {#if subsectors.length === 0}
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 py-2 border border-dashed border-white/5 rounded-xl px-4 italic text-center">Nenhum subsetor cadastrado para este setor</p>
                                {:else}
                                    {#each subsectors as ss}
                                        <div class="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors group/ss">
                                            <div class="flex items-center gap-3">
                                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></div>
                                                <div class="flex flex-col">
                                                    <span class="text-xs font-black text-foreground/70 uppercase tracking-widest leading-none">{ss.name}</span>
                                                    {#if ss.segment}
                                                        <span class="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">SEG: {ss.segment}</span>
                                                    {/if}
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1 opacity-0 group-hover/ss:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    class="h-7 w-7 rounded-sm hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/20" 
                                                    onclick={() => requestDelete(ss.id, "subsector")}
                                                >
                                                    <Trash2 class="w-3.5 h-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    class="h-7 w-7 rounded-sm hover:bg-primary/10 hover:text-primary text-muted-foreground/20" 
                                                    onclick={() => openEditSubsector(ss)}
                                                >
                                                    <Pencil class="w-3.5 h-3.5 text-primary" />
                                                </Button>
                                            </div>
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="bg-white dark:bg-[#0a0c10] border-white/5 p-0 rounded-[2.5rem] shadow-2xl transition-all duration-700 ring-1 ring-white/10 sm:max-w-[850px]">
        <Dialog.Header class="px-8 py-7 border-b border-white/5 bg-white/[0.02] rounded-t-[2.5rem]">
            <Dialog.Title class="text-[13px] font-black uppercase tracking-[0.4em] flex items-center gap-4 text-foreground">
                <div class="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                    <Building2 class="w-5 h-5 text-primary" />
                </div>
                <div>
                    {editingId ? "Gestão Estrutural" : "Novo Setor de Atuação"}
                    <span class="block text-[9px] font-bold text-muted-foreground/60 dark:text-muted-foreground/40 mt-1 tracking-widest uppercase">
                        {editingId ? "Configuração de Setor e Matriz de Subsetores" : "Definição de Nova Vertical Econômica"}
                    </span>
                </div>
            </Dialog.Title>
        </Dialog.Header>

        <div class="px-10 py-10 h-full max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                <!-- Left Column: Sector Identity -->
                <div class="space-y-10">
                    <div class="space-y-6">
                        <div class="flex items-center gap-2 border-b border-primary/20 pb-2">
                            <Fingerprint class="w-3.5 h-3.5 text-primary/40" />
                            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 italic">Identidade Corporativa</span>
                        </div>
                        
                        <div class="grid gap-6">
                            <SystemInput 
                                label="NOME DO SETOR*"
                                bind:value={formData.name}
                                placeholder="PÁRA-BRISAS, BANCOS..."
                                class="font-black uppercase tracking-widest h-14 bg-muted/10 border-white/5 px-6 rounded-2xl"
                            />
                            
                            <SystemInput 
                                label="MACRO SETOR (B3)"
                                bind:value={formData.macro_sector}
                                placeholder="CONSUMO CÍCLICO, FINANCEIRO..."
                                class="font-black uppercase tracking-widest h-14 bg-muted/10 border-white/5 px-6 rounded-2xl"
                            />
                        </div>
                    </div>

                    <!-- Visual Assets (Icon & Color Pickers) -->
                    <div class="space-y-6">
                        <div class="flex items-center gap-2 border-b border-rose-500/20 pb-2">
                            <Palette class="w-3.5 h-3.5 text-rose-500/40" />
                            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/60 italic">Atributos Visuais Institucionais</span>
                        </div>

                        <!-- Icon Picker -->
                        <div class="space-y-3">
                            <Label class="text-[10px] uppercase font-black tracking-widest text-muted-foreground/30 px-1">ÍCONE OPERACIONAL</Label>
                            <div class="grid grid-cols-6 gap-2 p-3 bg-muted/10 rounded-2xl border border-white/5">
                                {#each ['Building2', 'Factory', 'LineChart', 'Cpu', 'ShoppingCart', 'Shovel', 'HeartPulse', 'Droplets', 'Zap', 'Wallet', 'Landmark', 'Smile'] as iconName}
                                    <button 
                                        class={cn(
                                            "h-10 w-10 flex items-center justify-center rounded-xl transition-all border",
                                            formData.icon === iconName 
                                                ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" 
                                                : "bg-white/5 border-transparent text-muted-foreground/40 hover:bg-white/10"
                                        )}
                                        onclick={() => formData.icon = iconName}
                                    >
                                        {#if iconName === 'Building2'}<Building2 class="w-4 h-4" />
                                        {:else if iconName === 'Factory'}<Factory class="w-4 h-4" />
                                        {:else if iconName === 'LineChart'}<LineChart class="w-4 h-4" />
                                        {:else if iconName === 'Cpu'}<Cpu class="w-4 h-4" />
                                        {:else if iconName === 'ShoppingCart'}<ShoppingCart class="w-4 h-4" />
                                        {:else if iconName === 'Shovel'}<Shovel class="w-4 h-4" />
                                        {:else if iconName === 'HeartPulse'}<HeartPulse class="w-4 h-4" />
                                        {:else if iconName === 'Droplets'}<Droplets class="w-4 h-4" />
                                        {:else if iconName === 'Zap'}<Zap class="w-4 h-4" />
                                        {:else if iconName === 'Wallet'}<Wallet class="w-4 h-4" />
                                        {:else if iconName === 'Landmark'}<Landmark class="w-4 h-4" />
                                        {:else if iconName === 'Smile'}<Smile class="w-4 h-4" />
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Color Picker -->
                        <div class="space-y-3">
                            <Label class="text-[10px] uppercase font-black tracking-widest text-muted-foreground/30 px-1">COR DE IDENTIFICAÇÃO</Label>
                            <div class="flex flex-wrap gap-2 p-3 bg-muted/10 rounded-2xl border border-white/5">
                                {#each ['emerald', 'rose', 'sky', 'amber', 'indigo', 'slate'] as colorName}
                                    <button 
                                        class={cn(
                                            "h-8 w-8 rounded-full transition-all border-2",
                                            formData.color === colorName ? "border-white scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100",
                                            colorName === 'emerald' && "bg-emerald-500",
                                            colorName === 'rose' && "bg-rose-500",
                                            colorName === 'sky' && "bg-sky-500",
                                            colorName === 'amber' && "bg-amber-500",
                                            colorName === 'indigo' && "bg-indigo-500",
                                            colorName === 'slate' && "bg-slate-500"
                                        )}
                                        onclick={() => formData.color = colorName}
                                    ></button>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Matrix & Expansion -->
                <div class="space-y-10">
                    <div class="space-y-6">
                        <div class="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                            <Layers class="w-3.5 h-3.5 text-emerald-500/40" />
                            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 italic">Matriz de Subsetores e Segmentos</span>
                        </div>
                        
                        {#if editingId}
                            <!-- Inline add for subsectors (Institutional) -->
                            <div class="flex items-center gap-3 p-2 bg-white/[0.02] border border-white/5 rounded-2xl group focus-within:border-emerald-500/30 transition-all shadow-sm">
                                <input 
                                    type="text" 
                                    bind:value={newSubsectorName}
                                    placeholder="NOME DO NOVO SUBSETOR..."
                                    class="h-12 flex-1 bg-transparent border-none rounded-xl px-4 text-[11px] font-black uppercase tracking-widest focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/20"
                                />
                                <Button 
                                    size="icon" 
                                    class="h-10 w-10 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                                    onclick={addSubsectorInside}
                                >
                                    <Plus class="w-4 h-4" />
                                </Button>
                            </div>

                            <!-- List of Subsectors with segments -->
                            <div class="max-h-[350px] overflow-y-auto pr-3 custom-scrollbar space-y-3 p-1">
                                {#each sectorsStore.getSubsectorsBySector(editingId) as ss}
                                    <div class="flex flex-col p-4 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all group/ss space-y-3">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-3">
                                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                                <span class="text-[11px] font-black uppercase tracking-widest text-foreground/80">{ss.name}</span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                class="h-8 w-8 rounded-full hover:bg-rose-500 text-muted-foreground/20 opacity-0 group-hover/ss:opacity-100 transition-all" 
                                                onclick={() => requestDelete(ss.id, "subsector")}
                                            >
                                                <Trash2 class="w-3.5 h-3.5 text-white" />
                                            </Button>
                                        </div>
                                        <div class="relative">
                                            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-emerald-500/40 uppercase tracking-widest pointer-events-none">SEGMENTO</span>
                                            <input 
                                                type="text" 
                                                bind:value={ss.segment}
                                                placeholder="NÃO DEFINIDO"
                                                class="w-full h-10 bg-white/5 border border-white/5 rounded-xl pl-[70px] pr-4 text-[10px] font-bold uppercase tracking-widest focus:border-emerald-500/30 outline-none transition-all"
                                                onchange={() => sectorsStore.saveSubsector(ss)}
                                            />
                                        </div>
                                    </div>
                                {/each}
                                {#if sectorsStore.getSubsectorsBySector(editingId).length === 0}
                                    <div class="h-[200px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01] opacity-30">
                                        <Layers class="w-10 h-10 mb-4 animate-pulse" />
                                        <span class="text-[9px] font-black uppercase tracking-[0.4em]">Matriz Econômica Vazia</span>
                                    </div>
                                {/if}
                            </div>
                        {:else}
                             <div class="h-[400px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01] opacity-60">
                                <div class="p-6 bg-white/5 rounded-full mb-6 ring-1 ring-white/10">
                                    <Layers class="w-12 h-12 text-primary/40 animate-pulse" />
                                </div>
                                <span class="text-[10px] font-black uppercase tracking-[0.3em] text-center max-w-[200px] leading-relaxed">
                                    APÓS CADASTRAR O SETOR, VOCÊ PODERÁ DEFINIR A MATRIZ DE SUBSETORES E SEGMENTOS.
                                </span>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <Dialog.Footer class="px-10 py-8 border-t border-white/5 bg-white/[0.02] rounded-b-[2.5rem] flex flex-row items-center justify-end gap-4">
            <Button variant="ghost" onclick={() => (isDialogOpen = false)} class="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground hover:bg-transparent"
                >{$t("general.cancel")}</Button
            >
            <Button 
                onclick={saveSector} 
                disabled={isProcessing} 
                class="rounded-full px-12 h-12 text-[10px] font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20"
            >
                {#if isProcessing}
                    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-3"></div>
                {/if}
                {editingId ? "SALVAR ALTERAÇÕES" : "CADASTRAR SETOR"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Subsector Dialog (For inline creation if needed elsewhere) -->
<Dialog.Root bind:open={isSubsectorDialogOpen}>
    <Dialog.Content class="sm:max-w-[480px] bg-white dark:bg-[#0a0c10] border-white/5 p-0 rounded-[2.5rem] shadow-3xl ring-1 ring-white/10">
        <Dialog.Header class="px-8 py-7 border-b border-white/5 bg-white/[0.02] rounded-t-[2.5rem]">
            <Dialog.Title class="text-[13px] font-black uppercase tracking-[0.3em] flex items-center gap-4">
                <div class="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Layers class="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                    {editingSubsectorId ? "Editar Subsetor" : "Novo Subsetor"}
                    <span class="block text-[9px] font-bold text-muted-foreground/40 mt-1 tracking-widest uppercase">Vínculo de Derivação Econômica</span>
                </div>
            </Dialog.Title>
        </Dialog.Header>

        <div class="px-10 py-10 space-y-8">
            <div class="p-5 bg-emerald-500/[0.02] rounded-3xl border border-emerald-500/10 flex items-center justify-between">
                <div>
                    <span class="text-[8px] font-black uppercase tracking-widest text-emerald-500/40 block mb-1">SETOR PAI</span>
                    <span class="text-xs font-black text-foreground uppercase tracking-[0.2em]">{sectorsStore.getSectorName(parentSectorId || '')}</span>
                </div>
                <Building2 class="w-5 h-5 text-emerald-500/20" />
            </div>

            <div class="grid gap-6">
                <SystemInput 
                    label="NOME DO SUBSETOR*"
                    bind:value={subsectorFormData.name}
                    placeholder="Ex: BANCOS, ENERGIA..."
                    class="font-black uppercase tracking-widest text-lg h-14 bg-muted/10 border-white/5 px-6 rounded-2xl"
                />
                
                <SystemInput 
                    label="SEGMENTO OPERACIONAL"
                    bind:value={subsectorFormData.segment}
                    placeholder="Ex: BANCOS MÉDIOS, ENERGIA ELÉTRICA..."
                    class="font-black uppercase tracking-widest text-lg h-14 bg-muted/10 border-white/5 px-6 rounded-2xl"
                />
            </div>
        </div>

        <Dialog.Footer class="px-10 py-8 border-t border-white/5 bg-white/[0.02] rounded-b-[2.5rem] flex flex-row items-center justify-end gap-4">
            <Button variant="ghost" onclick={() => (isSubsectorDialogOpen = false)} class="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground hover:bg-transparent"
                >{$t("general.cancel")}</Button
            >
            <Button onclick={saveSubsector} disabled={isProcessing} class="rounded-full px-12 h-12 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20">
                {#if isProcessing}
                    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-3"></div>
                {/if}
                {$t("general.save")}
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
