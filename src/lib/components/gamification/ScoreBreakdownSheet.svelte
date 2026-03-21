<script lang="ts">
    import { Sheet, SheetContent, SheetHeader, SheetTitle } from "$lib/components/ui/sheet";
    import { gamificationStore } from "$lib/stores/gamification.svelte";
    import { Activity, ShieldAlert, BrainCircuit, HeartPulse, Zap, AlertTriangle, TrendingUp, Info } from "lucide-svelte";
    
    export let open = false;

    // Helpers
    function getPillarColor(score: number): string {
        if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        if (score >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        return "text-red-400 bg-red-500/10 border-red-500/20";
    }
</script>

<Sheet bind:open>
    <SheetContent class="w-full sm:max-w-md overflow-y-auto bg-background/95 backdrop-blur-xl border-l border-border/10 shadow-2xl pb-12">
        <SheetHeader class="space-y-1 pb-4 border-b border-border/5 mb-6">
            <SheetTitle class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Zap class="w-5 h-5 text-amber-500" />
                </div>
                <div>
                    <h2 class="text-xl font-black uppercase tracking-tight">Raio-X do Score</h2>
                    <p class="text-xs text-muted-foreground font-medium">Entenda matematicamente sua pontuação</p>
                </div>
                <div class="ml-auto text-3xl font-black text-amber-400">
                    {gamificationStore.scoreBreakdown.stats.score.toFixed(0)}
                </div>
            </SheetTitle>
        </SheetHeader>

        <div class="space-y-8">
            <!-- PISTA 1: OS 4 PILARES -->
            <div class="space-y-3">
                <h3 class="text-[10px] font-black tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                    <Activity class="w-3 h-3" /> Peso dos 4 Pilares
                </h3>
                <div class="grid grid-cols-2 gap-2">
                    <div class="p-3 rounded border border-border/40 bg-background/40">
                        <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Execução (30%)</div>
                        <div class="font-mono font-bold text-lg {getPillarColor(gamificationStore.scoreBreakdown.stats.executionScore)} w-max px-2 py-0.5 rounded border">
                            {gamificationStore.scoreBreakdown.stats.executionScore.toFixed(0)}
                        </div>
                    </div>
                    <div class="p-3 rounded border border-border/40 bg-background/40">
                        <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Risco (30%)</div>
                        <div class="font-mono font-bold text-lg {getPillarColor(gamificationStore.scoreBreakdown.stats.riskScore)} w-max px-2 py-0.5 rounded border">
                            {gamificationStore.scoreBreakdown.stats.riskScore.toFixed(0)}
                        </div>
                    </div>
                    <div class="p-3 rounded border border-border/40 bg-background/40">
                        <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Comportamento (25%)</div>
                        <div class="font-mono font-bold text-lg {getPillarColor(gamificationStore.scoreBreakdown.stats.behaviorScore)} w-max px-2 py-0.5 rounded border">
                            {gamificationStore.scoreBreakdown.stats.behaviorScore.toFixed(0)}
                        </div>
                    </div>
                    <div class="p-3 rounded border border-border/40 bg-background/40">
                        <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Psicológico (15%)</div>
                        <div class="font-mono font-bold text-lg {getPillarColor(gamificationStore.scoreBreakdown.stats.psychoScore)} w-max px-2 py-0.5 rounded border">
                            {gamificationStore.scoreBreakdown.stats.psychoScore.toFixed(0)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- FEEDBACK ACIONÁVEL -->
            {#if gamificationStore.scoreBreakdown.recommendations.length > 0}
                <div class="space-y-3">
                    <h3 class="text-[10px] font-black tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                        <BrainCircuit class="w-3 h-3 text-amber-500" /> O que fazer agora?
                    </h3>
                    <div class="bg-amber-500/5 border border-amber-500/20 rounded-md p-3 space-y-2">
                        {#each gamificationStore.scoreBreakdown.recommendations.slice(0, 2) as rec}
                            <div class="flex items-start gap-2 text-sm text-foreground/80">
                                <TrendingUp class="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                                <span class="leading-snug">{rec}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- MAIORES IMPACTOS BRUTOS -->
            {#if gamificationStore.scoreBreakdown.impacts.length > 0}
                <div class="space-y-3">
                    <h3 class="text-[10px] font-black tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                        <AlertTriangle class="w-3 h-3 text-red-400" /> Fatores de Maior Impacto
                    </h3>
                    <div class="space-y-2">
                        {#each gamificationStore.scoreBreakdown.impacts as impact}
                            <div class="flex items-start justify-between bg-background/40 p-2.5 rounded-md border border-border/40">
                                <div class="flex-1">
                                    <div class="flex items-center gap-1.5">
                                        <div class="text-xs font-bold {impact.type === 'negative' ? 'text-red-400' : 'text-emerald-400'}">{impact.title}</div>
                                        <span class="text-[8px] uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground">{impact.pillar}</span>
                                    </div>
                                    <p class="text-[10px] text-muted-foreground mt-0.5 leading-tight">{impact.description}</p>
                                </div>
                                <div class="font-mono text-xs font-bold shrink-0 mt-0.5 {impact.type === 'negative' ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'} px-2 py-0.5 rounded">
                                    {impact.points > 0 ? '+' : ''}{impact.points} pts
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- REGRAS DAS STREAKS -->
            <div class="space-y-3">
                <h3 class="text-[10px] font-black tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                    <Info class="w-3 h-3" /> Manual das Streaks
                </h3>
                <div class="text-[11px] space-y-2 text-muted-foreground bg-muted/30 p-3 rounded border border-border/50">
                    <div class="flex gap-2"><span class="font-bold text-indigo-400 w-16 shrink-0">Controle:</span> Operar apenas com emoções saudáveis ou neutras.</div>
                    <div class="flex gap-2"><span class="font-bold text-emerald-400 w-16 shrink-0">Disciplina:</span> Sem alertas de Danger e respeitando os limites diários.</div>
                    <div class="flex gap-2"><span class="font-bold text-foreground w-16 shrink-0">No-Tilt:</span> Sem loss colossal e sem traços de Revenge Trading.</div>
                </div>
            </div>
        </div>
    </SheetContent>
</Sheet>
