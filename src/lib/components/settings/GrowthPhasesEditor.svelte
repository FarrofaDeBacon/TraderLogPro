<script lang="ts">
    import type { GrowthPhase } from "$lib/types";
    import { Plus, Trash2, TrendingUp } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Card from "$lib/components/ui/card";
    import * as Select from "$lib/components/ui/select";
    import { t } from "svelte-i18n";

    let { phases = $bindable([]), simpleMode = false, onChange } = $props<{ phases?: GrowthPhase[], simpleMode?: boolean, onChange?: () => void }>();

    function addPhase() {
        if (!phases) phases = [];
        phases = [
            ...phases,
            {
                level: phases.length + 1,
                name: "",
                lot_size: 1,
                conditions_to_advance: [],
                conditions_to_demote: [],
            },
        ];
        onChange?.();
    }

    function removePhase(index: number) {
        if (!phases) return;
        phases = phases.filter((_: unknown, i: number) => i !== index);
        phases = phases.map((p: GrowthPhase, i: number) => ({ ...p, level: i + 1 }));
        onChange?.();
    }
</script>

<div class="mt-4 space-y-3">
    <div class="flex items-center justify-between">
        <h5 class={simpleMode ? "text-xs font-bold uppercase tracking-widest text-muted-foreground" : "text-sm font-medium"}>
            {simpleMode ? $t("risk.growth.phases") : ($t("risk.growth.phases") + ` (${phases?.length || 0})`)}
        </h5>
        <Button variant="outline" size="sm" class="gap-2" onclick={addPhase}>
            <Plus class="w-4 h-4" />
            {simpleMode ? $t("risk.growth.addPhase") : $t("common.add")}
        </Button>
    </div>

    {#if phases && phases.length > 0}
        <div class={simpleMode ? "space-y-2" : "grid gap-3 max-h-[400px] overflow-y-auto pr-2"}>
            {#each phases as phase, index}
                {#if simpleMode}
                    <div class="flex items-center gap-2 p-2 rounded-lg border bg-black/5">
                        <div class="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-500">
                            {index + 1}
                        </div>
                        <div class="flex-1 grid grid-cols-2 gap-2">
                            <div class="flex items-center gap-2">
                                <Label class="text-[10px] uppercase text-muted-foreground shrink-0">{$t("risk.growth.maxLotsLabel")}</Label>
                                <Input type="number" step="0.01" class="h-8" bind:value={phase.lot_size} />
                            </div>
                            <div class="flex items-center gap-2">
                                <Label class="text-[10px] uppercase text-muted-foreground shrink-0">{$t("risk.growth.phaseNameLabel")}</Label>
                                <Input class="h-8" bind:value={phase.name} placeholder={$t("risk.growth.optional")} />
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onclick={() => removePhase(index)}>
                            <Trash2 class="w-3 h-3" />
                        </Button>
                    </div>
                {:else}
                    <div class="relative p-3.5 rounded-xl border border-border/20 bg-card shadow-sm mb-3 space-y-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="absolute top-2 right-2 h-7 w-7 text-muted-foreground/50 hover:text-destructive transition-colors shrink-0 z-10"
                            title={$t("risk.messages.removePhase")}
                            onclick={() => removePhase(index)}
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                        </Button>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                            <div class="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/10 focus-within:border-primary/30 transition-colors">
                                <div class="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {index + 1}
                                </div>
                                <Input class="h-7 text-sm font-semibold border-0 px-2 focus-visible:ring-0 bg-transparent shadow-none" placeholder={$t("risk.growth.phaseNamePlaceholder")} bind:value={phase.name} />
                            </div>

                            <div class="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/10 focus-within:border-primary/30 transition-colors">
                                <Label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 pl-2">{$t("risk.growth.maxLotsLabel")}</Label>
                                <Input type="number" step="0.01" min="0.01" class="h-7 text-sm font-bold w-full border-0 focus-visible:ring-0 bg-transparent shadow-none text-right pr-2" bind:value={phase.lot_size} />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 border-t border-border/10 pt-3">
                            <!-- Advance Rules Block -->
                            <div class="space-y-2 p-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase flex items-center gap-1.5 tracking-wider">
                                        <TrendingUp class="w-3.5 h-3.5" />
                                        {$t("risk.growth.progression")}
                                    </Label>
                                    <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/10" onclick={() => phase.conditions_to_advance.push({metric: 'profit', operator: '>=', value: 0})}>
                                        <Plus class="w-3 h-3 mr-1" /> {$t("common.add")}
                                    </Button>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                    {#each phase.conditions_to_advance as rule, ri}
                                        <div class="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 bg-background p-1 rounded border border-emerald-500/20 shadow-sm">
                                            <Select.Root type="single" bind:value={rule.metric}>
                                                <Select.Trigger class="h-7 text-xs flex-1 border-0 bg-transparent shadow-none px-2">
                                                    <Select.Value placeholder={$t("risk.growth.metrics.profit")} />
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="profit">{$t("risk.growth.metrics.profit")}</Select.Item>
                                                    <Select.Item value="days">{$t("risk.growth.metrics.days")}</Select.Item>
                                                    <Select.Item value="winRate">{$t("risk.growth.metrics.winRate")}</Select.Item>
                                                    <Select.Item value="consistency">{$t("risk.growth.metrics.consistency")}</Select.Item>
                                                </Select.Content>
                                            </Select.Root>

                                            <Select.Root type="single" bind:value={rule.operator}>
                                                <Select.Trigger class="h-7 text-xs w-[56px] px-1 font-mono font-bold border-0 bg-transparent shadow-none justify-center">
                                                    {rule.operator}
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value=">=" class="text-xs font-mono">&gt;=</Select.Item>
                                                    <Select.Item value=">" class="text-xs font-mono">&gt;</Select.Item>
                                                    <Select.Item value="<=" class="text-xs font-mono">&lt;=</Select.Item>
                                                    <Select.Item value="<" class="text-xs font-mono">&lt;</Select.Item>
                                                </Select.Content>
                                            </Select.Root>

                                            <Input type="number" step="0.1" class="h-7 text-xs w-[70px] font-mono font-bold bg-muted/50 border-border/50" bind:value={rule.value} />
                                            
                                            <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground/40 hover:text-destructive shrink-0" onclick={() => phase.conditions_to_advance.splice(ri, 1)}>
                                                <Trash2 class="w-3 h-3" />
                                            </Button>
                                        </div>
                                    {/each}

                                    {#if phase.conditions_to_advance.length === 0}
                                        <div class="text-[10px] font-medium text-emerald-600/60 dark:text-emerald-400/50 p-2 border border-dashed border-emerald-500/20 rounded-md bg-transparent text-center">
                                            {$t("risk.growth.manualAdvanceOnly")}
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- Demote Rules Block -->
                            <div class="space-y-2 p-2.5 rounded-lg border border-rose-500/10 bg-rose-500/5">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase flex items-center gap-1.5 tracking-wider">
                                        <TrendingUp class="w-3.5 h-3.5 rotate-180" />
                                        {$t("risk.growth.regression")}
                                    </Label>
                                    <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] font-bold text-rose-600 dark:text-rose-500 hover:bg-rose-500/10" onclick={() => phase.conditions_to_demote.push({metric: 'drawdown', operator: '<=', value: 0})}>
                                        <Plus class="w-3 h-3 mr-1" /> {$t("common.add")}
                                    </Button>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                    {#each phase.conditions_to_demote as rule, ri}
                                        <div class="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 bg-background p-1 rounded border border-rose-500/20 shadow-sm">
                                            <Select.Root type="single" bind:value={rule.metric}>
                                                <Select.Trigger class="h-7 text-xs flex-1 border-0 bg-transparent shadow-none px-2">
                                                    <Select.Value placeholder={$t("risk.growth.metrics.drawdown")} />
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="drawdown">{$t("risk.growth.metrics.drawdown")}</Select.Item>
                                                    <Select.Item value="dailyLoss">{$t("risk.growth.metrics.dailyLoss")}</Select.Item>
                                                    <Select.Item value="lossStreak">{$t("risk.growth.metrics.lossStreak")}</Select.Item>
                                                </Select.Content>
                                            </Select.Root>

                                            <Select.Root type="single" bind:value={rule.operator}>
                                                <Select.Trigger class="h-7 text-xs w-[56px] px-1 font-mono font-bold border-0 bg-transparent shadow-none justify-center">
                                                    {rule.operator}
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value=">=" class="text-xs font-mono">&gt;=</Select.Item>
                                                    <Select.Item value=">" class="text-xs font-mono">&gt;</Select.Item>
                                                    <Select.Item value="<=" class="text-xs font-mono">&lt;=</Select.Item>
                                                    <Select.Item value="<" class="text-xs font-mono">&lt;</Select.Item>
                                                </Select.Content>
                                            </Select.Root>

                                            <Input type="number" step="0.1" class="h-7 text-xs w-[70px] font-mono font-bold bg-muted/50 border-border/50" bind:value={rule.value} />
                                            
                                            <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground/40 hover:text-destructive shrink-0" onclick={() => phase.conditions_to_demote.splice(ri, 1)}>
                                                <Trash2 class="w-3 h-3" />
                                            </Button>
                                        </div>
                                    {/each}

                                    {#if phase.conditions_to_demote.length === 0}
                                        <div class="text-[10px] font-medium text-rose-600/60 dark:text-rose-400/50 p-2 border border-dashed border-rose-500/20 rounded-md bg-transparent text-center">
                                            {$t("risk.growth.noRegressionRules")}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    {:else}
        <div class="p-8 text-center border-2 border-dashed rounded-xl bg-muted/20">
            <p class="text-sm text-muted-foreground">{$t("risk.growth.addPhaseOverride")}</p>
        </div>
    {/if}
</div>
