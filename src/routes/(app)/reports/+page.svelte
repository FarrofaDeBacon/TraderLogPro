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
      BarChart3,
      Printer,
      AlertTriangle
  } from "lucide-svelte";
  import { mount, unmount } from "svelte";
  import PdfExportTemplate from "$lib/components/reports/PdfExportTemplate.svelte";
  import ReportAICard from "$lib/components/reports/ReportAICard.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { currenciesStore } from "$lib/stores/currencies.svelte";
  import { tradesStore } from "$lib/stores/trades.svelte";
  import { dailyReviewsStore } from "$lib/stores/daily-reviews.svelte";
  import { workspaceStore } from "$lib/stores/workspace.svelte";
  import { generateReport } from "$lib/domain/reports/report-engine";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
  } from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import DateFilter from "$lib/components/filters/DateFilter.svelte";
  import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    subDays,
    subWeeks,
    subMonths,
    subYears,
    parseISO
  } from "date-fns";

  // State
  let timeFilter = $state("this_month");
  let customStartDate = $state("");
  let customEndDate = $state("");
  let isExporting = $state(false);

  // Reatividade do DateRange
  let dateRanges = $derived.by(() => {
    const now = new Date();
    switch (timeFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday": {
        const y = subDays(now, 1);
        return { start: startOfDay(y), end: endOfDay(y) };
      }
      case "this_week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last_week": {
        const lw = subWeeks(now, 1);
        return { start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }) };
      }
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month": {
        const lm = subMonths(now, 1);
        return { start: startOfMonth(lm), end: endOfMonth(lm) };
      }
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "last_year": {
        const ly = subYears(now, 1);
        return { start: startOfYear(ly), end: endOfYear(ly) };
      }
      case "all":
        return { start: new Date(2000, 0, 1), end: endOfDay(now) };
      case "custom":
        if (customStartDate && customEndDate) {
            return { start: parseISO(customStartDate), end: endOfDay(parseISO(customEndDate)) };
        }
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  });

  // Format Helper
  const formatReportDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const report = $derived.by(() => {
    return generateReport(
      tradesStore.trades,
      dailyReviewsStore.reviews,
      dateRanges.start,
      dateRanges.end,
      {
        getConvertedResult: (t) => tradesStore.getConvertedTradeResult(t, accountsStore.accounts, currenciesStore.currencies),
        getEmotionalState: (id) => workspaceStore.emotionalStates.find(e => e.id === id)
      }
    );
  });

  // Derived limit AI payload to shrink prompt size
  const aiMetricsPayload = $derived({
      periodName: timeFilter,
      totalPnL: report.summary.totalPnL,
      tradeCount: report.summary.tradeCount,
      winRate: report.summary.winRate,
      profitFactor: report.summary.profitFactor,
      windowScore: report.scoreAndDiscipline.windowScore,
      executionScore: report.scoreAndDiscipline.executionScore,
      behaviorScore: report.scoreAndDiscipline.behaviorScore,
      streaks: report.scoreAndDiscipline.streaks,
      majorNegativeImpact: report.behavior.topNegativeImpacts[0]?.title || "Nenhum",
      majorPositiveImpact: report.behavior.topPositiveImpacts[0]?.title || "Nenhum",
      reviewsDistribution: report.reflection.distribution,
      worstEmotion: report.psychologyStats.dominantNegativeEmotion
  });

  // UI Helpers
  function getPillarColor(score: number) {
      if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      if (score >= 50) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  }

  async function exportReport() {
      if (isExporting) return;
      isExporting = true;

      try {
          // 1. Cria contêiner off-screen para montar o componente temporariamente
          const container = document.createElement('div');
          container.style.display = 'none';
          document.body.appendChild(container);

          // 2. Monta dinamicamente a UI de Impressão (PdfExportTemplate já está formatado com HEX e tags de print)
          const mountedComponent = mount(PdfExportTemplate, {
              target: container,
              props: {
                 report: report,
                 selectedPeriod: timeFilter,
                 dateRanges: dateRanges
              }
          });

          // Hack para garantir rendering completo do DOM pelo Svelte 5
          await new Promise(r => setTimeout(r, 100));

          // 3. Pega o HTML gerado
          const reportHTML = container.innerHTML;

          // Limpa a montagem em Svelte logo após pegar a renderização limpa
          unmount(mountedComponent);
          document.body.removeChild(container);

          // 4. Copia os estilos expostos para nova tela (Tailwind)
          const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
              .map(node => node.outerHTML)
              .join('\n');

          // 5. Injeta Iframe Invisível (Dribla bloqueios de pop-up)
          // Usar 'left: -2000vw' e tamanhos reais preservam o layout grid/flex como se estivesse na tela cheia!
          const iframe = document.createElement('iframe');
          iframe.style.position = 'absolute';
          iframe.style.left = '-2000vw';
          iframe.style.top = '0';
          iframe.style.width = '1000px'; 
          iframe.style.height = '1414px';
          iframe.style.border = 'none';
          
          document.body.appendChild(iframe);
          
          const doc = iframe.contentWindow?.document || iframe.contentDocument;
          if (!doc) throw new Error("Falha ao criar iframe para PDF");

          // 6. Injeta tudo direto no Iframe, botando o conteúdo final e script para janela
          doc.open();
          doc.write(`
              <!DOCTYPE html>
              <html lang="pt-BR">
              <head>
                  <meta charset="UTF-8">
                  <title>TraderLogPro_Performance_${timeFilter}</title>
                  ${styleTags}
                  <style>
                      @page {
                          size: A4 portrait;
                          margin: 0; /* Remove rodapés e cabeçalhos automáticos com URLs */
                      }
                      body {
                          background-color: #ffffff !important;
                          color: #000000 !important;
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                          margin: 0;
                          padding: 12mm 15mm !important; /* Cria a margem dentro do papel */
                          box-sizing: border-box;
                      }
                      /* Força a remoção de fundos escuros e sombras na hora de imprimir */
                      * {
                          box-shadow: none !important;
                      }
                  </style>
              </head>
              <body class="bg-white text-black">
                  ${reportHTML}
                  <scr` + `ipt>
                      // Garante impressao mesmo se onload falhar em iframes
                      let printed = false;
                      const doPrint = () => {
                          if (printed) return;
                          printed = true;
                          setTimeout(() => {
                              window.focus();
                              window.print();
                              // Dispara evento pro parent destruir o iframe dps
                              window.parent.postMessage('print_complete', '*');
                          }, 500);
                      };
                      
                      // Aguarda folhas de estilo externas
                      window.onload = doPrint;
                      // Fallback de segurança 
                      setTimeout(doPrint, 2000); 
                  </scr` + `ipt>
              </body>
              </html>
          `);
          doc.close();

          // Aguarda retorno da msg do script interno para apagar a sujeira
          window.addEventListener('message', function cleanup(e) {
              if (e.data === 'print_complete') {
                  setTimeout(() => {
                      if (document.body.contains(iframe)) {
                         document.body.removeChild(iframe);
                      }
                  }, 1000);
                  window.removeEventListener('message', cleanup);
              }
          });

      } catch (error) {
          console.error("Erro ao exportar PDF: ", error);
      } finally {
          isExporting = false;
      }
  }

</script>

<div class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col min-h-full pb-24 text-foreground relative">
    
    <!-- EXPORTAÇÃO -->
    <div class="mb-6 p-4 bg-primary/10 border border-primary/20 text-primary-foreground rounded-lg flex items-center justify-between gap-6">
        <div>
            <h3 class="font-bold text-sm mb-1 flex items-center gap-2">Exportação Direta em PDF</h3>
            <p class="text-xs opacity-90 leading-relaxed text-foreground/80">
                O arquivo será gerado de maneira oculta garantindo o formato Institucional em 2 páginas. O visual na tela permanecerá limpo (Dark Mode).
            </p>
        </div>
        <Button onclick={exportReport} disabled={isExporting} class="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 gap-2 shadow-lg w-[220px]">
            {#if isExporting}
                <div class="h-4 w-4 rounded-full border-2 border-primary-foreground border-r-transparent animate-spin"></div>
                Gerando Documento...
            {:else}
                <Printer class="w-4 h-4" />
                Exportar para PDF
            {/if}
        </Button>
    </div>

    <!-- CABEÇALHO DA ROTA ON-SCREEN -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-border/40 gap-4">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-3xl font-bold tracking-tight">Performance Report</h2>
                <p class="text-muted-foreground flex items-center gap-2 mt-1">
                    <FileText class="w-4 h-4" /> Auditoria Profissional Consolidada ({formatReportDate(dateRanges.start)} a {formatReportDate(dateRanges.end)})
                </p>
            </div>
            <div class="flex items-center gap-3">
                <DateFilter bind:value={timeFilter} bind:startDate={customStartDate} bind:endDate={customEndDate} />
            </div>
        </div>
    </div>

    <!-- CORPO DO RELATÓRIO PELA JANELA DO WEB APP -->
    <div class="space-y-6">
        
        <!-- BLOCO 1: RESUMO FINANCEIRO -->
        <section>
            <h2 class="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <BarChart3 class="w-4 h-4" /> 1. Resumo do Período
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Nenhuma operação registrada na janela selecionada.
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card class="bg-background/60 shadow-sm border-border/50">
                        <CardContent class="p-4">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Líquido (PnL)</p>
                            <p class="text-2xl font-black tracking-tighter {report.summary.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}">
                                {formatCurrency(report.summary.totalPnL)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50">
                        <CardContent class="p-4">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Win Rate</p>
                            <p class="text-2xl font-black tracking-tighter font-mono">
                                {(report.summary.winRate * 100).toFixed(0)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50">
                        <CardContent class="p-4">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Profit Factor</p>
                            <p class="text-2xl font-black tracking-tighter font-mono">
                                {report.summary.profitFactor.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50">
                        <CardContent class="p-4">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Volume (Trades / Dias)</p>
                            <p class="text-lg font-black tracking-tighter font-mono mt-1">
                                {report.summary.tradeCount} <span class="text-sm font-medium text-muted-foreground">in</span> {report.period.daysActive}d
                            </p>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 2: SCORE E DISCIPLINA DA JANELA -->
        <section class="pt-2">
            <h2 class="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Trophy class="w-4 h-4" /> 2. Score Oficial da Janela (Avaliação Qualitativa)
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Score indisponível sem volume operacional.
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Grade do Score -->
                    <Card class="lg:col-span-2 bg-background/60 shadow-sm border-border/50">
                        <CardContent class="p-5 flex flex-col md:flex-row items-center gap-6">
                            <div class="text-center shrink-0">
                                <div class="w-24 h-24 rounded-full border-4 flex items-center justify-center {report.scoreAndDiscipline.windowScore >= 80 ? 'border-emerald-500 text-emerald-500' : report.scoreAndDiscipline.windowScore >= 50 ? 'border-amber-500 text-amber-500' : 'border-rose-500 text-rose-500'}">
                                    <span class="text-4xl font-black tracking-tighter">{report.scoreAndDiscipline.windowScore.toFixed(0)}</span>
                                </div>
                                <p class="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-3">Master Score</p>
                            </div>
                            
                            <div class="flex-1 grid grid-cols-2 gap-3 w-full">
                                <div>
                                    <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Corte Execução</div>
                                    <div class="font-mono font-bold text-sm border w-max px-2 py-0.5 rounded {getPillarColor(report.scoreAndDiscipline.executionScore)}">
                                        {report.scoreAndDiscipline.executionScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Corte Risco</div>
                                    <div class="font-mono font-bold text-sm border w-max px-2 py-0.5 rounded {getPillarColor(report.scoreAndDiscipline.riskScore)}">
                                        {report.scoreAndDiscipline.riskScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Comportamento</div>
                                    <div class="font-mono font-bold text-sm border w-max px-2 py-0.5 rounded {getPillarColor(report.scoreAndDiscipline.behaviorScore)}">
                                        {report.scoreAndDiscipline.behaviorScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Psicológico</div>
                                    <div class="font-mono font-bold text-sm border w-max px-2 py-0.5 rounded {getPillarColor(report.scoreAndDiscipline.psychoScore)}">
                                        {report.scoreAndDiscipline.psychoScore.toFixed(0)} / 100
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Fechamento das Streaks na Janela -->
                    <Card class="bg-background/60 shadow-sm border-border/50 flex flex-col justify-center">
                        <CardHeader class="pb-2">
                            <CardTitle class="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Streaks da Janela</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 p-3 pt-0">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-foreground">Disciplina Inquebrável</span>
                                <span class="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.discipline}d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-foreground">Controle Emocional</span>
                                <span class="font-mono font-bold text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.emotionalControl}d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-foreground">No-Tilt (Blindagem)</span>
                                <span class="font-mono font-bold text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{report.scoreAndDiscipline.streaks.noTilt}d</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 3: COMPORTAMENTO (AUDITORIA IA) -->
        <section class="pt-2">
            <h2 class="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Brain class="w-4 h-4" /> 3. Auditoria Comportamental
            </h2>
            
            {#if report.behavior.topNegativeImpacts.length === 0 && report.behavior.topPositiveImpacts.length === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Sem comportamentos críticos detectados no período. Rotação operacional neutra.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Card class="bg-rose-500/5 border-rose-500/20 shadow-none">
                        <CardHeader class="pb-2">
                            <CardTitle class="text-[10px] uppercase font-black tracking-widest text-rose-500 flex items-center gap-2">
                                <ShieldAlert class="w-3.5 h-3.5" /> Ofensores de Sistema (Top Punições)
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            {#each report.behavior.topNegativeImpacts as neg}
                                <div class="flex items-start justify-between border-b border-rose-500/10 pb-2 last:border-0 last:pb-0">
                                    <div class="pr-4">
                                        <p class="text-xs font-bold text-foreground leading-tight">{neg.title}</p>
                                        <p class="text-[10px] text-muted-foreground leading-tight mt-0.5">{neg.description}</p>
                                    </div>
                                    <Badge variant="outline" class="text-rose-500 border-rose-500/30 rounded-sm font-mono shrink-0">{neg.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topNegativeImpacts.length === 0}
                                <p class="text-xs text-muted-foreground">Sistema em perfeito funcionamento mecânico. Zero falhas.</p>
                            {/if}
                        </CardContent>
                    </Card>
                    <Card class="bg-emerald-500/5 border-emerald-500/20 shadow-none">
                        <CardHeader class="pb-2">
                            <CardTitle class="text-[10px] uppercase font-black tracking-widest text-emerald-500 flex items-center gap-2">
                                <Zap class="w-3.5 h-3.5" /> Edges Encontrados (Top Bônus)
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            {#each report.behavior.topPositiveImpacts as pos}
                                <div class="flex items-start justify-between border-b border-emerald-500/10 pb-2 last:border-0 last:pb-0">
                                    <div class="pr-4">
                                        <p class="text-xs font-bold text-foreground leading-tight">{pos.title}</p>
                                        <p class="text-[10px] text-muted-foreground leading-tight mt-0.5">{pos.description}</p>
                                    </div>
                                    <Badge variant="outline" class="text-emerald-500 border-emerald-500/30 rounded-sm font-mono shrink-0">+{pos.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topPositiveImpacts.length === 0}
                                <p class="text-xs text-muted-foreground">Sem vantagens excepcionais contabilizadas.</p>
                            {/if}
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 4: REFLEXÃO DO PÓS-MERCADO (DAILY REVIEWS) -->
        <section class="pt-2">
            <h2 class="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen class="w-4 h-4" /> 4. Diário & Reflexão Subjetiva
            </h2>

            {#if report.reflection.reviewCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-rose-500/30 text-rose-500/80 bg-rose-500/5 font-medium">
                    Você operou sem registrar revisão diária. Isso reduz a capacidade de auditoria e aprendizado do período.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card class="bg-background/60 shadow-sm border-border/50 md:col-span-1 flex flex-col justify-center">
                        <CardContent class="p-4 flex flex-col justify-center h-full">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Ritmo de Registro</p>
                            <div class="text-3xl font-black mb-1 text-foreground">{report.reflection.reviewCount} <span class="text-sm font-medium text-muted-foreground tracking-normal">Reviews</span></div>
                            <div class="flex flex-col gap-1 mt-3">
                                <div class="flex items-center justify-between text-xs">
                                   <span class="text-emerald-500 font-bold">Good</span>
                                   <span class="font-mono text-muted-foreground">{report.reflection.distribution.good}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs">
                                   <span class="text-amber-500 font-bold">Neutral</span>
                                   <span class="font-mono text-muted-foreground">{report.reflection.distribution.neutral}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs">
                                   <span class="text-rose-500 font-bold">Bad</span>
                                   <span class="font-mono text-muted-foreground">{report.reflection.distribution.bad}</span>
                                </div>
                            </div>
                            <!-- Cross-Psychology Stats -->
                            {#if report.psychologyStats.lossPercentageInNegativeState !== null}
                                <div class="mt-4 pt-3 border-t border-border/50">
                                    <p class="text-[10px] text-muted-foreground leading-tight">
                                        <span class="font-bold text-rose-500">{(report.psychologyStats.lossPercentageInNegativeState * 100).toFixed(0)}% dos prejuízos</span> ocorreram sob estado emocional negativo <span class="uppercase font-bold">({report.psychologyStats.dominantNegativeEmotion})</span>. 
                                    </p>
                                </div>
                            {/if}
                        </CardContent>
                    </Card>

                    <Card class="bg-background/60 shadow-sm border-border/50 md:col-span-3">
                        <CardHeader class="pb-2">
                            <CardTitle class="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Extratos Relevantes do Diário</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {#if report.reflection.relevantNotes.length === 0}
                                <p class="text-sm italic text-muted-foreground">As avaliações registradas não contêm textos extensos para análise qualitativa.</p>
                            {:else}
                                <div class="space-y-4">
                                    {#each report.reflection.relevantNotes as note}
                                        <div class="bg-muted/30 border-l-2 border-primary/40 p-3 text-sm italic text-foreground/80 leading-relaxed rounded-r-md">
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

        <!-- BLOCO 5: DECISION LAYER (PLANO TÁTICO) -->
        <section class="pt-4 border-t border-border/40 mt-4">
            <h2 class="text-xs font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                <Target class="w-4 h-4" /> 5. Decision Layer (Direção Tática)
            </h2>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                <!-- Diagnóstico -->
                <Card class="bg-primary/5 shadow-none border-primary/20">
                    <CardHeader class="pb-2">
                        <CardTitle class="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2">
                            <Activity class="w-3.5 h-3.5" /> Diagnóstico Final
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p class="text-sm font-bold text-foreground leading-tight">{report.tactical.diagnosis.main}</p>
                        {#if report.tactical.diagnosis.sub}
                            <p class="text-xs text-muted-foreground mt-1 leading-tight">{report.tactical.diagnosis.sub}</p>
                        {/if}
                    </CardContent>
                </Card>

                <!-- Riscos Atuais -->
                <Card class="bg-background/60 shadow-sm border-border/50">
                    <CardHeader class="pb-2">
                        <CardTitle class="text-[10px] uppercase font-black tracking-widest text-rose-500 flex items-center gap-2">
                            <AlertTriangle class="w-3.5 h-3.5" /> Riscos Iminentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul class="space-y-1.5 list-disc pl-4 text-xs text-muted-foreground">
                            {#each report.tactical.risks as risk}
                                <li class="leading-tight">{risk}</li>
                            {/each}
                            {#if report.tactical.risks.length === 0}
                                <li class="leading-tight text-emerald-500/80">Nenhum risco matricial grave identificado.</li>
                            {/if}
                        </ul>
                    </CardContent>
                </Card>

                <!-- Plano de Execução -->
                <Card class="bg-background/80 shadow-sm border-border">
                    <CardHeader class="pb-2">
                        <CardTitle class="text-[10px] uppercase font-black tracking-widest text-foreground flex items-center gap-2">
                            <CheckCircle2 class="w-3.5 h-3.5" /> Plano de Execução
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul class="space-y-2">
                            {#each report.tactical.actionPlan as action}
                                <li class="text-xs font-semibold text-foreground/90 leading-tight flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>{action}</span>
                                </li>
                            {/each}
                        </ul>
                    </CardContent>
                </Card>

            </div>
        </section>

        <!-- BLOCO 6: HELICOPTER VIEW (IA) -->
        <section class="pt-4 border-t border-border/40 mt-4">
            <ReportAICard 
                periodStr={timeFilter === 'custom' ? `Custom (${formatReportDate(dateRanges.start)} a ${formatReportDate(dateRanges.end)})` : timeFilter} 
                metricsPayload={aiMetricsPayload} 
                isPrintMode={isExporting} 
            />
        </section>
    </div>
</div>
