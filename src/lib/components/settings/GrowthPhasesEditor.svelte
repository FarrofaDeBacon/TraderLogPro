<script lang="ts">
    import type { GrowthPhase } from "$lib/types";
    import { Plus, Trash2, TrendingUp, Zap, ChevronRight } from "lucide-svelte";
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
                name: `Fase ${phases.length + 1}`,
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

<div class={wizardMode ? "space-y-4" : "mt-2 space-y-4 h-full"}>
    {#if !wizardMode}
        <div class="flex items-center justify-between mb-2">
            <h5 class="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
                {simpleMode ? $t("risk.growth.phases") : ($t("risk.growth.phases") + ` [ ${phases?.length || 0} ]`)}
            </h5>
            {#if simpleMode || !phases || phases.length === 0}
                <Button 
                    variant="outline" 
                    size="sm" 
                    class="h-8 px-4 text-[9px] font-black uppercase tracking-widest bg-primary/5 border-primary/20 text-primary hover:bg-primary/15 rounded-xl transition-all" 
                    onclick={addPhase}
                >
                    <Plus class="w-3.5 h-3.5 mr-1" />
                    {simpleMode ? $t("risk.growth.addPhase") : "NOVA FASE"}
                </Button>
            {/if}
        </div>
    {/if}

    {#if phases && phases.length > 0}
        {#if simpleMode}
            <div class="space-y-2">
                {#each phases as phase, index}
                    <div class="flex items-center gap-3 p-3 rounded-2xl border bg-black/20 border-white/5 hover:border-white/10 transition-all shadow-sm">
                        <div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-black text-primary shadow-inner">
                            {index + 1}
                        </div>
                        <div class="flex-1 grid grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1">
                                <Label class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.1em]">{$t("risk.growth.maxLotsLabel")}</Label>
                                <Input type="number" step="0.01" class="h-8 bg-white/5 border-white/5 font-mono font-bold text-xs focus-visible:ring-primary/30" bind:value={phase.lot_size} />
                            </div>
                            <div class="flex flex-col gap-1">
                                <Label class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.1em]">{$t("risk.growth.phaseNameLabel")}</Label>
                                <Input class="h-8 bg-white/5 border-white/5 font-black text-xs uppercase focus-visible:ring-primary/30" bind:value={phase.name} placeholder="OPCIONAL" />
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-lg" onclick={() => removePhase(index)}>
                            <Trash2 class="w-3.5 h-3.5" />
                        </Button>
                    </div>
                {/each}
            </div>
        {:else}
            <!-- ADVANCED EDITOR (Terminal Edition) -->
            {#if phases[activePhaseIndex]}
                {@const phase = phases[activePhaseIndex]}
                {@const index = activePhaseIndex}
                <div class="relative p-5 rounded-2xl border border-white/10 bg-black/20 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <!-- Phase Indicator Badge -->
                    <div class="absolute -top-3 left-6 px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-primary/20">
                        {phase.name || `CONFIGURATING PHASE ${index + 1}`}
                    </div>

                    <!-- Identity Input Block (Independent Pills) -->
                    <div class="grid grid-cols-1 md:grid-cols-[1fr_160px_40px] gap-3">
                        <div class="h-11 px-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col justify-center relative hover:bg-white/[0.05] transition-all group focus-within:border-primary/30">
                            <span class="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground/40 absolute top-1.5 left-4 group-focus-within:text-primary transition-colors">
                                {$t("risk.growth.phaseNameLabel")}
                            </span>
                            <input 
                                class="bg-transparent border-none p-0 mt-3 text-[11px] font-black uppercase outline-none focus:ring-0 w-full placeholder:opacity-20" 
                                placeholder="IDENTIFICADOR DA FASE" 
                                bind:value={phase.name} 
                            />
                        </div>

                        <div class="h-11 px-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col justify-center relative hover:bg-white/[0.05] transition-all group focus-within:border-primary/30">
                            <span class="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground/40 absolute top-1.5 left-4 group-focus-within:text-primary transition-colors">
                                {$t("risk.growth.maxLotsLabel")}
                            </span>
                            <div class="flex items-center gap-1 mt-3">
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0.01" 
                                    class="bg-transparent border-none p-0 text-[11px] font-black font-mono outline-none focus:ring-0 w-full text-right pr-4" 
                                    bind:value={phase.lot_size} 
                                />
                                <span class="text-[8px] font-black text-muted-foreground/30 absolute right-4 bottom-2.5">LOTES</span>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-end">
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-9 w-9 text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-xl"
                                title={$t("risk.messages.removePhase")}
                                onclick={() => removePhase(index)}
                            >
                                <Trash2 class="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <!-- Rules Section (Standardized with Circular Icons) -->
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <!-- PROGRESSION BLOCK -->
                        <div class="space-y-3 p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] relative group">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5 transition-transform group-hover:scale-105">
                                        <TrendingUp class="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div class="flex flex-col">
                                        <h4 class="text-[10px] font-black uppercase tracking-tight text-emerald-500">PROGRESSÃO</h4>
                                        <span class="text-[7px] font-bold uppercase tracking-[0.1em] text-emerald-500/40 opacity-80">METAS PARA AVANÇAR</span>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    class="h-7 px-3 text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/15 rounded-xl transition-all" 
                                    onclick={() => phase.conditions_to_advance.push({metric: 'profit', operator: '>=', value: 0})}
                                >
                                    <Plus class="w-3 h-3 mr-1.5" /> {$t("common.add")}
                                </Button>
                            </div>

                            <div class="space-y-2">
                                {#each phase.conditions_to_advance as rule, ri}
                                    <div class="flex items-center gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5 shadow-inner animate-in fade-in slide-in-from-top-2">
                                        <div class="flex-1">
                                            <Select.Root type="single" bind:value={rule.metric}>
                                                <Select.Trigger class="h-8 bg-white/5 border-none text-[10px] font-black uppercase px-3 rounded-lg focus:ring-emerald-500/30">
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
                                        </div>

                                        <div class="w-12">
                                            <Select.Root type="single" bind:value={rule.operator}>
                                                <Select.Trigger class="h-8 bg-white/5 border-none text-[10px] font-black font-mono text-center rounded-lg focus:ring-emerald-500/30">
                                                    {rule.operator}
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value=">=" class="font-mono">&gt;=</Select.Item>
                                                    <Select.Item value=">" class="font-mono">&gt;</Select.Item>
                                                    <Select.Item value="<=" class="font-mono">&lt;=</Select.Item>
                                                    <Select.Item value="<" class="font-mono">&lt;</Select.Item>
                                                </Select.Content>
                                            </Select.Root>
                                        </div>

                                        <div class="relative w-28">
                                            <Input 
                                                type="number" 
                                                step="0.1" 
                                                class="h-8 bg-white/5 border-none text-[11px] font-black font-mono text-right pr-6 focus-visible:ring-emerald-500/30" 
                                                bind:value={rule.value} 
                                            />
                                            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-emerald-500/40 uppercase">
                                                {['profit', 'totalTarget', 'dailyTarget'].includes(rule.metric) ? (targetUnit === 'points' ? 'PTS' : 'MOEDA') : 
                                                 rule.metric === 'winRate' ? '%' : ''}
                                            </span>
                                        </div>
                                        
                                        <Button variant="ghost" size="icon" class="h-8 w-8 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg" onclick={() => { phase.conditions_to_advance = phase.conditions_to_advance.filter((_v: any, i: number) => i !== ri); onChange?.(); }}>
                                            <Trash2 class="w-3 w-3" />
                                        </Button>
                                    </div>
                                {/each}

                                {#if phase.conditions_to_advance.length === 0}
                                    <div class="py-6 px-4 border border-dashed border-emerald-500/20 rounded-xl bg-emerald-500/[0.01] flex flex-col items-center justify-center gap-2">
                                        <TrendingUp class="w-6 h-6 text-emerald-500/10" />
                                        <p class="text-[9px] font-black text-emerald-500/30 uppercase tracking-widest leading-tight">PROGRESSÃO VIA COMANDO MANUAL</p>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- REGRESSION BLOCK -->
                        <div class="space-y-3 p-4 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] relative group">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/5 transition-transform group-hover:scale-105">
                                        <TrendingUp class="w-4 h-4 text-rose-500 rotate-180" />
                                    </div>
                                    <div class="flex flex-col">
                                        <h4 class="text-[10px] font-black uppercase tracking-tight text-rose-500">REGRESSÃO</h4>
                                        <span class="text-[7px] font-bold uppercase tracking-[0.1em] text-rose-500/40 opacity-80">LIMITES PARA RECUAR</span>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    class="h-7 px-3 text-[9px] font-black uppercase text-rose-500 bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/15 rounded-xl transition-all" 
                                    onclick={() => phase.conditions_to_demote.push({metric: 'drawdown', operator: '<=', value: 0})}
                                >
                                    <Plus class="w-3 h-3 mr-1.5" /> {$t("common.add")}
                                </Button>
                            </div>

                            <div class="space-y-2">
                                {#each phase.conditions_to_demote as rule, ri}
                                    <div class="flex items-center gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5 shadow-inner animate-in fade-in slide-in-from-top-2">
                                        <div class="flex-1">
                                            <Select.Root type="single" bind:value={rule.metric}>
                                                <Select.Trigger class="h-8 bg-white/5 border-none text-[10px] font-black uppercase px-3 rounded-lg focus:ring-rose-500/30">
                                                    {rule.metric ? $t(demoteMetrics[rule.metric] || 'risk.growth.metrics.drawdown') : $t('risk.growth.metrics.drawdown')}
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="drawdown">{$t("risk.growth.metrics.drawdown")}</Select.Item>
                                                    <Select.Item value="dailyLoss">{$t("risk.growth.metrics.dailyLoss")}</Select.Item>
                                                    <Select.Item value="lossStreak">{$t("risk.growth.metrics.lossStreak")}</Select.Item>
                                                </Select.Content>
                                            </Select.Root>
                                        </div>

                                        <div class="w-12">
                                            <Select.Root type="single" bind:value={rule.operator}>
                                                <Select.Trigger class="h-8 bg-white/5 border-none text-[10px] font-black font-mono text-center rounded-lg focus:ring-rose-500/30">
                                                    {rule.operator}
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value=">=" class="font-mono">&gt;=</Select.Item>
                                                    <Select.Item value=">" class="font-mono">&gt;</Select.Item>
                                                    <Select.Item value="<=" class="font-mono">&lt;=</Select.Item>
                                                    <Select.Item value="<" class="font-mono">&lt;</Select.Item>
                                                </Select.Content>
                                            </Select.Root>
                                        </div>

                                        <div class="relative w-28">
                                            <Input 
                                                type="number" 
                                                step="0.1" 
                                                class="h-8 bg-white/5 border-none text-[11px] font-black font-mono text-right pr-6 focus-visible:ring-rose-500/30" 
                                                bind:value={rule.value} 
                                            />
                                            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-rose-500/40 uppercase">
                                                {(rule.metric === 'drawdown' || rule.metric === 'dailyLoss') ? (drawdownUnit === 'points' ? 'PTS' : 'MOEDA') : ''}
                                            </span>
                                        </div>
                                        
                                        <Button variant="ghost" size="icon" class="h-8 w-8 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg" onclick={() => { phase.conditions_to_demote = phase.conditions_to_demote.filter((_v: any, i: number) => i !== ri); onChange?.(); }}>
                                            <Trash2 class="w-3 w-3" />
                                        </Button>
                                    </div>
                                {/each}

                                {#if phase.conditions_to_demote.length === 0}
                                    <div class="py-6 px-4 border border-dashed border-rose-500/20 rounded-xl bg-rose-500/[0.01] flex flex-col items-center justify-center gap-2">
                                        <TrendingUp class="w-6 h-6 text-rose-500/10 rotate-180" />
                                        <p class="text-[9px] font-black text-rose-500/30 uppercase tracking-widest leading-tight">SEM LIMITES DE REGRESSÃO AUTOMÁTICA</p>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        {/if}
    {:else}
        <div class="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-black/20 gap-4 group">
            <div class="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                <Plus class="w-8 h-8 text-primary/40 group-hover:text-primary transition-colors" />
            </div>
            <p class="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">
                NENHUM NÍVEL OPERACIONAL DEFINIDO PARA ESTE PLANO.
            </p>
            {#if !simpleMode}
                <Button 
                    variant="outline" 
                    class="mt-2 h-9 px-8 bg-primary/10 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary/20 shadow-lg shadow-primary/5" 
                    onclick={addPhase}
                >
                    <Plus class="w-3.5 h-3.5 mr-2" /> CRIAR PRIMEIRA FASE
                </Button>
            {/if}
        </div>
    {/if}
</div>
