<script lang="ts">
    import { llmService } from "$lib/services/llmService";
    import { Card, CardContent } from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { BrainCircuit, Loader2, AlertCircle, Target, ShieldAlert, Zap } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import { onDestroy } from "svelte";

    export let strategyId: string;
    export let periodStr: string = "All Time";
    export let metricsPayload: any = {};
    export let hasActiveAiProvider: boolean = false;

    let loading = false;
    let insight: any = null;
    let error: string | null = null;
    let componentMounted = true;

    onDestroy(() => { componentMounted = false; });

    export async function generateInsight() {
        if (!hasActiveAiProvider) {
            error = "Nenhum provedor de IA habilitado em Integrações."; return;
        }
        loading = true;
        error = null;
        try {
            const result = await llmService.generateStrategyInsight(strategyId, periodStr, metricsPayload);
            if (componentMounted) insight = result;
        } catch (e: any) {
            if (componentMounted) error = e.message || "Erro na análise estratégica.";
        } finally {
            if (componentMounted) loading = false;
        }
    }
</script>

<Card class="border border-border/20 shadow-none bg-emerald-500/[0.02] backdrop-blur-md relative overflow-hidden group">
    <div class="absolute -left-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>

    <CardContent class="p-3">
        {#if !insight && !loading && !error}
            <div class="flex items-center justify-between gap-4">
               <div class="flex items-center gap-3">
                  <div class="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                     <BrainCircuit class="w-4 h-4" />
                  </div>
                  <div>
                     <h4 class="text-xs font-bold text-foreground/90 leading-tight">Estratégia sob Lente (IA)</h4>
                     <p class="text-[10px] text-muted-foreground font-medium">Extração de edge operacional e pontos de falha sistêmica.</p>
                  </div>
               </div>
               <Button 
                   variant="outline" 
                   size="sm" 
                   onclick={generateInsight} 
                   disabled={!hasActiveAiProvider}
                   class="h-7 text-[10px] px-3 border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-500/80 font-bold uppercase tracking-wider"
               >
                   Gerar Insight
               </Button>
            </div>
        {:else if loading}
            <div class="flex items-center justify-center gap-3 py-1" transition:fade>
                <Loader2 class="w-4 h-4 animate-spin text-emerald-500/40" />
                <span class="text-[10px] font-black uppercase tracking-widest text-emerald-500/50">Mapeando eficiência do setup...</span>
            </div>
        {:else if error}
            <div class="flex items-center justify-between gap-4 bg-rose-500/5 p-2 rounded-md border border-rose-500/10">
                <div class="flex items-center gap-2">
                    <AlertCircle class="w-4 h-4 text-rose-500/60" />
                    <span class="text-[10px] font-bold text-rose-500/80 uppercase tracking-tight">{error}</span>
                </div>
                <Button size="sm" variant="ghost" class="h-6 text-[9px] text-rose-500 hover:bg-rose-500/10 font-black uppercase" onclick={generateInsight}>Tentar Novamente</Button>
            </div>
        {:else if insight && !loading}
            <div class="flex flex-col md:flex-row gap-4 items-center" transition:slide>
                <!-- Performance Synthesis -->
                <div class="flex-1 min-w-0 border-r border-border/10 pr-4 hidden md:block">
                    <div class="flex items-center gap-1.5 mb-1 text-emerald-500/60">
                        <Zap class="w-3 h-3" />
                        <h4 class="font-black text-[8px] uppercase tracking-widest">Performance Sintética</h4>
                    </div>
                    <p class="text-[11px] leading-relaxed text-foreground/80 font-medium line-clamp-2 italic">"{insight.performanceInterpretation}"</p>
                </div>

                <!-- Context and Weakness -->
                <div class="flex-[2] grid grid-cols-2 gap-3 w-full">
                    <div class="p-2.5 rounded-md border border-blue-500/10 bg-blue-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1 text-blue-500/70">
                            <Target class="w-3 h-3" />
                            <h4 class="font-black text-[8px] uppercase tracking-widest">Contexto Ideal</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.idealContext}</p>
                    </div>

                    <div class="p-2.5 rounded-md border border-rose-500/10 bg-rose-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1 text-rose-500/70">
                            <ShieldAlert class="w-3 h-3" />
                            <h4 class="font-black text-[8px] uppercase tracking-widest">Fraqueza Crítica</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.criticalWeakness}</p>
                    </div>
                </div>

                <!-- Meta Info -->
                <div class="flex flex-col items-end gap-1 shrink-0 pl-4 border-l border-border/10">
                    <span class="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest">Strategy Engine</span>
                    {#if insight._meta}
                        <div class="flex flex-col items-end">
                            <span class="text-[9px] font-mono text-emerald-500/50">
                                {insight._meta.origin === 'cache' ? '⚡ CACHE' : '☁️ LIVE'}
                            </span>
                            <span class="text-[8px] font-mono text-muted-foreground/40">{insight._meta.responseTimeMs}ms</span>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </CardContent>
</Card>
