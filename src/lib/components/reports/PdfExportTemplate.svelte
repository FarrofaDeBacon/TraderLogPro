<script lang="ts">
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
      BarChart3
  } from "lucide-svelte";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";

  // PROPS RECEBIDOS PELO COMPONENTE MONTADO VIA SVELTE 5
  let { report, selectedPeriod, dateRanges } = $props<{
      report: any;
      selectedPeriod: string;
      dateRanges: { start: Date, end: Date };
  }>();

  // Format Helper
  const formatReportDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // UI Helpers
  function getPillarColor(score: number) {
      if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      if (score >= 50) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  }
</script>

<div class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col min-h-full text-black bg-white" id="pdf-export-template">
    <!-- HEADER INSTITUCIONAL -->
    <div class="flex flex-col border-b-2 border-black pb-4 mb-6 relative">
        <h1 class="text-2xl font-black uppercase tracking-widest text-black">TraderLog Pro</h1>
        <h2 class="text-lg font-bold text-gray-700 mt-0.5">Relatório de Performance Operacional</h2>
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2 border-t border-gray-200 inline-block pt-1 w-max">
            Período Auditado: {formatReportDate(dateRanges.start)} a {formatReportDate(dateRanges.end)}
        </div>
    </div>

    <!-- CORPO DO RELATÓRIO: Grid Dinâmico (Colunas) -->
    <div class="space-y-0 grid grid-cols-12 gap-6">
        
        <!-- BLOCO 1: RESUMO FINANCEIRO -->
        <section class="break-inside-avoid col-span-12">
            <h2 class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                <BarChart3 class="w-3.5 h-3.5" /> Estatística Financeira Oficial
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-gray-300 text-gray-500 bg-gray-50">
                    Nenhuma operação registrada na janela selecionada.
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card class="bg-white shadow-sm border-gray-200">
                        <CardContent class="p-3">
                            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Líquido (PnL)</p>
                            <p class="text-xl font-black tracking-tighter {report.summary.totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                                {formatCurrency(report.summary.totalPnL)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-white shadow-sm border-gray-200">
                        <CardContent class="p-3">
                            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Win Rate</p>
                            <p class="text-xl font-black tracking-tighter font-mono text-black">
                                {(report.summary.winRate * 100).toFixed(0)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-white shadow-sm border-gray-200">
                        <CardContent class="p-3">
                            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Profit Factor</p>
                            <p class="text-xl font-black tracking-tighter font-mono text-black">
                                {report.summary.profitFactor.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-white shadow-sm border-gray-200">
                        <CardContent class="p-3">
                            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Volume de Negócios</p>
                            <p class="text-base font-black tracking-tighter font-mono mt-1 text-black">
                                {report.summary.tradeCount} <span class="text-xs font-medium text-gray-500">Trades em</span> {report.period.daysActive}ds
                            </p>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 2: SCORE E DISCIPLINA DA JANELA -->
        <section class="break-inside-avoid col-span-12">
            <h2 class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                <Trophy class="w-3.5 h-3.5" /> Avaliação Qualitativa (Score)
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-gray-300 text-gray-500 bg-gray-50">
                    Score indisponível sem volume operacional.
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <Card class="lg:col-span-2 bg-white shadow-sm border-gray-200">
                        <CardContent class="p-4 flex flex-col md:flex-row items-center gap-5">
                            <div class="text-center shrink-0">
                                <div class="w-16 h-16 rounded-full border-[3px] flex items-center justify-center score-circle {report.scoreAndDiscipline.windowScore >= 80 ? 'border-emerald-500 text-emerald-600' : report.scoreAndDiscipline.windowScore >= 50 ? 'border-amber-500 text-amber-600' : 'border-rose-500 text-rose-600'}">
                                    <span class="text-2xl font-black tracking-tighter">{report.scoreAndDiscipline.windowScore.toFixed(0)}</span>
                                </div>
                                <p class="text-[8px] font-bold uppercase tracking-widest text-gray-500 mt-1.5">Master Score</p>
                            </div>
                            
                            <div class="flex-1 grid grid-cols-2 gap-3 w-full">
                                <div>
                                    <div class="text-[8px] uppercase tracking-wider text-gray-500 mb-1">Corte Execução (Econômico)</div>
                                    <div class="font-mono font-bold text-xs w-max px-2 py-0.5 rounded border {getPillarColor(report.scoreAndDiscipline.executionScore)}">
                                        {report.scoreAndDiscipline.executionScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[8px] uppercase tracking-wider text-gray-500 mb-1">Gestão Risco (Limites)</div>
                                    <div class="font-mono font-bold text-xs w-max px-2 py-0.5 rounded border {getPillarColor(report.scoreAndDiscipline.riskScore)}">
                                        {report.scoreAndDiscipline.riskScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[8px] uppercase tracking-wider text-gray-500 mb-1">Auditoria IA (Mecânica)</div>
                                    <div class="font-mono font-bold text-xs w-max px-2 py-0.5 rounded border {getPillarColor(report.scoreAndDiscipline.behaviorScore)}">
                                        {report.scoreAndDiscipline.behaviorScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[8px] uppercase tracking-wider text-gray-500 mb-1">Psicológico (Diário)</div>
                                    <div class="font-mono font-bold text-xs w-max px-2 py-0.5 rounded border {getPillarColor(report.scoreAndDiscipline.psychoScore)}">
                                        {report.scoreAndDiscipline.psychoScore.toFixed(0)} / 100
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="bg-white shadow-sm border-gray-200 flex flex-col justify-center h-full">
                        <CardHeader class="p-4 pb-2">
                            <CardTitle class="text-[9px] uppercase font-black tracking-widest text-gray-500">Streaks Preservadas (Janela)</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-2 px-4 pb-4 border-t border-gray-100 pt-4">
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-bold text-black">Disciplina Inquebrável</span>
                                <span class="font-mono font-bold text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.discipline} d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-bold text-black">Controle Emocional</span>
                                <span class="font-mono font-bold text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.emotionalControl} d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-bold text-black">Prevenção a Tilt</span>
                                <span class="font-mono font-bold text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.noTilt} d</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 3: COMPORTAMENTO (Col-6) -->
        <section class="break-inside-avoid col-span-6 flex flex-col h-full">
            <h2 class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                <Brain class="w-3.5 h-3.5" /> Ofensores & Edges
            </h2>
            
            {#if report.behavior.topNegativeImpacts.length === 0 && report.behavior.topPositiveImpacts.length === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-gray-300 text-gray-500 bg-gray-50 flex-1">
                    Operação linear sem desvios relevantes do Setup.
                </div>
            {:else}
                <div class="flex flex-col gap-3 flex-1 h-full">
                    <Card class="bg-rose-50 border-rose-200 shadow-none flex-1">
                        <CardHeader class="p-3 pb-2">
                            <CardTitle class="text-[10px] font-black tracking-widest text-rose-600 flex items-center gap-2 uppercase">
                                <ShieldAlert class="w-3 h-3" /> Infrações (Alta Severidade)
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="p-3 pt-0">
                            {#each report.behavior.topNegativeImpacts as neg}
                                <div class="flex items-start justify-between border-b border-rose-100 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                                    <div class="pr-2">
                                        <p class="text-[10px] font-bold text-black leading-tight">{neg.title}</p>
                                    </div>
                                    <Badge variant="outline" class="text-rose-600 border-rose-300 rounded-sm font-mono shrink-0 text-[9px]">{neg.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topNegativeImpacts.length === 0}
                                <p class="text-[10px] text-gray-500">Sistema funcional, zero falhas críticas.</p>
                            {/if}
                        </CardContent>
                    </Card>
                    <Card class="bg-emerald-50 border-emerald-200 shadow-none flex-1 mt-auto">
                        <CardHeader class="p-3 pb-2">
                            <CardTitle class="text-[10px] font-black tracking-widest text-emerald-600 flex items-center gap-2 uppercase">
                                <Zap class="w-3 h-3" /> Vantagens Competitivas
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="p-3 pt-0">
                            {#each report.behavior.topPositiveImpacts as pos}
                                <div class="flex items-start justify-between border-b border-emerald-100 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                                    <div class="pr-2">
                                        <p class="text-[10px] font-bold text-black leading-tight">{pos.title}</p>
                                    </div>
                                    <Badge variant="outline" class="text-emerald-600 border-emerald-300 rounded-sm font-mono shrink-0 text-[9px]">+{pos.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topPositiveImpacts.length === 0}
                                <p class="text-[10px] text-gray-500">Mediano, sem saltos matemáticos a favor.</p>
                            {/if}
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 4: REFLEXÃO DO PÓS-MERCADO (Col-6) -->
        <section class="break-inside-avoid col-span-6 flex flex-col h-full">
            <h2 class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                <BookOpen class="w-3.5 h-3.5" /> Resumo Pós-Mercado
            </h2>

            {#if report.reflection.reviewCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-gray-300 text-gray-500 bg-gray-50 flex-1">
                    Sem Daily Reviews no período. Pós-mercado inexistente.
                </div>
            {:else}
                <div class="flex flex-col gap-3 flex-1 h-full">
                    <Card class="bg-white shadow-sm border-gray-200">
                        <CardContent class="p-3 grid grid-cols-2 gap-4 items-center h-full">
                            <div>
                                <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Sessões Documentadas</p>
                                <div class="text-2xl font-black text-black">{report.reflection.reviewCount} <span class="text-xs font-medium text-gray-500 tracking-normal">Dias Lidos</span></div>
                            </div>
                            <div class="flex flex-col gap-1.5 border-l border-gray-100 pl-3">
                                <div class="flex items-center justify-between text-[10px]">
                                   <span class="text-emerald-600 font-bold uppercase">Good</span>
                                   <span class="font-mono text-gray-500 font-bold">{report.reflection.distribution.good}</span>
                                </div>
                                <div class="flex items-center justify-between text-[10px]">
                                   <span class="text-amber-500 font-bold uppercase">Neutral</span>
                                   <span class="font-mono text-gray-500 font-bold">{report.reflection.distribution.neutral}</span>
                                </div>
                                <div class="flex items-center justify-between text-[10px]">
                                   <span class="text-rose-600 font-bold uppercase">Bad</span>
                                   <span class="font-mono text-gray-500 font-bold">{report.reflection.distribution.bad}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="bg-white shadow-sm border-gray-200 flex-1 mb-auto">
                        <CardHeader class="p-4 pb-2">
                            <CardTitle class="text-[10px] uppercase font-black tracking-widest text-gray-500">Observações Primárias (Extracts)</CardTitle>
                        </CardHeader>
                        <CardContent class="px-4 pb-4 border-t border-gray-100 pt-4">
                            {#if report.reflection.relevantNotes.length === 0}
                                <p class="text-xs italic text-gray-500">Avaliações não suportadas por textos discritivos o suficiente.</p>
                            {:else}
                                <div class="space-y-3">
                                    {#each report.reflection.relevantNotes as note}
                                        <div class="bg-gray-50 border-l-[3px] border-gray-300 p-3 text-[11px] italic text-gray-700 leading-relaxed rounded-r border-t border-r border-b border-gray-200">
                                            "{note}"
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>
    </div>
</div>
