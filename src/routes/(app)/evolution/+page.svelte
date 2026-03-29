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
        Calendar,
        Crosshair,
        ShieldCheck,
        Trophy,
        LayoutDashboard
    } from "lucide-svelte";
    import { cn } from "$lib/utils";
    import { gamificationStore } from "$lib/stores/gamification.svelte";
    import { MILESTONES } from "$lib/domain/stats/milestones";
    import { SystemCard, SystemHeader, SystemMetric } from "$lib/components/ui/system";

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

<div class="flex-1 flex flex-col space-y-6 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
    
    <SystemCard status="primary" class="p-3 mb-4 bg-primary/5">
        <SystemHeader 
            title="Inteligência Emocional"
            subtitle="Performance Comportamental & Disciplina"
            icon={Brain}
            variant="page"
            class="mb-0"
        />
    </SystemCard>

    <!-- SCORE COMPACTO -->
    <Card.Root class={cn(
        "card-glass border-l-4 shadow-xl relative overflow-hidden group transition-all duration-500",
        score < 50 ? 'border-l-rose-500' : score < 80 ? 'border-l-amber-500' : 'border-l-emerald-500'
    )}>
        <Card.Content class="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div class="flex flex-col md:flex-row items-center gap-8">
                <div class="flex flex-col items-center md:items-start">
                    <span class="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-2">ROLLING PERFORMANCE SCORE</span>
                    <div class="flex items-baseline gap-2">
                        <h2 class="text-6xl md:text-7xl font-black font-mono tracking-tighter transition-all duration-700
                            {score < 50 ? 'text-rose-500' : score < 80 ? 'text-amber-500' : 'text-emerald-500'}">
                            {score}
                        </h2>
                        <span class="text-xs font-bold text-muted-foreground/30 uppercase tracking-tighter">pts</span>
                    </div>
                </div>

                <div class="hidden md:block w-px h-16 bg-white/5"></div>

                <div class="text-center md:text-left max-w-md">
                    <p class="text-lg font-bold text-foreground leading-tight tracking-tight mb-2">
                        {#if score < 50}
                            Estado Crítico: Retomada imediata de controle necessária.
                        {:else if score < 80}
                            Alerta Operacional: Sinais de instabilidade detectados.
                        {:else}
                            Elite Disciplinar: Execução em estado de fluxo.
                        {/if}
                    </p>
                    <p class="text-xs text-muted-foreground font-medium leading-relaxed opacity-80">
                        {#if score < 50}
                            Suas emoções estão dominando o sistema. Interrompa as operações e revise seu gerenciamento de risco.
                        {:else if score < 80}
                            Você está operando próximo ao limite do plano. Pequenos desvios podem comprometer a consistência.
                        {:else}
                            Performance institucional mantida. Suas decisões estão isoladas de ruído emocional.
                        {/if}
                    </p>
                </div>
            </div>
            
            <div class="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-1000 rotate-12 group-hover:rotate-0">
                <Brain class="w-48 h-48" />
            </div>
        </Card.Content>
    </Card.Root>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- COLUNA ESQUERDA: MILESTONES & ANALYTICS -->
        <div class="lg:col-span-8 flex flex-col gap-6">
            
            <!-- MILESTONES -->
            <section>
                <div class="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Trophy class="w-3.5 h-3.5 text-amber-500" />
                    <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Milestones Vault</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each MILESTONES as milestone}
                        {@const isUnlocked = unlockedBadges.includes(milestone.id)}
                        <SystemCard 
                            status={isUnlocked ? "success" : "info"}
                            hover={isUnlocked}
                            class={cn("p-3 transition-all duration-300", !isUnlocked && "opacity-30 grayscale")}
                        >
                            <div class="flex items-center gap-3 mb-2">
                                <div class={cn("p-1.5 rounded-lg bg-black/40", isUnlocked ? "text-primary" : "text-muted-foreground")}>
                                    {#if milestone.icon === 'Target'} <Target class="w-3.5 h-3.5" /> 
                                    {:else if milestone.icon === 'Crosshair'} <Crosshair class="w-3.5 h-3.5" />
                                    {:else if milestone.icon === 'ShieldCheck'} <ShieldCheck class="w-3.5 h-3.5" />
                                    {:else if milestone.icon === 'Trophy'} <Trophy class="w-3.5 h-3.5" />
                                    {:else if milestone.icon === 'Brain'} <Brain class="w-3.5 h-3.5" />
                                    {:else} <TrendingUp class="w-3.5 h-3.5" /> {/if}
                                </div>
                                <h4 class="font-black text-[11px] uppercase tracking-wider">{milestone.title}</h4>
                            </div>
                            <p class="text-[10px] text-muted-foreground font-medium leading-tight line-clamp-2">{milestone.description}</p>
                        </SystemCard>
                    {/each}
                </div>
            </section>

            <!-- FEED DIÁRIO -->
            <section>
                <div class="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <History class="w-3.5 h-3.5 text-primary" />
                    <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Historical Insights</h3>
                </div>
                
                {#if timeline.length === 0}
                    <div class="p-12 text-center card-glass rounded-xl border border-dashed border-white/10">
                        <Brain class="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                        <p class="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Nenhum dado comportamental registrado.</p>
                    </div>
                {:else}
                    <div class="space-y-6">
                        {#each timeline as [date, dayInsights]}
                            <div class="relative pl-6 border-l border-white/10 ml-2">
                                <div class="absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"></div>
                                
                                <div class="flex items-center gap-3 mb-4">
                                    <h4 class="text-[10px] font-black uppercase tracking-[0.15em] text-foreground bg-white/5 border border-white/10 px-3 py-1 rounded">
                                        {format(new Date(date), "dd/MM/yyyy")} — {format(new Date(date), "EEEE", { locale: ptBR })}
                                    </h4>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {#each dayInsights as insight}
                                        <SystemCard 
                                            status={insight.type === 'danger' ? 'danger' : insight.type === 'warning' ? 'warning' : 'success'}
                                            hover={true}
                                            class="p-3 flex items-start gap-3"
                                        >
                                            <div class="mt-0.5">
                                                {#if insight.type === 'danger'} <ShieldAlert class="w-3.5 h-3.5 text-rose-500" />
                                                {:else if insight.type === 'warning'} <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
                                                {:else} <Zap class="w-3.5 h-3.5 text-emerald-500" /> {/if}
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex justify-between items-start mb-0.5">
                                                    <span class="text-[10px] font-black uppercase tracking-wider">{insight.title}</span>
                                                </div>
                                                <p class="text-[11px] text-muted-foreground font-medium leading-tight">{insight.description}</p>
                                            </div>
                                        </SystemCard>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>
        </div>

        <!-- COLUNA DIREITA: ANALYTICS -->
        <div class="lg:col-span-4 flex flex-col gap-6">
            
            <section>
                <div class="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Activity class="w-3.5 h-3.5 text-primary" />
                    <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Pattern Frequency</h3>
                </div>
                
                {#if freqs.length === 0}
                    <div class="p-6 text-center card-glass rounded-xl opacity-50">
                        <p class="text-[10px] font-bold uppercase tracking-widest">Aguardando amostragem.</p>
                    </div>
                {:else}
                    <Card.Root class="card-glass overflow-hidden shadow-lg border-white/5">
                        <Card.Content class="p-0">
                            {#each freqs as freq, i}
                                <div class={cn(
                                    "p-3 flex justify-between items-center transition-all hover:bg-white/5",
                                    i !== freqs.length - 1 ? "border-b border-white/5" : ""
                                )}>
                                    <div class="flex items-center gap-2">
                                        <div class={cn(
                                            "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                                            freq.type === 'danger' ? 'text-rose-500 bg-rose-500' : 
                                            freq.type === 'warning' ? 'text-amber-500 bg-amber-500' : 'text-emerald-500 bg-emerald-500'
                                        )}></div>
                                        <span class="text-[11px] font-bold uppercase tracking-tight text-foreground/80">{freq.title}</span>
                                    </div>
                                    <div class="flex items-baseline gap-1">
                                        <span class="text-xl font-mono font-black tabular-nums">{freq.count}</span>
                                        <span class="text-[9px] font-bold text-muted-foreground tracking-tighter opacity-40">INST</span>
                                    </div>
                                </div>
                            {/each}
                        </Card.Content>
                    </Card.Root>
                    
                    <Card.Root class="mt-4 bg-primary/5 border-primary/20 shadow-inner">
                        <Card.Content class="p-4 flex gap-3 items-center">
                            <TrendingUp class="w-5 h-5 text-primary opacity-50 shrink-0" />
                            <p class="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wide leading-tight">
                                <span class="text-primary italic">Nota Tática:</span> Reconhecer padrões recorrentes é o primeiro passo para a automação da disciplina.
                            </p>
                        </Card.Content>
                    </Card.Root>
                {/if}
            </section>
        </div>
    </div>
</div>
