<script lang="ts">
    import { evolutionStore } from "$lib/stores/evolutionStore.svelte";
    import { t } from "svelte-i18n";
    import * as Card from "$lib/components/ui/card";
    import { format } from "date-fns";
    import { ptBR } from "date-fns/locale/pt-BR";
    import {
        Activity,
        TrendingUp,
        Target,
        ShieldAlert,
        AlertTriangle,
        Zap,
        Brain,
        History,
        Calendar
    } from "lucide-svelte";
    import { cn } from "$lib/utils";
    import { gamificationStore } from "$lib/stores/gamification.svelte";
    import { MILESTONES } from "$lib/domain/stats/milestones";
    import { Crosshair, ShieldCheck, Trophy } from "lucide-svelte"; // ensure icons exist

    let history = $derived(evolutionStore.history);
    let freqs = $derived(evolutionStore.insightFrequencies);
    let score = $derived(Math.round(gamificationStore.scoreStats.score));
    let unlockedBadges = $derived(gamificationStore.unlockedMilestones);

    // Group history by date for timeline
    let timeline = $derived.by(() => {
        const groups: Record<string, typeof history> = {};
        history.forEach(h => {
            if (!groups[h.date]) groups[h.date] = [];
            groups[h.date].push(h);
        });
        return Object.entries(groups).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    });
</script>

<div class="flex-1 flex flex-col space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
    
    <!-- Cabeçalho -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
            <h1 class="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
                <Brain class="w-8 h-8 text-primary" />
                Inteligência Emocional (Score)
            </h1>
            <p class="text-muted-foreground mt-1">Seu histórico algorítmico de comportamento na mesa.</p>
        </div>
    </div>

    <!-- SCORE MASSIÇO -->
    <div class="mb-6 rounded-3xl p-10 md:p-16 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group
        {score < 50 ? 'bg-rose-600/10 border border-rose-500/20' : 
         score < 80 ? 'bg-amber-500/10 border border-amber-500/20' : 
         'bg-emerald-600/10 border border-emerald-500/20'}">
        
        <div class="relative z-10 flex flex-col items-center gap-4">
            <h3 class="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">ROLLING SCORE (30 TRADES)</h3>
            <h2 class="text-7xl md:text-9xl font-black font-mono tracking-tighter drop-shadow-md
                {score < 50 ? 'text-rose-500' : score < 80 ? 'text-amber-500' : 'text-emerald-500'}">
                {score}
            </h2>
            <p class="text-xl md:text-2xl font-medium text-foreground/80 mt-2">
                {#if score < 50}
                    Zona Crítica. Suas emoções estão operando sua conta. Recupere o controle.
                {:else if score < 80}
                    Disciplina Média. Sinais vitais sob pressão. Policie seu plano.
                {:else}
                    Máxima Performance Tática. Emoções isoladas, execução fria.
                {/if}
            </p>
        </div>
    </div>

    <!-- MILESTONES VAULT -->
    <div class="mb-10">
        <h3 class="text-sm font-black uppercase tracking-[0.15em] text-foreground flex items-center gap-2 mb-6 border-b border-border/40 pb-4">
            <Trophy class="w-4 h-4 text-amber-500" /> Milestones Vault
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each MILESTONES as milestone}
                {@const isUnlocked = unlockedBadges.includes(milestone.id)}
                <div class={cn(
                    "flex flex-col p-5 rounded-2xl border transition-all duration-300",
                    isUnlocked ? milestone.colorClass : "bg-muted/10 border-border/20 opacity-50 grayscale hover:grayscale-0"
                )}>
                    <div class="flex items-center gap-3 mb-2">
                        <div class="p-2 bg-background/50 rounded-lg">
                            {#if milestone.icon === 'Target'} <Target class="w-5 h-5" /> 
                            {:else if milestone.icon === 'Crosshair'} <Crosshair class="w-5 h-5" />
                            {:else if milestone.icon === 'ShieldCheck'} <ShieldCheck class="w-5 h-5" />
                            {:else if milestone.icon === 'Trophy'} <Trophy class="w-5 h-5" />
                            {:else if milestone.icon === 'Brain'} <Brain class="w-5 h-5" />
                            {:else} <TrendingUp class="w-5 h-5" /> {/if}
                        </div>
                        <h4 class="font-black tracking-widest uppercase text-sm">{milestone.title}</h4>
                    </div>
                    <p class="text-xs font-medium opacity-80 mt-1 leading-relaxed">{milestone.description}</p>
                </div>
            {/each}
        </div>
    </div>

    <!-- DUPLO GRID -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- DIREITA: FEED/TIMELINE (span 8) -->
        <div class="lg:col-span-8 flex flex-col gap-6">
            <h3 class="text-sm font-black uppercase tracking-[0.15em] text-foreground flex items-center gap-2 mb-4 border-b border-border/40 pb-4">
                <History class="w-4 h-4 text-primary" /> Feed Psicológico Diário
            </h3>
            
            {#if timeline.length === 0}
                <div class="p-8 text-center bg-card/40 rounded-2xl border border-dashed border-border/40">
                    <p class="text-muted-foreground font-bold">O seu diário emocional está em branco. Opere e volte aqui mais tarde.</p>
                </div>
            {:else}
                <div class="space-y-10 pl-2">
                    {#each timeline as [date, dayInsights]}
                        <div class="relative">
                            <!-- Trace line for timeline -->
                            <div class="absolute left-[-16px] top-8 bottom-[-40px] w-0.5 bg-border/40 -z-10 last:hidden"></div>
                            
                            <!-- Date Bubble -->
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-8 h-8 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center shrink-0 -ml-5 z-10">
                                    <Calendar class="w-3.5 h-3.5 text-primary" />
                                </div>
                                <h4 class="text-lg font-black tracking-tight bg-card/60 px-4 py-1 rounded-lg border border-border/50">
                                    {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
                                </h4>
                            </div>

                            <!-- Insight Cards for this Day -->
                            <div class="space-y-4 ml-6">
                                {#each dayInsights as insight}
                                    <div class={cn(
                                        "p-5 border-l-4 rounded-xl shadow-sm transition-all hover:scale-[1.01] bg-card/60 backdrop-blur-sm",
                                        insight.type === 'danger' ? "border-rose-500 hover:shadow-rose-500/10" : 
                                        insight.type === 'warning' ? "border-amber-500 hover:shadow-amber-500/10" : 
                                        "border-emerald-500 hover:shadow-emerald-500/10"
                                    )}>
                                        <div class="flex items-start justify-between gap-4">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 mb-2">
                                                    {#if insight.type === 'danger'} <ShieldAlert class="w-4 h-4 text-rose-500" />
                                                    {:else if insight.type === 'warning'} <AlertTriangle class="w-4 h-4 text-amber-500" />
                                                    {:else} <Zap class="w-4 h-4 text-emerald-500" /> {/if}
                                                    <span class={cn(
                                                        "text-xs font-black uppercase tracking-widest",
                                                        insight.type === 'danger' ? "text-rose-500" : 
                                                        insight.type === 'warning' ? "text-amber-500" : 
                                                        "text-emerald-500"
                                                    )}>{insight.title}</span>
                                                </div>
                                                <p class="text-sm font-medium text-foreground/90">{insight.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- ESQUERDA: RADAR DE FREQUÊNCIA (span 4) -->
        <div class="lg:col-span-4 flex flex-col gap-6">
            <h3 class="text-sm font-black uppercase tracking-[0.15em] text-foreground flex items-center gap-2 mb-4 border-b border-border/40 pb-4">
                <Target class="w-4 h-4 text-primary" /> Frequência de Padrões
            </h3>
            
            {#if freqs.length === 0}
                <p class="text-sm text-muted-foreground italic text-center p-4">Nenhum padrão consolidado ainda.</p>
            {:else}
                <div class="space-y-3">
                    {#each freqs as freq}
                        <div class="bg-card/50 p-4 rounded-xl border border-border/50 flex justify-between items-center group hover:bg-card">
                            <div class="flex items-center gap-3">
                                <div class={cn(
                                    "w-3 h-3 rounded-full",
                                    freq.type === 'danger' ? 'bg-rose-500' : 
                                    freq.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                )}></div>
                                <span class="text-xs font-bold uppercase tracking-wider text-foreground/80">{freq.title}</span>
                            </div>
                            <span class="text-2xl font-mono font-black {freq.type === 'danger' ? 'text-rose-500' : freq.type === 'warning' ? 'text-amber-500' : 'text-emerald-500'}">
                                {freq.count}x
                            </span>
                        </div>
                    {/each}
                </div>
                
                <div class="mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/20 text-center">
                    <TrendingUp class="w-8 h-8 text-primary mx-auto mb-3" />
                    <p class="text-xs focus font-bold text-foreground/80 uppercase tracking-widest leading-loose">
                        O diário não mente. O que mais acontece aqui é o que mais drena (ou constrói) sua conta no longo prazo.
                    </p>
                </div>
            {/if}
        </div>

    </div>

</div>
