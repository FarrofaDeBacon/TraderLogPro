<script lang="ts">
    import { currenciesStore } from "$lib/stores/currencies.svelte";
    import { accountsStore } from "$lib/stores/accounts.svelte";
    import {
        Plus,
        Pencil,
        Trash2,
        Wallet,
        Building2,
        Hash,
        ChevronRight,
        ChevronDown,
        Search,
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { Badge } from "$lib/components/ui/badge";
    import { appStore } from "$lib/stores/app.svelte";
    import { Label } from "$lib/components/ui/label";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import type { Account } from "$lib/types";
    import { t, locale } from "svelte-i18n";
    import { toast } from "svelte-sonner";
    import { formatCurrency } from "$lib/utils";
    import { SystemHeader, SystemInput, SystemSelect } from "$lib/components/ui/system";
    import { slide } from "svelte/transition";
    import { cn } from "$lib/utils";

    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";

    let isDialogOpen = $state(false);
    let editingId = $state<string | null>(null);
    let searchTerm = $state("");

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);
    let isProcessing = $state(false);

    let expandedGroups = $state<Record<string, boolean>>({
        Real: true,
        Prop: true,
        Demo: true
    });

    function toggleGroup(group: string) {
        expandedGroups[group] = !expandedGroups[group];
    }

    let filteredItems = $derived(
        accountsStore.accounts
            .filter(a => a.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.nickname.localeCompare(b.nickname))
    );

    let groupedAccounts = $derived(
        filteredItems.reduce((acc, account) => {
            const type = account.account_type || "Outros";
            if (!acc[type]) acc[type] = [];
            acc[type].push(account);
            return acc;
        }, {} as Record<string, Account[]>)
    );

    const typeOrder = ["Real", "Prop", "Demo"];

    let formData = $state<Omit<Account, "id">>({
        nickname: "",
        account_type: "Real",
        broker: "",
        account_number: "",
        currency: "BRL",
        currency_id: "currency:brl",
        balance: 0,
        custom_logo: null,
        default_fee_id: undefined,
    });

    function resetForm() {
        formData = {
            nickname: "",
            account_type: "Real",
            broker: "",
            account_number: "",
            currency: "BRL",
            currency_id: "currency:brl",
            balance: 0,
            custom_logo: null,
            default_fee_id: undefined,
        };
        editingId = null;
    }

    function openNew() {
        resetForm();
        isDialogOpen = true;
    }

    function openEdit(account: Account) {
        editingId = account.id;
        formData = { ...$state.snapshot(account) };
        isDialogOpen = true;
    }

    async function saveAccount() {
        if (!formData.nickname.trim()) {
            toast.error("O apelido da conta é obrigatório.");
            return;
        }

        if (isProcessing) return;
        isProcessing = true;
        try {
            if (editingId) {
                await accountsStore.updateAccount(editingId, formData);
            } else {
                await accountsStore.addAccount(formData);
            }
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
                const result = await accountsStore.deleteAccount(deleteId);
                if (result.success) {
                    toast.success($t("general.deleteSuccess"));
                    isDeleteOpen = false;
                    deleteId = null;
                } else {
                    toast.error(result.error || $t("general.error"));
                }
            } finally {
                isProcessing = false;
            }
        }
    }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <SystemHeader 
        title={$t("settings.accounts.title")}
        description={$t("settings.accounts.description")}
    >
        {#snippet actions()}
            <div class="flex items-center gap-4">
                <div class="relative hidden md:block">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    <input 
                        type="text" 
                        bind:value={searchTerm}
                        placeholder="Buscar conta..."
                        class="h-10 pl-10 pr-4 bg-muted/10 border border-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest focus:border-primary/30 outline-none w-64 transition-all focus:w-80"
                    />
                </div>
                <Button 
                    onclick={openNew} 
                    class="rounded-full px-8 h-10 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                    <Plus class="w-4 h-4 mr-2" />
                    {$t("settings.accounts.new")}
                </Button>
            </div>
        {/snippet}
    </SystemHeader>

    <div class="grid gap-10 pt-4">
        {#if filteredItems.length === 0}
            <div class="flex flex-col items-center justify-center p-32 border-2 border-dashed rounded-[3rem] border-white/5 bg-secondary/[0.02] text-muted-foreground animate-in zoom-in-95 duration-1000 shadow-2xl">
                <Wallet class="w-20 h-20 opacity-5 animate-pulse mb-8" />
                <span class="text-[10px] font-bold uppercase tracking-[0.5em] opacity-30">{$t("settings.accounts.empty")}</span>
                <Button variant="link" class="mt-6 text-[11px] font-bold uppercase tracking-[0.3em] text-primary/60 hover:text-primary transition-colors" onclick={openNew}>
                    {searchTerm ? "LIMPAR BUSCA" : "CADASTRAR PRIMEIRA CONTA"}
                </Button>
            </div>
        {:else}
            {#each typeOrder as type}
                {#if groupedAccounts[type] && groupedAccounts[type].length > 0}
                    <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <button 
                            type="button" 
                            class="flex items-center gap-3 px-2 group w-full text-left outline-none" 
                            onclick={() => toggleGroup(type)}
                        >
                            <div class={cn(
                                "p-1.5 rounded-md transition-colors",
                                type === "Real" ? "bg-emerald-500/10 text-emerald-500" :
                                type === "Prop" ? "bg-amber-500/10 text-amber-500" :
                                "bg-blue-500/10 text-blue-500"
                            )}>
                                {#if type === "Prop"}
                                    <Hash class="w-3.5 h-3.5" />
                                {:else}
                                    <Building2 class="w-3.5 h-3.5" />
                                {/if}
                            </div>
                            <h4 class="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                                {$t(`settings.accounts.types.${type}`) || type}
                            </h4>
                            <div class="h-[1px] flex-1 bg-white/5 mx-2"></div>
                            {#if expandedGroups[type]}
                                <ChevronDown class="w-4 h-4 text-muted-foreground/40" />
                            {:else}
                                <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
                            {/if}
                        </button>

                        {#if expandedGroups[type]}
                            <div transition:slide={{ duration: 200 }} class="flex flex-col gap-3">
                                {#each groupedAccounts[type] as account}
                                    <div
                                        class="group relative bg-card/40 dark:glass border border-white/5 rounded-3xl p-5 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-500 cursor-pointer flex items-center justify-between overflow-hidden shadow-sm hover:shadow-primary/5"
                                        onclick={() => openEdit(account)}
                                        role="button"
                                        tabindex={0}
                                        onkeydown={(e) => e.key === 'Enter' && openEdit(account)}
                                    >
                                        <div class="absolute inset-0 bg-gradient-to-br from-primary/0 to-blue-500/0 dark:group-hover:from-primary/[0.03] dark:group-hover:to-blue-500/[0.03] rounded-3xl transition-all duration-700 pointer-events-none"></div>

                                        <div class="relative flex items-center gap-6 shrink-0">
                                            <div class="p-1 bg-muted/20 rounded-xl group-hover:bg-primary/10 transition-colors border border-white/5 w-12 h-12 flex items-center justify-center shadow-sm shrink-0 leading-none">
                                                {#if account.account_type === "Real"}
                                                    <Building2 class="w-5 h-5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
                                                {:else}
                                                    <Wallet class="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
                                                {/if}
                                            </div>
                                            <div class="flex flex-col gap-0.5 min-w-[160px]">
                                                <div class="flex items-center gap-2">
                                                    <h4 class="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors uppercase">
                                                        {account.nickname}
                                                    </h4>
                                                    <Badge variant="outline" class={cn(
                                                        "text-[9px] h-4 font-bold uppercase tracking-tighter rounded-full border-none px-2",
                                                        type === "Real" ? "bg-emerald-500/10 text-emerald-500" :
                                                        type === "Prop" ? "bg-amber-500/10 text-amber-500" :
                                                        "bg-blue-500/10 text-blue-500"
                                                    )}>
                                                        {type}
                                                    </Badge>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                                                        {account.broker}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="relative flex flex-col items-end gap-0.5 mr-auto ml-12">
                                            <span class="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] leading-none mb-1">
                                                SALDO ATUAL
                                            </span>
                                            <span class="font-bold text-xl text-foreground tracking-tighter group-hover:scale-105 transition-transform origin-right duration-500">
                                                {formatCurrency(
                                                    account.balance,
                                                    account.currency || currenciesStore.resolveById(account.currency_id || "")?.code || "BRL",
                                                    $locale || "pt-BR",
                                                )}
                                            </span>
                                        </div>

                                        <div class="relative flex items-center gap-6">
                                            {#if account.account_number}
                                                <div class="hidden md:flex flex-col items-end gap-0.5 px-4 h-8 justify-center border-x border-white/5">
                                                    <span class="text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">NÚMERO DA CONTA</span>
                                                    <span class="font-mono text-xs text-muted-foreground/60 tracking-tight leading-none uppercase">{account.account_number}</span>
                                                </div>
                                            {/if}

                                            <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    class="h-9 w-9 rounded-full hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/20" 
                                                    onclick={(e) => { e.stopPropagation(); requestDelete(account.id); }}
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
    <Dialog.Content class="sm:max-w-[550px] overflow-visible bg-white dark:bg-[#0a0c10] border-white/5 p-0 rounded-[2.5rem] shadow-2xl">
        <Dialog.Header class="px-8 py-6 border-b border-white/5 bg-white/[0.02] rounded-t-[2.5rem]">
            <Dialog.Title class="text-[13px] font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-lg">
                    <Wallet class="w-5 h-5 text-primary" />
                </div>
                {editingId
                    ? $t("settings.accounts.form.titleEdit")
                    : $t("settings.accounts.form.titleNew")}
            </Dialog.Title>
            <Dialog.Description class="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-[44px]">
                {editingId ? "Atualize os parâmetros de sua conta ativa" : "Configure uma nova conta real ou simulada"}
            </Dialog.Description>
        </Dialog.Header>

        <div class="px-8 py-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <SystemInput 
                label={$t("settings.accounts.form.nickname") + "*"}
                bind:value={formData.nickname}
                placeholder={$t("settings.accounts.form.nicknamePlaceholder")}
                class="font-bold uppercase tracking-widest text-lg h-12"
            />

            <div class="grid grid-cols-2 gap-4">
                <SystemSelect 
                    label={$t("settings.accounts.form.type")}
                    bind:value={formData.account_type}
                    portal={null}
                    options={[
                        { value: "Real", label: $t("settings.accounts.types.Real") },
                        { value: "Prop", label: $t("settings.accounts.types.Prop") },
                        { value: "Demo", label: $t("settings.accounts.types.Demo") }
                    ]}
                >
                    {#snippet icon()}
                        <Building2 class="w-4 h-4 text-primary" />
                    {/snippet}
                </SystemSelect>

                <SystemInput 
                    label={$t("settings.accounts.form.broker")}
                    bind:value={formData.broker}
                    placeholder="Ex: XP Investimentos"
                    class="font-bold uppercase tracking-widest"
                />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <SystemInput 
                    label={$t("settings.accounts.form.number")}
                    bind:value={formData.account_number}
                    placeholder="Opcional"
                    class="font-bold uppercase tracking-widest font-mono"
                />

                <SystemSelect 
                    label={$t("settings.accounts.form.currency")}
                    bind:value={formData.currency_id}
                    portal={null}
                    onValueChange={(val) => {
                        const resolved = currenciesStore.resolveById(val);
                        if (resolved) formData.currency = resolved.code;
                    }}
                    options={currenciesStore.currencies.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                />
            </div>

            <Separator class="bg-white/5 opacity-50" />

            <div class="space-y-4">
                <div class="flex items-center justify-between px-1">
                    <Label class="text-[10px] uppercase font-bold tracking-widest text-white/30">Taxa Operacional Padrão</Label>
                    <Badge variant="outline" class="text-[8px] h-4 bg-primary/10 border-primary/20 text-primary font-bold uppercase tracking-tighter">
                        {formData.default_fee_id ? "Soberana" : "Usar Padrão Global"}
                    </Badge>
                </div>
                <Select.Root type="single" bind:value={formData.default_fee_id} portal={null}>
                    <Select.Trigger class="w-full bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                        {financialConfigStore.fees.find(f => f.id === formData.default_fee_id)?.name || "Usar Padrão Global"}
                    </Select.Trigger>
                    <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl">
                        <Select.Item value="">Usar Padrão Global</Select.Item>
                        {#each financialConfigStore.fees as fee}
                            <Select.Item value={fee.id}>
                                {fee.name} ({fee.broker || "Global"})
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <div class="space-y-2">
                <Label class="text-[10px] uppercase font-bold tracking-widest text-white/30 px-1">Saldo de Abertura / Atual</Label>
                <div class="relative group">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 text-sm font-black group-focus-within:text-primary transition-colors">
                        {currenciesStore.getCurrencySymbol(formData.currency_id || formData.currency)}
                    </span>
                    <input 
                        type="number"
                        bind:value={formData.balance}
                        step="0.01"
                        class="h-12 w-full bg-white/[0.03] border border-white/10 rounded-xl px-12 text-lg font-bold tracking-tight focus:border-primary/40 outline-none transition-all"
                    />
                </div>
            </div>
        </div>

        <Dialog.Footer class="px-8 py-6 border-t border-white/5 bg-white/[0.02] rounded-b-[2.5rem] gap-3">
            <Button variant="ghost" onclick={() => (isDialogOpen = false)} class="rounded-full px-6 h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >{$t("general.cancel")}</Button
            >
            <Button onclick={saveAccount} disabled={isProcessing} class="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:scale-105 transition-all shadow-xl shadow-primary/20">
                {#if isProcessing}
                    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                {/if}
                {$t("settings.accounts.form.save")}
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
