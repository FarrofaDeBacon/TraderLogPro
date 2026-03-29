<script lang="ts">
    import { t } from "svelte-i18n";
    import { Brain, TrendingUp } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { SystemCard, SystemHeader } from "$lib/components/ui/system";

    interface Props {
        onSyncWeights: () => void;
        onNewCheckin: () => void;
    }

    let { onSyncWeights, onNewCheckin }: Props = $props();
</script>

{#snippet actions()}
    <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={onSyncWeights} class="bg-background/40 hover:bg-background/60 border border-border/40 text-[9px] font-black h-8 uppercase tracking-widest px-3">
            <TrendingUp class="w-3 h-3 mr-1.5 opacity-70" />
            {$t("psychology.syncWeights")}
        </Button>
        <Button onclick={onNewCheckin} size="sm" class="bg-primary hover:bg-primary/90 text-[10px] font-black h-8 uppercase tracking-widest px-4 shadow-lg shadow-primary/20">
            <Brain class="w-3.5 h-3.5 mr-2" />
            {$t("psychology.checkin.button")}
        </Button>
    </div>
{/snippet}

<SystemCard status="primary" class="p-3 mb-6 bg-primary/5">
    <SystemHeader 
        title={$t("psychology.title")}
        subtitle={$t("psychology.description")}
        icon={Brain}
        variant="page"
        class="mb-0"
        {actions}
    />
</SystemCard>
