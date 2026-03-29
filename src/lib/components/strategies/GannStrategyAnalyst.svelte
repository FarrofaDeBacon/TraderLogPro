<script lang="ts">
  import { t } from "svelte-i18n";
  import SystemCard from "$lib/components/ui/system/SystemCard.svelte";
  import SystemMetric from "$lib/components/ui/system/SystemMetric.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Progress } from "$lib/components/ui/progress";
  import { 
    calculateVibrationAlignment, 
    calculateCycleSuccessRate,
    calculateAngleAdherence
  } from "$lib/utils/gann";
  import { Compass, Zap, Repeat, Target } from "lucide-svelte";
  
  interface Props {
    trades: any[];
    referencePrice?: number;
  }
  
  let { trades, referencePrice = 0 }: Props = $props();
  
  // Analytics
  const alignment = $derived(calculateVibrationAlignment(trades, referencePrice));
  const cycleWinRate = $derived(calculateCycleSuccessRate(trades));
  const angleScore = $derived(calculateAngleAdherence(trades));
  
  const gannMastery = $derived((alignment + cycleWinRate + angleScore) / 3);

  function getMasteryStatus(score: number): "success" | "warning" | "danger" {
    if (score > 70) return "success";
    if (score > 40) return "warning";
    return "danger";
  }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Card: Gann Mastery Score -->
  <SystemCard status={getMasteryStatus(gannMastery)} class="p-4 flex flex-col items-center text-center justify-center">
    <Compass class="w-6 h-6 text-status-success mb-2" />
    <h3 class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
      {$t('strategyGann.mastery')}
    </h3>
    <div class="text-3xl font-mono font-black tabular-nums tracking-tighter text-foreground">
      {gannMastery.toFixed(0)}%
    </div>
    <p class="text-[9px] text-muted-foreground/40 mt-1 uppercase font-bold tracking-widest">
      {$t('strategyGann.mathematicalConfluence')}
    </p>
  </SystemCard>

  <!-- Card: Vibration Alignment -->
  <SystemCard status="info" class="p-4 flex flex-col justify-between">
    <div class="flex justify-between items-start mb-3">
      <div class="space-y-0.5">
        <h3 class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
          {$t('strategyGann.alignment')}
        </h3>
        <p class="text-[9px] text-muted-foreground/40 leading-none">{$t('strategyGann.alignmentDesc')}</p>
      </div>
      <Target class="w-4 h-4 text-status-info opacity-50" />
    </div>
    <div class="space-y-2">
      <div class="flex justify-between items-end">
        <span class="text-xl font-mono font-black text-foreground tabular-nums leading-none">
          {alignment.toFixed(1)}%
        </span>
        <span class="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">
          {$t('strategyGann.accuracy')}
        </span>
      </div>
      <Progress value={alignment} class="h-1 bg-status-info/10" />
    </div>
  </SystemCard>

  <!-- Card: Cycle Success -->
  <SystemCard status="warning" class="p-4 flex flex-col justify-between">
    <div class="flex justify-between items-start mb-3">
      <div class="space-y-0.5">
        <h3 class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
          {$t('strategyGann.cycleWatch')}
        </h3>
        <p class="text-[9px] text-muted-foreground/40 leading-none">{$t('strategyGann.cycleWatchDesc')}</p>
      </div>
      <Repeat class="w-4 h-4 text-status-warning opacity-50" />
    </div>
    <div class="space-y-2">
      <div class="flex justify-between items-end">
        <span class="text-xl font-mono font-black text-foreground tabular-nums leading-none">
          {cycleWinRate.toFixed(1)}%
        </span>
        <span class="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">
          {$t('strategyGann.success')}
        </span>
      </div>
      <Progress value={cycleWinRate} class="h-1 bg-status-warning/10" />
    </div>
  </SystemCard>

  <!-- Card: Angle Adherence -->
  <SystemCard status="danger" class="p-4 flex flex-col justify-between">
    <div class="flex justify-between items-start mb-3">
      <div class="space-y-0.5">
        <h3 class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
          {$t('strategyGann.angleScore')}
        </h3>
        <p class="text-[9px] text-muted-foreground/40 leading-none">{$t('strategyGann.geometricPrecision')}</p>
      </div>
      <Zap class="w-4 h-4 text-status-danger opacity-50" />
    </div>
    <div class="space-y-2">
      <div class="flex justify-between items-end">
        <span class="text-xl font-mono font-black text-foreground tabular-nums leading-none">
          {angleScore.toFixed(1)}%
        </span>
        <span class="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">
          {$t('strategyGann.adherence')}
        </span>
      </div>
      <Progress value={angleScore} class="h-1 bg-status-danger/10" />
    </div>
  </SystemCard>
</div>

<!-- Confluence Detail -->
<SystemCard status="success" class="mt-4 p-6">
  <div class="flex items-center gap-3 mb-6">
    <Compass class="w-5 h-5 text-status-success" />
    <div>
      <h3 class="text-sm font-black uppercase tracking-widest text-foreground">
        {$t('strategyGann.analyticalConfluence')}
      </h3>
      <p class="text-[10px] text-muted-foreground/60">{$t('strategyGann.confluenceDesc')}</p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <Badge variant="outline" class="bg-status-success/5 text-status-success border-status-success/20 font-mono">01</Badge>
        <h4 class="text-[10px] font-black uppercase tracking-widest">{$t('strategyGann.vibrationLaw')}</h4>
      </div>
      <p class="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
        {$t('strategyGann.vibrationLawDesc')}
      </p>
    </div>

    <div class="space-y-4 border-l border-r border-white/5 px-8">
      <div class="flex items-center gap-2">
        <Badge variant="outline" class="bg-status-warning/5 text-status-warning border-status-warning/20 font-mono">02</Badge>
        <h4 class="text-[10px] font-black uppercase tracking-widest">{$t('strategyGann.timeLaw')}</h4>
      </div>
      <p class="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
        {$t('strategyGann.timeLawDesc')}
      </p>
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <Badge variant="outline" class="bg-status-info/5 text-status-info border-status-info/20 font-mono">03</Badge>
        <h4 class="text-[10px] font-black uppercase tracking-widest">{$t('strategyGann.geometryLaw')}</h4>
      </div>
      <p class="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
        {$t('strategyGann.geometryLawDesc')}
      </p>
    </div>
  </div>
</SystemCard>
