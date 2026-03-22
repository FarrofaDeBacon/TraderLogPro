<script lang="ts">
  import {
    Activity,
    Calendar,
    BarChart3,
    Trophy,
    Target,
    BookOpen,
    AlertTriangle,
    ShieldAlert,
    Zap,
    Printer,
    FileText,
    Brain
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  
  import { tradesStore } from "$lib/stores/trades.svelte";
  import { dailyReviewsStore } from "$lib/stores/daily-reviews.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { currenciesStore } from "$lib/stores/currencies.svelte";
  import { workspaceStore } from "$lib/stores/workspace.svelte";
  import { generateReport } from "$lib/domain/reports/report-engine";
  import { formatCurrency } from "$lib/utils";
  
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

  // Format Helper
  const formatReportDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const dateRanges = $derived.by(() => {
    const now = new Date();
    switch (selectedPeriod) {
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
  });

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

  async function handleExportPDF() {
      if (isExporting) return;
      isExporting = true;

      try {
          // 1. Carrega o html2pdf nativamente
          if (!(window as any).html2pdf) {
              await new Promise((resolve, reject) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                  script.onload = resolve;
                  script.onerror = reject;
                  document.head.appendChild(script);
              });
          }

          // 2. Extrai container oficial e gera clone off-screen
          const originalNode = document.querySelector('.print-container') as HTMLElement;
          if (!originalNode) throw new Error("Container não encontrado");

          const clonedNode = originalNode.cloneNode(true) as HTMLElement;
          
          // 3. Hack Supremo: Transformar as classes "print:xxx" em utilitárias normais ativas
          // Isso engana o html2canvas fazendo-o desenhar o grid multi-colunas mesmo fora do print preview.
          clonedNode.innerHTML = clonedNode.innerHTML.replace(/print:/g, '');
          clonedNode.className = clonedNode.className.replace(/print:/g, '');
          
          // 4. Injeta Força-Bruta de Light Mode e Tamanho Fixo Desktop
          clonedNode.classList.add('bg-white', 'text-black');
          clonedNode.style.position = 'absolute';
          clonedNode.style.left = '-15000px';
          clonedNode.style.top = '0';
          clonedNode.style.width = '1024px'; // Força largura ideal A4 Landscape/Portrait

          // Forçar background branco nos cards para não herdarem opacidade estranha
          const cards = clonedNode.querySelectorAll('.bg-background\\/60, .bg-muted\\/20');
          cards.forEach((c: any) => {
               c.style.backgroundColor = '#ffffff';
               c.style.borderColor = '#e2e8f0'; // slate-200
               c.style.color = '#000000';
          });
          // Ocultar barras da UI on-screen que tivessem .no-print
          const noPrintItems = clonedNode.querySelectorAll('.no-print');
          noPrintItems.forEach((c: any) => c.style.display = 'none');
          // Exibir header institucional que era oculto
          const hiddenHeaders = clonedNode.querySelectorAll('.hidden');
          hiddenHeaders.forEach((c: any) => c.classList.remove('hidden'));

          document.body.appendChild(clonedNode);

          // 5. Opções de Exportação
          const opt = {
              margin:       [10, 10, 10, 10], // top, left, bottom, right (em mm)
              filename:     `TraderLogPro_Performance_${selectedPeriod}.pdf`,
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { 
                  scale: 2, // Retained Retina quality
                  useCORS: true,
                  backgroundColor: '#ffffff'
              },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // 6. Gera Documento e Limpa
          await (window as any).html2pdf().set(opt).from(clonedNode).save();
          document.body.removeChild(clonedNode);

      } catch (error) {
          console.error("Erro ao gerar PDF: ", error);
      } finally {
          isExporting = false;
      }
  }
</script>

<div class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col min-h-full pb-24 print-container text-foreground relative">
    
    <!-- AVISO DE CONFIGURAÇÃO DE IMPRESSORA (Substituído por Loading no Export) -->
    <div class="mb-6 p-4 bg-primary/10 border border-primary/20 text-primary-foreground rounded-lg flex items-center justify-between no-print gap-6">
        <div>
            <h3 class="font-bold text-sm mb-1 flex items-center gap-2">Exportação Direta em PDF</h3>
            <p class="text-xs opacity-90 leading-relaxed text-foreground/80">
                O arquivo será processado localmente e baixado automaticamente. O formato "Print-Perfect" institucional já está configurado.
            </p>
        </div>
        <Button onclick={handleExportPDF} disabled={isExporting} class="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 gap-2 shadow-lg w-[220px]">
            {#if isExporting}
                <div class="h-4 w-4 rounded-full border-2 border-primary-foreground border-r-transparent animate-spin"></div>
                Gerando Documento...
            {:else}
                <Printer class="w-4 h-4" />
                Exportar para PDF
            {/if}
        </Button>
    </div>

    <!-- CABEÇALHO DA ROTA ON-SCREEN (Escondido no Print) -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-border/40 gap-4 no-print">
        <div class="report-header">
            <h1 class="text-3xl font-black tracking-tighter flex items-center gap-3">
                <FileText class="w-8 h-8 text-primary" />
                Relatório de Performance Operacional
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

    <!-- HEADER INSTITUCIONAL ESTRITO NO PRINT (Visível apenas na imperssão) -->
    <div class="hidden print:flex flex-col border-b-2 border-black pb-4 mb-6 relative">
        <div class="absolute right-0 top-0 text-[10px] uppercase font-bold text-gray-400">Pág. 1</div>
        <h1 class="text-2xl font-black uppercase tracking-widest text-black">TraderLog Pro</h1>
        <h2 class="text-lg font-bold text-gray-700 mt-0.5">Relatório de Performance Operacional</h2>
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2 border-t border-gray-200 inline-block pt-1 w-max">
            Período Auditado: {formatReportDate(dateRanges.start)} a {formatReportDate(dateRanges.end)}
        </div>
    </div>

    <!-- CORPO DO RELATÓRIO: Grid Dinâmico (Colunas no Print) -->
    <div class="space-y-6 print:space-y-0 print:grid print:grid-cols-12 print:gap-6">
        
        <!-- BLOCO 1: RESUMO FINANCEIRO -->
        <section class="break-inside-avoid print-section print:col-span-12">
            <h2 class="text-xs print:text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <BarChart3 class="w-4 h-4 print:w-3.5 print:h-3.5" /> Estatística Financeira Oficial
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Nenhuma operação registrada na janela selecionada.
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 print:gap-3">
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-3">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Líquido (PnL)</p>
                            <p class="text-2xl print:text-xl font-black tracking-tighter {report.summary.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}">
                                {formatCurrency(report.summary.totalPnL)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-3">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Win Rate</p>
                            <p class="text-2xl print:text-xl font-black tracking-tighter font-mono">
                                {(report.summary.winRate * 100).toFixed(0)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-3">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Profit Factor</p>
                            <p class="text-2xl print:text-xl font-black tracking-tighter font-mono">
                                {report.summary.profitFactor.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-3">
                            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Volume de Negócios</p>
                            <p class="text-lg print:text-base font-black tracking-tighter font-mono mt-1">
                                {report.summary.tradeCount} <span class="text-sm print:text-xs font-medium text-muted-foreground">Trades em</span> {report.period.daysActive}ds
                            </p>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 2: SCORE E DISCIPLINA DA JANELA -->
        <section class="break-inside-avoid print-section print:col-span-12">
            <h2 class="text-xs print:text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Trophy class="w-4 h-4 print:w-3.5 print:h-3.5" /> Avaliação Qualitativa (Score)
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Score indisponível sem volume operacional.
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 print:gap-3">
                    <!-- Grade do Score -->
                    <Card class="lg:col-span-2 bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-5 print:p-4 flex flex-col md:flex-row items-center gap-6 print:gap-5">
                            <div class="text-center shrink-0">
                                <div class="w-24 h-24 print:w-16 print:h-16 rounded-full border-4 print:border-[3px] flex items-center justify-center score-circle {report.scoreAndDiscipline.windowScore >= 80 ? 'border-emerald-500 text-emerald-500' : report.scoreAndDiscipline.windowScore >= 50 ? 'border-amber-500 text-amber-500' : 'border-rose-500 text-rose-500'}">
                                    <span class="text-4xl print:text-2xl font-black tracking-tighter">{report.scoreAndDiscipline.windowScore.toFixed(0)}</span>
                                </div>
                                <p class="text-[9px] print:text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-3 print:mt-1.5">Master Score</p>
                            </div>
                            
                            <div class="flex-1 grid grid-cols-2 gap-3 w-full">
                                <div>
                                    <div class="text-[9px] print:text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Corte Execução (Econômico)</div>
                                    <div class="font-mono font-bold text-sm print:text-xs print-badge {getPillarColor(report.scoreAndDiscipline.executionScore)} w-max px-2 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.executionScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] print:text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Gestão Risco (Limites)</div>
                                    <div class="font-mono font-bold text-sm print:text-xs print-badge {getPillarColor(report.scoreAndDiscipline.riskScore)} w-max px-2 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.riskScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] print:text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Auditoria IA (Mecânica)</div>
                                    <div class="font-mono font-bold text-sm print:text-xs print-badge {getPillarColor(report.scoreAndDiscipline.behaviorScore)} w-max px-2 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.behaviorScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] print:text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Psicológico (Diário)</div>
                                    <div class="font-mono font-bold text-sm print:text-xs print-badge {getPillarColor(report.scoreAndDiscipline.psychoScore)} w-max px-2 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.psychoScore.toFixed(0)} / 100
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Fechamento das Streaks na Janela -->
                    <Card class="bg-background/60 shadow-sm border-border/50 flex flex-col justify-center print-card h-full">
                        <CardHeader class="pb-2 print:p-4 print:pb-2">
                            <CardTitle class="text-[10px] print:text-[9px] uppercase font-black tracking-widest text-muted-foreground">Streaks Preservadas (Janela)</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 print:space-y-2 print:px-4 print:pb-4 border-t border-border/10 print:pt-4">
                            <div class="flex items-center justify-between">
                                <span class="text-xs print:text-[11px] font-bold text-foreground">Disciplina Inquebrável</span>
                                <span class="font-mono font-bold text-xs print:text-[11px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded print-badge-solid">{report.scoreAndDiscipline.streaks.discipline} d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs print:text-[11px] font-bold text-foreground">Controle Emocional</span>
                                <span class="font-mono font-bold text-xs print:text-[11px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded print-badge-solid">{report.scoreAndDiscipline.streaks.emotionalControl} d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs print:text-[11px] font-bold text-foreground">Prevenção a Tilt</span>
                                <span class="font-mono font-bold text-xs print:text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded print-badge-solid">{report.scoreAndDiscipline.streaks.noTilt} d</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 3: COMPORTAMENTO (Col-6 no Print) -->
        <section class="break-inside-avoid print-section print:col-span-6 flex flex-col h-full">
            <h2 class="text-xs print:text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Brain class="w-4 h-4 print:w-3.5 print:h-3.5" /> Ofensores & Edges
            </h2>
            
            {#if report.behavior.topNegativeImpacts.length === 0 && report.behavior.topPositiveImpacts.length === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20 flex-1">
                    Operação linear sem desvios relevantes do Setup.
                </div>
            {:else}
                <div class="flex flex-col gap-4 print:gap-3 flex-1 h-full">
                    <Card class="bg-rose-500/5 border-rose-500/20 shadow-none print-card-color flex-1">
                        <CardHeader class="pb-2 print:p-3 print:pb-2">
                            <CardTitle class="text-[10px] font-black tracking-widest text-rose-500 flex items-center gap-2 uppercase">
                                <ShieldAlert class="w-3.5 h-3.5 print:w-3 print:h-3" /> Infrações (Alta Severidade)
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 print:p-3 print:pt-0">
                            {#each report.behavior.topNegativeImpacts as neg}
                                <div class="flex items-start justify-between border-b border-rose-500/10 pb-2 print:pb-1.5 last:border-0 last:pb-0">
                                    <div class="pr-2">
                                        <p class="text-xs print:text-[10px] font-bold text-foreground leading-tight">{neg.title}</p>
                                    </div>
                                    <Badge variant="outline" class="text-rose-500 border-rose-500/30 rounded-sm font-mono shrink-0 print:text-[9px] print-badge-outline">{neg.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topNegativeImpacts.length === 0}
                                <p class="text-[10px] text-muted-foreground">Sistema funcional, zero falhas críticas.</p>
                            {/if}
                        </CardContent>
                    </Card>
                    <Card class="bg-emerald-500/5 border-emerald-500/20 shadow-none print-card-color flex-1 mt-auto">
                        <CardHeader class="pb-2 print:p-3 print:pb-2">
                            <CardTitle class="text-[10px] font-black tracking-widest text-emerald-500 flex items-center gap-2 uppercase">
                                <Zap class="w-3.5 h-3.5 print:w-3 print:h-3" /> Vantagens Competitivas
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 print:p-3 print:pt-0">
                            {#each report.behavior.topPositiveImpacts as pos}
                                <div class="flex items-start justify-between border-b border-emerald-500/10 pb-2 print:pb-1.5 last:border-0 last:pb-0">
                                    <div class="pr-2">
                                        <p class="text-xs print:text-[10px] font-bold text-foreground leading-tight">{pos.title}</p>
                                    </div>
                                    <Badge variant="outline" class="text-emerald-500 border-emerald-500/30 rounded-sm font-mono shrink-0 print:text-[9px] print-badge-outline">+{pos.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topPositiveImpacts.length === 0}
                                <p class="text-[10px] text-muted-foreground">Mediano, sem saltos matemáticos a favor.</p>
                            {/if}
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 4: REFLEXÃO DO PÓS-MERCADO (Col-6 no Print) -->
        <section class="break-inside-avoid print-section print:col-span-6 flex flex-col h-full">
            <h2 class="text-xs print:text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen class="w-4 h-4 print:w-3.5 print:h-3.5" /> Resumo Pós-Mercado
            </h2>

            {#if report.reflection.reviewCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20 flex-1">
                    Sem Daily Reviews no período. Pós-mercado inexistente.
                </div>
            {:else}
                <div class="flex flex-col gap-4 print:gap-3 flex-1 h-full">
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-3 grid grid-cols-2 gap-4 items-center h-full">
                            <div>
                                <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Sessões Documentadas</p>
                                <div class="text-3xl print:text-2xl font-black text-foreground">{report.reflection.reviewCount} <span class="text-xs font-medium text-muted-foreground tracking-normal">Dias Lidos</span></div>
                            </div>
                            <div class="flex flex-col gap-1.5 border-l border-border/20 pl-4 print:pl-3">
                                <div class="flex items-center justify-between text-xs print:text-[10px]">
                                   <span class="text-emerald-500 font-bold uppercase">Good</span>
                                   <span class="font-mono text-muted-foreground font-bold">{report.reflection.distribution.good}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs print:text-[10px]">
                                   <span class="text-amber-500 font-bold uppercase">Neutral</span>
                                   <span class="font-mono text-muted-foreground font-bold">{report.reflection.distribution.neutral}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs print:text-[10px]">
                                   <span class="text-rose-500 font-bold uppercase">Bad</span>
                                   <span class="font-mono text-muted-foreground font-bold">{report.reflection.distribution.bad}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="bg-background/60 shadow-sm border-border/50 print-card flex-1 mb-auto">
                        <CardHeader class="pb-2 print:p-4 print:pb-2">
                            <CardTitle class="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Observações Primárias (Extracts)</CardTitle>
                        </CardHeader>
                        <CardContent class="print:px-4 print:pb-4 border-t border-border/10 print:pt-4">
                            {#if report.reflection.relevantNotes.length === 0}
                                <p class="text-sm print:text-xs italic text-muted-foreground">Avaliações não suportadas por textos discritivos o suficiente.</p>
                            {:else}
                                <div class="space-y-4 print:space-y-3">
                                    {#each report.reflection.relevantNotes as note}
                                        <div class="bg-muted/30 print:bg-gray-50 border-l-2 print:border-l-[3px] border-primary/40 p-3 print:p-3 text-sm print:text-[11px] italic text-foreground/80 leading-relaxed rounded-r border-t border-r border-b border-border/20 print-note">
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

<style>
    /* O SEGREDO DO PRINT-PERFECT: FORÇAR AS VARIÁVEIS SHADCN PARA LIGHT MODE APENAS NO PAPEL */
    @media print {
        @page {
            /* Margem fina, tamanho padrão. Para 1 página. */
            margin: 0.8cm 1cm;
            size: A4 portrait;
        }

        /* 
           Reset brutal de variáveis globais que o Shadcn/Tailwind usam.
           Mesmo que o app esteja em Dark Mode, a classe container no print vai forçar o fundo branco absoluto 
           e fonte preta absoluta, simulando Light Mode perfeito sem quebrar a interface na tela normal.
        */
        :global(:root), :global(.dark), :global(body) {
            --background: 0 0% 100% !important;
            --foreground: 222.2 84% 4.9% !important;
            --card: 0 0% 100% !important;
            --card-foreground: 222.2 84% 4.9% !important;
            --border: 214.3 31.8% 91.4% !important;
            --input: 214.3 31.8% 91.4% !important;
            --primary: 222.2 47.4% 11.2% !important;
            --primary-foreground: 210 40% 98% !important;
            --secondary: 210 40% 96.1% !important;
            --secondary-foreground: 222.2 47.4% 11.2% !important;
            --accent: 210 40% 96.1% !important;
            --accent-foreground: 222.2 47.4% 11.2% !important;
            --destructive: 0 84.2% 60.2% !important;
            --destructive-foreground: 210 40% 98% !important;
            --ring: 222.2 84% 4.9% !important;
            --radius: 0.5rem;
            --sidebar-background: 0 0% 98% !important;
        }

        :global(body) {
            background-color: white !important;
            color: black !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
        }

        :global(.no-print) {
            display: none !important;
        }

        .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
            background: white !important;
        }

        /* Otimizações diretas da impressora */
        .break-inside-avoid {
            page-break-inside: avoid;
        }

        .print-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background-color: white !important;
            color: black !important;
        }

        .print-card-color {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            /* Force white background even for the colored behavior cards on print 
               to save ink and look cleaner, maintaining just the border or icon color */
            background-color: white !important; 
        }

        .print-note {
            background-color: #f8fafc !important;
            color: #334155 !important;
        }

        .score-circle {
            background-color: white !important;
        }

        /* Cores estritas de texto que não dependem do foreground mutável */
        .text-emerald-500 { color: #10b981 !important; }
        .text-amber-500 { color: #f59e0b !important; }
        .text-rose-500 { color: #f43f5e !important; }
        .text-indigo-400 { color: #818cf8 !important; }
        .text-primary { color: #000000 !important; }
        
        /* Textos de suporte não tão pretos pra não explodir visualmente */
        .text-muted-foreground { color: #64748b !important; }
    }
</style>
<!-- Trigger HMR: v3 Print Strict Mode -->
