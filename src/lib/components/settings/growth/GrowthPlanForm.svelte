<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import * as Card from "$lib/components/ui/card";
    import { TrendingUp, Zap, Brain, RotateCcw, Plus } from "lucide-svelte";
    import { slide, fade } from "svelte/transition";
    import GrowthPhasesEditor from "$lib/components/settings/GrowthPhasesEditor.svelte";
    import type { GrowthPlan } from "$lib/types";
    import { t } from "svelte-i18n";
    import { Info, CheckCircle2 } from "lucide-svelte";

    let {
        initialData,
        onSave,
        onCancel,
    } = $props<{
        initialData?: GrowthPlan;
        onSave: (data: Omit<GrowthPlan, "id">) => void;
        onCancel: () => void;
    }>();

    let formData = $state<Omit<GrowthPlan, "id">>({
        name: "",
        enabled: true,
        current_phase_index: 0,
        phases: [],
        daily_loss_mode: 'accumulate',
        phase_drawdown_mode: 'accumulate',
        phase_target_mode: 'cumulative',
        target_unit: 'financial',
        drawdown_unit: 'financial'
    });

    let activeSection = $state<"logic" | "stages" | "summary">("logic");
    let activePhaseIndex = $state(0);

    const sidebarSections = [
        { id: "logic", icon: Brain, label: "Engenharia" },
        { id: "stages", icon: Zap, label: "Estágios" },
        { id: "summary", icon: Info, label: "Resumo" }
    ] as const;

    $effect(() => {
        if (initialData) {
            formData = { 
                ...initialData,
                target_unit: initialData.target_unit || 'financial',
                drawdown_unit: initialData.drawdown_unit || 'financial'
            };
        }
    });

    function addPhase() {
        formData.phases = [
            ...formData.phases,
            {
                level: formData.phases.length + 1,
                name: "",
                lot_size: 1,
                conditions_to_advance: [],
                conditions_to_demote: [],
            },
        ];
        activePhaseIndex = formData.phases.length - 1;
    }

    function nextPhase() {
        if (activePhaseIndex < formData.phases.length - 1) activePhaseIndex++;
    }

    function prevPhase() {
        if (activePhaseIndex > 0) activePhaseIndex--;
    }

    function handleSubmit(e?: SubmitEvent) {
        e?.preventDefault();
        onSave($state.snapshot(formData));
    }
</script>

<div class="flex flex-col md:flex-row h-[540px] bg-background/40 backdrop-blur-md rounded-xl overflow-hidden border border-white/5 shadow-2xl">
    <!-- SIDEBAR (LEFT) -->
    <aside class="w-full md:w-[140px] bg-muted/20 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
        <div class="p-2 border-b border-white/5 overflow-hidden">
            <h2 class="text-[8px] font-black uppercase tracking-[0.05em] text-primary truncate opacity-80">{$t("risk.growthPlan.title")}</h2>
            <p class="text-[6px] text-muted-foreground font-black uppercase tracking-tighter opacity-30 leading-none">Dynamics v2.1</p>
        </div>

        <nav class="p-1 space-y-0.5 overflow-x-auto md:overflow-x-visible flex md:flex-col gap-0.5 md:gap-0.5">
            {#each sidebarSections as section}
                <button
                    onclick={() => activeSection = section.id}
                    class="flex-1 md:w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all group shrink-0
                        {activeSection === section.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}"
                >
                    <section.icon class="w-3 h-3 {activeSection === section.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}" />
                    <span class="text-[8px] font-black uppercase tracking-tight {activeSection === section.id ? 'text-primary' : 'text-muted-foreground font-bold'}">
                        {section.label}
                    </span>
                </button>
            {/each}
        </nav>
        
        <div class="flex-1"></div>
        
        <div class="p-1.5 bg-muted/10 border-t border-white/5 hidden md:block">
            <div class="flex items-center justify-between mb-1">
                <span class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest leading-none">Fases</span>
                <span class="text-[8px] font-black text-primary leading-none">{formData.phases.length}</span>
            </div>
            <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-primary transition-all duration-500" style="width: {(formData.phases.length / 10) * 100}%"></div>
            </div>
        </div>
    </aside>

    <!-- CONTENT (RIGHT) -->
    <main class="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-background/5 to-transparent">
        <div class="flex-1 p-3">
            {#if activeSection === "logic"}
                <div in:fade={{ duration: 150 }} class="space-y-4 animate-in slide-in-from-left-4 h-full">
                    <header class="space-y-0.5">
                        <h3 class="text-[10px] font-black uppercase text-foreground">Engenharia de Cálculo</h3>
                        <p class="text-[7px] text-muted-foreground uppercase font-bold opacity-40 tracking-tight">Defina como as metas e perdas serão acumuladas.</p>
                    </header>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <!-- Unit Strategy (New) -->
                        <!-- Progression Unit (Alvo/Meta) -->
                        <div class="p-2.5 rounded-xl border bg-card/20 border-white/5 space-y-2">
                            <div class="flex items-center justify-between">
                                <Label class="text-[8px] font-black uppercase text-primary tracking-widest leading-none">{$t("risk.growthPlan.targetUnit")}</Label>
                                <span class="text-[7px] text-muted-foreground uppercase font-bold opacity-30">Meta Total</span>
                            </div>
                            <div class="flex gap-1 p-0.5 bg-black/20 rounded-lg">
                                <button 
                                    onclick={() => formData.target_unit = 'financial'}
                                    class="flex-1 py-1 text-[8px] font-black uppercase rounded-md transition-all {formData.target_unit === 'financial' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-white/5'}"
                                >
                                    {$t("risk.growthPlan.financial")}
                                </button>
                                <button 
                                    onclick={() => formData.target_unit = 'points'}
                                    class="flex-1 py-1 text-[8px] font-black uppercase rounded-md transition-all {formData.target_unit === 'points' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-white/5'}"
                                >
                                    {$t("risk.growthPlan.points")}
                                </button>
                            </div>
                            <p class="text-[7px] text-muted-foreground/50 leading-tight">Define a unidade para os objetivos de **lucro acumulado** das fases.</p>
                        </div>

                        <!-- Risk Unit (Perdas/Drawdown) -->
                        <div class="p-2.5 rounded-xl border bg-card/20 border-white/5 space-y-2">
                            <div class="flex items-center justify-between">
                                <Label class="text-[8px] font-black uppercase text-rose-500 tracking-widest leading-none">{$t("risk.growthPlan.drawdownUnit")}</Label>
                                <span class="text-[7px] text-muted-foreground uppercase font-bold opacity-30">Limites e DD</span>
                            </div>
                            <div class="flex gap-1 p-0.5 bg-black/20 rounded-lg">
                                <button 
                                    onclick={() => formData.drawdown_unit = 'financial'}
                                    class="flex-1 py-1 text-[8px] font-black uppercase rounded-md transition-all {formData.drawdown_unit === 'financial' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-white/5'}"
                                >
                                    {$t("risk.growthPlan.financial")}
                                </button>
                                <button 
                                    onclick={() => formData.drawdown_unit = 'points'}
                                    class="flex-1 py-1 text-[8px] font-black uppercase rounded-md transition-all {formData.drawdown_unit === 'points' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-white/5'}"
                                >
                                    {$t("risk.growthPlan.points")}
                                </button>
                            </div>
                            <p class="text-[7px] text-muted-foreground/50 leading-tight">Define a unidade para **perda diária** e **drawdown** das fases.</p>
                        </div>

                        <!-- Daily Loss Mode -->
                        <div class="p-2.5 rounded-xl border bg-card/20 border-white/5 flex items-center justify-between group hover:bg-white/[0.03] transition-all">
                            <div class="flex items-center gap-2">
                                <div class="p-1.5 rounded-lg bg-rose-500/10"><TrendingUp class="w-3 h-3 text-rose-500/70" rotate={180} /></div>
                                <div class="space-y-0 text-left">
                                    <h4 class="text-[8px] font-black uppercase tracking-tight leading-none">{$t("risk.growthPlan.dailyLossMode")}</h4>
                                    <p class="text-[7px] text-muted-foreground uppercase font-bold opacity-30 leading-none truncate max-w-[120px]">
                                        {formData.daily_loss_mode === 'recover' ? "Líquido" : "Acumulado"}
                                    </p>
                                </div>
                            </div>
                            <Switch class="scale-75 origin-right" checked={formData.daily_loss_mode === 'recover'} onCheckedChange={(v) => formData.daily_loss_mode = v ? 'recover' : 'accumulate'} />
                        </div>

                        <!-- Phase Drawdown -->
                        <div class="p-2.5 rounded-xl border bg-card/20 border-white/5 flex items-center justify-between group hover:bg-white/[0.03] transition-all">
                            <div class="flex items-center gap-2">
                                <div class="p-1.5 rounded-lg bg-primary/10"><Zap class="w-3 h-3 text-primary/70" /></div>
                                <div class="space-y-0 text-left">
                                    <h4 class="text-[8px] font-black uppercase tracking-tight leading-none">Drawdown Fase</h4>
                                    <p class="text-[7px] text-muted-foreground uppercase font-bold opacity-30 leading-none truncate max-w-[120px]">
                                        {formData.phase_drawdown_mode === 'recover' ? "Reset" : "High-Water"}
                                    </p>
                                </div>
                            </div>
                            <Switch class="scale-75 origin-right" checked={formData.phase_drawdown_mode === 'recover'} onCheckedChange={(v) => formData.phase_drawdown_mode = v ? 'recover' : 'accumulate'} />
                        </div>

                        <!-- Phase Target -->
                        <div class="p-2.5 rounded-xl border bg-card/20 border-white/5 flex items-center justify-between group hover:bg-white/[0.03] transition-all md:col-span-2">
                            <div class="flex items-center gap-2">
                                <div class="p-1.5 rounded-lg bg-emerald-500/10"><Brain class="w-3 h-3 text-emerald-500/70" /></div>
                                <div class="space-y-0 text-left">
                                    <h4 class="text-[8px] font-black uppercase tracking-tight leading-none">Meta de Fases</h4>
                                    <p class="text-[7px] text-muted-foreground uppercase font-bold opacity-30 leading-none">
                                        {formData.phase_target_mode === 'reset_each_phase' ? "Reinicia o lucro necessário a cada nova fase atingida." : "Lucro acumulado continua somando entre fases."}
                                    </p>
                                </div>
                            </div>
                            <Switch class="scale-75 origin-right" checked={formData.phase_target_mode === 'reset_each_phase'} onCheckedChange={(v) => formData.phase_target_mode = v ? 'reset_each_phase' : 'cumulative'} />
                        </div>
                    </div>
                </div>

            {:else if activeSection === "stages"}
                <div in:fade={{ duration: 150 }} class="flex flex-col h-full animate-in slide-in-from-left-4 overflow-hidden">
                    <header class="flex items-center justify-between mb-2">
                        <div class="space-y-0.5">
                            <h3 class="text-[10px] font-black uppercase text-foreground">Escalonamento de Lotes</h3>
                            <p class="text-[7px] text-muted-foreground uppercase font-bold opacity-40 tracking-tight">Fase {activePhaseIndex + 1} de {formData.phases.length}.</p>
                        </div>
                        <div class="flex gap-2">
                             <Button variant="ghost" size="icon" class="h-6 w-6" onclick={prevPhase} disabled={activePhaseIndex === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </Button>
                            <Button variant="ghost" size="icon" class="h-6 w-6" onclick={nextPhase} disabled={activePhaseIndex === formData.phases.length - 1}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </Button>
                            <Button variant="outline" onclick={addPhase} class="h-6 px-3 bg-primary/10 border-primary/20 text-primary font-black uppercase text-[8px] tracking-widest gap-1 hover:bg-primary/20">
                                <Plus class="w-3 h-3" />
                                Add Fase
                            </Button>
                        </div>
                    </header>

                    <div class="flex-1 overflow-y-visible pb-2 min-h-0">
                        <GrowthPhasesEditor 
                            bind:phases={formData.phases} 
                            bind:activePhaseIndex={activePhaseIndex} 
                            targetUnit={formData.target_unit}
                            drawdownUnit={formData.drawdown_unit}
                            simpleMode={false} 
                            wizardMode={false} 
                        />
                    </div>
                </div>

            {:else if activeSection === "summary"}
                <div in:fade={{ duration: 150 }} class="space-y-3 animate-in zoom-in-95 fade-in h-full">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div class="space-y-1.5 p-2.5 rounded-xl border bg-card/20 border-white/5 focus-within:border-primary/20 transition-all md:col-span-2">
                            <Label class="text-[8px] font-black uppercase text-muted-foreground/50 tracking-widest">{$t("risk.growthPlan.planNameLabel")}</Label>
                            <Input bind:value={formData.name} placeholder="Ex: Trader Elite 2025" class="bg-transparent font-black h-6 text-xs border-0 p-0 focus-visible:ring-0 shadow-none mt-0" />
                        </div>
                        
                        <div class="p-2.5 rounded-xl border bg-card/20 border-white/5 flex items-center justify-between md:col-span-2">
                            <div class="space-y-0">
                                <Label class="text-[9px] font-black uppercase text-foreground">{$t("risk.growthPlan.activeStatus")}</Label>
                                <p class="text-[7px] text-muted-foreground font-bold uppercase opacity-30 leading-none">Habilitar execução no cockpit</p>
                            </div>
                            <Switch class="scale-75 origin-right" bind:checked={formData.enabled} />
                        </div>
                    </div>

                    <div class="p-4 text-center space-y-3 rounded-2xl border bg-white/[0.02] border-white/5 relative overflow-hidden shadow-2xl">
                        <div class="relative w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center mx-auto ring-1 ring-primary/30">
                            <TrendingUp class="w-4 h-4" />
                        </div>
                        
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            <div class="p-2 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center gap-0.5">
                                <span class="text-[6px] font-black text-muted-foreground/40 uppercase tracking-widest">Níveis</span>
                                <span class="text-xs font-black text-foreground">{formData.phases.length}</span>
                            </div>
                            <div class="p-2 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center gap-0.5">
                                <span class="text-[6px] font-black text-muted-foreground/40 uppercase tracking-widest">Base</span>
                                <span class="text-xs font-black text-foreground">{formData.phases[0]?.lot_size || 0}<span class="text-[7px] opacity-30 ml-0.5">LT</span></span>
                            </div>
                            <div class="p-2 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center gap-0.5">
                                <span class="text-[6px] font-black text-muted-foreground/40 uppercase tracking-widest">Teto</span>
                                <span class="text-xs font-black text-emerald-500">{formData.phases[formData.phases.length - 1]?.lot_size || 0}<span class="text-[7px] opacity-30 ml-0.5">LT</span></span>
                            </div>
                            <div class="p-2 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center gap-0.5">
                                <span class="text-[6px] font-black text-muted-foreground/40 uppercase tracking-widest">Unidades</span>
                                <span class="text-[7px] font-black text-primary uppercase leading-tight">
                                    {formData.target_unit === 'financial' ? '$' : 'pts'} / {formData.drawdown_unit === 'financial' ? '$' : 'pts'}
                                </span>
                            </div>
                        </div>

                        <div class="p-2 rounded-xl border border-dashed border-primary/20 bg-primary/5 text-[7px] font-black text-muted-foreground/60 leading-tight flex items-center gap-2">
                             <CheckCircle2 class="w-3 h-3 text-primary shrink-0" />
                            <p class="text-left uppercase tracking-tighter">Estrutura validada. O motor institucional está pronto para processar sua performance.</p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- FOOTER (CONTROL) -->
        <footer class="p-2.5 border-t border-white/5 bg-background/40 flex items-center justify-between shrink-0">
            <Button variant="ghost" class="h-8 px-4 font-black uppercase text-[9px] tracking-[0.1em] text-muted-foreground hover:text-foreground" onclick={onCancel}>
                {$t("common.cancel")}
            </Button>

            <Button
                class="h-8 px-8 font-black uppercase text-[10px] tracking-[0.2em] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all duration-300"
                onclick={() => handleSubmit()}
            >
                <TrendingUp class="w-3.5 h-3.5 mr-2" />
                {$t("common.save")}
            </Button>
        </footer>
    </main>
</div>

