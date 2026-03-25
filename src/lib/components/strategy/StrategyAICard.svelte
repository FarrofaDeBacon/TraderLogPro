<script lang="ts">
    import { llmService } from "$lib/services/llmService";
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
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
            error = "Nenhum provedor de IA habilitado em Configurações > Integrações."; return;
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

<Card class="border-2 border-emerald-500/20 shadow-sm bg-card/60 backdrop-blur-xl mt-6 relative overflow-hidden">
    <div class="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

    <CardHeader class="pb-3 flex flex-row items-center justify-between">
        <div>
            <CardTitle class="flex items-center gap-2 text-emerald-500">
                <BrainCircuit class="w-5 h-5" /> 
                Deep Dive da Estratégia (IA)
            </CardTitle>
            <CardDescription class="text-xs mt-1 max-w-xl">
                Análise sintética das correlações dos KPIs (Payoff, Win Rate) para otimização operacional. 
            </CardDescription>
        </div>
        
        {#if !insight && !loading}
            <Button 
                variant="outline" 
                size="sm" 
                onclick={generateInsight} 
                disabled={!hasActiveAiProvider}
                class="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-500"
            >
                <BrainCircuit class="w-4 h-4 mr-2" /> Gerar insight
            </Button>
        {/if}
    </CardHeader>

    <CardContent>
        {#if error}
            <div class="p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start gap-3 text-rose-500 mb-2">
                <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
                <div class="text-sm">
                    <p class="font-bold">Falha na análise</p>
                    <p class="opacity-80">{error}</p>
                </div>
            </div>
            <Button size="sm" variant="outline" class="border-rose-500/30 text-rose-500 hover:bg-rose-500/10" onclick={generateInsight}>Tentar Novamente</Button>
        {/if}

        {#if loading}
            <div class="py-12 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/20 rounded-lg bg-background/20" transition:fade>
                <Loader2 class="w-6 h-6 animate-spin text-emerald-500/70" />
                <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest text-emerald-500/70">Processando correlações estatísticas...</span>
            </div>
        {/if}

        {#if insight && !loading}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2" transition:slide>
                <!-- Performance -->
                <div class="md:col-span-2 p-4 rounded-lg border border-emerald-500/20 bg-background/50 shadow-sm">
                    <div class="flex items-center gap-2 mb-2 text-emerald-500">
                        <Zap class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">Performance Sintética</h4>
                    </div>
                    <p class="text-[13px] leading-relaxed text-foreground/90 font-medium">{insight.performanceInterpretation}</p>
                </div>

                <!-- Contexto Ótimo -->
                <div class="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                    <div class="flex items-center gap-2 mb-2 text-blue-500">
                        <Target class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] uppercase tracking-widest text-blue-500/80">Contexto Ideal</h4>
                    </div>
                    <p class="text-[12px] text-foreground/90 font-medium leading-relaxed">{insight.idealContext}</p>
                </div>

                <!-- Fraqueza -->
                <div class="p-4 rounded-lg border bg-rose-500/5 border-rose-500/20">
                    <div class="flex items-center gap-2 mb-2 text-rose-500">
                        <ShieldAlert class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] uppercase tracking-widest text-rose-500/80">Fraqueza & Exposição</h4>
                    </div>
                    <p class="text-[12px] text-foreground/90 font-medium leading-relaxed">{insight.criticalWeakness}</p>
                </div>
            </div>

            <!-- Meta / Disclaimer -->
            <div class="mt-6 pt-3 border-t border-border/40 flex flex-col md:flex-row items-center justify-between text-[11px] text-muted-foreground/60 gap-3 font-mono tracking-wider">
                <span class="text-[10px]">A IA não exime a validação de backtesting rigoroso.</span>
                {#if insight._meta}
                    <div class="flex items-center gap-3">
                        <span class={insight._meta.origin === 'cache' ? 'text-emerald-500/80' : 'text-emerald-500/70'}>
                             {insight._meta.origin === 'cache' ? '⚡ Cache local' : '☁️ Análise gerada agora'}
                        </span>
                        <span>Tempo: {insight._meta.responseTimeMs}ms</span>
                    </div>
                {/if}
            </div>
        {:else if !insight && !loading && !error}
            <div class="py-6 text-center text-xs text-muted-foreground/60 border-2 border-dashed border-border/20 rounded-lg bg-background/20 font-medium uppercase tracking-widest">
                Requer aprovação manual para leitura estratégica.
            </div>
        {/if}
    </CardContent>
</Card>
