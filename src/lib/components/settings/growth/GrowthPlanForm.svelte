<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import * as Card from "$lib/components/ui/card";
    import { TrendingUp, Zap, Brain, RotateCcw, Plus, Info, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-svelte";
    import { slide, fade } from "svelte/transition";
    import GrowthPhasesEditor from "$lib/components/settings/GrowthPhasesEditor.svelte";
    import type { GrowthPlan } from "$lib/types";
    import { t } from "svelte-i18n";

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
        { id: "logic", icon: Brain, label: "Engenharia", sub: "FOUNDATION" },
        { id: "stages", icon: Zap, label: "Estágios", sub: "EXECUTION" },
        { id: "summary", icon: Info, label: "Resumo", sub: "STRATEGY" }
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
                name: `Fase ${formData.phases.length + 1}`,
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

<div class="flex flex-col md:flex-row h-[560px] bg-background/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
    <!-- SIDEBAR (LEFT) - Standardized UI -->
    <aside class="w-full md:w-[160px] bg-black/20 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
        <div class="p-4 border-b border-white/5 bg-white/[0.02]">
            <h2 class="text-[10px] font-black uppercase tracking-tight text-foreground">PLANO EVOLUÇÃO</h2>
            <p class="text-[7px] text-primary/60 font-black uppercase tracking-[0.2em] mt-0.5 opacity-80">STAGING HUB</p>
        </div>

        <nav class="p-2 space-y-1 flex-1 overflow-y-auto">
            {#each sidebarSections as section}
                <button
                    onclick={() => activeSection = section.id}
                    class="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all group shrink-0
                        {activeSection === section.id ? 'bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5' : 'hover:bg-white/5 border border-transparent'}"
                >
                    <div class="p-1.5 rounded-lg {activeSection === section.id ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground group-hover:text-foreground'} transition-colors">
                        <section.icon class="w-3.5 h-3.5" />
                    </div>
                    <div class="flex flex-col items-start leading-none">
                        <span class="text-[9px] font-black uppercase tracking-tight {activeSection === section.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}">
                            {section.label}
                        </span>
                        <span class="text-[6px] font-bold uppercase tracking-[0.1em] opacity-30 mt-0.5">{section.sub}</span>
                    </div>
                </button>
            {/each}
        </nav>
        
        <div class="p-3 bg-black/20 border-t border-white/5 hidden md:block">
            <div class="flex items-center justify-between mb-1.5 px-0.5">
                <span class="text-[7px] font-black uppercase text-muted-foreground/30 tracking-[0.2em]">FASES ATIVAS</span>
                <span class="text-[8px] font-black text-primary">{formData.phases.length}</span>
            </div>
            <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-primary transition-all duration-700 ease-out" style="width: {(Math.min(formData.phases.length, 10) / 10) * 100}%"></div>
            </div>
        </div>
    </aside>

    <!-- CONTENT (RIGHT) -->
    <main class="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-white/[0.03] to-transparent">
        <div class="flex-1 p-5 overflow-y-auto custom-scrollbar">
            {#if activeSection === "logic"}
                <div in:fade={{ duration: 150 }} class="space-y-6 animate-in slide-in-from-left-4">
                    <!-- Section Header Pattern -->
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                            <Brain class="w-5 h-5 text-primary" />
                        </div>
                        <div class="flex flex-col">
                            <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">FUNDAÇÃO & ENGENHARIA</h3>
                            <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Lógica e Parâmetros Base</span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="p-4 rounded-2xl border bg-black/20 border-white/10 focus-within:border-primary/30 transition-all shadow-inner group">
                            <Label class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.15em] mb-1 block group-focus-within:text-primary/60 transition-colors">
                                {$t("risk.growthPlan.planNameLabel")}
                            </Label>
                            <Input 
                                bind:value={formData.name} 
                                placeholder="EX: TRADER ELITE PRO 2025" 
                                class="bg-transparent font-black h-8 text-sm border-0 p-0 focus-visible:ring-0 shadow-none mt-0 placeholder:opacity-20 uppercase" 
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <!-- Units Configuration -->
                            <div class="p-3.5 rounded-2xl border bg-black/20 border-white/10 space-y-3">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[8px] font-black uppercase text-primary tracking-[0.15em]">{$t("risk.growthPlan.targetUnit")}</Label>
                                    <div class="p-1 rounded-full bg-primary/10"><TrendingUp class="w-2.5 h-2.5 text-primary" /></div>
                                </div>
                                <div class="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                    <button 
                                        onclick={() => formData.target_unit = 'financial'}
                                        class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all {formData.target_unit === 'financial' ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-white/5 opacity-50'}"
                                    >
                                        {$t("risk.growthPlan.financial")}
                                    </button>
                                    <button 
                                        onclick={() => formData.target_unit = 'points'}
                                        class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all {formData.target_unit === 'points' ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-white/5 opacity-50'}"
                                    >
                                        {$t("risk.growthPlan.points")}
                                    </button>
                                </div>
                            </div>

                            <div class="p-3.5 rounded-2xl border bg-black/20 border-white/10 space-y-3">
                                <div class="flex items-center justify-between">
                                    <Label class="text-[8px] font-black uppercase text-rose-500 tracking-[0.15em]">{$t("risk.growthPlan.drawdownUnit")}</Label>
                                    <div class="p-1 rounded-full bg-rose-500/10"><TrendingUp class="w-2.5 h-2.5 text-rose-500 rotate-180" /></div>
                                </div>
                                <div class="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                    <button 
                                        onclick={() => formData.drawdown_unit = 'financial'}
                                        class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all {formData.drawdown_unit === 'financial' ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-white/5 opacity-50'}"
                                    >
                                        {$t("risk.growthPlan.financial")}
                                    </button>
                                    <button 
                                        onclick={() => formData.drawdown_unit = 'points'}
                                        class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all {formData.drawdown_unit === 'points' ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-white/5 opacity-50'}"
                                    >
                                        {$t("risk.growthPlan.points")}
                                    </button>
                                </div>
                            </div>

                            <!-- Lógica Toggles -->
                            <div class="p-3.5 rounded-2xl border bg-black/20 border-white/10 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                        <TrendingUp class="w-3.5 h-3.5 text-rose-500/80 rotate-180" />
                                    </div>
                                    <div class="flex flex-col">
                                        <h4 class="text-[9px] font-black uppercase tracking-tight">{$t("risk.growthPlan.dailyLossMode")}</h4>
                                        <p class="text-[7px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
                                            {formData.daily_loss_mode === 'recover' ? "MÉTODO LÍQUIDO" : "MÉTODO ACUMULADO"}
                                        </p>
                                    </div>
                                </div>
                                <Switch class="scale-90 origin-right" checked={formData.daily_loss_mode === 'recover'} onCheckedChange={(v) => formData.daily_loss_mode = v ? 'recover' : 'accumulate'} />
                            </div>

                            <div class="p-3.5 rounded-2xl border bg-black/20 border-white/10 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <Zap class="w-3.5 h-3.5 text-emerald-500/80" />
                                    </div>
                                    <div class="flex flex-col">
                                        <h4 class="text-[9px] font-black uppercase tracking-tight">MÉTODO DRAWDOWN</h4>
                                        <p class="text-[7px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
                                            {formData.phase_drawdown_mode === 'recover' ? "RESET TOTAL" : "HIGH-WATER MARK"}
                                        </p>
                                    </div>
                                </div>
                                <Switch class="scale-90 origin-right" checked={formData.phase_drawdown_mode === 'recover'} onCheckedChange={(v) => formData.phase_drawdown_mode = v ? 'recover' : 'accumulate'} />
                            </div>

                            <div class="p-4 rounded-2xl border bg-black/20 border-white/10 flex items-center justify-between group hover:bg-white/[0.04] transition-all md:col-span-2">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <RotateCcw class="w-4 h-4 text-primary" />
                                    </div>
                                    <div class="flex flex-col">
                                        <h4 class="text-[10px] font-black uppercase tracking-tight">PROGRESSÃO DE META</h4>
                                        <p class="text-[8px] text-muted-foreground font-medium max-w-[400px] mt-0.5">
                                            {formData.phase_target_mode === 'reset_each_phase' ? "O lucro necessário é REINICIADO a cada nova fase atingida." : "LUCRO ACUMULADO continua somando entre todas as fases."}
                                        </p>
                                    </div>
                                </div>
                                <Switch class="scale-100 origin-right" checked={formData.phase_target_mode === 'reset_each_phase'} onCheckedChange={(v) => formData.phase_target_mode = v ? 'reset_each_phase' : 'cumulative'} />
                            </div>
                        </div>
                    </div>
                </div>

            {:else if activeSection === "stages"}
                <div in:fade={{ duration: 150 }} class="flex flex-col h-full animate-in slide-in-from-left-4 overflow-hidden">
                    <header class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                                <Zap class="w-5 h-5 text-amber-500" />
                            </div>
                            <div class="flex flex-col">
                                <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">ESTÁGIOS DE EVOLUÇÃO</h3>
                                <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Fase {activePhaseIndex + 1} de {formData.phases.length}</span>
                            </div>
                        </div>
                        <div class="flex gap-1.5 bg-black/30 p-1 rounded-xl border border-white/5">
                             <Button variant="ghost" size="icon" class="h-7 w-7 rounded-lg hover:bg-white/10" onclick={prevPhase} disabled={activePhaseIndex === 0}>
                                <ChevronLeft class="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" class="h-7 w-7 rounded-lg hover:bg-white/10" onclick={nextPhase} disabled={activePhaseIndex === formData.phases.length - 1}>
                                <ChevronRight class="w-4 h-4" />
                            </Button>
                            <div class="w-px h-7 bg-white/10 mx-1"></div>
                            <Button onclick={addPhase} class="h-7 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black uppercase text-[9px] tracking-widest gap-1.5 rounded-lg transition-all shadow-lg shadow-primary/5">
                                <Plus class="w-3.5 h-3.5" />
                                NOVA FASE
                            </Button>
                        </div>
                    </header>

                    <div class="flex-1 overflow-y-auto pb-4 custom-scrollbar">
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
                <div in:fade={{ duration: 150 }} class="space-y-4 animate-in zoom-in-95 fade-in h-full">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner">
                            <Info class="w-5 h-5 text-primary" />
                        </div>
                        <div class="flex flex-col">
                            <h3 class="text-[12px] font-black uppercase tracking-tight text-foreground">AUDITORIA DE ESTRUTURA</h3>
                            <span class="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Status e Validação Final</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="p-4 rounded-2xl border bg-black/20 border-white/10 flex items-center justify-between md:col-span-2 group">
                            <div class="flex flex-col">
                                <Label class="text-[10px] font-black uppercase text-foreground">HABILITAR PLANO</Label>
                                <p class="text-[8px] text-muted-foreground font-black uppercase tracking-tight opacity-40 mt-0.5">Ativar execução imediata no cockpit</p>
                            </div>
                            <Switch class="scale-100 origin-right" bind:checked={formData.enabled} />
                        </div>
                    </div>

                    <div class="p-6 text-center space-y-6 rounded-3xl border bg-white/[0.04] border-white/10 relative overflow-hidden shadow-2xl backdrop-blur-xl">
                        <div class="absolute top-0 right-0 p-8 opacity-5">
                            <TrendingUp class="w-32 h-32" />
                        </div>

                        <div class="relative w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto ring-1 ring-primary/40 shadow-lg shadow-primary/10">
                            <TrendingUp class="w-6 h-6" />
                        </div>
                        
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center gap-1 group hover:border-primary/30 transition-all">
                                <span class="text-[7px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">NÍVEIS</span>
                                <span class="text-lg font-black text-foreground">{formData.phases.length}</span>
                            </div>
                            <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center gap-1 group hover:border-primary/30 transition-all">
                                <span class="text-[7px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">BASE</span>
                                <span class="text-lg font-black text-foreground">{formData.phases[0]?.lot_size || 0}<span class="text-[10px] opacity-30 ml-1">LT</span></span>
                            </div>
                            <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center gap-1 group hover:border-emerald-500/30 transition-all">
                                <span class="text-[7px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">TETO</span>
                                <span class="text-lg font-black text-emerald-500">{formData.phases[formData.phases.length - 1]?.lot_size || 0}<span class="text-[10px] opacity-30 ml-1">LT</span></span>
                            </div>
                            <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center gap-1 group hover:border-primary/30 transition-all">
                                <span class="text-[7px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">UNIDADES</span>
                                <span class="text-[9px] font-black text-primary uppercase leading-tight text-center mt-1">
                                    {formData.target_unit === 'financial' ? 'MOEDA' : 'PONTOS'} <br/> 
                                    {formData.drawdown_unit === 'financial' ? 'MOEDA' : 'PONTOS'}
                                </span>
                            </div>
                        </div>

                        <div class="p-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-[9px] font-black text-foreground/80 leading-snug flex items-center gap-4 group">
                             <div class="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <CheckCircle2 class="w-3.5 h-3.5 text-primary" />
                             </div>
                            <p class="text-left uppercase tracking-tight">ENGREANAGEM VALIDADA. O MOTOR INSTITUCIONAL ESTÁ PRONTO PARA CALIBRAR SUA EVOLUÇÃO.</p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- FOOTER (CONTROL) - Emerald Solid Pattern -->
        <footer class="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0 backdrop-blur-xl">
            <Button 
                variant="ghost" 
                class="h-9 px-5 font-black uppercase text-[10px] tracking-[0.1em] text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all" 
                onclick={onCancel}
            >
                {$t("common.cancel")}
            </Button>

            <Button
                class="h-9 px-10 font-black uppercase text-[11px] tracking-[0.2em] bg-[#10b981] hover:bg-[#059669] text-black shadow-xl shadow-emerald-500/20 transition-all duration-300 rounded-xl active:scale-[0.97]"
                onclick={() => handleSubmit()}
            >
                <TrendingUp class="w-4 h-4 mr-2" />
                {$t("common.save")}
            </Button>
        </footer>
    </main>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.1);
    }
</style>
