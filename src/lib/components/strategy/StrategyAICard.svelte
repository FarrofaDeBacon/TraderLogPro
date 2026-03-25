<script lang="ts">
    import { llmService } from "$lib/services/llmService";
    import { Button } from "$lib/components/ui/button";
    import { BrainCircuit, Loader2, AlertCircle, Target, ShieldAlert, Zap } from "lucide-svelte";
    import { onDestroy } from "svelte";

    export let strategyId: string;
    export let periodStr: string = "All Time";
    export let metricsPayload: any = {};
    export let hasActiveAiProvider: boolean = false;

    let loading = false;
    let insight: any = null;
    let error: string | null = null;
    let componentMounted = true;

    onDestroy(() => {
        componentMounted = false;
    });

    export async function generateInsight() {
        if (!hasActiveAiProvider) {
            error = "Nenhum provedor de IA habilitado em Configurações > Integrações.";
            return;
        }

        loading = true;
        error = null;
        try {
            const result = await llmService.generateStrategyInsight(strategyId, periodStr, metricsPayload);
            if (componentMounted) {
                insight = result;
            }
        } catch (e: any) {
            if (componentMounted) {
                error = e.message || "Erro na análise estratégica.";
            }
        } finally {
            if (componentMounted) {
                loading = false;
            }
        }
    }
</script>

<div class="mt-4 pt-4 border-t border-border/50">
    <div class="flex items-center justify-between mb-4">
        <div class="flex flex-col">
            <div class="flex items-center gap-2">
                <BrainCircuit class="w-4 h-4 text-emerald-500" />
                <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest">Leitura Avançada (IA)</span>
            </div>
            <span class="text-[9px] text-muted-foreground/60 mt-1 max-w-sm">Análise 100% interpretativa. Esta visão não anula ou substitui os diagnósticos matemáticos e de risco listados acima.</span>
        </div>
        
        {#if !insight && !loading}
            <Button 
                variant="outline" 
                size="sm" 
                onclick={generateInsight} 
                disabled={!hasActiveAiProvider}
                class="h-7 text-[10px] border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-500"
            >
                Deep Dive da Estratégia
            </Button>
        {/if}
    </div>

    {#if loading}
        <div class="flex flex-col items-center justify-center py-6 text-emerald-500/70">
            <Loader2 class="w-5 h-5 animate-spin mb-2" />
            <span class="text-[10px] uppercase font-bold tracking-widest">Extraindo correlações...</span>
        </div>
    {/if}

    {#if error}
        <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start gap-2 text-rose-400 mt-2">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <div class="text-[10px]">
                <p class="font-bold">Falha Estrutural na IA</p>
                <p class="opacity-80">{error}</p>
            </div>
        </div>
    {/if}

    {#if insight && !loading}
        <div class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div class="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div class="flex items-center gap-1.5 mb-1.5 text-emerald-500">
                    <Zap class="w-3.5 h-3.5" />
                    <span class="text-[10px] font-black uppercase tracking-widest">Performance Sintética</span>
                </div>
                <p class="text-xs text-foreground/90 leading-relaxed font-medium">
                    {insight.performanceInterpretation}
                </p>
            </div>

            <div class="grid grid-cols-1 gap-3">
                <div class="p-3 rounded-lg border bg-card text-card-foreground">
                    <div class="flex items-center gap-1.5 mb-1.5 text-blue-500">
                        <Target class="w-3.5 h-3.5" />
                        <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contexto Operacional Ótimo</span>
                    </div>
                    <p class="text-[11px] text-muted-foreground leading-relaxed">
                        {insight.idealContext}
                    </p>
                </div>

                <div class="p-3 rounded-lg border bg-rose-500/5 border-rose-500/20">
                    <div class="flex items-center gap-1.5 mb-1.5 text-rose-500">
                        <ShieldAlert class="w-3.5 h-3.5" />
                        <span class="text-[10px] font-black uppercase tracking-widest text-rose-500/80">Fraqueza & Exposição</span>
                    </div>
                    <p class="text-[11px] text-rose-400/90 leading-relaxed font-medium">
                        {insight.criticalWeakness}
                    </p>
                </div>
            </div>

            <!-- Debug / Meta Info (Requirement #6) -->
            <div class="pt-2 flex items-center justify-between text-[8px] text-muted-foreground/50 font-mono tracking-wider">
                <div class="truncate max-w-[150px]" title={insight._meta?.hash}>PTR: {insight._meta?.hash || 'N/A'}</div>
                <div class="flex items-center gap-2">
                    <span class={insight._meta?.origin === 'cache' ? 'text-amber-500/70' : 'text-emerald-500/70'}>
                        [{insight._meta?.origin === 'cache' ? 'RAM_HIT' : 'NETWORK_LLM'}]
                    </span>
                    <span>{insight._meta?.responseTimeMs || 0}ms</span>
                </div>
            </div>
        </div>
    {/if}
</div>
