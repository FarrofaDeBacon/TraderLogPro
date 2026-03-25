<script lang="ts">
    import { llmService } from "$lib/services/llmService";
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
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

<Card class="border-2 border-indigo-500/20 shadow-sm bg-card/60 backdrop-blur-xl mb-6 relative overflow-hidden">
    <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
    
    <CardHeader class="pb-3 flex flex-row items-center justify-between">
        <div>
            <CardTitle class="flex items-center gap-2 text-indigo-500">
                <BrainCircuit class="w-5 h-5" /> 
                Análise Comportamental (IA)
            </CardTitle>
            <CardDescription class="text-xs mt-1 max-w-xl">
                Interpretação mecânica do seu padrão emocional baseada puramente nos KPIs matemáticos. 
            </CardDescription>
        </div>
        
        {#if !insight && !loading}
            <Button 
                variant="outline" 
                size="sm" 
                onclick={generateInsight} 
                disabled={!hasActiveAiProvider}
                class="border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-500"
            >
                <BrainCircuit class="w-4 h-4 mr-2" /> Gerar análise
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
                <Loader2 class="w-6 h-6 animate-spin text-indigo-500/70" />
                <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest text-indigo-500/70">Processando dados do período...</span>
            </div>
        {/if}

        {#if insight && !loading}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2" transition:slide>
                <!-- Padrão Dominante (Topo) -->
                <div class="md:col-span-2 p-4 rounded-lg border border-indigo-500/20 bg-background/50 shadow-sm">
                    <div class="flex items-center gap-2 mb-2 text-indigo-500">
                        <BrainCircuit class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">Padrão Dominante</h4>
                    </div>
                    <p class="text-[13px] leading-relaxed text-foreground/90 font-medium">{insight.dominantPattern}</p>
                </div>

                <!-- Maior Risco -->
                <div class="p-4 rounded-lg border bg-rose-500/5 border-rose-500/20">
                    <div class="flex items-center gap-2 mb-2 text-rose-500">
                        <ShieldAlert class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] uppercase tracking-widest text-rose-500/80">Maior Risco Psicológico</h4>
                    </div>
                    <p class="text-[12px] text-foreground/90 font-medium leading-relaxed">{insight.majorRisk}</p>
                </div>

                <!-- Ações Práticas -->
                <div class="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                    <div class="flex items-center gap-2 mb-2 text-emerald-500">
                        <CheckCircle2 class="w-4 h-4" />
                        <h4 class="font-bold text-[10px] uppercase tracking-widest text-emerald-500/80">Recomendações Práticas</h4>
                    </div>
                    <ul class="space-y-1.5">
                        {#each insight.practicalActions || [] as action}
                            <li class="flex items-start gap-2 text-[12px] text-foreground/80 font-medium">
                                <span class="text-emerald-500/60 mt-0.5 min-w-[12px]">•</span>
                                <span class="leading-snug">{action}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>

            <!-- Meta / Disclaimer -->
            <div class="mt-6 pt-3 border-t border-border/40 flex flex-col md:flex-row items-center justify-between text-[11px] text-muted-foreground/60 gap-3 font-mono tracking-wider">
                <span class="text-[10px]">A IA não toma decisões financeiras.</span>
                {#if insight._meta}
                    <div class="flex items-center gap-3">
                        <span class={insight._meta.origin === 'cache' ? 'text-emerald-500/80' : 'text-indigo-500/70'}>
                             {insight._meta.origin === 'cache' ? '⚡ Cache local' : '☁️ Análise gerada agora'}
                        </span>
                        <span>Tempo: {insight._meta.responseTimeMs}ms</span>
                    </div>
                {/if}
            </div>
        {:else if !insight && !loading && !error}
            <div class="py-6 text-center text-xs text-muted-foreground/60 border-2 border-dashed border-border/20 rounded-lg bg-background/20 font-medium uppercase tracking-widest">
                Requer aprovação manual para leitura comportamental.
            </div>
        {/if}
    </CardContent>
</Card>
