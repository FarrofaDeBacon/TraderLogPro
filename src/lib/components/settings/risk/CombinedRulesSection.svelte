<script lang="ts">
    import { t } from "svelte-i18n";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Switch } from "$lib/components/ui/switch";
    import { Trash2, Plus, GitMerge } from "lucide-svelte";
    import type { CombinedRiskRule, AssetRiskProfile } from "$lib/types";

    let { rules = $bindable([]), availableAssetProfiles = [] } = $props<{
        rules: CombinedRiskRule[];
        availableAssetProfiles: AssetRiskProfile[];
    }>();

    let editingIndex = $state<number | null>(null);

    // Initial Empty Rule Form
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

<div class="space-y-5 p-5 rounded-xl border border-border/10 bg-black/5 shadow-sm mt-6">
    <div class="flex items-center justify-between">
        <h3 class="flex items-center gap-2 font-bold text-muted-foreground">
            <GitMerge class="w-4 h-4" />
            {$t("risk.rules.combined.title")}
        </h3>
        {#if editingIndex === null}
            <Button variant="outline" size="sm" onclick={() => openDraft()}>
                <Plus class="w-4 h-4 mr-2" />
                {$t("risk.rules.combined.add")}
            </Button>
        {/if}
    </div>

    {#if editingIndex !== null}
        <!-- Form de Edição / Criação -->
        <div class="p-4 rounded-lg border bg-background/50 space-y-4">
            <div class="grid grid-cols-1 gap-4">
                <div class="space-y-2">
                    <Label>{$t("risk.rules.combined.name")}</Label>
                    <Input bind:value={draftRule.name} placeholder={$t("risk.rules.combined.namePlaceholder")} />
                </div>
                <div class="space-y-2">
                    <Label>{$t("risk.rules.combined.type")}</Label>
                    <Select.Root disabled type="single" value="sum_contracts">
                        <Select.Trigger>
                            {$t("risk.rules.combined.sumContracts")}
                        </Select.Trigger>
                    </Select.Root>
                </div>
            </div>

            <div class="space-y-2">
                <Label>{$t("risk.rules.combined.linkedProfiles")}</Label>
                <div class="flex flex-wrap gap-2 p-3 border rounded-md min-h-12 bg-background/30">
                    {#if availableAssetProfiles.length === 0}
                        <p class="text-xs text-muted-foreground">{$t("risk.plan.scope.noAssets")}</p>
                    {/if}
                    {#each availableAssetProfiles as profile}
                        {@const isSelected = draftRule.asset_risk_profile_ids?.includes(profile.id as string)}
                        <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            class="rounded-full shadow-none"
                            onclick={() => toggleAssetProfile(profile.id as string)}
                        >
                            {profile.name}
                        </Button>
                    {/each}
                </div>
                {#if draftRule.asset_risk_profile_ids?.length === 0}
                    <p class="text-xs text-amber-500">{$t("risk.plan.scope.selectAtLeastOne")}</p>
                {/if}
            </div>

            <div class="grid grid-cols-1 gap-4">
                <div class="space-y-2">
                    <Label>{$t("common.operator")}</Label>
                    <Select.Root
                        type="single"
                        bind:value={draftRule.operator}
                    >
                        <Select.Trigger>
                            {draftRule.operator}
                        </Select.Trigger>
                        <Select.Content>
                            {#each operators as op}
                                <Select.Item value={op}>{op}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
                <div class="space-y-2">
                    <Label>{$t("risk.rules.combined.limit")}</Label>
                    <Input type="number" bind:value={draftRule.limit_value} />
                </div>
            </div>

            <div class="flex items-center space-x-2 pt-2 pb-2">
                <Switch id="rule-active" bind:checked={draftRule.enabled} />
                <Label for="rule-active">{$t("risk.rules.active")}</Label>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" onclick={cancelDraft}>{$t("common.cancel")}</Button>
                <Button 
                    onclick={saveDraft} 
                    disabled={!draftRule.name || draftRule.asset_risk_profile_ids?.length === 0}
                >
                    {$t("common.save")}
                </Button>
            </div>
        </div>
    {:else}
        <!-- Listagem -->
        {#if rules.length === 0}
            <div class="p-6 text-center border border-dashed rounded-lg bg-background/30 text-muted-foreground text-sm">
                {$t("risk.rules.combined.none")}
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-3">
                {#each rules as rule, idx}
                    <div class="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border bg-background/50 hover:border-primary/50 transition-colors gap-3">
                        <div class="flex flex-col gap-1">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-sm {rule.enabled ? '' : 'text-muted-foreground line-through'}">{rule.name}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    {rule.rule_type === 'sum_contracts' ? $t("risk.rules.combined.sumContracts") : rule.rule_type} 
                                    {rule.operator} {rule.limit_value}
                                </span>
                            </div>
                            <div class="flex items-center gap-1 flex-wrap">
                                <span class="text-xs text-muted-foreground">{$t("risk.tooltips.combinedRuleAssets")}</span>
                                {#each rule.asset_risk_profile_ids as apId}
                                    {@const ap = availableAssetProfiles.find((p: AssetRiskProfile) => p.id === apId)}
                                    <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                                        {ap ? ap.name : apId}
                                    </span>
                                {/each}
                            </div>
                        </div>

                        <div class="flex items-center gap-2 self-end md:self-auto">
                            <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary" onclick={() => openDraft(idx)}>
                                <span class="sr-only">{$t("common.edit")}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </Button>
                            <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:bg-destructive/10" onclick={() => removeRule(idx)}>
                                <span class="sr-only">{$t("common.delete")}</span>
                                <Trash2 class="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>
