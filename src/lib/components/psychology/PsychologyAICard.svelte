<script lang="ts">
    import { t } from "svelte-i18n";
    import { llmService } from "$lib/services/llmService";
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { BrainCircuit, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-svelte";
    import { onDestroy } from "svelte";

    export let periodStr: string = "Últimos 30 Dias";
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
            const result = await llmService.generatePsychologyInsight(periodStr, metricsPayload);
            if (componentMounted) {
                insight = result;
            }
        } catch (e: any) {
            if (componentMounted) {
                error = e.message || "Erro na análise comportamental.";
            }
        } finally {
            if (componentMounted) {
                loading = false;
            }
        }
    }
</script>

<Card class="border-2 border-indigo-500/20 shadow-lg bg-card/60 backdrop-blur-xl mb-6 relative overflow-hidden">
    <!-- Decorative background -->
    <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
    
    <CardHeader class="pb-3 flex flex-row items-center justify-between">
        <div>
            <CardTitle class="flex items-center gap-2 text-indigo-400">
                <BrainCircuit class="w-5 h-5" /> 
                Análise Comportamental (IA)
            </CardTitle>
            <CardDescription class="text-xs mt-1 max-w-xl">
                Interpretação mecânica do seu padrão emocional baseada puramente nos KPIs matemáticos do período. 
                Nenhuma decisão financeira deve ser tomada baseada exclusivamente nestas conclusões.
            </CardDescription>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onclick={generateInsight} 
            disabled={loading || !hasActiveAiProvider}
            class="border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400"
        >
            {#if loading}
                <Loader2 class="w-4 h-4 mr-2 animate-spin" /> Processando...
            {:else}
                <BrainCircuit class="w-4 h-4 mr-2" /> Extrair Edge
            {/if}
        </Button>
    </CardHeader>

    <CardContent>
        {#if error}
            <div class="p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start gap-3 text-rose-400">
                <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
                <div class="text-sm">
                    <p class="font-bold">Falha Estrutural na IA</p>
                    <p class="opacity-80">{error}</p>
                </div>
            </div>
        {/if}

        {#if insight && !loading}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <!-- Left Column -->
                <div class="space-y-4">
                    <div class="space-y-1">
                        <h4 class="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <BrainCircuit class="w-3.5 h-3.5 text-indigo-400" /> Padrão Dominante
                        </h4>
                        <p class="text-sm text-foreground/90 font-medium leading-relaxed">
                            {insight.dominantPattern}
                        </p>
                    </div>

                    <div class="space-y-1">
                        <h4 class="text-[10px] font-black uppercase tracking-widest text-rose-500/80 flex items-center gap-1.5">
                            <ShieldAlert class="w-3.5 h-3.5 text-rose-500/80" /> Maior Risco Psicológico
                        </h4>
                        <p class="text-sm text-rose-400/90 leading-relaxed font-medium">
                            {insight.majorRisk}
                        </p>
                    </div>
                </div>

                <!-- Right Column -->
                <div class="space-y-3 md:border-l border-border/50 md:pl-6">
                    <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-500/80 flex items-center gap-1.5">
                        <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500/80" /> Ações Práticas Recomendadas
                    </h4>
                    <ul class="space-y-2">
                        {#each insight.practicalActions || [] as action}
                            <li class="flex items-start gap-2 text-sm text-muted-foreground">
                                <span class="text-emerald-500/60 mt-0.5">•</span>
                                <span class="leading-relaxed">{action}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>

            <!-- Debug / Meta Info (Requirement #6) -->
            <div class="mt-6 pt-3 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground/60 font-mono tracking-wider">
                <div class="text-[8px] opacity-50 truncate max-w-[200px]" title={insight._meta?.hash}>HASH_PTR: {insight._meta?.hash || 'N/A'}</div>
                <div class="flex items-center gap-3">
                    <span class={insight._meta?.origin === 'cache' ? 'text-amber-500/80' : 'text-indigo-400/80'}>
                        [ {insight._meta?.origin === 'cache' ? 'RESTORED_FROM_LOCAL_CACHE' : 'LLM_NETWORK_ALLOCATION'} ]
                    </span>
                    <span>T-RES: {insight._meta?.responseTimeMs || 0}ms</span>
                </div>
            </div>
        {:else if !insight && !loading && !error}
            <div class="py-6 text-center text-xs text-muted-foreground/60 border-2 border-dashed border-border/20 rounded-lg bg-background/20 font-medium uppercase tracking-widest">
                Aguardando Comando Manual de Extração
            </div>
        {/if}
    </CardContent>
</Card>
