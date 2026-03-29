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
  import SystemCard from "$lib/components/ui/system/SystemCard.svelte";
  import SystemMetric from "$lib/components/ui/system/SystemMetric.svelte";
  import SystemHeader from "$lib/components/ui/system/SystemHeader.svelte";
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
            <SystemHeader 
                title="Exportação Direta em PDF" 
                class="mb-1"
            />
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
    {#snippet reportActions()}
        <div class="flex items-center gap-3">
            <DateFilter bind:value={timeFilter} bind:startDate={customStartDate} bind:endDate={customEndDate} />
        </div>
    {/snippet}

    <SystemCard status="info" class="p-3 mb-6">
        <SystemHeader 
            title="Performance Report"
            subtitle={`Auditoria Profissional Consolidada (${formatReportDate(dateRanges.start)} a ${formatReportDate(dateRanges.end)})`}
            icon={FileText}
            variant="page"
            class="mb-0"
            actions={reportActions}
        />
    </SystemCard>

    <!-- CORPO DO RELATÓRIO PELA JANELA DO WEB APP -->
    <div class="space-y-6">
        
        <!-- BLOCO 1: RESUMO FINANCEIRO -->
        <section>
            <SystemHeader 
                title="1. Resumo do Período"
                icon={BarChart3}
                class="mb-3"
            />
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Nenhuma operação registrada na janela selecionada.
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SystemCard class="p-4">
                        <SystemMetric 
                            label="Líquido (PnL)"
                            value={formatCurrency(report.summary.totalPnL)}
                            status={report.summary.totalPnL >= 0 ? 'success' : 'danger'}
                            weight="black"
                        />
                    </SystemCard>
                    <SystemCard class="p-4">
                        <SystemMetric 
                            label="Win Rate"
                            value={(report.summary.winRate * 100).toFixed(0) + "%"}
                            status={report.summary.winRate >= 0.5 ? 'success' : 'danger'}
                            weight="black"
                        />
                    </SystemCard>
                    <SystemCard class="p-4">
                        <SystemMetric 
                            label="Profit Factor"
                            value={report.summary.profitFactor.toFixed(2)}
                            status={report.summary.profitFactor >= 1.2 ? 'success' : report.summary.profitFactor >= 1 ? 'warning' : 'danger'}
                            weight="black"
                        />
                    </SystemCard>
                    <SystemCard class="p-4">
                        <SystemMetric 
                            label="Volume (Trades / Dias)"
                            value={String(report.summary.tradeCount)}
                            subvalue={report.period.daysActive + "d ativos"}
                            weight="black"
                        />
                    </SystemCard>
                </div>
            {/if}
        </section>

        <!-- BLOCO 2: SCORE E DISCIPLINA DA JANELA -->
        <section class="pt-2">
            <SystemHeader 
                title="2. Score Oficial da Janela (Avaliação Qualitativa)"
                icon={Trophy}
                class="mb-3"
            />
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Score indisponível sem volume operacional.
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Grade do Score -->
                    <SystemCard class="lg:col-span-2 p-5 flex flex-col md:flex-row items-center gap-6">
                        <div class="text-center shrink-0">
                            <div class="w-24 h-24 rounded-full border-4 flex items-center justify-center {report.scoreAndDiscipline.windowScore >= 80 ? 'border-emerald-500 text-emerald-500' : report.scoreAndDiscipline.windowScore >= 50 ? 'border-amber-500 text-amber-500' : 'border-rose-500 text-rose-500'}">
                                <span class="text-4xl font-black tracking-tighter">{report.scoreAndDiscipline.windowScore.toFixed(0)}</span>
                            </div>
                            <p class="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-3">Master Score</p>
                        </div>
                        
                        <div class="flex-1 grid grid-cols-2 gap-4 w-full">
                            <SystemMetric 
                                label="Corte Execução"
                                value={report.scoreAndDiscipline.executionScore.toFixed(0) + " / 100"}
                                status={report.scoreAndDiscipline.executionScore >= 80 ? 'success' : report.scoreAndDiscipline.executionScore >= 50 ? 'warning' : 'danger'}
                            />
                            <SystemMetric 
                                label="Corte Risco"
                                value={report.scoreAndDiscipline.riskScore.toFixed(0) + " / 100"}
                                status={report.scoreAndDiscipline.riskScore >= 80 ? 'success' : report.scoreAndDiscipline.riskScore >= 50 ? 'warning' : 'danger'}
                            />
                            <SystemMetric 
                                label="Comportamento"
                                value={report.scoreAndDiscipline.behaviorScore.toFixed(0) + " / 100"}
                                status={report.scoreAndDiscipline.behaviorScore >= 80 ? 'success' : report.scoreAndDiscipline.behaviorScore >= 50 ? 'warning' : 'danger'}
                            />
                            <SystemMetric 
                                label="Psicológico"
                                value={report.scoreAndDiscipline.psychoScore.toFixed(0) + " / 100"}
                                status={report.scoreAndDiscipline.psychoScore >= 80 ? 'success' : report.scoreAndDiscipline.psychoScore >= 50 ? 'warning' : 'danger'}
                            />
                        </div>
                    </SystemCard>

                    <!-- Fechamento das Streaks na Janela -->
                    <SystemCard status="info" class="flex flex-col justify-center">
                        <div class="p-3">
                            <SystemHeader 
                                title="Streaks da Janela"
                                class="mb-3"
                            />
                            <div class="space-y-3">
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
                            </div>
                        </div>
                    </SystemCard>
                </div>
            {/if}
        </section>

        <!-- BLOCO 3: COMPORTAMENTO (AUDITORIA IA) -->
        <section class="pt-2">
            <SystemHeader 
                title="3. Auditoria Comportamental"
                icon={Brain}
                class="mb-3"
            />
            
            {#if report.behavior.topNegativeImpacts.length === 0 && report.behavior.topPositiveImpacts.length === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Sem comportamentos críticos detectados no período. Rotação operacional neutra.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <SystemCard status="danger" class="bg-rose-500/5 border-rose-500/20 shadow-none">
                        <div class="p-4">
                            <SystemHeader 
                                title="Ofensores de Sistema (Top Punições)"
                                icon={ShieldAlert}
                                class="mb-3 text-rose-500"
                            />
                            <div class="space-y-3">
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
                            </div>
                        </div>
                    </SystemCard>
                    <SystemCard status="success" class="bg-emerald-500/5 border-emerald-500/20 shadow-none">
                        <div class="p-4">
                            <SystemHeader 
                                title="Edges Encontrados (Top Bônus)"
                                icon={Zap}
                                class="mb-3 text-emerald-500"
                            />
                            <div class="space-y-3">
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
                            </div>
                        </div>
                    </SystemCard>
                </div>
            {/if}
        </section>

        <!-- BLOCO 4: REFLEXÃO DO PÓS-MERCADO (DAILY REVIEWS) -->
        <section class="pt-2">
            <SystemHeader 
                title="4. Diário & Reflexão Subjetiva"
                icon={BookOpen}
                class="mb-3"
            />

            {#if report.reflection.reviewCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-rose-500/30 text-rose-500/80 bg-rose-500/5 font-medium">
                    Você operou sem registrar revisão diária. Isso reduz a capacidade de auditoria e aprendizado do período.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <SystemCard class="md:col-span-1 p-4 flex flex-col justify-center">
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
                    </SystemCard>

                    <SystemCard class="md:col-span-3">
                        <div class="p-4">
                            <SystemHeader 
                                title="Extratos Relevantes do Diário"
                                class="mb-3 text-muted-foreground"
                            />
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
                        </div>
                    </SystemCard>
                </div>
            {/if}
        </section>

        <!-- BLOCO 5: DECISION LAYER (PLANO TÁTICO) -->
        <section class="pt-4 border-t border-border/40 mt-4">
            <SystemHeader 
                title="5. Decision Layer (Direção Tática)"
                icon={Target}
                class="mb-3 text-primary"
            />
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                <!-- Diagnóstico -->
                <SystemCard status="info" class="bg-primary/5 shadow-none border-primary/20">
                    <div class="p-4">
                        <SystemHeader 
                            title="Diagnóstico Final"
                            icon={Activity}
                            class="mb-3 text-primary"
                        />
                        <p class="text-sm font-bold text-foreground leading-tight">{report.tactical.diagnosis.main}</p>
                        {#if report.tactical.diagnosis.sub}
                            <p class="text-xs text-muted-foreground mt-1 leading-tight">{report.tactical.diagnosis.sub}</p>
                        {/if}
                    </div>
                </SystemCard>

                <!-- Riscos Atuais -->
                <SystemCard status="danger" class="bg-background/60 shadow-sm border-border/50">
                    <div class="p-4">
                        <SystemHeader 
                            title="Riscos Iminentes"
                            icon={AlertTriangle}
                            class="mb-3 text-rose-500"
                        />
                        <ul class="space-y-1.5 list-disc pl-4 text-xs text-muted-foreground">
                            {#each report.tactical.risks as risk}
                                <li class="leading-tight">{risk}</li>
                            {/each}
                            {#if report.tactical.risks.length === 0}
                                <li class="leading-tight text-emerald-500/80">Nenhum risco matricial grave identificado.</li>
                            {/if}
                        </ul>
                    </div>
                </SystemCard>

                <!-- Plano de Execução -->
                <SystemCard status="none" class="bg-background/80 shadow-sm border-border">
                    <div class="p-4">
                        <SystemHeader 
                            title="Plano de Execução"
                            icon={CheckCircle2}
                            class="mb-3"
                        />
                        <ul class="space-y-2">
                            {#each report.tactical.actionPlan as action}
                                <li class="text-xs font-semibold text-foreground/90 leading-tight flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>{action}</span>
                                </li>
                            {/each}
                        </ul>
                    </div>
                </SystemCard>

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
