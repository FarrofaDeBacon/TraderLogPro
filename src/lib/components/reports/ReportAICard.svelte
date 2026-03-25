<script lang="ts">
    import { llmService } from '$lib/services/llmService';
    import { integrationsStore } from '$lib/stores/integrations.svelte';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
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
<Card class="border border-border/40 shadow-none bg-card/40 mt-4 relative overflow-hidden">
    <div class="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

    <CardHeader class="p-4 pb-2 flex flex-row items-center justify-between">
        <div>
            <CardTitle class="flex items-center gap-1.5 text-primary/80 text-sm font-bold tracking-tight">
                <BrainCircuit class="w-4 h-4" /> 
                Visão Executiva (IA)
            </CardTitle>
            <CardDescription class="text-[10px] mt-0.5 max-w-[200px] leading-tight opacity-70">
                Súmula macro do portfólio baseada nos KPIs cruzados.
            </CardDescription>
        </div>
        
        {#if !insightData && !isLoading}
            <Button 
                variant="outline" 
                size="sm" 
                onclick={generateInsight}
                disabled={!hasAIConfig || !hasEnoughData}
                class="h-7 text-xs px-2 border-primary/20 hover:bg-primary/5 text-primary/80"
            >
                <Sparkles class="w-3 h-3 mr-1" />
                Gerar análise
            </Button>
        {/if}
    </CardHeader>

    <CardContent class="p-4 pt-2">
        <!-- Avisos e Erros (Idle States) -->
        {#if !hasAIConfig && !insightData && !isLoading}
            <div class="py-4 text-center text-[10px] text-muted-foreground/40 border border-dashed border-border/20 rounded-md bg-background/10 font-medium uppercase tracking-widest">
                IA Desativada
            </div>
        {:else if !hasEnoughData && !insightData && !isLoading}
            <div class="py-4 text-center text-[10px] text-muted-foreground/40 border border-dashed border-border/20 rounded-md bg-background/10 font-medium uppercase tracking-widest">
                Requer 3 trades mínimos
            </div>
        {:else if error}
            <div class="p-3 bg-rose-500/5 border border-rose-500/10 rounded-md flex items-start gap-2 text-rose-500 mb-2">
                <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
                <div class="text-[11px]">
                    <p class="font-bold">Falha na análise</p>
                    <p class="opacity-80">{error}</p>
                </div>
            </div>
            <Button size="sm" variant="outline" class="h-7 text-xs border-rose-500/20 text-rose-500 hover:bg-rose-500/5" onclick={generateInsight}>Tentar Novamente</Button>
        {/if}

        <!-- Loading State -->
        {#if isLoading}
            <div class="py-8 flex flex-col items-center justify-center gap-2 border border-dashed border-border/20 rounded-md bg-background/20" transition:fade>
                <Loader2 class="w-5 h-5 animate-spin text-primary/50" />
                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-primary/50">Gerando análise...</span>
            </div>
        {/if}

        <!-- AI Output -->
        {#if insightData && !isLoading}
            <div class="flex flex-col gap-2 mt-2" transition:slide>
                <!-- Resumo Executivo -->
                <div class="p-3 rounded-md border border-primary/10 bg-background/30">
                    <div class="flex items-center gap-1.5 mb-1.5 text-primary/70">
                        <Target class="w-3 h-3" />
                        <h4 class="font-black text-[9px] uppercase tracking-widest">Resumo Institucional</h4>
                    </div>
                    <p class="text-[11px] leading-relaxed text-foreground/80 font-medium">{insightData.executiveSummary}</p>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <!-- Edge -->
                    <div class="p-3 rounded-md border border-emerald-500/10 bg-emerald-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1.5 text-emerald-500/70">
                            <TrendingUp class="w-3 h-3" />
                            <h4 class="font-black text-[9px] uppercase tracking-widest">A Vantagem (Edge)</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-medium leading-relaxed">{insightData.majorEdge}</p>
                    </div>

                    <!-- Fraqueza -->
                    <div class="p-3 rounded-md border border-rose-500/10 bg-rose-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1.5 text-rose-500/70">
                            <ShieldAlert class="w-3 h-3" />
                            <h4 class="font-black text-[9px] uppercase tracking-widest">Maior Fragilidade</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-medium leading-relaxed">{insightData.majorFragility}</p>
                    </div>
                </div>

                <!-- Próximo Foco -->
                <div class="mt-1 p-2 border-l-2 border-l-primary/50 bg-primary/5 border border-y-primary/5 border-r-primary/5 rounded-r-md">
                    <h4 class="font-black text-[8px] text-primary/60 mb-1 uppercase tracking-widest flex items-center gap-1.5">
                        <BrainCircuit class="w-3 h-3" /> Foco Requerido
                    </h4>
                    <p class="text-[10px] text-foreground/80 font-bold italic leading-relaxed">"{insightData.nextWindowFocus}"</p>
                </div>
            </div>

            <!-- Meta / Disclaimer info -->
            <div class="mt-3 pt-2 border-t border-border/20 flex flex-row items-center justify-between text-[9px] text-muted-foreground/40 font-mono tracking-wider">
                <span>IA ≠ KPIs auditados</span>
                {#if insightData._meta}
                    <div class="flex items-center gap-2">
                        <span class={insightData._meta.origin === 'cache' ? 'text-emerald-500/50' : 'text-primary/50'}>
                            {insightData._meta.origin === 'cache' ? '⚡ Cache' : '☁️ Network'}
                        </span>
                        <span>{insightData._meta.responseTimeMs}ms</span>
                    </div>
                {/if}
            </div>
        {/if}
    </CardContent>
</Card>
{/if}
