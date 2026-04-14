<script lang="ts">
    import { Plus, Pencil, Trash2, Scale, Info, ShieldAlert } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Switch } from "$lib/components/ui/switch";
    import { Separator } from "$lib/components/ui/separator";
    import { appStore } from "$lib/stores/app.svelte";
    import type { TaxRule } from "$lib/types";
    import { cn } from "$lib/utils";
    import { SystemHeader } from "$lib/components/ui/system";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { t, locale } from "svelte-i18n";
    import { toast } from "svelte-sonner";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";

    let isDialogOpen = $state(false);
    let editingId = $state<string | null>(null);

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    let formData = $state<Omit<TaxRule, "id">>({
        name: "",
        trade_type: "DayTrade",
        tax_rate: 0,
        withholding_rate: 0,
        exemption_threshold: 0,
        basis: "NetProfit",
        cumulative_losses: true,
        revenue_code: "",
        withholding_basis: "Profit",
    });

    // --- RULES LOGIC ---

    function resetForm() {
        formData = {
            name: "",
            trade_type: "DayTrade",
            tax_rate: 15,
            withholding_rate: 0.005,
            exemption_threshold: 0,
            basis: "NetProfit",
            cumulative_losses: true,
            revenue_code: "",
            withholding_basis: "Profit",
        };
        editingId = null;
    }

    function openNew() {
        resetForm();
        isDialogOpen = true;
    }

    function openEdit(rule: TaxRule) {
        editingId = rule.id;
        formData = { ...rule };
        isDialogOpen = true;
    }

    let isSubmittingRule = $state(false);

    async function saveRule() {
        if (!formData.name) {
            toast.error($t("fiscal.settings.rules.form.nameRequired"));
            return;
        }

        if (isSubmittingRule) return;
        isSubmittingRule = true;

        try {
            if (editingId) {
                await financialConfigStore.updateTaxRule(editingId, formData);
            } else {
                await financialConfigStore.addTaxRule(formData);
            }
            // FECHAR modal
            isDialogOpen = false;
            toast.success($t("fiscal.settings.rules.form.successSave"));
        } catch (e) {
            console.error("Erro ao salvar regra:", e);
            toast.error($t("fiscal.settings.rules.form.errorSave"));
        } finally {
            isSubmittingRule = false;
        }
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await financialConfigStore.deleteTaxRule(deleteId);

            if (!result.success) {
                toast.error(result.error || $t("general.error"));
            } else {
                toast.success($t("general.deleteSuccess"));
            }
            deleteId = null;
        }
    }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <SystemHeader 
        title={$t("fiscal.settings.rules.title")}
        description={$t("fiscal.settings.rules.description")}
    >
        {#snippet actions()}
            <Button 
                onclick={openNew} 
                class="h-10 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-full shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest"
            >
                <Plus class="w-4 h-4 mr-2" />
                {$t("fiscal.settings.rules.new")}
            </Button>
        {/snippet}
    </SystemHeader>

    <div class="grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-3">
        {#each financialConfigStore.taxRules as rule}
            <div
                class="group flex flex-col p-5 rounded-[1.5rem] border bg-card/40 border-white/5 hover:border-emerald-500/50 transition-all shadow-sm relative overflow-hidden"
            >
                <!-- Background Glow -->
                <div class="absolute -right-12 -top-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>

                <div class="flex items-start justify-between mb-5 relative z-10">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/10">
                            <Scale class="w-5 h-5" />
                        </div>
                        <div>
                            <h4 class="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                                {rule.name}
                            </h4>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[9px] font-bold uppercase tracking-widest text-emerald-500/80 bg-emerald-500/5 px-1.5 py-0.5 rounded-md border border-emerald-500/10">
                                    {rule.trade_type === 'DayTrade' ? 'Day Trade' : 'Swing Trade'}
                                </span>
                                <span class="text-[9px] font-bold uppercase tracking-widest text-white/30">
                                    {rule.basis === "NetProfit" ? "LUCRO LÍQUIDO" : "VOLUME VENDAS"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-4 mb-6 relative z-10">
                    <div class="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <span class="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-1">Alíquota IR</span>
                        <p class="text-lg font-bold text-white leading-none tracking-tight">
                            {rule.tax_rate}<span class="text-xs opacity-50 ml-0.5">%</span>
                        </p>
                    </div>
                    <div class="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <span class="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-1">Retido (DD)</span>
                        <p class="text-lg font-bold text-white leading-none tracking-tight">
                            {rule.withholding_rate}<span class="text-xs opacity-50 ml-0.5">%</span>
                        </p>
                    </div>
                </div>

                <div class="space-y-2.5 mb-6 flex-1 relative z-10">
                    <div class="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-white/40">
                        <span>Prejuízos Acumuláveis</span>
                        <span class={rule.cumulative_losses ? "text-emerald-400" : "text-rose-400"}>
                            {rule.cumulative_losses ? "SIM" : "NÃO"}
                        </span>
                    </div>
                    
                    {#if rule.exemption_threshold > 0}
                        <div class="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                            <span>Isenção Mensal</span>
                            <span>R$ {rule.exemption_threshold.toLocaleString()}</span>
                        </div>
                    {/if}

                    {#if rule.revenue_code}
                        <div class="flex justify-between items-center pt-2 border-t border-white/5">
                            <span class="text-[10px] uppercase font-bold tracking-widest text-white/20">Código DARF</span>
                            <span class="text-[10px] font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded text-white/70">{rule.revenue_code}</span>
                        </div>
                    {/if}
                </div>

                <div class="flex items-center justify-end gap-1 pt-4 border-t border-white/5 relative z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 rounded-full text-white/40 hover:bg-destructive hover:text-white"
                        onclick={() => requestDelete(rule.id)}
                    >
                        <Trash2 class="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 rounded-full text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400"
                        onclick={() => openEdit(rule)}
                    >
                        <Pencil class="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        {:else}
            <div
                class="col-span-full flex flex-col items-center justify-center p-12 border border-dashed border-white/5 rounded-[2rem] text-muted-foreground/30 h-[300px] bg-white/[0.01]"
            >
                <Scale class="w-12 h-12 mb-4 opacity-10" />
                <span class="text-sm font-bold uppercase tracking-widest">{$t("fiscal.settings.rules.empty")}</span>
                <Button variant="link" onclick={openNew} class="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mt-2"
                    >{$t("fiscal.settings.rules.new")}</Button
                >
            </div>
        {/each}
    </div>
</div>

<!-- Rule Dialog -->
<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[550px] bg-white dark:bg-[#0a0c10] border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div class="p-8 pb-4">
            <Dialog.Header class="space-y-1">
                <Dialog.Title class="text-xl font-bold text-white flex items-center gap-3">
                    <div class="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/10">
                        <Scale class="w-5 h-5" />
                    </div>
                    {editingId ? "Editar Regra Fiscal" : "Nova Regra Fiscal"}
                </Dialog.Title>
                <Dialog.Description class="text-xs text-muted-foreground">
                    Define os parâmetros de alíquota e retenção para uma modalidade específica.
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="px-8 py-2 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <!-- Basic Info -->
            <div class="space-y-4">
                <div class="space-y-2">
                    <Label for="name" class="text-[10px] uppercase font-bold tracking-widest text-white/40">Nome da Regra</Label>
                    <Input
                        id="name"
                        bind:value={formData.name}
                        placeholder="Ex: Swing Trade Ações 15%"
                        class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white"
                    />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Alíquota IR</Label>
                        <div class="relative">
                            <Input type="number" step="0.1" bind:value={formData.tax_rate} class="bg-white/[0.03] border-white/10 rounded-xl h-12 pr-8 text-white" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Retenção (Dedo Duro)</Label>
                        <div class="relative">
                            <Input type="number" step="0.001" bind:value={formData.withholding_rate} class="bg-white/[0.03] border-white/10 rounded-xl h-12 pr-8 text-white" />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-30">%</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Base de Cálculo</Label>
                        <Select.Root type="single" bind:value={formData.basis} portal={null}>
                            <Select.Trigger class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                                {formData.basis === "NetProfit" ? "Lucro Líquido" : "Volume de Vendas"}
                            </Select.Trigger>
                            <Select.Content class="bg-white dark:bg-[#0a0c10] border-white/10 rounded-xl">
                                <Select.Item value="NetProfit">Lucro Líquido</Select.Item>
                                <Select.Item value="GrossProfit">Volume de Vendas</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Modalidade</Label>
                        <Select.Root type="single" bind:value={formData.trade_type} portal={null}>
                            <Select.Trigger class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white">
                                {formData.trade_type === "DayTrade" ? "Day Trade" : "Swing Trade"}
                            </Select.Trigger>
                            <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                                <Select.Item value="DayTrade">Day Trade</Select.Item>
                                <Select.Item value="SwingTrade">Swing Trade</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2 text-emerald-500">
                    <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Limite Isenção Mensal</Label>
                    <div class="relative">
                        <Input type="number" step="1000" bind:value={formData.exemption_threshold} class="bg-emerald-500/5 border-emerald-500/20 rounded-xl h-12 pl-8 text-white" />
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">R$</span>
                    </div>
                </div>
                <div class="space-y-2">
                    <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Código DARF</Label>
                    <Input bind:value={formData.revenue_code} placeholder="Ex: 5602" class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white" />
                </div>
            </div>

            <div class="space-y-4">
                <div class="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div class="space-y-0.5">
                        <Label class="text-xs font-bold text-white uppercase tracking-widest">Prejuízos Acumuláveis</Label>
                        <p class="text-[10px] text-white/30 font-medium">Permite abater prejuízos passados nesta regra</p>
                    </div>
                    <Switch bind:checked={formData.cumulative_losses} />
                </div>
            </div>
            
            <div class="pb-10"></div>
        </div>

        <Dialog.Footer class="p-8 bg-black/20 border-t border-white/5">
            <div class="flex items-center justify-end gap-3 w-full">
                <Button variant="ghost" onclick={() => isDialogOpen = false} class="text-white/40 hover:text-white hover:bg-transparent uppercase text-[10px] font-bold tracking-widest">
                    {$t("general.cancel")}
                </Button>
                <Button onclick={saveRule} class="rounded-full bg-emerald-500 text-black hover:bg-emerald-400 px-8 font-bold uppercase text-[10px] tracking-widest">
                    {isSubmittingRule ? "Salvando..." : $t("fiscal.settings.rules.form.save")}
                </Button>
            </div>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.1); border-radius: 20px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.2); }
</style>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

