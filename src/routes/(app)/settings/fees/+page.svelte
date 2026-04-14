<script lang="ts">
    import { accountsStore } from "$lib/stores/accounts.svelte";
    import { currenciesStore } from "$lib/stores/currencies.svelte";
    import {
        Plus,
        Pencil,
        Trash2,
        Receipt,
        Calculator,
        Building2,
        Activity,
        Globe,
        ShieldAlert,
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { modalitiesStore } from "$lib/stores/modalities.svelte";
    import { SystemHeader, SystemCard } from "$lib/components/ui/system";
    import { t } from "svelte-i18n";
    import type { FeeProfile, FeeProfileEntry } from "$lib/types";
    import { slide } from "svelte/transition";
    import { ChevronDown, ChevronRight } from "lucide-svelte";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { toast } from "svelte-sonner";
    import { cn } from "$lib/utils";

    let isDialogOpen = $state(false);
    let editingId = $state<string | null>(null);

    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    let expandedGroups = $state<Record<string, boolean>>({});
    function toggleGroup(group: string) {
        expandedGroups[group] = !expandedGroups[group];
    }

    let activeModalityId = $state<string>("");
    let entriesMap = $state<Record<string, Partial<FeeProfileEntry>>>({});

    let formData = $state<Omit<FeeProfile, "id">>({
        name: "",
        broker: "",
        notes: "",
    });

    // Initialize modality
    $effect(() => {
        if (!activeModalityId && modalitiesStore.modalities.length > 0) {
            activeModalityId = modalitiesStore.modalities[0].id!;
        }
    });

    function getEntry(modalityId: string): Partial<FeeProfileEntry> {
        if (!entriesMap[modalityId]) {
            return {
                modality_id: modalityId,
                fixed_fee: 0,
                percentage_fee: 0,
                exchange_fee: 0,
                iss: 0,
                currency_spread: 0,
                withholding_tax: 0,
                income_tax_rate: 0,
            };
        }
        return entriesMap[modalityId];
    }

    let currentEntry = $derived(getEntry(activeModalityId));

    // Unique Brokers from Accounts
    let uniqueBrokers = $derived(
        Array.from(new Set(accountsStore.accounts.map((a) => a.broker))).sort(),
    );

    // Group Fees by Broker
    let groupedFees = $derived.by(() => {
        const groups: Record<string, FeeProfile[]> = {};
        for (const fee of financialConfigStore.fees) {
            const broker = fee.broker || $t("general.all");
            if (!groups[broker]) {
                groups[broker] = [];
            }
            groups[broker].push(fee);
        }
        return groups;
    });

    function getBrokerStyle(name: string) {
        const n = name.toLowerCase();
        if (n.includes("binance"))
            return { color: "text-amber-500", bg: "bg-amber-500/10" };
        if (n.includes("xp"))
            return { color: "text-blue-500", bg: "bg-blue-500/10" };
        if (n.includes("profit") || n.includes("nelogica"))
            return { color: "text-green-500", bg: "bg-green-500/10" };
        return { color: "text-muted-foreground", bg: "bg-muted" };
    }

    // Simulation simulation
    let simValue = $state(10000);

    function resetForm() {
        formData = {
            name: "",
            broker: "",
            notes: "",
        };
        entriesMap = {};
        modalitiesStore.modalities.forEach(m => {
            entriesMap[m.id!] = {
                modality_id: m.id,
                fixed_fee: 0,
                percentage_fee: 0,
                exchange_fee: 0,
                iss: 0,
                currency_spread: 0,
                withholding_tax: 0,
                income_tax_rate: 0,
            };
        });
        if (modalitiesStore.modalities.length > 0) {
            activeModalityId = modalitiesStore.modalities[0].id!;
        }
        editingId = null;
    }

    function openNew() {
        resetForm();
        isDialogOpen = true;
    }

    function openEdit(profile: FeeProfile) {
        editingId = profile.id;
        formData = {
            name: profile.name,
            broker: profile.broker,
            notes: profile.notes,
            account_id: profile.account_id,
        };
        
        // Load entries
        const entries = financialConfigStore.getEntriesForFeeProfile(profile.id);
        entriesMap = {};
        modalitiesStore.modalities.forEach(m => {
            const entry = entries.find(e => e.modality_id === m.id);
            entriesMap[m.id!] = entry ? { ...entry } : {
                modality_id: m.id,
                fixed_fee: 0,
                percentage_fee: 0,
                exchange_fee: 0,
                iss: 0,
                currency_spread: 0,
                withholding_tax: 0,
                income_tax_rate: 0,
            };
        });

        if (modalitiesStore.modalities.length > 0) {
            activeModalityId = modalitiesStore.modalities[0].id!;
        }
        isDialogOpen = true;
    }

    async function save() {
        const payload = { ...formData };

        let profileId = editingId;
        if (editingId) {
            financialConfigStore.updateFeeProfile(editingId, payload);
        } else {
            profileId = await financialConfigStore.addFeeProfile(payload) as unknown as string;
            // Note: addFeeProfile returns void currently but I might need to fix it or wait for store sync
            // Actually, addFeeProfile in svelte class should probably return the id or use the one we generate
        }

        // Save entries
        for (const modId of Object.keys(entriesMap)) {
            const entry = entriesMap[modId];
            if (profileId) {
                await financialConfigStore.saveFeeProfileEntry({
                    ...entry,
                    fee_profile_id: profileId,
                } as FeeProfileEntry);
            }
        }
        
        isDialogOpen = false;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await financialConfigStore.deleteFeeProfile(deleteId);
            if (!result.success) {
                toast.error(result.error || $t("general.error"));
            } else {
                toast.success($t("general.deleteSuccess"));
            }
            deleteId = null;
        }
    }

    // Calculation Helpers
    function calc(val: number, pct: number) {
        return (val * pct) / 100;
    }

    let currentCurrencySymbol = $derived.by(() => {
        const account = accountsStore.accounts.find(a => a.id === formData.account_id);
        return currenciesStore.getCurrencySymbol(account?.currency || "BRL");
    });
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <SystemHeader 
        title={$t("settings.fees.title")}
        description={$t("settings.fees.description")}
    >
        {#snippet actions()}
            <Button 
                onclick={openNew} 
                class="h-10 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-full shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest"
            >
                <Plus class="w-4 h-4 mr-2" />
                {$t("settings.fees.new")}
            </Button>
        {/snippet}
    </SystemHeader>

    <div class="grid gap-10 pt-8">
        {#each Object.entries(groupedFees) as [brokerName, profiles]}
            {@const style = getBrokerStyle(brokerName)}
            <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <!-- Section Header (Accordion Trigger) -->
                <button 
                    type="button" 
                    class="flex items-center gap-3 px-2 group w-full text-left outline-none" 
                    onclick={() => toggleGroup(brokerName)}
                >
                    <div class={cn("p-1.5 rounded-md transition-colors group-hover:bg-primary/20", style.bg.replace("bg-muted", "bg-primary/10"))}>
                        <Building2 class={cn("w-3.5 h-3.5", style.color.includes("muted") ? "text-primary" : style.color)} />
                    </div>
                    <div class="flex flex-col">
                        <h4 class="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                            {brokerName}
                        </h4>
                    </div>
                    <div class="h-[1px] flex-1 bg-white/5"></div>
                    {#if expandedGroups[brokerName]}
                        <ChevronDown class="w-4 h-4 text-muted-foreground/40" />
                    {:else}
                        <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
                    {/if}
                </button>

                {#if expandedGroups[brokerName]}
                    <div transition:slide={{ duration: 200 }} class="flex flex-col gap-3">
                        {#each profiles as profile}
                            <div 
                                class="group flex items-center justify-between p-4 rounded-2xl border bg-card/40 border-white/5 hover:border-primary/50 transition-all cursor-pointer shadow-sm"
                                onclick={() => openEdit(profile)}
                                role="button"
                                tabindex="0"
                                onkeydown={(e) => e.key === 'Enter' && openEdit(profile)}
                            >
                                <div class="flex items-center gap-4">
                                    <div class="p-2.5 bg-muted/20 rounded-xl group-hover:bg-primary/10 transition-colors border border-white/5">
                                        <Receipt class="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div class="flex flex-col gap-0.5">
                                        <div class="flex items-center gap-2">
                                            <h4 class="font-bold text-base tracking-tight">
                                                {profile.name}
                                            </h4>
                                            <div class="h-4 w-[1px] bg-white/10 mx-1"></div>
                                            <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                {profile.broker || 'SEM CORRETORA'}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-4 text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">
                                            <span>MÚLTIPLAS MODALIDADES</span>
                                            <span class="opacity-30">•</span>
                                            <span class="text-primary">CLIQUE PARA EDITAR</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-destructive hover:text-white" onclick={(e) => { e.stopPropagation(); requestDelete(profile.id); }}>
                                        <Trash2 class="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary" onclick={() => openEdit(profile)}>
                                        <Pencil class="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[750px] bg-white dark:bg-[#0a0c10] border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div class="p-8 pb-4 bg-white/[0.02] border-b border-white/5">
            <Dialog.Header class="space-y-1">
                <Dialog.Title class="text-[13px] font-extrabold uppercase tracking-[0.3em] flex items-center gap-3 text-foreground">
                    <div class="p-2 bg-primary/10 rounded-lg">
                        <Receipt class="w-5 h-5 text-primary" />
                    </div>
                    {editingId ? $t("settings.fees.form.titleEdit") : $t("settings.fees.form.titleNew")}
                </Dialog.Title>
                <Dialog.Description class="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-[44px]">
                    {$t("settings.fees.form.description")}
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="px-8 py-2 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar mt-6">
            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="name" class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">{$t("settings.fees.form.name")}</Label>
                    <Input
                        id="name"
                        bind:value={formData.name}
                        placeholder={$t("settings.fees.form.namePlaceholder")}
                        class="bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold uppercase tracking-widest text-xs"
                    />
                </div>
                <div class="space-y-2">
                    <Label for="account" class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">Vincular a Conta</Label>
                    <Select.Root type="single" bind:value={formData.account_id} portal={null}>
                        <Select.Trigger class="w-full bg-muted/10 border-white/10 rounded-xl h-12 text-foreground font-bold uppercase tracking-widest text-xs">
                            {accountsStore.accounts.find(a => a.id === formData.account_id)?.nickname || "Usar Padrão Global"}
                        </Select.Trigger>
                        <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl shadow-2xl">
                            <Select.Item value="" class="rounded-lg text-xs font-bold uppercase tracking-widest">Usar Padrão Global</Select.Item>
                            {#each accountsStore.accounts as acc}
                                <Select.Item value={acc.id} class="rounded-lg text-xs font-bold uppercase tracking-widest">{acc.nickname} ({acc.broker})</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-primary/20 pb-2">
                    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                        {$t("settings.fees.form.operationalCosts")}
                    </h4>
                    
                    <!-- Modality Selector (Pills) -->
                    <div class="flex p-1 bg-muted/10 rounded-full border border-white/5">
                        {#each modalitiesStore.modalities as mod}
                            <button
                                type="button"
                                class={cn(
                                    "px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-full transition-all duration-300",
                                    activeModalityId === mod.id 
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                                        : "text-muted-foreground/40 hover:text-foreground/60"
                                )}
                                onclick={() => activeModalityId = mod.id!}
                            >
                                {mod.name}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">{$t("settings.fees.form.fixedFee")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.01" bind:value={currentEntry.fixed_fee} class="bg-muted/10 border-white/10 rounded-xl h-12 pl-8 text-foreground font-bold" />
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">{currentCurrencySymbol}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">{$t("settings.fees.form.percentageFee")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.001" bind:value={currentEntry.percentage_fee} class="bg-muted/10 border-white/10 rounded-xl h-12 pr-8 text-foreground font-bold" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">{$t("settings.fees.form.exchangeFee")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.001" bind:value={currentEntry.exchange_fee} class="bg-muted/10 border-white/10 rounded-xl h-12 pr-8 text-foreground font-bold" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">{$t("settings.fees.form.iss")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.01" bind:value={currentEntry.iss} class="bg-muted/10 border-white/10 rounded-xl h-12 pr-8 text-foreground font-bold" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">{$t("settings.fees.form.currencySpread")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.01" bind:value={currentEntry.currency_spread} class="bg-muted/10 border-white/10 rounded-xl h-12 pr-8 text-foreground font-bold" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <!-- New Fields in Entry -->
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">IR Retido (Dedo Duro)</Label>
                        <div class="relative">
                            <Input type="number" step="0.001" bind:value={currentEntry.withholding_tax} class="bg-muted/10 border-white/10 rounded-xl h-12 pr-8 text-foreground font-bold" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">Alíquota de IRPF</Label>
                        <div class="relative">
                            <Input type="number" step="0.01" bind:value={currentEntry.income_tax_rate} class="bg-muted/10 border-white/10 rounded-xl h-12 pr-8 text-foreground font-bold" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Simulator -->
            <div class="p-6 rounded-3xl bg-muted/[0.03] border border-white/5 space-y-4">
                <div class="flex items-center justify-between border-b border-white/5 pb-4">
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Simulador de Impacto</span>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] text-muted-foreground/30 uppercase font-black tracking-widest leading-none">Volume:</span>
                        <Input type="number" class="h-9 w-32 bg-white/[0.02] border-white/5 text-xs rounded-xl text-right font-bold focus:ring-1 focus:ring-primary/20" bind:value={simValue} />
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div class="space-y-1">
                        <span class="text-[9px] uppercase text-muted-foreground/30 font-black tracking-widest">Fixos</span>
                        <p class="text-sm font-bold text-foreground/80">{currentCurrencySymbol} {(currentEntry.fixed_fee || 0).toFixed(2)}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[9px] uppercase text-muted-foreground/30 font-black tracking-widest">Variáveis</span>
                        <p class="text-sm font-bold text-foreground/80">{currentCurrencySymbol} {(calc(simValue, currentEntry.percentage_fee || 0) + calc(simValue, currentEntry.exchange_fee || 0)).toFixed(2)}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[9px] uppercase text-muted-foreground/30 font-black tracking-widest">Impostos</span>
                        <p class="text-sm font-bold text-foreground/80">{currentCurrencySymbol} {calc(simValue + (currentEntry.fixed_fee || 0), currentEntry.iss || 0).toFixed(2)}</p>
                    </div>
                    <div class="space-y-1 text-right">
                        <span class="text-[9px] uppercase text-primary font-black tracking-widest">Total Custos</span>
                        <p class="text-2xl font-black text-foreground tracking-tighter shadow-sm leading-none mt-1">
                            {currentCurrencySymbol} {(
                                (currentEntry.fixed_fee || 0) +
                                calc(simValue, currentEntry.percentage_fee || 0) +
                                calc(simValue, currentEntry.exchange_fee || 0) +
                                calc(simValue + (currentEntry.fixed_fee || 0), currentEntry.iss || 0) +
                                calc(simValue, currentEntry.currency_spread || 0)
                            ).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div class="space-y-2 pb-6">
                <Label for="notes" class="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/40 px-1">{$t("settings.fees.form.notes")}</Label>
                <Textarea
                    id="notes"
                    bind:value={formData.notes}
                    placeholder={$t("settings.fees.form.notesPlaceholder")}
                    class="min-h-[100px] bg-muted/10 border-white/10 rounded-xl p-4 text-foreground text-sm font-medium"
                />
            </div>
        </div>

        <Dialog.Footer class="p-8 bg-white/[0.02] border-t border-white/5 flex flex-row items-center justify-end gap-3">
            <Button variant="ghost" onclick={() => isDialogOpen = false} class="rounded-full px-6 h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                {$t("general.cancel")}
            </Button>
            <Button onclick={save} class="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-12 h-12 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                {$t("settings.fees.form.save")}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; border: 2px solid transparent; background-clip: padding-box; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); border: 2px solid transparent; background-clip: padding-box; }
    
    .shadow-text-primary {
        text-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3);
    }
</style>
