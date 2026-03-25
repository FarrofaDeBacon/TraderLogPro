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

<Card class="border border-border/40 shadow-none bg-card/40 mt-6 relative overflow-hidden">
    <!-- Reduced glow -->
    <div class="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>

    <CardHeader class="p-4 pb-2 flex flex-row items-center justify-between">
        <div>
            <CardTitle class="flex items-center gap-1.5 text-emerald-500/80 text-sm font-bold tracking-tight">
                <BrainCircuit class="w-4 h-4" /> 
                Deep Dive da Estratégia (IA)
            </CardTitle>
            <CardDescription class="text-[10px] mt-0.5 max-w-[200px] leading-tight opacity-70">
                Análise sintética de performance sistêmica.
            </CardDescription>
        </div>
        
        {#if !insight && !loading}
            <Button 
                variant="outline" 
                size="sm" 
                onclick={generateInsight} 
                disabled={!hasActiveAiProvider}
                class="h-7 text-xs px-2 border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-500/80"
            >
                <BrainCircuit class="w-3 h-3 mr-1" /> Gerar insight
            </Button>
        {/if}
    </CardHeader>

    <CardContent class="p-4 pt-2">
        {#if error}
            <div class="p-3 bg-rose-500/5 border border-rose-500/10 rounded-md flex items-start gap-2 text-rose-500 mb-2">
                <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
                <div class="text-[11px]">
                    <p class="font-bold">Falha na análise</p>
                    <p class="opacity-80">{error}</p>
                </div>
            </div>
            <Button size="sm" variant="outline" class="h-7 text-xs border-rose-500/20 text-rose-500 hover:bg-rose-500/5" onclick={generateInsight}>Tentar Novamente</Button>
        {/if}

        {#if loading}
            <div class="py-8 flex flex-col items-center justify-center gap-2 border border-dashed border-border/20 rounded-md bg-background/20" transition:fade>
                <Loader2 class="w-5 h-5 animate-spin text-emerald-500/50" />
                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-emerald-500/50">Gerando análise...</span>
            </div>
        {/if}

        {#if insight && !loading}
            <div class="flex flex-col gap-2 mt-2" transition:slide>
                <!-- Performance -->
                <div class="p-3 rounded-md border border-emerald-500/10 bg-background/30">
                    <div class="flex items-center gap-1.5 mb-1.5 text-emerald-500/70">
                        <Zap class="w-3 h-3" />
                        <h4 class="font-black text-[9px] uppercase tracking-widest">Performance Sintética</h4>
                    </div>
                    <p class="text-[11px] leading-relaxed text-foreground/80 font-medium">{insight.performanceInterpretation}</p>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <!-- Contexto Ótimo -->
                    <div class="p-3 rounded-md border border-blue-500/10 bg-blue-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1.5 text-blue-500/70">
                            <Target class="w-3 h-3" />
                            <h4 class="font-black text-[9px] uppercase tracking-widest">Contexto Ideal</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-medium leading-relaxed">{insight.idealContext}</p>
                    </div>

                    <!-- Fraqueza -->
                    <div class="p-3 rounded-md border border-rose-500/10 bg-rose-500/[0.02]">
                        <div class="flex items-center gap-1.5 mb-1.5 text-rose-500/70">
                            <ShieldAlert class="w-3 h-3" />
                            <h4 class="font-black text-[9px] uppercase tracking-widest">Fraqueza / Exposição</h4>
                        </div>
                        <p class="text-[10px] text-foreground/80 font-medium leading-relaxed">{insight.criticalWeakness}</p>
                    </div>
                </div>
            </div>

            <!-- Meta / Disclaimer -->
            <div class="mt-3 pt-2 border-t border-border/20 flex flex-row items-center justify-between text-[9px] text-muted-foreground/40 font-mono tracking-wider">
                <span>IA ≠ Backtesting Rigoroso</span>
                {#if insight._meta}
                    <div class="flex items-center gap-2">
                        <span class={insight._meta.origin === 'cache' ? 'text-emerald-500/50' : 'text-emerald-500/50'}>
                             {insight._meta.origin === 'cache' ? '⚡ Cache' : '☁️ Network'}
                        </span>
                        <span>{insight._meta.responseTimeMs}ms</span>
                    </div>
                {/if}
            </div>
        {:else if !insight && !loading && !error}
            <div class="py-4 text-center text-[10px] text-muted-foreground/40 border border-dashed border-border/20 rounded-md bg-background/10 font-medium uppercase tracking-widest">
                Standby para análise.
            </div>
        {/if}
    </CardContent>
</Card>
