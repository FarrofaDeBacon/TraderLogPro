<script lang="ts">
    import { t } from "svelte-i18n";
    import { Brain, TrendingUp, TrendingDown, ShieldAlert } from "lucide-svelte";
    import { SystemCard, SystemMetric } from "$lib/components/ui/system";

    interface Props {
        psychoDiagnosis: any;
    }

    let { psychoDiagnosis }: Props = $props();

    function getStatus(score: number): "success" | "warning" | "danger" {
        if (score >= 70) return "success";
        if (score >= 40) return "warning";
        return "danger";
    }
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- SCORE -->
    <SystemCard 
        status={getStatus(psychoDiagnosis?.psychoScore || 0)} 
        hover={true} 
        showGlow={true}
        class="p-4"
    >
        <SystemMetric 
            label={$t('psychology.kpis.psychoScore')}
            value={psychoDiagnosis?.psychoScore || 0}
            status={getStatus(psychoDiagnosis?.psychoScore || 0)}
            subvalue="/ 100"
            weight="black"
        />
    </SystemCard>

    <!-- MELHOR PERFORMANCE -->
    <SystemCard status="success" hover={true} class="p-4">
        <SystemMetric 
            label={$t('psychology.kpis.bestPerformance')}
            value={psychoDiagnosis?.saviorEmotion?.emotionName || '-'}
            status="success"
            subvalue={`${psychoDiagnosis?.saviorEmotion?.tradeCount || 0} trades`}
            weight="black"
        />
    </SystemCard>

    <!-- PIOR PERFORMANCE -->
    <SystemCard status="danger" hover={true} class="p-4">
        <SystemMetric 
            label={$t('psychology.kpis.offender')}
            value={psychoDiagnosis?.killerEmotion?.emotionName || '-'}
            status="danger"
            subvalue={`${psychoDiagnosis?.killerEmotion?.tradeCount || 0} trades`}
            weight="black"
        />
    </SystemCard>

    <!-- DRENO FINANCEIRO -->
    <SystemCard status="warning" hover={true} class="p-4">
        <SystemMetric 
            label={$t('psychology.kpis.negativeLosses')}
            value={`${(psychoDiagnosis?.killerEmotionLossPercent * 100 || 0).toFixed(0)}%`}
            status="warning"
            subvalue="Dreno Acumulado"
            weight="black"
        />
    </SystemCard>
</div>
