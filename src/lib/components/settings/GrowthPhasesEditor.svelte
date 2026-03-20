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
                    <div class="relative p-3.5 rounded-xl border border-border/20 bg-card shadow-sm mb-3 space-y-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="absolute top-2 right-2 h-7 w-7 text-muted-foreground/50 hover:text-destructive transition-colors shrink-0 z-10"
                            title="Remover Fase"
                            onclick={() => removePhase(index)}
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                        </Button>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                            <div class="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/10 focus-within:border-primary/30 transition-colors">
                                <div class="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {index + 1}
                                </div>
                                <Input class="h-7 text-sm font-semibold border-0 px-2 focus-visible:ring-0 bg-transparent shadow-none" placeholder="Nome da Fase (Opcional)" bind:value={phase.name} />
                            </div>

                            <div class="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/10 focus-within:border-primary/30 transition-colors">
                                <Label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 pl-2">{$t("settings.risk.growthPlan.maxLots") || "Máx Lotes"}</Label>
                                <Input type="number" min="1" class="h-7 text-sm font-bold w-full border-0 focus-visible:ring-0 bg-transparent shadow-none text-right pr-2" bind:value={phase.lot_size} />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 border-t border-border/10 pt-3">
                            <!-- Advance Rules Block -->
                            <div class="space-y-2 p-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase flex items-center gap-1.5 tracking-wider">
                                        <TrendingUp class="w-3.5 h-3.5" />
                                        {$t("settings.risk.growthPlan.progression") || "Avanço de Fase"}
                                    </Label>
                                    <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/10" onclick={() => phase.conditions_to_advance.push({metric: 'profit_target', operator: '>=', value: 0})}>
                                        <Plus class="w-3 h-3 mr-1" /> {$t("general.add")}
                                    </Button>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                    {#each phase.conditions_to_advance as rule, ri}
                                        <div class="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 bg-background p-1 rounded border border-emerald-500/20 shadow-sm">
                                            <Select.Root type="single" bind:value={rule.metric}>
                                                <Select.Trigger class="h-7 text-xs flex-1 border-0 bg-transparent shadow-none px-2"><span class="truncate font-medium">{rule.metric === 'profit_target' ? 'Lucro' : rule.metric === 'days_positive' ? 'Dias O.K' : rule.metric === 'win_rate' ? 'Win Rate %' : rule.metric === 'consistency_days' ? 'Consistência' : rule.metric}</span></Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="profit_target" class="text-xs">Lucro ($/pts)</Select.Item>
                                                    <Select.Item value="days_positive" class="text-xs">Dias O.K</Select.Item>
                                                    <Select.Item value="win_rate" class="text-xs">Win Rate %</Select.Item>
                                                    <Select.Item value="consistency_days" class="text-xs">Consistência</Select.Item>
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
                                        <div class="text-[10px] font-medium text-emerald-600/60 dark:text-emerald-400/50 p-2 border border-dashed border-emerald-500/20 rounded-md bg-transparent text-center">Avanço exclusivamente manual.</div>
                                    {/if}
                                </div>
                            </div>

                            <!-- Demote Rules Block -->
                            <div class="space-y-2 p-2.5 rounded-lg border border-rose-500/10 bg-rose-500/5">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase flex items-center gap-1.5 tracking-wider">
                                        <TrendingUp class="w-3.5 h-3.5 rotate-180" />
                                        {$t("settings.risk.growthPlan.regression") || "Regressão"}
                                    </Label>
                                    <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] font-bold text-rose-600 dark:text-rose-500 hover:bg-rose-500/10" onclick={() => phase.conditions_to_demote.push({metric: 'drawdown_limit', operator: '<=', value: 0})}>
                                        <Plus class="w-3 h-3 mr-1" /> {$t("general.add")}
                                    </Button>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                    {#each phase.conditions_to_demote as rule, ri}
                                        <div class="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 bg-background p-1 rounded border border-rose-500/20 shadow-sm">
                                            <Select.Root type="single" bind:value={rule.metric}>
                                                <Select.Trigger class="h-7 text-xs flex-1 border-0 bg-transparent shadow-none px-2">
                                                    <span class="truncate font-medium">{rule.metric === 'drawdown_limit' ? 'Drawdown' : rule.metric === 'daily_loss_limit' ? 'Perda Diária' : rule.metric === 'max_daily_loss_streak' ? 'Dias de Loss' : rule.metric}</span>
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="drawdown_limit" class="text-xs">Drawdown ($/pts)</Select.Item>
                                                    <Select.Item value="daily_loss_limit" class="text-xs">Perda Diária ($/pts)</Select.Item>
                                                    <Select.Item value="max_daily_loss_streak" class="text-xs">Dias de Loss Seguidos</Select.Item>
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
                                        <div class="text-[10px] font-medium text-rose-600/60 dark:text-rose-400/50 p-2 border border-dashed border-rose-500/20 rounded-md bg-transparent text-center">Nenhuma regra para rebaixamento.</div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>Card.Root>
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
