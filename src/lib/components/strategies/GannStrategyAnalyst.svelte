<script lang="ts">
    import { t } from "svelte-i18n";
    import { Card, CardContent } from "$lib/components/ui/card";
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

    function getMasteryColor(score: number) {
        if (score > 70) return "text-emerald-500";
        if (score > 40) return "text-amber-500";
        return "text-rose-500";
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Card: Gann Mastery Score -->
    <Card class="border shadow-md bg-card/60 backdrop-blur-xl border-l-4 border-l-emerald-500 overflow-hidden">
        <CardContent class="p-4 flex flex-col items-center text-center justify-center">
            <Compass class="w-8 h-8 text-emerald-500 mb-2" />
            <h3 class="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">{$t('strategies.strategy.gann.mastery')}</h3>
            <div class={`text-3xl font-black ${getMasteryColor(gannMastery)}`}>
                {gannMastery.toFixed(0)}%
            </div>
            <p class="text-[9px] text-muted-foreground mt-1 uppercase font-bold">{$t('strategies.strategy.gann.mathematicalConfluence')}</p>
        </CardContent>
    </Card>

    <!-- Card: Vibration Alignment -->
    <Card class="border shadow-md bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardContent class="p-4 space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-widest">{$t('strategies.strategy.gann.alignment')}</h3>
                    <p class="text-[9px] text-muted-foreground">{$t('strategies.strategy.gann.alignmentDesc')}</p>
                </div>
                <Target class="w-4 h-4 text-blue-500" />
            </div>
            <div class="space-y-1">
                <div class="flex justify-between items-end">
                    <span class="text-xl font-black text-foreground">{alignment.toFixed(1)}%</span>
                    <span class="text-[9px] font-bold text-muted-foreground uppercase">{$t('strategies.strategy.gann.accuracy')}</span>
                </div>
                <Progress value={alignment} class="h-1 bg-blue-500/10" />
            </div>
        </CardContent>
    </Card>

    <!-- Card: Cycle Success -->
    <Card class="border shadow-md bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardContent class="p-4 space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-widest">{$t('strategies.strategy.gann.cycleWatch')}</h3>
                    <p class="text-[9px] text-muted-foreground">{$t('strategies.strategy.gann.cycleWatchDesc')}</p>
                </div>
                <Repeat class="w-4 h-4 text-amber-500" />
            </div>
            <div class="space-y-1">
                <div class="flex justify-between items-end">
                    <span class="text-xl font-black text-foreground">{cycleWinRate.toFixed(1)}%</span>
                    <span class="text-[9px] font-bold text-muted-foreground uppercase">{$t('strategies.strategy.gann.success')}</span>
                </div>
                <Progress value={cycleWinRate} class="h-1 bg-amber-500/10" />
            </div>
        </CardContent>
    </Card>

    <!-- Card: Angle Adherence -->
    <Card class="border shadow-md bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardContent class="p-4 space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-widest">{$t('strategies.strategy.gann.angleScore')}</h3>
                    <p class="text-[9px] text-muted-foreground">{$t('strategies.strategy.gann.geometricPrecision')}</p>
                </div>
                <Zap class="w-4 h-4 text-indigo-500" />
            </div>
            <div class="space-y-1">
                <div class="flex justify-between items-end">
                    <span class="text-xl font-black text-foreground">{angleScore.toFixed(1)}%</span>
                    <span class="text-[9px] font-bold text-muted-foreground uppercase">{$t('strategies.strategy.gann.adherence')}</span>
                </div>
                <Progress value={angleScore} class="h-1 bg-indigo-500/10" />
            </div>
        </CardContent>
    </Card>
</div>

<!-- Confluence Detail -->
<Card class="mt-4 border shadow-md bg-card/60 backdrop-blur-xl border-t-2 border-t-emerald-500/50">
    <CardContent class="p-6">
        <div class="flex items-center gap-3 mb-6">
            <Compass class="w-5 h-5 text-emerald-500" />
            <div>
                <h3 class="text-base font-bold tracking-tight">{$t('strategies.strategy.gann.analyticalConfluence')}</h3>
                <p class="text-xs text-muted-foreground">{$t('strategies.strategy.gann.confluenceDesc')}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <Badge variant="outline" class="bg-emerald-500/5 text-emerald-500 border-emerald-500/20">01</Badge>
                    <h4 class="text-xs font-bold uppercase tracking-wider">{$t('strategies.strategy.gann.vibrationLaw')}</h4>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                    {$t('strategies.strategy.gann.vibrationLawDesc')}
                </p>
            </div>

            <div class="space-y-4 border-l border-r border-border/50 px-8">
                <div class="flex items-center gap-2">
                    <Badge variant="outline" class="bg-amber-500/5 text-amber-500 border-amber-500/20">02</Badge>
                    <h4 class="text-xs font-bold uppercase tracking-wider">{$t('strategies.strategy.gann.timeLaw')}</h4>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                    {$t('strategies.strategy.gann.timeLawDesc')}
                </p>
            </div>

            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <Badge variant="outline" class="bg-indigo-500/5 text-indigo-500 border-indigo-500/20">03</Badge>
                    <h4 class="text-xs font-bold uppercase tracking-wider">{$t('strategies.strategy.gann.geometryLaw')}</h4>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                    {$t('strategies.strategy.gann.geometryLawDesc')}
                </p>
            </div>
        </div>
    </CardContent>
</Card>
