<script lang="ts">
    import { llmService } from "$lib/services/llmService";
    import { Card, CardContent } from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { BrainCircuit, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import { onDestroy } from "svelte";

    export let periodStr: string = "Últimos 30 Dias";
    export let metricsPayload: any = {};
    export let hasActiveAiProvider: boolean = false;

    let loading = false;
    let insight: any = null;
    let error: string | null = null;
    let componentMounted = true;

    onDestroy(() => { componentMounted = false; });

    export async function generateInsight() {
        if (!hasActiveAiProvider) {
            error = "Nenhum provedor de IA habilitado em Configurações > Integrações."; return;
        }
        loading = true;
        error = null;
        try {
            const result = await llmService.generatePsychologyInsight(periodStr, metricsPayload);
            if (componentMounted) insight = result;
        } catch (e: any) {
            if (componentMounted) error = e.message || "Erro na análise comportamental.";
        } finally {
            if (componentMounted) loading = false;
        }
    }
</script>

<Card class="border border-border/20 shadow-none bg-primary/[0.02] backdrop-blur-md relative overflow-hidden group">
    <!-- Decoração discreta -->
    <div class="absolute -left-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
    
    <CardContent class="p-3">
        {#if !insight && !loading && !error}
            <div class="flex items-center justify-between gap-4">
               <div class="flex items-center gap-3">
                  <div class="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                     <BrainCircuit class="w-4 h-4" />
                  </div>
                  <div>
                     <h4 class="text-xs font-bold text-foreground/90 leading-tight">Análise Comportamental (IA)</h4>
                     <p class="text-[10px] text-muted-foreground font-medium">Interpretação sistêmica dos padrões emocionais do período.</p>
                  </div>
               </div>
               <Button 
                   variant="outline" 
                   size="sm" 
                   onclick={generateInsight} 
                   disabled={!hasActiveAiProvider}
                   class="h-7 text-[10px] px-3 border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-500/80 font-bold uppercase tracking-wider"
               >
                   Gerar Insight
               </Button>
            </div>
        {:else if loading}
            <div class="flex items-center justify-center gap-3 py-1" transition:fade>
                <Loader2 class="w-4 h-4 animate-spin text-indigo-500/40" />
                <span class="text-[10px] font-black uppercase tracking-widest text-indigo-500/50">Sintetizando correlações comportamentais...</span>
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
                <!-- Padrão Dominante (33% de largura no horizontal) -->
                <div class="flex-1 min-w-0 border-r border-border/10 pr-4 hidden md:block">
                    <div class="flex items-center gap-1.5 mb-1 text-indigo-500/60">
                        <BrainCircuit class="w-3 h-3" />
                        <h4 class="font-black text-[8px] uppercase tracking-widest">Padrão Dominante</h4>
                    </div>
                    <p class="text-[11px] leading-relaxed text-foreground/80 font-medium line-clamp-2 italic">"{insight.dominantPattern}"</p>
                </div>

                <!-- Risco e Ação (Lado a Lado) -->
                <div class="flex-[2] grid grid-cols-2 gap-3 w-full">
                    <div class="p-2.5 rounded-md border border-rose-500/10 bg-rose-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1 text-rose-500/70">
                            <ShieldAlert class="w-3 h-3" />
                            <h4 class="font-black text-[8px] uppercase tracking-widest">Maior Vulnerabilidade</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.majorRisk}</p>
                    </div>

                    <div class="p-2.5 rounded-md border border-emerald-500/10 bg-emerald-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1 text-emerald-500/70">
                            <CheckCircle2 class="w-3 h-3" />
                            <h4 class="font-black text-[8px] uppercase tracking-widest">Protocolo Sugerido</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.practicalActions?.[0] || 'Manter disciplina estatística'}</p>
                    </div>
                </div>

                <!-- Meta Info (Direita) -->
                <div class="flex flex-col items-end gap-1 shrink-0 pl-4 border-l border-border/10">
                    <span class="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest">AI Diagnostics</span>
                    {#if insight._meta}
                        <div class="flex flex-col items-end">
                            <span class="text-[9px] font-mono {insight._meta.origin === 'cache' ? 'text-emerald-500/50' : 'text-indigo-500/50'}">
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
