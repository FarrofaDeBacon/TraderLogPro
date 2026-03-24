<script lang="ts">
  import { t } from "svelte-i18n";
  import {
      WalletCards,
      CalendarDays,
      Trophy,
      TrendingUp,
      TrendingDown,
      Target,
      Brain,
      Zap,
      ShieldAlert,
      BookOpen,
      Clock,
      Award,
      CheckCircle2,
      XCircle,
      MinusCircle,
      Activity,
      FileText,
      BarChart3,
      AlertTriangle
  } from "lucide-svelte";

  // PROPS RECEBIDOS PELO COMPONENTE MONTADO VIA SVELTE 5
  let { report, selectedPeriod, dateRanges } = $props<{
      report: any;
      selectedPeriod: string;
      dateRanges: { start: Date, end: Date };
  }>();

  // Format Helper
  const formatReportDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // UI Helpers (Usando apenas cores HEX seguras para html2canvas não quebrar no Tailwind 4 oklch)
  function getPillarColor(score: number) {
      if (score >= 80) return 'color: #059669; border-color: #a7f3d0; background-color: #ecfdf5;'; // emerald
      if (score >= 50) return 'color: #d97706; border-color: #fde68a; background-color: #fffbeb;'; // amber
      return 'color: #e11d48; border-color: #fecdd3; background-color: #fff1f2;'; // rose
  }
</script>

<div style="font-family: inherit; color: #000000; background-color: #ffffff;" class="w-full max-w-5xl mx-auto p-4 md:p-6 block" id="pdf-export-template">
    <!-- HEADER INSTITUCIONAL -->
    <div style="border-bottom-width: 2px; border-color: #000000;" class="pb-4 mb-6 relative border-solid block">
        <h1 style="color: #000000;" class="text-2xl font-black uppercase tracking-widest leading-none">TraderLog Pro</h1>
        <h2 style="color: #374151;" class="text-lg font-bold mt-1 leading-none">{$t('reports.pdf.title')}</h2>
        <div style="color: #6b7280; border-top-width: 1px; border-color: #e5e7eb; padding-top: 0.25rem;" class="text-[11px] font-bold uppercase tracking-widest mt-2 border-solid inline-block w-max">
            {$t('reports.pdf.auditedPeriod')}: {formatReportDate(dateRanges.start)} a {formatReportDate(dateRanges.end)}
        </div>
    </div>

    <!-- CORPO DO RELATÓRIO: Layout em Blocos Nativos (Anti-Bug de Paginação do Chrome) -->
    <div class="space-y-6 block">
        
        <!-- BLOCO 1: RESUMO FINANCEIRO -->
        <section class="break-inside-avoid w-full">
            <h2 style="color: #6b7280;" class="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <BarChart3 class="w-3.5 h-3.5" color="#6b7280" /> {$t('reports.pdf.financialStats')}
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div style="color: #6b7280; background-color: #f9fafb; border-width: 1px; border-color: #d1d5db;" class="p-8 text-center border-dashed rounded-xl">
                    {$t('reports.pdf.noTrades')}
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="rounded-xl border-solid flex flex-col">
                        <div class="p-3">
                            <p style="color: #6b7280;" class="text-[10px] font-bold uppercase tracking-wider mb-1">{$t('reports.pdf.netPnl')}</p>
                            <p style="color: {report.summary.totalPnL >= 0 ? '#059669' : '#e11d48'};" class="text-xl font-black tracking-tighter">
                                {formatCurrency(report.summary.totalPnL)}
                            </p>
                        </div>
                    </div>
                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="rounded-xl border-solid flex flex-col">
                        <div class="p-3">
                            <p style="color: #6b7280;" class="text-[10px] font-bold uppercase tracking-wider mb-1">{$t('reports.pdf.winRate')}</p>
                            <p style="color: #000000;" class="text-xl font-black tracking-tighter font-mono">
                                {(report.summary.winRate * 100).toFixed(0)}%
                            </p>
                        </div>
                    </div>
                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="rounded-xl border-solid flex flex-col">
                        <div class="p-3">
                            <p style="color: #6b7280;" class="text-[10px] font-bold uppercase tracking-wider mb-1">{$t('reports.pdf.profitFactor')}</p>
                            <p style="color: #000000;" class="text-xl font-black tracking-tighter font-mono">
                                {report.summary.profitFactor.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="rounded-xl border-solid flex flex-col">
                        <div class="p-3">
                            <p style="color: #6b7280;" class="text-[10px] font-bold uppercase tracking-wider mb-1">{$t('reports.pdf.tradeVolume')}</p>
                            <p style="color: #000000;" class="text-base font-black tracking-tighter font-mono mt-1">
                                {report.summary.tradeCount} <span style="color: #6b7280;" class="text-xs font-medium">Trades {$t('reports.pdf.inDays')}</span> {report.period.daysActive}d
                            </p>
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <!-- BLOCO 2: SCORE E DISCIPLINA DA JANELA -->
        <section class="break-inside-avoid w-full">
            <h2 style="color: #6b7280;" class="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Trophy class="w-3.5 h-3.5" color="#6b7280" /> {$t('reports.pdf.qualitativeScore')}
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div style="color: #6b7280; background-color: #f9fafb; border-width: 1px; border-color: #d1d5db;" class="p-8 text-center border-dashed rounded-xl">
                    {$t('reports.pdf.scoreUnavailable')}
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="lg:col-span-2 rounded-xl border-solid flex flex-col">
                        <div class="p-4 flex flex-col md:flex-row items-center gap-5">
                            <div class="text-center shrink-0">
                                <div style="background-color: #ffffff; border-width: 3px; border-color: {report.scoreAndDiscipline.windowScore >= 80 ? '#059669' : report.scoreAndDiscipline.windowScore >= 50 ? '#d97706' : '#e11d48'}; color: {report.scoreAndDiscipline.windowScore >= 80 ? '#059669' : report.scoreAndDiscipline.windowScore >= 50 ? '#d97706' : '#e11d48'};" class="w-16 h-16 rounded-full border-solid flex items-center justify-center">
                                    <span class="text-2xl font-black tracking-tighter">{report.scoreAndDiscipline.windowScore.toFixed(0)}</span>
                                </div>
                                <p style="color: #6b7280;" class="text-[8px] font-bold uppercase tracking-widest mt-1.5">{$t('reports.pdf.masterScore')}</p>
                            </div>
                            
                            <div class="flex-1 grid grid-cols-2 gap-3 w-full">
                                <div>
                                    <div style="color: #6b7280;" class="text-[8px] uppercase tracking-wider mb-1">{$t('reports.pdf.executionCut')}</div>
                                    <div style="border-width: 1px; {getPillarColor(report.scoreAndDiscipline.executionScore)}" class="font-mono font-bold text-xs border-solid w-max px-2 py-0.5 rounded">
                                        {report.scoreAndDiscipline.executionScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #6b7280;" class="text-[8px] uppercase tracking-wider mb-1">{$t('reports.pdf.riskManagement')}</div>
                                    <div style="border-width: 1px; {getPillarColor(report.scoreAndDiscipline.riskScore)}" class="font-mono font-bold text-xs border-solid w-max px-2 py-0.5 rounded">
                                        {report.scoreAndDiscipline.riskScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #6b7280;" class="text-[8px] uppercase tracking-wider mb-1">{$t('reports.pdf.aiAudit')}</div>
                                    <div style="border-width: 1px; {getPillarColor(report.scoreAndDiscipline.behaviorScore)}" class="font-mono font-bold text-xs border-solid w-max px-2 py-0.5 rounded">
                                        {report.scoreAndDiscipline.behaviorScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #6b7280;" class="text-[8px] uppercase tracking-wider mb-1">{$t('reports.pdf.psychologicalDaily')}</div>
                                    <div style="border-width: 1px; {getPillarColor(report.scoreAndDiscipline.psychoScore)}" class="font-mono font-bold text-xs border-solid w-max px-2 py-0.5 rounded">
                                        {report.scoreAndDiscipline.psychoScore.toFixed(0)} / 100
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="rounded-xl border-solid flex flex-col justify-center h-full">
                        <div class="p-4 pb-2 flex flex-col space-y-1.5">
                            <div style="color: #6b7280;" class="font-black text-[9px] uppercase tracking-widest leading-none">{$t('reports.pdf.preservedStreaks')}</div>
                        </div>
                        <div style="border-top-width: 1px; border-color: #f3f4f6;" class="space-y-2 px-4 pb-4 pt-4 border-solid">
                            <div class="flex items-center justify-between">
                                <span style="color: #000000;" class="text-[11px] font-bold">{$t('reports.pdf.unbreakableDiscipline')}</span>
                                <span style="background-color: #d1fae5; color: #047857;" class="font-mono font-bold text-[11px] px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.discipline} d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span style="color: #000000;" class="text-[11px] font-bold">{$t('reports.pdf.emotionalControl')}</span>
                                <span style="background-color: #e0e7ff; color: #4338ca;" class="font-mono font-bold text-[11px] px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.emotionalControl} d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span style="color: #000000;" class="text-[11px] font-bold">{$t('reports.pdf.tiltPrevention')}</span>
                                <span style="background-color: #f3f4f6; color: #4b5563;" class="font-mono font-bold text-[11px] px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.noTilt} d</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <!-- SUB-GRID DE 2 COLUNAS (Restrito à uma página para evitar Bug do Chrome) -->
        <div class="grid grid-cols-2 gap-6 break-inside-avoid w-full">
            
            <!-- BLOCO 3: COMPORTAMENTO (Metade Esq) -->
            <section class="flex flex-col h-full">
                <h2 style="color: #6b7280;" class="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Brain class="w-3.5 h-3.5" color="#6b7280" /> {$t('reports.pdf.offendersEdges')}
                </h2>
            
            {#if report.behavior.topNegativeImpacts.length === 0 && report.behavior.topPositiveImpacts.length === 0}
                <div style="color: #6b7280; background-color: #f9fafb; border-width: 1px; border-color: #d1d5db;" class="p-8 text-center border-dashed rounded-xl flex-1">
                    {$t('reports.pdf.linearOperation')}
                </div>
            {:else}
                <div class="flex flex-col gap-3 flex-1 h-full">
                    <div style="background-color: #fff1f2; border-width: 1px; border-color: #fecdd3;" class="rounded-xl border-solid flex flex-col flex-1">
                        <div class="p-3 pb-2 flex flex-col space-y-1.5">
                            <div style="color: #e11d48;" class="text-[10px] font-black tracking-widest flex items-center gap-2 uppercase leading-none">
                                <ShieldAlert class="w-3 h-3" color="#e11d48" /> {$t('reports.pdf.infractions')}
                            </div>
                        </div>
                        <div class="p-3 pt-0">
                            {#each report.behavior.topNegativeImpacts as neg}
                                <div style="border-bottom-width: 1px; border-color: #ffe4e6;" class="flex items-start justify-between pb-1.5 mb-1.5 border-solid last:border-b-0 last:pb-0 last:mb-0">
                                    <div class="pr-2">
                                        <p style="color: #000000;" class="text-[10px] font-bold leading-tight">{neg.title}</p>
                                    </div>
                                    <div style="color: #e11d48; border-width: 1px; border-color: #fda4af;" class="inline-flex items-center rounded-sm border-solid px-2.5 py-0.5 font-mono shrink-0 text-[9px] font-semibold">{neg.points}</div>
                                </div>
                            {/each}
                            {#if report.behavior.topNegativeImpacts.length === 0}
                                <p style="color: #6b7280;" class="text-[10px]">{$t('reports.pdf.functionalSystem')}</p>
                            {/if}
                        </div>
                    </div>
                    <div style="background-color: #ecfdf5; border-width: 1px; border-color: #a7f3d0;" class="rounded-xl border-solid flex flex-col flex-1 mt-auto">
                        <div class="p-3 pb-2 flex flex-col space-y-1.5">
                            <div style="color: #059669;" class="text-[10px] font-black tracking-widest flex items-center gap-2 uppercase leading-none">
                                <Zap class="w-3 h-3" color="#059669" /> {$t('reports.pdf.competitiveAdvantages')}
                            </div>
                        </div>
                        <div class="p-3 pt-0">
                            {#each report.behavior.topPositiveImpacts as pos}
                                <div style="border-bottom-width: 1px; border-color: #d1fae5;" class="flex items-start justify-between pb-1.5 mb-1.5 border-solid last:border-b-0 last:pb-0 last:mb-0">
                                    <div class="pr-2">
                                        <p style="color: #000000;" class="text-[10px] font-bold leading-tight">{pos.title}</p>
                                    </div>
                                    <div style="color: #059669; border-width: 1px; border-color: #6ee7b7;" class="inline-flex items-center rounded-sm border-solid px-2.5 py-0.5 font-mono shrink-0 text-[9px] font-semibold">+{pos.points}</div>
                                </div>
                            {/each}
                            {#if report.behavior.topPositiveImpacts.length === 0}
                                <p style="color: #6b7280;" class="text-[10px]">{$t('reports.pdf.medianNoJumps')}</p>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        </section>

            <!-- BLOCO 4: REFLEXÃO DO PÓS-MERCADO (Metade Dir) -->
            <section class="flex flex-col h-full">
                <h2 style="color: #6b7280;" class="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen class="w-3.5 h-3.5" color="#6b7280" /> {$t('reports.pdf.postMarketSummary')}
                </h2>

            {#if report.reflection.reviewCount === 0}
                <div style="color: #e11d48; background-color: #fff1f2; border-width: 1px; border-color: #fda4af;" class="p-8 text-center border-dashed rounded-xl flex-1 font-bold">
                    {$t('reports.pdf.noDailyReview')}
                </div>
            {:else}
                <div class="flex flex-col gap-3 flex-1 h-full">
                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="rounded-xl border-solid flex flex-col">
                        <div class="p-3 grid grid-cols-2 gap-4 items-center h-full">
                            <div>
                                <p style="color: #6b7280;" class="text-[10px] font-bold uppercase tracking-widest mb-1.5">{$t('reports.pdf.documentedSessions')}</p>
                                <div style="color: #000000;" class="text-2xl font-black">{report.reflection.reviewCount} <span style="color: #6b7280;" class="text-xs font-medium tracking-normal">{$t('reports.pdf.daysRead')}</span></div>
                            </div>
                            <div style="border-left-width: 1px; border-color: #f3f4f6;" class="flex flex-col gap-1.5 pl-3 border-solid">
                                <div class="flex items-center justify-between text-[10px]">
                                   <span style="color: #059669;" class="font-bold uppercase">Good</span>
                                   <span style="color: #6b7280;" class="font-mono font-bold">{report.reflection.distribution.good}</span>
                                </div>
                                <div class="flex items-center justify-between text-[10px]">
                                   <span style="color: #d97706;" class="font-bold uppercase">Neutral</span>
                                   <span style="color: #6b7280;" class="font-mono font-bold">{report.reflection.distribution.neutral}</span>
                                </div>
                                <div class="flex items-center justify-between text-[10px]">
                                   <span style="color: #e11d48;" class="font-bold uppercase">Bad</span>
                                   <span style="color: #6b7280;" class="font-mono font-bold">{report.reflection.distribution.bad}</span>
                                </div>

                                <!-- Cross-Psychology Stats -->
                                {#if report.psychologyStats.lossPercentageInNegativeState !== null}
                                <div style="border-top-width: 1px; border-color: #e5e7eb;" class="mt-3 pt-2 border-solid">
                                    <p style="color: #6b7280;" class="text-[8px] leading-tight">
                                        <span style="color: #e11d48; font-weight: bold;">{(report.psychologyStats.lossPercentageInNegativeState * 100).toFixed(0)}% {$t('reports.pdf.lossesUnderNegative')} <span style="font-weight: bold; text-transform: uppercase;">({report.psychologyStats.dominantNegativeEmotion})</span>. 
                                    </p>
                                </div>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div style="background-color: #ffffff; border-width: 1px; border-color: #e5e7eb;" class="rounded-xl border-solid flex flex-col flex-1 mb-auto">
                        <div class="p-4 pb-2 flex flex-col space-y-1.5">
                            <div style="color: #6b7280;" class="text-[10px] uppercase font-black tracking-widest leading-none">{$t('reports.pdf.primaryObservations')}</div>
                        </div>
                        <div style="border-top-width: 1px; border-color: #f3f4f6;" class="px-4 pb-4 pt-4 border-solid">
                            {#if report.reflection.relevantNotes.length === 0}
                                <p style="color: #6b7280;" class="text-xs italic">{$t('reports.pdf.unsupportedEvaluations')}</p>
                            {:else}
                                <div class="space-y-3">
                                    {#each report.reflection.relevantNotes as note}
                                        <div style="background-color: #f9fafb; border-left-width: 3px; border-top-width: 1px; border-right-width: 1px; border-bottom-width: 1px; border-color: #d1d5db; color: #374151;" class="p-3 text-[11px] italic leading-relaxed rounded-r border-solid">
                                            "{note}"
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
            </section>
        </div>

        <!-- BLOCO 5: DECISION LAYER (PLANO TÁTICO) -->
        <section class="break-inside-avoid w-full">
            <h2 style="color: #111827;" class="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 mt-2 pt-5 border-t border-solid border-gray-200">
                <Target class="w-4 h-4" color="#111827" /> 5. Decision Layer
            </h2>
            
            <div class="grid grid-cols-3 gap-4">
                
                <!-- Diagnóstico Final -->
                <div style="background-color: #f0fdf4; border-width: 1px; border-color: #bbf7d0;" class="rounded-xl border-solid flex flex-col p-4">
                    <div style="color: #059669;" class="text-[9px] font-black tracking-widest uppercase mb-2 flex items-center gap-1.5 leading-none">
                        <Activity class="w-3.5 h-3.5" color="#059669" /> Diagnóstico Final
                    </div>
                    <p style="color: #000000;" class="text-[11px] font-bold leading-tight mt-1">{report.tactical.diagnosis.main}</p>
                    {#if report.tactical.diagnosis.sub}
                        <p style="color: #4b5563;" class="text-[9px] mt-1.5 leading-tight">{report.tactical.diagnosis.sub}</p>
                    {/if}
                </div>

                <!-- Riscos Atuais -->
                <div style="background-color: #fff1f2; border-width: 1px; border-color: #fecdd3;" class="rounded-xl border-solid flex flex-col p-4">
                    <div style="color: #e11d48;" class="text-[9px] font-black tracking-widest uppercase mb-2 flex items-center gap-1.5 leading-none">
                        <AlertTriangle class="w-3.5 h-3.5" color="#e11d48" /> {$t('reports.pdf.imminentRisks')}
                    </div>
                    <ul class="space-y-1.5 pl-3 mt-1 text-[9px] m-0" style="color: #be123c; list-style-type: disc;">
                        {#each report.tactical.risks as risk}
                            <li class="leading-tight">{risk}</li>
                        {/each}
                        {#if report.tactical.risks.length === 0}
                            <li class="leading-tight text-emerald-600 font-bold" style="list-style-type: none; margin-left: -12px;">{$t('reports.pdf.noGraveRisks')}</li>
                        {/if}
                    </ul>
                </div>

                <!-- Plano de Execução -->
                <div style="background-color: #f8fafc; border-width: 1px; border-color: #e2e8f0;" class="rounded-xl border-solid flex flex-col p-4">
                    <div style="color: #0f172a;" class="text-[9px] font-black tracking-widest uppercase mb-2 flex items-center gap-1.5 leading-none">
                        <CheckCircle2 class="w-3.5 h-3.5" color="#0f172a" /> Plano de Execução
                    </div>
                    <ul class="space-y-2 m-0 mt-2">
                        {#each report.tactical.actionPlan as action}
                            <li class="text-[9px] font-bold leading-tight flex items-start gap-1.5" style="color: #1e293b;">
                                <span style="color: #3b82f6; font-size: 10px;">•</span>
                                <span>{action}</span>
                            </li>
                        {/each}
                    </ul>
                </div>

            </div>
        </section>
    </div>
</div>
