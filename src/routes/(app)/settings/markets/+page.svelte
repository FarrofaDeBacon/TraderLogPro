<script lang="ts">
    import { marketsStore } from "$lib/stores/markets.svelte";
    import {
        Plus,
        Pencil,
        Trash2,
        Globe,
        MapPin,
        Clock,
        Calendar,
        ChevronDown,
        ChevronRight,
        Activity,
        ShieldCheck
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Separator } from "$lib/components/ui/separator";
    import { SystemHeader, SystemCard } from "$lib/components/ui/system";
    import { appStore } from "$lib/stores/app.svelte";
    import type { Market } from "$lib/types";
    import { t } from "svelte-i18n";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { toast } from "svelte-sonner";
    import Skeleton from "$lib/components/ui/skeleton.svelte";
    import { slide } from "svelte/transition";
    import { cn } from "$lib/utils";

    let isDialogOpen = $state(false);
    let editingId = $state<string | null>(null);

    // Accordion state
    let expandedGroups = $state<Record<string, boolean>>({});

    function toggleGroup(group: string) {
        expandedGroups[group] = !expandedGroups[group];
    }

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    let formMarket = $state<Omit<Market, "id">>({
        code: "",
        name: "",
        timezone: "America/Sao_Paulo",
        trading_days: [1, 2, 3, 4, 5],
        trading_sessions: [{ start_time: "09:00", end_time: "18:00" }],
    });

    const weekdays = [
        { value: 0, label: "sun" },
        { value: 1, label: "mon" },
        { value: 2, label: "tue" },
        { value: 3, label: "wed" },
        { value: 4, label: "thu" },
        { value: 5, label: "fri" },
        { value: 6, label: "sat" },
    ];

    function toggleDay(day: number) {
        if (formMarket.trading_days.includes(day)) {
            formMarket.trading_days = formMarket.trading_days.filter((d) => d !== day);
        } else {
            formMarket.trading_days = [...formMarket.trading_days, day].sort();
        }
    }

    function addSession() {
        formMarket.trading_sessions = [
            ...formMarket.trading_sessions,
            { start_time: "09:00", end_time: "18:00" },
        ];
    }

    function removeSession(index: number) {
        formMarket.trading_sessions = formMarket.trading_sessions.filter((_, i) => i !== index);
    }

    const timezones = [
        { value: "America/Sao_Paulo", label: "Brasília (UTC-3)" },
        { value: "America/New_York", label: "Nova York (US Eastern)" },
        { value: "America/Chicago", label: "Chicago (US Central)" },
        { value: "UTC", label: "UTC (Universal)" },
        { value: "Europe/London", label: "Londres (GMT/BST)" },
        { value: "Asia/Tokyo", label: "Tóquio (JST)" },
    ];

    let filteredMarkets = $derived(
        [...marketsStore.markets].sort((a, b) => a.code.localeCompare(b.code)),
    );

    let groupedMarkets = $derived.by(() => {
        const groups: Record<string, Market[]> = {};
        for (const item of filteredMarkets) {
            const tzLabel = timezones.find((t) => t.value === item.timezone)?.label || item.timezone;
            if (!groups[tzLabel]) groups[tzLabel] = [];
            groups[tzLabel].push(item);
        }
        return groups;
    });

    $effect(() => {
        const keys = Object.keys(groupedMarkets);
        if (keys.length > 0 && Object.keys(expandedGroups).length === 0) {
            keys.forEach(k => expandedGroups[k] = true);
        }
    });

    function openNew() {
        editingId = null;
        formMarket = {
            code: "",
            name: "",
            timezone: "America/Sao_Paulo",
            trading_days: [1, 2, 3, 4, 5],
            trading_sessions: [{ start_time: "09:00", end_time: "18:00" }],
        };
        isDialogOpen = true;
    }

    function openEdit(market: Market) {
        editingId = market.id;
        formMarket = {
            code: market.code || "",
            name: market.name || "",
            timezone: market.timezone || "America/Sao_Paulo",
            trading_days: [...(market.trading_days || [])],
            trading_sessions: (market.trading_sessions || []).map((s) => ({ ...s })),
        };
        isDialogOpen = true;
    }

    async function save() {
        if (editingId) {
            marketsStore.updateMarket(editingId, $state.snapshot(formMarket));
            toast.success($t("general.saveSuccess"));
        } else {
            marketsStore.addMarket($state.snapshot(formMarket));
            toast.success($t("general.saveSuccess"));
        }
        isDialogOpen = false;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            await marketsStore.deleteMarket(deleteId);
            toast.success($t("general.deleteSuccess"));
            deleteId = null;
        }
    }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <div class="flex items-start justify-between gap-4 mb-2">
        <div class="space-y-1">
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
                {$t("settings.markets.title")}
            </h1>
            <p class="text-sm text-muted-foreground">
                {$t("settings.markets.description")}
            </p>
        </div>
        <Button 
            onclick={openNew} 
            size="sm"
            class="h-9 px-4 font-bold bg-foreground text-background hover:bg-foreground/90 transition-all rounded-full"
        >
            <Plus class="w-4 h-4 mr-2" />
            {$t("settings.markets.new")}
        </Button>
    </div>

    <Separator class="bg-white/5" />

    <!-- Grouped Market List -->
    <div class="grid gap-10 pt-8">
        {#if appStore.isLoadingData && Object.keys(groupedMarkets).length === 0}
            <div class="space-y-6">
                <Skeleton class="h-10 w-64 rounded-xl bg-white/5" />
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each Array(3) as _}
                        <Skeleton class="h-40 rounded-[2rem] bg-white/5" />
                    {/each}
                </div>
            </div>
        {:else if Object.keys(groupedMarkets).length > 0}
            {#each Object.entries(groupedMarkets) as [timezone, items]}
                <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <!-- Section Header (Accordion Trigger) -->
                    <button 
                        type="button" 
                        class="flex items-center gap-3 px-2 group w-full text-left outline-none" 
                        onclick={() => toggleGroup(timezone)}
                    >
                        <div class="p-1.5 rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
                            <Globe class="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h4 class="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                            {timezone}
                        </h4>
                        <div class="h-[1px] flex-1 bg-white/5"></div>
                        {#if expandedGroups[timezone]}
                            <ChevronDown class="w-4 h-4 text-muted-foreground/40" />
                        {:else}
                            <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
                        {/if}
                    </button>

                    {#if expandedGroups[timezone]}
                        <div transition:slide={{ duration: 200 }} class="flex flex-col gap-3">
                            {#each items as item}
                                <div 
                                    class="group flex items-center justify-between p-4 rounded-2xl border bg-card/40 border-white/5 hover:border-primary/50 transition-all cursor-pointer shadow-sm"
                                    onclick={() => openEdit(item)}
                                    role="button"
                                    tabindex="0"
                                    onkeydown={(e) => e.key === 'Enter' && openEdit(item)}
                                >
                                    <div class="flex items-center gap-4">
                                        <div class="p-2.5 bg-muted/20 rounded-xl group-hover:bg-primary/10 transition-colors border border-white/5">
                                            <MapPin class="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div class="flex flex-col gap-0.5">
                                            <div class="flex items-center gap-2">
                                                <h4 class="font-bold text-base tracking-tight">
                                                    {item.code}
                                                </h4>
                                                <div class="h-4 w-[1px] bg-white/10 mx-1"></div>
                                                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                    {item.name}
                                                </span>
                                            </div>
                                            <div class="flex items-center gap-4 text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">
                                                <div class="flex items-center gap-1.5">
                                                    <Clock class="w-3 h-3" />
                                                    <span>
                                                        {#if item.trading_sessions?.length}
                                                            {item.trading_sessions[0].start_time} — {item.trading_sessions[0].end_time}
                                                        {:else}
                                                            Sessão N/A
                                                        {/if}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-destructive hover:text-white" onclick={(e) => { e.stopPropagation(); requestDelete(item.id); }}>
                                            <Trash2 class="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary" onclick={(e) => { e.stopPropagation(); openEdit(item); }}>
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
                <Globe class="w-20 h-20 opacity-5 animate-pulse mb-8" />
                <span class="text-sm font-black uppercase tracking-[0.5em] opacity-30 italic">{$t("settings.markets.empty")}</span>
                <Button variant="link" class="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-colors" onclick={openNew}>
                    INICIAR MAPEAMENTO DE MERCADO
                </Button>
            </div>
        {/if}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px] bg-[#0a0c10] border-white/5 rounded-[3rem] p-0 overflow-hidden shadow-2xl ring-1 ring-white/10">
        <Dialog.Header class="p-8 pb-4 space-y-1">
            <Dialog.Title class="text-xl font-bold text-white tracking-tight">
                {editingId ? $t("settings.markets.edit") : $t("settings.markets.new")}
            </Dialog.Title>
            <Dialog.Description class="text-xs text-muted-foreground/60 font-medium">
                {$t("settings.markets.description")}
            </Dialog.Description>
        </Dialog.Header>

        <div class="px-8 py-2 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="code" class="text-[11px] uppercase font-bold tracking-widest text-white/30">{$t("settings.markets.form.code")}</Label>
                    <Input id="code" bind:value={formMarket.code} placeholder="Ex: B3" class="bg-white/[0.03] border-white/10 rounded-2xl h-12 uppercase text-white focus:ring-1 focus:ring-white/20 px-4" />
                </div>
                <div class="space-y-2">
                    <Label for="name" class="text-[11px] uppercase font-bold tracking-widest text-white/30">{$t("settings.markets.form.name")}</Label>
                    <Input id="name" bind:value={formMarket.name} placeholder="Ex: Brasil, Bolsa, Balcão" class="bg-white/[0.03] border-white/10 rounded-2xl h-12 text-white focus:ring-1 focus:ring-white/20 px-4" />
                </div>
            </div>

            <div class="space-y-2">
                <Label for="timezone" class="text-[11px] uppercase font-bold tracking-widest text-white/30">{$t("settings.markets.form.timezone")}</Label>
                <Select.Root type="single" bind:value={formMarket.timezone}>
                    <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-2xl h-12 text-white px-4">
                        {timezones.find((t) => t.value === formMarket.timezone)?.label || formMarket.timezone}
                    </Select.Trigger>
                    <Select.Content class="bg-[#0a0c10] border-white/10 rounded-2xl shadow-2xl">
                        {#each timezones as tz}
                            <Select.Item value={tz.value} class="text-xs font-medium py-3 rounded-xl">{tz.label}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <div class="space-y-3">
                <Label class="text-[11px] uppercase font-bold tracking-widest text-white/30">{$t("settings.markets.form.tradingDays")}</Label>
                <div class="flex gap-2">
                    {#each weekdays as day}
                        <Button 
                            variant={formMarket.trading_days.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            class={cn(
                                "flex-1 h-11 rounded-xl transition-all font-bold text-xs",
                                formMarket.trading_days.includes(day.value) 
                                    ? "bg-white text-black hover:bg-white/90 shadow-lg shadow-white/5" 
                                    : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white"
                            )}
                            onclick={() => toggleDay(day.value)}
                        >
                            {$t(`common.weekdays.short.${day.label}`).charAt(0).toUpperCase()}
                        </Button>
                    {/each}
                </div>
            </div>

            <div class="space-y-4 pt-2">
                <div class="flex items-center justify-between">
                    <Label class="text-[11px] uppercase font-bold tracking-widest text-white/30">Sessões de Negociação</Label>
                    <Button variant="ghost" size="sm" onclick={addSession} class="h-8 text-[10px] uppercase font-black tracking-widest text-white/40 hover:text-white">
                        <Plus class="w-3 h-3 mr-1" />
                        Adicionar
                    </Button>
                </div>

                <div class="space-y-3 pb-4">
                    {#each formMarket.trading_sessions as session, idx}
                        <div class="p-5 rounded-3xl border border-white/5 bg-white/[0.01] space-y-4 relative group hover:border-white/10 transition-colors shadow-inner">
                            <div class="grid grid-cols-2 gap-6">
                                <div class="space-y-2">
                                    <Label class="text-[9px] uppercase text-white/20 font-black tracking-[0.2em]">Abertura</Label>
                                    <Input type="time" bind:value={session.start_time} class="bg-black/40 border-white/5 rounded-xl h-10 text-white font-medium text-center" />
                                </div>
                                <div class="space-y-2">
                                    <Label class="text-[9px] uppercase text-white/20 font-black tracking-[0.2em]">Fechamento</Label>
                                    <Input type="time" bind:value={session.end_time} class="bg-black/40 border-white/5 rounded-xl h-10 text-white font-medium text-center" />
                                </div>
                            </div>
                            {#if formMarket.trading_sessions.length > 1}
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    class="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-[#0a0c10] border border-white/10 text-white/20 hover:text-destructive hover:border-destructive/50 opacity-0 group-hover:opacity-100 transition-all"
                                    onclick={() => removeSession(idx)}
                                >
                                    <Trash2 class="w-3.5 h-3.5" />
                                </Button>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <Dialog.Footer class="p-8 bg-white/[0.02] border-t border-white/5 flex flex-row items-center justify-end gap-3">
            <Button variant="ghost" onclick={() => isDialogOpen = false} class="text-white/40 hover:text-white hover:bg-transparent font-bold uppercase tracking-widest text-[10px]">
                {$t("general.cancel")}
            </Button>
            <Button onclick={save} class="rounded-full bg-white text-black hover:bg-neutral-200 px-10 h-12 font-black uppercase tracking-tight shadow-xl shadow-white/5 transition-all hover:scale-[1.02] active:scale-[0.98]">
                {$t("settings.markets.form.save")}
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
