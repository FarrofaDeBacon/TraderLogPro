<script lang="ts">
    import { llmService } from '$lib/services/llmService';
    import { integrationsStore } from '$lib/stores/integrations.svelte';
    import { Button } from "$lib/components/ui/button";
    import { SystemAICard, SystemHeader } from "$lib/components/ui/system";
    import { BrainCircuit, Sparkles, AlertCircle, Target, TrendingUp, ShieldAlert, Loader2 } from 'lucide-svelte';
    import { fade, slide } from 'svelte/transition';
    import { cn } from "$lib/utils";

    interface Props {
        periodStr?: string;
        metricsPayload?: any;
        isPrintMode?: boolean;
    }

    let { 
        periodStr = "Período Personalizado", 
        metricsPayload = {}, 
        isPrintMode = false 
    }: Props = $props();

    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let insightData = $state<any>(null);

    let hasAIConfig = $derived(integrationsStore.apiConfigs.some(
        (c: any) => c.enabled && (c.provider === 'openai' || c.provider === 'google_gemini')
    ));
    let hasEnoughData = $derived((metricsPayload.tradeCount ?? 0) >= 3);

    let lastHash = $state("");
    $effect(() => {
        const h = JSON.stringify(metricsPayload);
        if (h !== lastHash) {
            insightData = null;
            error = null;
            lastHash = h;
        }
    });

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

    let status = $derived<"success" | "error" | "loading" | "idle">(
        isLoading ? 'loading' :
        error ? 'error' :
        insightData ? 'success' : 'idle'
    );
</script>

{#if !isPrintMode || insightData}
    <SystemAICard 
        {status} 
        class="mt-4"
        title="Visão Executiva de Portfólio (IA)"
        description="Cruzamento macro de KPIs e eficiência de capital."
        errorText={error || "Falha ao gerar a Visão Executiva."}
        origin={insightData?._meta?.origin}
        responseTimeMs={insightData?._meta?.responseTimeMs}
    >
        {#snippet idleActions()}
            <Button 
                variant="outline" 
                size="sm" 
                onclick={generateInsight} 
                disabled={!hasAIConfig || !hasEnoughData}
                class="h-7 text-[10px] px-3 border-primary/20 hover:bg-primary/5 text-primary/80 font-bold uppercase tracking-wider"
            >
                Gerar Análise
            </Button>
        {/snippet}

        {#snippet retryAction()}
            <Button size="sm" variant="ghost" class="h-6 text-[9px] text-rose-500 hover:bg-rose-500/10 font-black uppercase" onclick={generateInsight}>Tentar Novamente</Button>
        {/snippet}

        {#snippet content()}
            <div class="hidden md:block">
                <SystemHeader 
                    title="Súmula Institucional"
                    icon={Target}
                    class="mb-1 text-primary/60"
                />
                <p class="text-[11px] leading-relaxed text-foreground/80 font-medium line-clamp-2 italic">"{insightData.executiveSummary}"</p>
            </div>
        {/snippet}

        {#snippet matrix()}
            <div class="grid grid-cols-2 gap-3 w-full">
                <div class="p-2.5 rounded-md border border-emerald-500/10 bg-emerald-500/[0.02]">
                    <SystemHeader 
                        title="Core Advantage"
                        icon={TrendingUp}
                        class="mb-1 text-emerald-500/70"
                    />
                    <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insightData.majorEdge}</p>
                </div>

                <div class="p-2.5 rounded-md border border-rose-500/10 bg-rose-500/[0.02]">
                    <SystemHeader 
                        title="Ponto Crítico"
                        icon={ShieldAlert}
                        class="mb-1 text-rose-500/70"
                    />
                    <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insightData.majorFragility}</p>
                </div>
            </div>
        {/snippet}
        
        {#snippet actions()}
            <div class="flex flex-col items-center justify-center p-2 rounded-lg bg-primary/5 border border-primary/10 shrink-0 w-32 mt-1">
                <span class="text-[8px] font-black text-primary/60 uppercase mb-1 tracking-tighter">Foco Requerido</span>
                <p class="text-[10px] font-black text-primary text-center leading-tight">"{insightData.nextWindowFocus}"</p>
            </div>
        {/snippet}
    </SystemAICard>
{/if}
