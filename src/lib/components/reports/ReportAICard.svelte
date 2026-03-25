<script lang="ts">
    import { llmService } from '$lib/services/llmService';
    import { integrationsStore } from '$lib/stores/integrations.svelte';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { BrainCircuit, Sparkles, AlertCircle, Target, TrendingUp, ShieldAlert, Cpu, Loader2 } from 'lucide-svelte';
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
<Card class="border-2 border-primary/20 shadow-sm bg-card/60 backdrop-blur-xl mt-4 relative overflow-hidden">
    <!-- Decoração de Fundo (Contexto: Executivo) -->
    <div class="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

    <CardHeader class="pb-3 flex flex-row items-center justify-between">
        <div>
            <CardTitle class="flex items-center gap-2 text-primary">
                <BrainCircuit class="w-5 h-5" /> 
                Visão Executiva (IA)
            </CardTitle>
            <CardDescription class="text-xs mt-1 max-w-xl">
                Análise macro do portfólio baseada nos KPIs cruzados (Win Rate, Payoff e Comportamento).
            </CardDescription>
        </div>
        
        {#if !insightData && !isLoading}
            <Button 
                variant="outline" 
                size="sm" 
                onclick={generateInsight}
                disabled={!hasAIConfig || !hasEnoughData}
                class="border-primary/30 hover:bg-primary/10 text-primary"
            >
                <Sparkles class="w-4 h-4 mr-2" />
                Gerar análise
            </Button>
        {/if}
    </CardHeader>

    <CardContent>
        <!-- Avisos e Erros (Idle States) -->
        {#if !hasAIConfig && !insightData && !isLoading}
            <div class="py-6 text-center text-xs text-muted-foreground/60 border-2 border-dashed border-border/20 rounded-lg bg-background/20 font-medium uppercase tracking-widest">
                Configure um provedor de IA para habilitar as análises.
            </div>
        {:else if !hasEnoughData && !insightData && !isLoading}
            <div class="py-6 text-center text-xs text-muted-foreground/60 border-2 border-dashed border-border/20 rounded-lg bg-background/20 font-medium uppercase tracking-widest">
                Dados estatísticos insuficientes para inferência. (Mínimo de 3 trades)
            </div>
        {:else if error}
            <div class="p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start gap-3 text-rose-500 mb-2">
                <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
                <div class="text-sm">
                    <p class="font-bold">Falha na análise</p>
                    <p class="opacity-80">{error}</p>
                </div>
            </div>
            <Button size="sm" variant="outline" class="border-rose-500/30 text-rose-500 hover:bg-rose-500/10" onclick={generateInsight}>Tentar Novamente</Button>
        {/if}

        <!-- Loading State -->
        {#if isLoading}
            <div class="py-12 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/20 rounded-lg bg-background/20" transition:fade>
                <Loader2 class="w-6 h-6 animate-spin text-primary/70" />
                <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest text-primary/70">Processando dados do período...</span>
            </div>
        {/if}

        <!-- AI Output -->
        {#if insightData && !isLoading}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2" transition:slide>
                <!-- Resumo Executivo -->
                <div class="md:col-span-2 p-4 rounded-lg border border-primary/20 bg-background/50 shadow-sm">
                    <div class="flex items-center gap-2 mb-2">
                        <Target class="w-4 h-4 text-primary" />
                        <h4 class="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">Resumo Institucional</h4>
                    </div>
                    <p class="text-[13px] leading-relaxed text-foreground/90 font-medium">{insightData.executiveSummary}</p>
                </div>

                <!-- Edge -->
                <div class="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                    <div class="flex items-center gap-2 mb-2 text-emerald-500">
                        <TrendingUp class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] uppercase tracking-widest text-emerald-500/80">Maior Vantagem (Edge)</h4>
                    </div>
                    <p class="text-[12px] text-foreground/90 font-medium leading-relaxed">{insightData.majorEdge}</p>
                </div>

                <!-- Fraqueza -->
                <div class="p-4 rounded-lg border bg-rose-500/5 border-rose-500/20">
                    <div class="flex items-center gap-2 mb-2 text-rose-500">
                        <ShieldAlert class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] uppercase tracking-widest text-rose-500/80">Maior Fragilidade</h4>
                    </div>
                    <p class="text-[12px] text-foreground/90 font-medium leading-relaxed">{insightData.majorFragility}</p>
                </div>

                <!-- Próximo Foco -->
                <div class="md:col-span-2 mt-2 p-4 border-l-2 border-l-primary bg-primary/5 border border-y-primary/10 border-r-primary/10 rounded-r-lg">
                    <h4 class="font-bold text-[10px] text-primary/80 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <BrainCircuit class="w-3.5 h-3.5" /> Foco na Próxima Janela
                    </h4>
                    <p class="text-[13px] text-foreground/90 font-bold italic leading-relaxed">"{insightData.nextWindowFocus}"</p>
                </div>
            </div>

            <!-- Meta / Disclaimer info -->
            <div class="mt-6 pt-3 border-t border-border/40 flex flex-col md:flex-row items-center justify-between text-[11px] text-muted-foreground/60 gap-3 font-mono tracking-wider">
                <span class="text-[10px]">As análises de IA não substituem os KPIs matemáticos auditados.</span>
                {#if insightData._meta}
                    <div class="flex items-center gap-3">
                        <span class={insightData._meta.origin === 'cache' ? 'text-emerald-500/80' : 'text-primary/70'}>
                            {insightData._meta.origin === 'cache' ? '⚡ Cache local' : '☁️ Análise gerada agora'}
                        </span>
                        <span>Tempo: {insightData._meta.responseTimeMs}ms</span>
                    </div>
                {/if}
            </div>
        {/if}
    </CardContent>
</Card>
{/if}
