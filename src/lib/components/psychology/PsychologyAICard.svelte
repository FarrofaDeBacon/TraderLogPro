<script lang="ts">
    import { llmService } from "$lib/services/llmService";
    import { SystemAICard } from "$lib/components/ui/system";
    import { Button } from "$lib/components/ui/button";
    import { BrainCircuit, CheckCircle2, ShieldAlert } from "lucide-svelte";
    import { onDestroy } from "svelte";

    let { 
        periodStr = "Últimos 30 Dias",
        metricsPayload = {},
        hasActiveAiProvider = false
    } = $props();

    let loading = $state(false);
    let insight: any = $state(null);
    let error: string | null = $state(null);
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

    let status: "loading" | "error" | "success" | "idle" = $derived(loading ? "loading" : error ? "error" : insight ? "success" : "idle");
</script>

{#snippet idleActions()}
    <Button 
        variant="outline" 
        size="sm" 
        onclick={generateInsight} 
        disabled={!hasActiveAiProvider}
        class="h-7 text-[10px] px-3 border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-500/80 font-black uppercase tracking-widest"
    >
        Gerar Insight
    </Button>
{/snippet}

{#snippet retryAction()}
    <Button 
        size="sm" 
        variant="ghost" 
        class="h-6 text-[9px] text-rose-500 hover:bg-rose-500/10 font-black uppercase" 
        onclick={generateInsight}
    >
        Tentar Novamente
    </Button>
{/snippet}

{#snippet content()}
    <div class="flex items-center gap-1.5 mb-1 text-primary/60">
        <BrainCircuit class="w-3 h-3" />
        <h4 class="font-black text-[8px] uppercase tracking-widest">Padrão Dominante</h4>
    </div>
    <p class="text-[11px] leading-relaxed text-foreground/80 font-medium line-clamp-2 italic">
        "{insight.dominantPattern}"
    </p>
{/snippet}

{#snippet matrix()}
    <div class="grid grid-cols-2 gap-3 w-full">
        <div class="p-2.5 rounded-md border border-status-danger/10 bg-status-danger/[0.02]">
            <div class="flex items-center gap-1.5 mb-1 text-status-danger/70">
                <ShieldAlert class="w-3 h-3" />
                <h4 class="font-black text-[8px] uppercase tracking-widest">Maior Vulnerabilidade</h4>
            </div>
            <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.majorRisk}</p>
        </div>

        <div class="p-2.5 rounded-md border border-status-success/10 bg-status-success/[0.02]">
            <div class="flex items-center gap-1.5 mb-1 text-status-success/70">
                <CheckCircle2 class="w-3 h-3" />
                <h4 class="font-black text-[8px] uppercase tracking-widest">Protocolo Sugerido</h4>
            </div>
            <p class="text-[10px] text-foreground/80 font-bold leading-snug">{insight.practicalActions?.[0] || 'Manter disciplina estatística'}</p>
        </div>
    </div>
{/snippet}

<SystemAICard 
    {status}
    title="Análise Comportamental (IA)"
    description="Interpretação sistêmica dos padrões emocionais do período."
    errorText={error || "Erro na análise."}
    origin={insight?._meta?.origin}
    responseTimeMs={insight?._meta?.responseTimeMs}
    {idleActions}
    {retryAction}
    {content}
    {matrix}
/>
