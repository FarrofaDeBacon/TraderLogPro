<script lang="ts">
    import type { GrowthPhase } from "$lib/types";
    import { Plus, Trash2, TrendingUp } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Card from "$lib/components/ui/card";
    import * as Select from "$lib/components/ui/select";
    import { t } from "svelte-i18n";

    let { 
        phases = $bindable([]), 
        activePhaseIndex = $bindable(0), 
        simpleMode = false, 
        wizardMode = false, 
        targetUnit = 'financial',
        drawdownUnit = 'financial',
        onChange 
    } = $props<{ 
        phases?: GrowthPhase[], 
        activePhaseIndex?: number, 
        simpleMode?: boolean, 
        wizardMode?: boolean, 
        targetUnit?: 'financial' | 'points',
        drawdownUnit?: 'financial' | 'points',
        onChange?: () => void 
    }>();

    const advanceMetrics: Record<string, string> = {
        profit: 'risk.growth.metrics.profit',
        totalTarget: 'risk.growth.metrics.totalTarget',
        dailyTarget: 'risk.growth.metrics.dailyTarget',
        days: 'risk.growth.metrics.days',
        winRate: 'risk.growth.metrics.winRate',
        consistency: 'risk.growth.metrics.consistency'
    };

    const demoteMetrics: Record<string, string> = {
        drawdown: 'risk.growth.metrics.drawdown',
        dailyLoss: 'risk.growth.metrics.dailyLoss',
        lossStreak: 'risk.growth.metrics.lossStreak'
    };

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
        activePhaseIndex = phases.length - 1;
        onChange?.();
    }

    function removePhase(index: number) {
        if (!phases) return;
        phases = phases.filter((_: unknown, i: number) => i !== index);
        phases = phases.map((p: GrowthPhase, i: number) => ({ ...p, level: i + 1 }));
        if (activePhaseIndex >= phases.length) {
            activePhaseIndex = Math.max(0, phases.length - 1);
        }
        onChange?.();
    }
</script>

<div class={wizardMode ? "space-y-3" : "mt-4 space-y-3"}>
    {#if !wizardMode}
        <div class="flex items-center justify-between">
            <h5 class={simpleMode ? "text-xs font-bold uppercase tracking-widest text-muted-foreground" : "text-sm font-medium"}>
                {simpleMode ? $t("risk.growth.phases") : ($t("risk.growth.phases") + ` (${phases?.length || 0})`)}
            </h5>
            {#if simpleMode || !phases || phases.length === 0}
                <Button variant="outline" size="sm" class="gap-2" onclick={addPhase}>
                    <Plus class="w-4 h-4" />
                    {simpleMode ? $t("risk.growth.addPhase") : $t("common.add")}
                </Button>
            {/if}
        </div>
    {/if}

    {#if phases && phases.length > 0}
        {#if simpleMode}
            <div class="space-y-2">
                {#each phases as phase, index}
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
                {/each}
            </div>
        {:else}
            <!-- DETAIL/EDITOR para Active Phase -->
            {#if phases[activePhaseIndex]}
                {@const phase = phases[activePhaseIndex]}
                {@const index = activePhaseIndex}
                <div class="relative p-3 rounded-xl border border-indigo-500/20 bg-background shadow-sm mb-3 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div class="absolute -top-3 left-4 px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-500/20 backdrop-blur-md">
                        {phase.name || `Configurando Fase ${index + 1}`}
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-[1fr_140px_40px] gap-3 pt-1 pr-0 min-w-0 items-center">
                        <div class="flex items-center gap-2 bg-muted/20 p-1 rounded-lg border border-border/5 focus-within:border-primary/30 transition-colors min-w-0">
                            <Label class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 pl-2">{$t("risk.growth.phaseNameLabel")}</Label>
                            <Input class="h-7 text-[11px] font-semibold border-0 px-2 focus-visible:ring-0 bg-transparent shadow-none w-full" placeholder={$t("risk.growth.phaseNamePlaceholder")} bind:value={phase.name} />
                        </div>

                        <div class="flex items-center gap-2 bg-muted/20 p-1 rounded-lg border border-border/5 focus-within:border-primary/30 transition-colors">
                            <Label class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 pl-2">{$t("risk.growth.maxLotsLabel")}</Label>
                            <Input type="number" step="0.01" min="0.01" class="h-7 text-[11px] font-bold w-full border-0 focus-visible:ring-0 bg-transparent shadow-none text-right pr-2" bind:value={phase.lot_size} />
                        </div>
                        
                        <div class="flex justify-end pr-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-6 w-6 text-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 rounded-md"
                                title={$t("risk.messages.removePhase")}
                                onclick={() => removePhase(index)}
                            >
                                <Trash2 class="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-border/5 pt-2 w-full">
                        <!-- Advance Rules Block -->
                        <div class="space-y-2 p-2 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] shadow-sm">
                            <div class="flex items-center justify-between px-1">
                                <Label class="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1.5 tracking-wider">
                                    <div class="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <TrendingUp class="w-3 h-3" />
                                    </div>
                                    {$t("risk.growth.progression")}
                                </Label>
                                <Button variant="outline" size="sm" class="h-6 px-2 text-[9px] font-bold text-emerald-500 border-emerald-500/10 hover:bg-emerald-500/10 rounded-full" onclick={() => phase.conditions_to_advance.push({metric: 'profit', operator: '>=', value: 0})}>
                                    <Plus class="w-2.5 h-2.5 mr-1" /> {$t("common.add")}
                                </Button>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                {#each phase.conditions_to_advance as rule, ri}
                                <div class="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 bg-background/50 p-1 rounded-lg border border-emerald-500/10 shadow-sm min-w-0">
                                        <Select.Root type="single" bind:value={rule.metric}>
                                            <Select.Trigger class="h-7 text-[10px] flex-1 min-w-[80px] border-0 bg-muted/20 shadow-none px-2 font-semibold rounded-md">
                                                {rule.metric ? $t(advanceMetrics[rule.metric] || 'risk.growth.metrics.profit') : $t('risk.growth.metrics.profit')}
                                            </Select.Trigger>
                                            <Select.Content>
                                                <Select.Item value="totalTarget">{$t("risk.growth.metrics.totalTarget")}</Select.Item>
                                                <Select.Item value="dailyTarget">{$t("risk.growth.metrics.dailyTarget")}</Select.Item>
                                                <Select.Item value="profit">{$t("risk.growth.metrics.profit")}</Select.Item>
                                                <Select.Item value="days">{$t("risk.growth.metrics.days")}</Select.Item>
                                                <Select.Item value="winRate">{$t("risk.growth.metrics.winRate")}</Select.Item>
                                                <Select.Item value="consistency">{$t("risk.growth.metrics.consistency")}</Select.Item>
                                            </Select.Content>
                                        </Select.Root>

                                        <Select.Root type="single" bind:value={rule.operator}>
                                            <Select.Trigger class="h-7 text-[10px] w-12 px-1 font-mono font-bold border-0 bg-muted/20 shadow-none justify-center rounded-md">
                                                {rule.operator}
                                            </Select.Trigger>
                                            <Select.Content>
                                                <Select.Item value=">=" class="text-[10px] font-mono">&gt;=</Select.Item>
                                                <Select.Item value=">" class="text-[10px] font-mono">&gt;</Select.Item>
                                                <Select.Item value="<=" class="text-[10px] font-mono">&lt;=</Select.Item>
                                                <Select.Item value="<" class="text-[10px] font-mono">&lt;</Select.Item>
                                            </Select.Content>
                                        </Select.Root>

                                        <div class="relative flex items-center">
                                            <Input type="number" step="0.1" class="h-7 text-[10px] w-[65px] font-mono font-bold bg-muted/20 border-0 rounded-md pr-5 text-right" bind:value={rule.value} />
                                            <span class="absolute right-1.5 text-[8px] font-bold text-muted-foreground opacity-50 uppercase tracking-tighter">
                                                {['profit', 'totalTarget', 'dailyTarget'].includes(rule.metric) ? (targetUnit === 'points' ? 'pts' : '$') : 
                                                 rule.metric === 'winRate' ? '%' : ''}
                                            </span>
                                        </div>
                                        
                                        <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-md" onclick={() => { phase.conditions_to_advance = phase.conditions_to_advance.filter((_v: any, i: number) => i !== ri); onChange?.(); }}>
                                            <Trash2 class="w-3 h-3" />
                                        </Button>
                                    </div>
                                {/each}

                                {#if phase.conditions_to_advance.length === 0}
                                    <div class="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500/60 p-3 border border-dashed border-emerald-500/20 rounded-lg bg-emerald-500/5 text-center">
                                        {$t("risk.growth.manualAdvanceOnly")}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="space-y-2 p-2 rounded-xl border border-rose-500/10 bg-rose-500/[0.03] shadow-sm">
                            <div class="flex items-center justify-between px-1">
                                <Label class="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1.5 tracking-wider">
                                    <div class="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center">
                                        <TrendingUp class="w-3 h-3 rotate-180" />
                                    </div>
                                    {$t("risk.growth.regression")}
                                </Label>
                                <Button variant="outline" size="sm" class="h-6 px-2 text-[9px] font-bold text-rose-500 border-rose-500/10 hover:bg-rose-500/10 rounded-full" onclick={() => phase.conditions_to_demote.push({metric: 'drawdown', operator: '<=', value: 0})}>
                                    <Plus class="w-2.5 h-2.5 mr-1" /> {$t("common.add")}
                                </Button>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                {#each phase.conditions_to_demote as rule, ri}
                                    <div class="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 bg-background/50 p-1 rounded-lg border border-rose-500/10 shadow-sm">
                                        <Select.Root type="single" bind:value={rule.metric}>
                                            <Select.Trigger class="h-7 text-[10px] flex-1 border-0 bg-muted/20 shadow-none px-2 font-semibold rounded-md">
                                                {rule.metric ? $t(demoteMetrics[rule.metric] || 'risk.growth.metrics.drawdown') : $t('risk.growth.metrics.drawdown')}
                                            </Select.Trigger>
                                            <Select.Content>
                                                <Select.Item value="drawdown">{$t("risk.growth.metrics.drawdown")}</Select.Item>
                                                <Select.Item value="dailyLoss">{$t("risk.growth.metrics.dailyLoss")}</Select.Item>
                                                <Select.Item value="lossStreak">{$t("risk.growth.metrics.lossStreak")}</Select.Item>
                                            </Select.Content>
                                        </Select.Root>

                                        <Select.Root type="single" bind:value={rule.operator}>
                                            <Select.Trigger class="h-7 text-[10px] w-12 px-1 font-mono font-bold border-0 bg-muted/20 shadow-none justify-center rounded-md">
                                                {rule.operator}
                                            </Select.Trigger>
                                            <Select.Content>
                                                <Select.Item value=">=" class="text-[10px] font-mono">&gt;=</Select.Item>
                                                <Select.Item value=">" class="text-[10px] font-mono">&gt;</Select.Item>
                                                <Select.Item value="<=" class="text-[10px] font-mono">&lt;=</Select.Item>
                                                <Select.Item value="<" class="text-[10px] font-mono">&lt;</Select.Item>
                                            </Select.Content>
                                        </Select.Root>

                                        <div class="relative flex items-center">
                                            <Input type="number" step="0.1" class="h-7 text-[10px] w-[65px] font-mono font-bold bg-muted/20 border-0 rounded-md pr-5 text-right" bind:value={rule.value} />
                                            <span class="absolute right-1.5 text-[8px] font-bold text-muted-foreground opacity-50 uppercase tracking-tighter">
                                                {(rule.metric === 'drawdown' || rule.metric === 'dailyLoss') ? (drawdownUnit === 'points' ? 'pts' : '$') : ''}
                                            </span>
                                        </div>
                                        
                                        <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-md" onclick={() => { phase.conditions_to_demote = phase.conditions_to_demote.filter((_v: any, i: number) => i !== ri); onChange?.(); }}>
                                            <Trash2 class="w-3 h-3" />
                                        </Button>
                                    </div>
                                {/each}

                                {#if phase.conditions_to_demote.length === 0}
                                    <div class="text-[10px] font-bold text-rose-600/70 dark:text-rose-500/60 p-3 border border-dashed border-rose-500/20 rounded-lg bg-rose-500/5 text-center">
                                        {$t("risk.growth.noRegressionRules")}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        {/if}
    {:else}
        <div class="p-8 text-center border-2 border-dashed rounded-xl bg-muted/20">
            <p class="text-sm text-muted-foreground flex flex-col items-center gap-2">
                {$t("risk.growth.addPhaseOverride")}
                {#if !simpleMode}
                    <Button variant="secondary" size="sm" onclick={addPhase} class="mt-2">
                        <Plus class="w-4 h-4 mr-1"/> Adicionar Primeira Fase
                    </Button>
                {/if}
            </p>
        </div>
    {/if}
</div>
