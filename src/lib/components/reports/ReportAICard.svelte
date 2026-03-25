<script lang="ts">
    import { llmService } from '$lib/services/llmService';
    import { integrationsStore } from '$lib/stores/integrations.svelte';
    import { Card, CardContent } from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { BrainCircuit, Sparkles, AlertCircle, Target, TrendingUp, ShieldAlert, Loader2 } from 'lucide-svelte';
    import { fade, slide } from 'svelte/transition';

    export let periodStr: string = "Período Personalizado";
    export let metricsPayload: any = {};
    export let isPrintMode: boolean = false;

    let isLoading = false;
    let error: string | null = null;
    let insightData: any = null;

    $: hasAIConfig = integrationsStore.apiConfigs.some(
        (c: any) => c.enabled && (c.provider === 'openai' || c.provider === 'google_gemini')
    );
    $: hasEnoughData = (metricsPayload.tradeCount ?? 0) >= 3;

    let lastHash = "";
    $: {
        const h = JSON.stringify(metricsPayload);
        if (h !== lastHash) {
            insightData = null;
            error = null;
            lastHash = h;
        }
    }

    async function generateInsight() {
        if (!hasAIConfig) {
            error = "Nenhum provedor de IA habilitado em Integrações."; return;
        }
        if (!hasEnoughData) {
            error = "Dados insuficientes para análise executiva."; return;
        }

        isLoading = true;
        error = null;
        try {
            insightData = await llmService.generateReportInsight(periodStr, metricsPayload);
        } catch (err: any) {
            error = err.message || "Falha ao gerar a Visão Executiva.";
        } finally {
            isLoading = false;
        }
    }
</script>

{#if !isPrintMode || insightData}
<Card class="border border-border/20 shadow-none bg-primary/[0.02] backdrop-blur-md relative overflow-hidden group mt-4">
    <div class="absolute -left-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors"></div>

    <CardContent class="p-3">
        {#if !insightData && !isLoading && !error}
            <div class="flex items-center justify-between gap-4">
               <div class="flex items-center gap-3">
                  <div class="p-2 bg-primary/10 rounded-lg text-primary">
                     <BrainCircuit class="w-4 h-4" />
                  </div>
                  <div>
                     <h4 class="text-xs font-bold text-foreground/90 leading-tight">Visão Executiva de Portfólio (IA)</h4>
                     <p class="text-[10px] text-muted-foreground font-medium">Cruzamento macro de KPIs e eficiência de capital.</p>
                  </div>
               </div>
               <Button 
                   variant="outline" 
                   size="sm" 
                   onclick={generateInsight} 
                   disabled={!hasAIConfig || !hasEnoughData}
                   class="h-7 text-[10px] px-3 border-primary/20 hover:bg-primary/5 text-primary/80 font-bold uppercase tracking-wider"
               >
                   Gerar Análise
               </Button>
            </div>
        {:else if isLoading}
            <div class="flex items-center justify-center gap-3 py-1" transition:fade>
                <Loader2 class="w-4 h-4 animate-spin text-primary/40" />
                <span class="text-[10px] font-black uppercase tracking-widest text-primary/50">Auditando performance executiva...</span>
            </div>
        {:else if error}
            <div class="flex items-center justify-between gap-4 bg-rose-500/5 p-2 rounded-md border border-rose-500/10">
                <div class="flex items-center gap-2">
                    <AlertCircle class="w-4 h-4 text-rose-500/60" />
                    <span class="text-[10px] font-bold text-rose-500/80 uppercase tracking-tight">{error}</span>
                </div>
                <Button size="sm" variant="ghost" class="h-6 text-[9px] text-rose-500 hover:bg-rose-500/10 font-black uppercase" onclick={generateInsight}>Tentar Novamente</Button>
            </div>
        {:else if insightData && !isLoading}
            <div class="flex flex-col md:flex-row gap-4 items-center" transition:slide>
                <!-- Resumo -->
                <div class="flex-1 min-w-0 border-r border-border/10 pr-4 hidden md:block">
                    <div class="flex items-center gap-1.5 mb-1 text-primary/60">
                        <Target class="w-3 h-3" />
                        <h4 class="font-black text-[8px] uppercase tracking-widest">Súmula Institucional</h4>
                    </div>
                    <p class="text-[11px] leading-relaxed text-foreground/80 font-medium line-clamp-2 italic">"{insightData.executiveSummary}"</p>
                </div>

                <!-- Edge e Fragilidade -->
                <div class="flex-[2] grid grid-cols-2 gap-3 w-full">
                    <div class="p-2.5 rounded-md border border-emerald-500/10 bg-emerald-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1 text-emerald-500/70">
                            <TrendingUp class="w-3 h-3" />
                            <h4 class="font-black text-[8px] uppercase tracking-widest">Core Advantage</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insightData.majorEdge}</p>
                    </div>

                    <div class="p-2.5 rounded-md border border-rose-500/10 bg-rose-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1 text-rose-500/70">
                            <ShieldAlert class="w-3 h-3" />
                            <h4 class="font-black text-[8px] uppercase tracking-widest">Ponto Crítico</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insightData.majorFragility}</p>
                    </div>
                </div>

                <!-- Focus -->
                <div class="flex flex-col items-center justify-center p-2 rounded-lg bg-primary/5 border border-primary/10 shrink-0 w-32">
                    <span class="text-[8px] font-black text-primary/60 uppercase mb-1 tracking-tighter">Foco Requerido</span>
                    <p class="text-[10px] font-black text-primary text-center leading-tight">"{insightData.nextWindowFocus}"</p>
                </div>
            </div>
        {/if}
    </CardContent>
</Card>
{/if}
