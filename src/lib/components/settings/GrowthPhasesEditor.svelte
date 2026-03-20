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
            {simpleMode ? ($t("settings.risk.assetProfiles.overridePhases") || "Fases Específicas") : ($t("settings.risk.growthPlan.phases") + ` (${phases?.length || 0})`)}
        </h5>
        <Button size="sm" variant="outline" class={simpleMode ? "h-7 text-xs border-dashed" : ""} onclick={addPhase}>
            <Plus class="w-3 h-3 mr-1" />
            {simpleMode ? "Adicionar Fase" : $t("settings.risk.growthPlan.addPhase")}
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
                                <Label class="text-[10px] uppercase text-muted-foreground shrink-0">Máx Lotes</Label>
                                <Input type="number" min="1" class="h-7 text-xs px-2" bind:value={phase.lot_size} />
                            </div>
                            <div class="flex items-center gap-2">
                                <Label class="text-[10px] uppercase text-muted-foreground shrink-0">Nome (Opc)</Label>
                                <Input class="h-7 text-xs px-2" bind:value={phase.name} placeholder="Opcional" />
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onclick={() => removePhase(index)}>
                            <Trash2 class="w-3 h-3" />
                        </Button>
                    </div>
                {:else}
                    <Card.Root class="relative border-border/10 bg-black/5 shadow-sm rounded-xl overflow-hidden mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="absolute top-3 right-3 h-8 w-8 text-muted-foreground/50 hover:text-destructive transition-colors"
                            onclick={() => removePhase(index)}
                        >
                            <Trash2 class="w-4 h-4" />
                        </Button>
                        <Card.Header class="p-5 pb-2">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shadow-inner">
                                    {index + 1}
                                </div>
                                <Input class="h-9 text-base font-bold border-0 px-0 focus-visible:ring-0 bg-transparent" bind:value={phase.name} />
                            </div>
                        </Card.Header>
                        <Card.Content class="p-5 pt-3 space-y-5">
                            <div class="grid grid-cols-1 gap-5">
                                <div class="space-y-2.5">
                                    <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{$t("settings.risk.growthPlan.maxLots")}</Label>
                                    <Input type="number" class="h-9 text-sm" bind:value={phase.lot_size} />
                                </div>
                            </div>
                            <div class="pt-4 border-t border-border/10 space-y-6">
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <Label class="text-[11px] font-bold text-emerald-500 uppercase flex items-center gap-1.5 tracking-wider">
                                            <TrendingUp class="w-3.5 h-3.5" />
                                            {$t("settings.risk.growthPlan.progression") || "Avançar de Fase se:"}
                                        </Label>
                                        <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" onclick={() => phase.conditions_to_advance.push({metric: 'profit_target', operator: '>=', value: 0})}>
                                            <Plus class="w-3 h-3 mr-1" /> {$t("general.add")}
                                        </Button>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        {#each phase.conditions_to_advance as rule, ri}
                                            <div class="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 bg-emerald-500/5 p-1.5 rounded-md border border-emerald-500/10">
                                                <Select.Root type="single" bind:value={rule.metric}>
                                                    <Select.Trigger class="h-8 text-xs flex-1 border-0 bg-transparent shadow-none">
                                                        <span class="truncate font-medium">{rule.metric === 'profit_target' ? 'Lucro' : rule.metric === 'days_positive' ? 'Dias O.K' : rule.metric === 'win_rate' ? 'Win Rate %' : rule.metric === 'consistency_days' ? 'Consistência' : rule.metric}</span>
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        <Select.Item value="profit_target" class="text-xs">Lucro ($/pts)</Select.Item>
                                                        <Select.Item value="days_positive" class="text-xs">Dias O.K</Select.Item>
                                                        <Select.Item value="win_rate" class="text-xs">Win Rate %</Select.Item>
                                                        <Select.Item value="consistency_days" class="text-xs">Consistência</Select.Item>
                                                    </Select.Content>
                                                </Select.Root>

                                                <Select.Root type="single" bind:value={rule.operator}>
                                                    <Select.Trigger class="h-8 text-xs w-[60px] px-2 font-mono font-bold border-0 bg-transparent shadow-none">
                                                        {rule.operator}
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        <Select.Item value=">=" class="text-xs font-mono">&gt;=</Select.Item>
                                                        <Select.Item value=">" class="text-xs font-mono">&gt;</Select.Item>
                                                        <Select.Item value="<=" class="text-xs font-mono">&lt;=</Select.Item>
                                                        <Select.Item value="<" class="text-xs font-mono">&lt;</Select.Item>
                                                    </Select.Content>
                                                </Select.Root>

                                                <Input type="number" step="0.1" class="h-8 text-xs w-[75px] font-mono font-bold" bind:value={rule.value} />
                                                
                                                <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground/50 hover:text-destructive shrink-0" onclick={() => phase.conditions_to_advance.splice(ri, 1)}>
                                                    <Trash2 class="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        {/each}

                                        {#if phase.conditions_to_advance.length === 0}
                                            <div class="text-[11px] font-semibold text-muted-foreground/60 p-3 border border-dashed border-emerald-500/20 rounded-lg bg-emerald-500/5 text-center">Nenhuma regra para avançar. O avanço será manual.</div>
                                        {/if}
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <Label class="text-[11px] font-bold text-rose-500 uppercase flex items-center gap-1.5 tracking-wider">
                                            <TrendingUp class="w-3.5 h-3.5 rotate-180" />
                                            {$t("settings.risk.growthPlan.regression") || "Rebaixar de Fase se:"}
                                        </Label>
                                        <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10" onclick={() => phase.conditions_to_demote.push({metric: 'drawdown_limit', operator: '<=', value: 0})}>
                                            <Plus class="w-3 h-3 mr-1" /> {$t("general.add")}
                                        </Button>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        {#each phase.conditions_to_demote as rule, ri}
                                            <div class="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 bg-rose-500/5 p-1.5 rounded-md border border-rose-500/10">
                                                <Select.Root type="single" bind:value={rule.metric}>
                                                    <Select.Trigger class="h-8 text-xs flex-1 border-0 bg-transparent shadow-none">
                                                        <span class="truncate font-medium">{rule.metric === 'drawdown_limit' ? 'Drawdown' : rule.metric === 'daily_loss_limit' ? 'Perda Diária' : rule.metric === 'max_daily_loss_streak' ? 'Dias de Loss' : rule.metric}</span>
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        <Select.Item value="drawdown_limit" class="text-xs">Drawdown ($/pts)</Select.Item>
                                                        <Select.Item value="daily_loss_limit" class="text-xs">Perda Diária ($/pts)</Select.Item>
                                                        <Select.Item value="max_daily_loss_streak" class="text-xs">Dias de Loss Seguidos</Select.Item>
                                                    </Select.Content>
                                                </Select.Root>

                                                <Select.Root type="single" bind:value={rule.operator}>
                                                    <Select.Trigger class="h-8 text-xs w-[60px] px-2 font-mono font-bold border-0 bg-transparent shadow-none">
                                                        {rule.operator}
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        <Select.Item value=">=" class="text-xs font-mono">&gt;=</Select.Item>
                                                        <Select.Item value=">" class="text-xs font-mono">&gt;</Select.Item>
                                                        <Select.Item value="<=" class="text-xs font-mono">&lt;=</Select.Item>
                                                        <Select.Item value="<" class="text-xs font-mono">&lt;</Select.Item>
                                                    </Select.Content>
                                                </Select.Root>

                                                <Input type="number" step="0.1" class="h-8 text-xs w-[75px] font-mono font-bold" bind:value={rule.value} />
                                                
                                                <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground/50 hover:text-destructive shrink-0" onclick={() => phase.conditions_to_demote.splice(ri, 1)}>
                                                    <Trash2 class="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        {/each}

                                        {#if phase.conditions_to_demote.length === 0}
                                            <div class="text-[11px] font-semibold text-muted-foreground/60 p-3 border border-dashed border-rose-500/20 rounded-lg bg-rose-500/5 text-center">Nenhuma regra armada para rebaixamento de fase.</div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>
                {/if}
            {/each}
        </div>
    {:else}
        <div class="p-4 rounded-lg bg-black/5 border border-dashed text-center">
            <span class="text-xs text-muted-foreground">
                {simpleMode ? "Adicione ao menos 1 fase para override." : $t("settings.risk.growthPlan.noPhases")}
            </span>
        </div>
    {/if}
</div>
