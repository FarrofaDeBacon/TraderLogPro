<script lang="ts">
    import { llmService } from "$lib/services/llmService";
    import { Button } from "$lib/components/ui/button";
    import { SystemAICard, SystemHeader } from "$lib/components/ui/system";
    import { BrainCircuit, Loader2, AlertCircle, Target, ShieldAlert, Zap } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import { onDestroy } from "svelte";
    import { t } from "svelte-i18n";

    interface Props {
        strategyId: string;
        periodStr?: string;
        metricsPayload?: any;
        hasActiveAiProvider?: boolean;
    }

    let { 
        strategyId, 
        periodStr = "All Time", 
        metricsPayload = {}, 
        hasActiveAiProvider = false 
    }: Props = $props();

    let loading = $state(false);
    let insight = $state<any>(null);
    let error = $state<string | null>(null);
    let componentMounted = true;

    onDestroy(() => { componentMounted = false; });

    export async function generateInsight() {
        if (!hasActiveAiProvider) {
            error = $t("reports.ai.error_no_config"); return;
        }
        loading = true;
        error = null;
        try {
            const result = await llmService.generateStrategyInsight(strategyId, periodStr, metricsPayload);
            if (componentMounted) insight = result;
        } catch (e: any) {
            if (componentMounted) error = e.message || $t("strategies.aiCockpit.ai.error");
        } finally {
            if (componentMounted) loading = false;
        }
    }

    let status = $derived<"success" | "error" | "loading" | "idle">(
        loading ? 'loading' :
        error ? 'error' :
        insight ? 'success' : 'idle'
    );
</script>

<SystemAICard 
    {status} 
    title={$t("strategies.aiCockpit.ai.title")}
    description={$t("strategies.aiCockpit.ai.desc")}
    errorText={error || $t("strategies.aiCockpit.ai.error")}
    origin={insight?._meta?.origin}
    responseTimeMs={insight?._meta?.responseTimeMs}
>
    {#snippet idleActions()}
        <Button 
            variant="outline" 
            size="sm" 
            onclick={generateInsight} 
            disabled={!hasActiveAiProvider}
            class="h-7 text-[10px] px-3 border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-500/80 font-bold uppercase tracking-wider"
        >
            {$t("strategies.aiCockpit.ctaBtn")}
        </Button>
    {/snippet}

    {#snippet retryAction()}
        <Button size="sm" variant="ghost" class="h-6 text-[9px] text-rose-500 hover:bg-rose-500/10 font-black uppercase" onclick={generateInsight}>
             {$t("reports.ui.exportAction")} <!-- Using export action as retry for now or add specific key -->
        </Button>
    {/snippet}

    {#snippet content()}
        {#if insight}
            <div class="hidden md:block">
                <SystemHeader 
                    title={$t("strategies.aiCockpit.ai.title")}
                    icon={Zap}
                    class="mb-1 text-emerald-500/60"
                />
                <p class="text-[11px] leading-relaxed text-foreground/80 font-medium line-clamp-2 italic">"{insight.performanceInterpretation}"</p>
            </div>
        {/if}
    {/snippet}

    {#snippet matrix()}
        {#if insight}
            <div class="grid grid-cols-2 gap-3 w-full">
                <div class="p-2.5 rounded-md border border-blue-500/10 bg-blue-500/[0.02]">
                    <SystemHeader 
                        title={$t("strategies.aiCockpit.xray.bestSide")}
                        icon={Target}
                        class="mb-1 text-blue-500/70"
                    />
                    <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.idealContext}</p>
                </div>

                <div class="p-2.5 rounded-md border border-rose-500/10 bg-rose-500/[0.02]">
                    <SystemHeader 
                        title={$t("strategies.aiCockpit.health.currentRisk")}
                        icon={ShieldAlert}
                        class="mb-1 text-rose-500/70"
                    />
                    <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.criticalWeakness}</p>
                </div>
            </div>
        {/if}
    {/snippet}
</SystemAICard>
