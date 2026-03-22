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
  import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subMonths
  } from "date-fns";

  // State
  let selectedPeriod = $state('hoje');
  let isExporting = $state(false);

  // Reatividade do DateRange
  const getDateRanges = (period: string) => {
    const now = new Date();
    switch (period) {
      case "hoje":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "semana":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "mes":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "mes_passado":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  let dateRanges = $state(getDateRanges(selectedPeriod));

  $effect(() => {
      dateRanges = getDateRanges(selectedPeriod);
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
          // 1. Cria contêiner off-screen para montar o componente
          const container = document.createElement('div');
          container.style.display = 'none';
          document.body.appendChild(container);

          // 2. Monta dinamicamente a UI de Impressão (PdfExportTemplate já está formatado com HEX e tags de print)
          const mountedComponent = mount(PdfExportTemplate, {
              target: container,
              props: {
                 report: report,
                 selectedPeriod: selectedPeriod,
                 dateRanges: dateRanges
              }
          });

          // Hack para garantir rendering completo do DOM pelo Svelte
          await new Promise(r => setTimeout(r, 100));

          // 3. Pega o HTML gerado
          const reportHTML = container.innerHTML;

          // Limpa o componente logo após pegar o HTML
          unmount(mountedComponent);
          document.body.removeChild(container);

          // 4. Copia os estilos atuais (Tailwind + CSS Global) para não perder formatação
          const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
              .map(node => node.outerHTML)
              .join('\n');

          // 5. Abre Nova Janela
          const printWindow = window.open('', '_blank', 'width=1000,height=800');
          if (!printWindow) {
              alert("Por favor, permita pop-ups para gerar o documento.");
              isExporting = false;
              return;
          }

          // 6. Injeta HTML e Script de Auto-Impressão
          printWindow.document.write(`
              <!DOCTYPE html>
              <html lang="pt-BR">
              <head>
                  <meta charset="UTF-8">
                  <title>TraderLogPro_Performance_${selectedPeriod}</title>
                  ${styleTags}
                  <style>
                      @page {
                          size: A4 portrait;
                          margin: 10mm;
                      }
                      body {
                          background-color: #ffffff !important;
                          color: #000000 !important;
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                          margin: 0;
                          padding: 0;
                      }
                      /* Força a remoção de fundos escuros e sombras na hora de imprimir */
                      * {
                          box-shadow: none !important;
                      }
                  </style>
              </head>
              <body class="bg-white text-black">
                  ${reportHTML}
                  <script>
                      // Aguarda o carregamento de fontes e folhas de estilo externas
                      window.onload = () => {
                          setTimeout(() => {
                              window.print();
                              window.close();
                          }, 500); 
                      };
                  <\/script>
              </body>
              </html>
          `);
          
          printWindow.document.close();

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
        <div class="report-header">
            <h1 class="text-3xl font-black tracking-tighter flex items-center gap-3">
                <FileText class="w-8 h-8 text-primary" />
                Performance Report
            </h1>
            <p class="text-sm text-muted-foreground mt-1 font-medium">
                Auditoria Profissional Consolidada ({formatReportDate(dateRanges.start)} a {formatReportDate(dateRanges.end)})
            </p>
        </div>
        
        <div class="flex items-center gap-3">
            <Select type="single" bind:value={selectedPeriod}>
                <SelectTrigger class="w-[180px] h-10 bg-background border-border/50 text-xs font-bold uppercase tracking-wider">
                   {selectedPeriod === 'hoje' ? 'Hoje' : selectedPeriod === 'semana' ? 'Esta Semana' : selectedPeriod === 'mes' ? 'Este Mês' : 'Mês Passado'}
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Esta Semana (Seg-Dom)</SelectItem>
                    <SelectItem value="mes">Este Mês</SelectItem>
                    <SelectItem value="mes_passado">Mês Passado</SelectItem>
                </SelectContent>
            </Select>
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
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Nenhum Daily Review encontrado na janela. É crucial formalizar o Pós-Mercado para evoluir.
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
    </div>
</div>
