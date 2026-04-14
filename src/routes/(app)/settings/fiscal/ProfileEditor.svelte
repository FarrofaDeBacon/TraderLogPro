    import { modalitiesStore } from "$lib/stores/modalities.svelte";
    import { Plus, Trash2, Save, X, Scale, Info, ShieldAlert, ReceiptText } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { appStore } from "$lib/stores/app.svelte";
    import type { TaxProfile, TaxProfileEntry } from "$lib/types";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { t } from "svelte-i18n";
    import { toast } from "svelte-sonner";
    import { cn } from "$lib/utils";

    let {
        open = $bindable(false),
        profileId = $bindable<string | null>(null),
        onSave = undefined,
    }: {
        open?: boolean;
        profileId?: string | null;
        onSave?: () => void;
    } = $props();

    let formData = $state<Omit<TaxProfile, "id">>({
        name: "",
        description: "",
    });

    let selectedModality = $state<string | null>(null);

    // Initial state: select first modality if available
    $effect(() => {
        if (open && !selectedModality && modalitiesStore.modalities.length > 0) {
            selectedModality = modalitiesStore.modalities[0].id;
        }
    });

    // Entries map for easy lookup/modification
    let entryMap = $state<Record<string, string>>({}); // modality_id -> tax_rule_id

    // Local entries for new profiles (not yet in DB)
    let localEntries = $state<Omit<TaxProfileEntry, "id" | "tax_profile_id">[]>(
        [],
    );

    // Determine mode (New vs Edit) based on profileId
    $effect(() => {
        if (open) {
            if (profileId) {
                const p = financialConfigStore.taxProfiles.find(
                    (x) => x.id === profileId,
                );
                if (p) {
                    formData = {
                        name: p.name,
                        description: p.description || "",
                    };
                    
                    // Load existing entries into map
                    const entries = financialConfigStore.getEntriesForProfile(profileId);
                    const map: Record<string, string> = {};
                    entries.forEach(e => {
                        map[e.modality_id] = e.tax_rule_id;
                    });
                    entryMap = map;
                }
            } else {
                formData = { name: "", description: "" };
                entryMap = {};
            }
        }
    });

    // Entries for this profile
    let currentEntries = $derived.by(() => {
        if (!profileId) return localEntries;
        return financialConfigStore.getEntriesForProfile(profileId);
    });

    let isSubmitting = $state(false);

    async function handleSaveProfile() {
        if (!formData.name) {
            toast.error($t("fiscal.settings.profiles.error.nameRequired"));
            return;
        }

        if (isSubmitting) return;
        isSubmitting = true;

        try {
            let targetProfileId = profileId;

            if (profileId) {
                // Updating existing profile info
                await financialConfigStore.updateTaxProfile(profileId, formData);
            } else {
                // Creating new profile
                targetProfileId = await financialConfigStore.addTaxProfile(formData);
            }

            // Sync entries (ProfileEntry map)
            // 1. Delete existing for THIS profile (simplified sync)
            if (profileId) {
                const existing = financialConfigStore.getEntriesForProfile(profileId);
                for (const e of existing) {
                    await financialConfigStore.deleteTaxProfileEntry(e.id);
                }
            }

            // 2. Add current map entries
            for (const [modId, ruleId] of Object.entries(entryMap)) {
                if (ruleId) {
                    await financialConfigStore.addTaxProfileEntry({
                        tax_profile_id: targetProfileId!,
                        modality_id: modId,
                        tax_rule_id: ruleId,
                    });
                }
            }

            toast.success(profileId ? $t("fiscal.settings.profiles.success.update") : $t("fiscal.settings.profiles.success.create"));

            // Close and reset
            open = false;
            profileId = null;
            entryMap = {};
            if (onSave) onSave();
        } catch (e) {
            console.error("Erro ao salvar perfil:", e);
            toast.error($t("fiscal.settings.profiles.error.saveError"));
        } finally {
            isSubmitting = false;
        }
    }

    function setRuleForModality(modId: string, ruleId: string) {
        if (!ruleId) {
            const newMap = { ...entryMap };
            delete newMap[modId];
            entryMap = newMap;
        } else {
            entryMap = { ...entryMap, [modId]: ruleId };
        }
    }


    // Helpers for display
    function getModalityName(id: string) {
        return modalitiesStore.modalities.find((m) => m.id === id)?.name || "N/A";
    }
    function getRuleName(id: string) {
        const r = financialConfigStore.taxRules.find((r) => r.id === id);
        return r ? `${r.name} (${r.tax_rate}%)` : "N/A";
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="sm:max-w-[550px] bg-[#0a0c10] border-white/5 rounded-[2rem] p-0 overflow-hidden shadow-2xl"
    >
        <div class="p-8 pb-4">
            <Dialog.Header class="space-y-1">
                <Dialog.Title class="text-xl font-bold text-white flex items-center gap-3">
                    <div class="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/10">
                        <Scale class="w-5 h-5" />
                    </div>
                    {profileId
                        ? "Editar Perfil Fiscal"
                        : "Novo Perfil Fiscal"}
                </Dialog.Title>
                <Dialog.Description class="text-xs text-muted-foreground">
                    Organize e vincule regras fiscais por modalidade operacional.
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="px-8 py-2 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <!-- Profile Basic Info -->
            <div class="space-y-4">
                <div class="space-y-2">
                    <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Nome do Perfil</Label>
                    <Input
                        bind:value={formData.name}
                        placeholder="Ex: Padrão Bovespa"
                        class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white"
                    />
                </div>
                <div class="space-y-2">
                    <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Descrição</Label>
                    <Input
                        bind:value={formData.description}
                        placeholder="Breve descrição do contexto fiscal"
                        class="bg-white/[0.03] border-white/10 rounded-xl h-12 text-white"
                    />
                </div>
            </div>

            <Separator class="bg-white/5" />

            <!-- Modality Driven Mapping -->
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <div class="space-y-0.5">
                        <Label class="text-[10px] uppercase font-bold tracking-widest text-white/40">Mapeamento por Modalidade</Label>
                        <p class="text-[10px] text-white/20 font-medium">Selecione uma modalidade para vincular uma regra</p>
                    </div>
                </div>

                <!-- Modality Pills -->
                <div class="flex p-1 bg-white/[0.02] border border-white/5 rounded-full w-fit">
                    {#each modalitiesStore.modalities as mod}
                        <button
                            class={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                                selectedModality === mod.id
                                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                            onclick={() => (selectedModality = mod.id)}
                        >
                            {mod.name}
                        </button>
                    {/each}
                </div>

                <!-- Slot (TaxProfileEntry Definition) -->
                <div class="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 relative overflow-hidden group">
                    <!-- Modality Background Label -->
                    <div class="absolute -right-4 top-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                        <ReceiptText size={100} />
                    </div>

                    <div class="space-y-2 relative z-10">
                        <Label class="text-[9px] uppercase font-bold tracking-widest text-emerald-500/70 block mb-3">
                            Slot: {modalitiesStore.modalities.find(m => m.id === selectedModality)?.name || '---'}
                        </Label>
                        
                        {#if selectedModality}
                            <div class="space-y-4">
                                <div class="space-y-2">
                                    <Label class="text-[10px] uppercase font-bold tracking-widest text-white/30 px-1">Regra Fiscal Vincular</Label>
                                    <Select.Root
                                        type="single"
                                        value={entryMap[selectedModality] || ""}
                                        onValueChange={(v) => selectedModality && setRuleForModality(selectedModality, v)}
                                        portal={null}
                                    >
                                        <Select.Trigger class="bg-white/5 border-white/10 rounded-xl h-11 text-white">
                                            {financialConfigStore.taxRules.find(r => r.id === entryMap[selectedModality!])?.name || "Não configurado"}
                                        </Select.Trigger>
                                        <Select.Content class="bg-[#0a0c10] border-white/10 rounded-xl">
                                            <Select.Item value="">Não configurado</Select.Item>
                                            {#each financialConfigStore.taxRules.filter(r => r.trade_type === selectedModality) as rule}
                                                <Select.Item value={rule.id}>
                                                    {rule.name} ({rule.tax_rate}%)
                                                </Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                </div>

                                <!-- Transparency/Insight info -->
                                {#if entryMap[selectedModality]}
                                    {@const activeRule = financialConfigStore.taxRules.find(r => r.id === entryMap[selectedModality!])}
                                    <div class="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-3">
                                        <Info class="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <div class="space-y-1">
                                            <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Resumo da Regra</p>
                                            <p class="text-[10px] text-white/50 leading-relaxed font-medium">
                                                Alíquota de <span class="text-white font-bold">{activeRule?.tax_rate}%</span> incide sobre 
                                                <span class="text-white font-bold">{activeRule?.basis === 'NetProfit' ? 'Lucro Líquido' : 'Volume de Vendas'}</span>.
                                            </p>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="p-3 bg-white/[0.02] border border-white/5 border-dashed rounded-xl flex items-center gap-3">
                                        <ShieldAlert class="w-4 h-4 text-white/20 shrink-0" />
                                        <p class="text-[10px] text-white/30 font-medium">
                                            Não configurado para esta modalidade.
                                        </p>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
            
            <div class="pb-10"></div>
        </div>

        <div class="p-8 bg-black/20 border-t border-white/5">
            <Dialog.Footer class="gap-2 shrink-0">
                <Button variant="ghost" onclick={() => (open = false)} class="text-white/40 hover:text-white hover:bg-transparent uppercase text-[10px] font-bold tracking-widest">
                    {$t("general.cancel")}
                </Button>
                <Button
                    onclick={handleSaveProfile}
                    class="rounded-full bg-emerald-500 text-black hover:bg-emerald-400 px-8 font-bold uppercase text-[10px] tracking-widest"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Salvando..." : profileId ? "Atualizar Perfil" : "Criar Perfil"}
                </Button>
            </Dialog.Footer>
        </div>
    </Dialog.Content>
</Dialog.Root>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.1); border-radius: 20px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.2); }
</style>

