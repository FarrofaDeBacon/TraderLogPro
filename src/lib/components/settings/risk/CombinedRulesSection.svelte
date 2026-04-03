<script lang="ts">
    import { t, locale } from "svelte-i18n";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Switch } from "$lib/components/ui/switch";
    import { Trash2, Plus, GitMerge, ChevronRight, CheckCircle2, AlertCircle } from "lucide-svelte";
    import type { CombinedRiskRule, AssetRiskProfile } from "$lib/types";
    import { slide, fade } from "svelte/transition";
    import { Badge } from "$lib/components/ui/badge";

    let { rules = $bindable([]), assetRiskProfiles = [] } = $props<{
        rules: CombinedRiskRule[];
        assetRiskProfiles: AssetRiskProfile[];
    }>();

    let editingIndex = $state<number | null>(null);

    let draftRule = $state<Partial<CombinedRiskRule>>({
        name: "",
        enabled: true,
        rule_type: "sum_contracts",
        asset_risk_profile_ids: [],
        operator: "<=",
        limit_value: 0
    });

    const operators = ["<=", ">=", "=", "<", ">"];

    function openDraft(index?: number) {
        if (index !== undefined && rules[index]) {
            editingIndex = index;
            draftRule = JSON.parse(JSON.stringify(rules[index]));
        } else {
            editingIndex = -1;
            draftRule = {
                id: crypto.randomUUID(),
                name: "",
                enabled: true,
                rule_type: "sum_contracts",
                asset_risk_profile_ids: [],
                operator: "<=",
                limit_value: 0
            };
        }
    }

    function cancelDraft() {
        editingIndex = null;
    }

    function saveDraft() {
        if (!draftRule.name || draftRule.name.trim() === "") return;
        if (!draftRule.asset_risk_profile_ids || draftRule.asset_risk_profile_ids.length === 0) return;
        
        const finalizedRule = draftRule as CombinedRiskRule;

        if (editingIndex !== null && editingIndex >= 0) {
            rules[editingIndex] = finalizedRule;
        } else {
            rules = [...rules, finalizedRule];
        }
        editingIndex = null;
    }

    function removeRule(index: number) {
        rules = rules.filter((_: CombinedRiskRule, i: number) => i !== index);
    }

    function toggleAssetProfile(profileId: string) {
        const currentIds = draftRule.asset_risk_profile_ids || [];
        if (currentIds.includes(profileId)) {
            draftRule.asset_risk_profile_ids = currentIds.filter(id => id !== profileId);
        } else {
            draftRule.asset_risk_profile_ids = [...currentIds, profileId];
        }
    }
</script>

<div class="space-y-2 pt-2 mt-2 border-t border-white/5">
    <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
            <GitMerge class="w-3 h-3 text-primary/40" />
            <h3 class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                {$t("risk.rules.combined.title")}
            </h3>
        </div>
        {#if editingIndex === null}
            <Button variant="ghost" size="sm" class="h-6 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-2" onclick={() => openDraft()}>
                <Plus class="w-2.5 h-2.5 mr-1" />
                {$t("risk.rules.combined.add")}
            </Button>
        {/if}
    </div>

    {#if editingIndex !== null}
        <div in:slide={{ duration: 150 }} class="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3 animate-in zoom-in-95">
            <div class="grid grid-cols-1 gap-3">
                <div class="space-y-1">
                    <Label class="text-[8px] font-black uppercase text-primary/50 tracking-widest">{$t("risk.rules.combined.name")}</Label>
                    <Input bind:value={draftRule.name} class="h-7 bg-background/50 border-0 font-bold text-[10px]" placeholder={$t("risk.rules.combined.namePlaceholder")} />
                </div>
            </div>

            <div class="space-y-1.5">
                <Label class="text-[8px] font-black uppercase text-primary/50 tracking-widest">{$t("risk.rules.combined.linkedProfiles")}</Label>
                <div class="flex flex-wrap gap-1 p-1.5 border border-white/5 rounded-lg bg-black/20">
                    {#each assetRiskProfiles as profile}
                        {@const isSelected = draftRule.asset_risk_profile_ids?.includes(profile.id)}
                        <button
                            class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all
                                {isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}"
                            onclick={() => toggleAssetProfile(profile.id)}
                        >
                            {profile.name}
                        </button>
                    {/each}
                    {#if assetRiskProfiles.length === 0}
                        <p class="text-[8px] text-muted-foreground/30 font-bold uppercase p-0.5">Nenhum perfil disponível</p>
                    {/if}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                    <Label class="text-[8px] font-black uppercase text-primary/50 tracking-widest">Condição</Label>
                    <Select.Root type="single" bind:value={draftRule.operator}>
                        <Select.Trigger class="h-7 bg-background/50 border-0 font-bold text-[10px] ring-0 focus:ring-0">
                            {draftRule.operator}
                        </Select.Trigger>
                        <Select.Content>
                            {#each operators as op}
                                <Select.Item value={op}>{op}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
                <div class="space-y-1">
                    <Label class="text-[8px] font-black uppercase text-primary/50 tracking-widest">Limite</Label>
                    <Input type="number" bind:value={draftRule.limit_value} class="h-7 bg-background/50 border-0 font-bold text-[10px]" />
                </div>
            </div>

            <div class="flex justify-end gap-1.5 pt-2 border-t border-white/5">
                <Button variant="ghost" size="sm" class="h-7 text-[8px] font-black uppercase tracking-widest text-muted-foreground px-2" onclick={cancelDraft}>{$t("common.cancel")}</Button>
                <Button 
                    size="sm"
                    class="h-7 text-[8px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-3"
                    onclick={saveDraft} 
                    disabled={!draftRule.name || draftRule.asset_risk_profile_ids?.length === 0}
                >
                    {$t("common.save")}
                </Button>
            </div>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-1.5">
            {#each rules as rule, idx}
                <div out:fade class="group relative p-2 rounded-lg border border-white/5 bg-card/20 hover:border-primary/30 transition-all flex items-center justify-between overflow-hidden">
                    <div class="flex items-center gap-2.5">
                        <div class="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                            <GitMerge class="w-3 h-3 text-primary" />
                        </div>
                        <div class="space-y-0 min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px] {rule.enabled ? 'text-foreground' : 'text-muted-foreground opacity-50'}">{rule.name}</span>
                                <Badge variant="outline" class="h-3.5 text-[7px] font-black bg-primary/5 border-primary/20 text-primary px-1 leading-none">
                                    {rule.operator} {rule.limit_value}
                                </Badge>
                            </div>
                            <div class="flex items-center gap-0.5 mt-0.5 overflow-x-auto no-scrollbar">
                                {#each rule.asset_risk_profile_ids as apId}
                                    {@const ap = assetRiskProfiles.find((p: AssetRiskProfile) => p.id === apId)}
                                    <span class="text-[7px] font-black uppercase tracking-tighter px-1 rounded bg-white/5 text-muted-foreground/40 border border-white/5 whitespace-nowrap">
                                        {ap ? ap.name : 'Unknown'}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-0.5 translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200">
                        <button 
                            class="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors" 
                            onclick={() => openDraft(idx)}
                            aria-label="Editar regra"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button 
                            class="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-rose-500/50 hover:bg-rose-500/20 hover:text-rose-500 transition-colors" 
                            onclick={() => removeRule(idx)}
                            aria-label="Remover regra"
                        >
                            <Trash2 class="w-3 h-3" />
                        </button>
                    </div>
                </div>
            {/each}
            
            {#if rules.length === 0}
                <div class="p-4 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-center space-y-1 opacity-30">
                    <AlertCircle class="w-4 h-4" />
                    <p class="text-[8px] font-black uppercase tracking-[0.2em] leading-tight">
                        {$t("risk.rules.combined.none")}
                    </p>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
