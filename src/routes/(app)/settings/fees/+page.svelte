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
    import { SystemHeader, SystemCard } from "$lib/components/ui/system";
    import { t } from "svelte-i18n";
    import type { FeeProfile } from "$lib/types";
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

    let formData = $state<Omit<FeeProfile, "id">>({
        name: "",
        broker: "",
        fixed_fee: 0,
        percentage_fee: 0,
        exchange_fee: 0,
        iss: 0,
        currency_spread: 0,
        withholding_tax: 0,
        income_tax_rate: 0,
        custom_items: [],
        tax_rule_id: undefined,
        notes: "",
    });

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
            fixed_fee: 0,
            percentage_fee: 0,
            exchange_fee: 0,
            iss: 0,
            currency_spread: 0,
            withholding_tax: 0,
            income_tax_rate: 0,
            custom_items: [],
            tax_rule_id: undefined,
            notes: "",
        };
        editingId = null;
    }

    function openNew() {
        resetForm();
        isDialogOpen = true;
    }

    function openEdit(profile: FeeProfile) {
        editingId = profile.id;
        formData = { ...profile };
        isDialogOpen = true;
    }

    function save() {
        const payload = { ...formData };
        if (payload.tax_rule_id === "no_rule") {
            payload.tax_rule_id = undefined;
        }

        if (editingId) {
            financialConfigStore.updateFeeProfile(editingId, payload);
        } else {
            financialConfigStore.addFeeProfile(payload);
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
    <div class="flex items-start justify-between gap-4 mb-2">
        <div class="space-y-1">
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
                {$t("settings.fees.title")}
            </h1>
            <p class="text-sm text-muted-foreground">
                {$t("settings.fees.description")}
            </p>
        </div>
        <Button 
            onclick={openNew} 
            size="sm"
            class="h-9 px-4 font-bold bg-foreground text-background hover:bg-foreground/90 transition-all rounded-full"
        >
            <Plus class="w-4 h-4 mr-2" />
            {$t("settings.fees.new")}
        </Button>
    </div>

    <Separator class="bg-white/5" />

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
                                            <span>FIXO: {profile.fixed_fee.toFixed(2)}</span>
                                            <span class="opacity-30">•</span>
                                            <span class="text-emerald-500">VAR: {profile.percentage_fee}%</span>
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
    <Dialog.Content class="sm:max-w-[750px] bg-[#0a0c10] border-white/5 rounded-[2rem] p-0 overflow-hidden shadow-2xl">
        <div class="p-8 pb-4">
            <Dialog.Header class="space-y-1">
                <Dialog.Title class="text-xl font-bold text-white">
                    {editingId ? $t("settings.fees.form.titleEdit") : $t("settings.fees.form.titleNew")}
                </Dialog.Title>
                <Dialog.Description class="text-xs text-muted-foreground">
                    {$t("settings.fees.form.description")}
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="px-8 py-2 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="name" class="text-sm text-white/70">{$t("settings.fees.form.name")}</Label>
                    <Input
                        id="name"
                        bind:value={formData.name}
                        placeholder={$t("settings.fees.form.namePlaceholder")}
                        class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white"
                    />
                </div>
                <div class="space-y-2">
                    <Label for="account" class="text-sm text-white/70">Vincular a Conta</Label>
                    <Select.Root type="single" bind:value={formData.account_id}>
                        <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                            {accountsStore.accounts.find(a => a.id === formData.account_id)?.nickname || "Selecione a Conta"}
                        </Select.Trigger>
                        <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                            <Select.Item value="">Nenhuma (Global)</Select.Item>
                            {#each accountsStore.accounts as acc}
                                <Select.Item value={acc.id}>{acc.nickname} ({acc.broker})</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            <div class="space-y-4">
                <h4 class="text-xs font-bold uppercase tracking-widest text-white/40">
                    {$t("settings.fees.form.operationalCosts")}
                </h4>

                <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="space-y-2">
                        <Label class="text-xs text-white/60">{$t("settings.fees.form.fixedFee")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.01" bind:value={formData.fixed_fee} class="bg-white/[0.03] border-white/10 rounded-xl h-12 pl-8 text-white" />
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">{currentCurrencySymbol}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-xs text-white/60">{$t("settings.fees.form.percentageFee")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.001" bind:value={formData.percentage_fee} class="bg-white/[0.03] border-white/10 rounded-xl h-12 pr-8 text-white" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-xs text-white/60">{$t("settings.fees.form.exchangeFee")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.001" bind:value={formData.exchange_fee} class="bg-white/[0.03] border-white/10 rounded-xl h-12 pr-8 text-white" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-xs text-white/60">{$t("settings.fees.form.iss")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.01" bind:value={formData.iss} class="bg-white/[0.03] border-white/10 rounded-xl h-12 pr-8 text-white" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-xs text-white/60">{$t("settings.fees.form.currencySpread")}</Label>
                        <div class="relative">
                            <Input type="number" step="0.01" bind:value={formData.currency_spread} class="bg-white/[0.03] border-white/10 rounded-xl h-12 pr-8 text-white" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Simulator -->
            <div class="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div class="flex items-center justify-between border-b border-white/5 pb-4">
                    <span class="text-xs font-bold uppercase tracking-widest text-primary/80">Simulador de Impacto</span>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] text-white/30 uppercase font-bold">Volume:</span>
                        <Input type="number" class="h-8 w-28 bg-black/40 border-white/10 text-xs rounded-lg text-right" bind:value={simValue} />
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div class="space-y-1">
                        <span class="text-[10px] uppercase text-white/30 font-bold">Fixos</span>
                        <p class="text-sm font-medium">{currentCurrencySymbol} {formData.fixed_fee.toFixed(2)}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] uppercase text-white/30 font-bold">Variáveis</span>
                        <p class="text-sm font-medium">{currentCurrencySymbol} {(calc(simValue, formData.percentage_fee) + calc(simValue, formData.exchange_fee)).toFixed(2)}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] uppercase text-white/30 font-bold">Impostos</span>
                        <p class="text-sm font-medium">{currentCurrencySymbol} {calc(simValue + formData.fixed_fee, formData.iss).toFixed(2)}</p>
                    </div>
                    <div class="space-y-1 text-right">
                        <span class="text-[10px] uppercase text-primary font-bold">Total</span>
                        <p class="text-xl font-bold text-white tracking-tighter shadow-sm">
                            {currentCurrencySymbol} {(
                                formData.fixed_fee +
                                calc(simValue, formData.percentage_fee) +
                                calc(simValue, formData.exchange_fee) +
                                calc(simValue + formData.fixed_fee, formData.iss) +
                                calc(simValue, formData.currency_spread)
                            ).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div class="space-y-2 pb-6">
                <Label for="notes" class="text-sm text-white/70">{$t("settings.fees.form.notes")}</Label>
                <Textarea
                    id="notes"
                    bind:value={formData.notes}
                    placeholder={$t("settings.fees.form.notesPlaceholder")}
                    class="min-h-[100px] bg-white/[0.03] border-white/10 rounded-xl p-4 text-white text-sm"
                />
            </div>
        </div>

        <Dialog.Footer class="p-8 bg-black/20 border-t border-white/5">
            <div class="flex items-center justify-end gap-3 w-full">
                <Button variant="ghost" onclick={() => isDialogOpen = false} class="text-white/40 hover:text-white hover:bg-transparent">
                    {$t("general.cancel")}
                </Button>
                <Button onclick={save} class="rounded-full bg-white text-black hover:bg-neutral-200 px-8 font-bold">
                    {$t("settings.fees.form.save")}
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
    
    .shadow-text-primary {
        text-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3);
    }
</style>
