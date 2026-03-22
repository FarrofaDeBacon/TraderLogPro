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
  let selectedPeriod = $state<string>("mes");

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

  function handlePrint() {
      // Pequeno timeout opcional mas em geral chama logo a impressão do navegador
      window.print();
  }

  // UI Helpers
  function getPillarColor(score: number): string {
      if (score >= 80) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
      if (score >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
      return "text-rose-500 bg-rose-500/10 border-rose-500/30";
  }
</script>

<div class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col min-h-full pb-24 print-container text-foreground">
    <!-- CABEÇALHO DA ROTA -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 print:mb-4 pb-4 print:pb-2 border-b border-border/40 print:border-black/20 gap-4">
        <div class="report-header">
            <h1 class="text-3xl print:text-xl font-black tracking-tighter flex items-center gap-3 print:gap-2">
                <FileText class="w-8 h-8 print:w-5 print:h-5 text-primary" />
                Performance Report
            </h1>
            <p class="text-sm print:text-[10px] text-muted-foreground mt-1 print:mt-0 font-medium">
                Auditoria Profissional Consolidada ({formatReportDate(dateRanges.start)} a {formatReportDate(dateRanges.end)})
            </p>
        </div>
        
        <div class="flex items-center gap-3 no-print">
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

            <Button onclick={handlePrint} class="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 gap-2 shadow-lg">
                <Printer class="w-4 h-4" />
                Imprimir / Salvar em PDF
            </Button>
        </div>
    </div>

    <!-- CORPO DO RELATÓRIO -->
    <div class="space-y-6 print:space-y-3">
        
        <!-- BLOCO 1: RESUMO FINANCEIRO -->
        <section class="break-inside-avoid print-section">
            <h2 class="text-xs print:text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 print:mb-1.5 flex items-center gap-2">
                <BarChart3 class="w-4 h-4 print:w-3 print:h-3" /> 1. Resumo do Período
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Nenhuma operação registrada na janela selecionada.
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 print:gap-2">
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-2">
                            <p class="text-[10px] print:text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1 print:mb-0">Líquido (PnL)</p>
                            <p class="text-2xl print:text-lg font-black tracking-tighter {report.summary.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}">
                                {formatCurrency(report.summary.totalPnL)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-2">
                            <p class="text-[10px] print:text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1 print:mb-0">Win Rate</p>
                            <p class="text-2xl print:text-lg font-black tracking-tighter font-mono">
                                {(report.summary.winRate * 100).toFixed(0)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-2">
                            <p class="text-[10px] print:text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1 print:mb-0">Profit Factor</p>
                            <p class="text-2xl print:text-lg font-black tracking-tighter font-mono">
                                {report.summary.profitFactor.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card class="bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-4 print:p-2">
                            <p class="text-[10px] print:text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1 print:mb-0">Volume (Trades / Dias)</p>
                            <p class="text-lg print:text-sm font-black tracking-tighter font-mono mt-1 print:mt-0">
                                {report.summary.tradeCount} <span class="text-sm print:text-[9px] font-medium text-muted-foreground">in</span> {report.period.daysActive}d
                            </p>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 2: SCORE E DISCIPLINA DA JANELA -->
        <section class="break-inside-avoid print-section pt-2 print:pt-0">
            <h2 class="text-xs print:text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 print:mb-1.5 flex items-center gap-2">
                <Trophy class="w-4 h-4 print:w-3 print:h-3" /> 2. Score Oficial da Janela (Avaliação Qualitativa)
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Score indisponível sem volume operacional.
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 print:gap-2">
                    <!-- Grade do Score -->
                    <Card class="lg:col-span-2 bg-background/60 shadow-sm border-border/50 print-card">
                        <CardContent class="p-5 print:p-3 flex flex-col md:flex-row items-center gap-6 print:gap-4">
                            <div class="text-center shrink-0">
                                <div class="w-24 h-24 print:w-16 print:h-16 rounded-full border-4 print:border-2 flex items-center justify-center score-circle {report.scoreAndDiscipline.windowScore >= 80 ? 'border-emerald-500 text-emerald-500' : report.scoreAndDiscipline.windowScore >= 50 ? 'border-amber-500 text-amber-500' : 'border-rose-500 text-rose-500'}">
                                    <span class="text-4xl print:text-2xl font-black tracking-tighter">{report.scoreAndDiscipline.windowScore.toFixed(0)}</span>
                                </div>
                                <p class="text-[9px] print:text-[7px] font-bold uppercase tracking-widest text-muted-foreground mt-3 print:mt-1">Master Score</p>
                            </div>
                            
                            <div class="flex-1 grid grid-cols-2 gap-3 print:gap-2 w-full">
                                <div>
                                    <div class="text-[9px] print:text-[7px] uppercase tracking-wider text-muted-foreground mb-1">Corte Execução</div>
                                    <div class="font-mono font-bold text-sm print:text-[10px] print-badge {getPillarColor(report.scoreAndDiscipline.executionScore)} w-max px-2 print:px-1.5 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.executionScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] print:text-[7px] uppercase tracking-wider text-muted-foreground mb-1">Corte Risco</div>
                                    <div class="font-mono font-bold text-sm print:text-[10px] print-badge {getPillarColor(report.scoreAndDiscipline.riskScore)} w-max px-2 print:px-1.5 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.riskScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] print:text-[7px] uppercase tracking-wider text-muted-foreground mb-1">Comportamento</div>
                                    <div class="font-mono font-bold text-sm print:text-[10px] print-badge {getPillarColor(report.scoreAndDiscipline.behaviorScore)} w-max px-2 print:px-1.5 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.behaviorScore.toFixed(0)} / 100
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[9px] print:text-[7px] uppercase tracking-wider text-muted-foreground mb-1">Psicológico</div>
                                    <div class="font-mono font-bold text-sm print:text-[10px] print-badge {getPillarColor(report.scoreAndDiscipline.psychoScore)} w-max px-2 print:px-1.5 py-0.5 rounded border">
                                        {report.scoreAndDiscipline.psychoScore.toFixed(0)} / 100
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Fechamento das Streaks na Janela -->
                    <Card class="bg-background/60 shadow-sm border-border/50 flex flex-col justify-center print-card">
                        <CardHeader class="pb-2 print:p-3 print:pb-1">
                            <CardTitle class="text-[10px] print:text-[8px] uppercase font-black tracking-widest text-muted-foreground">Streaks da Janela</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 print:space-y-1 print:p-3 print:pt-0">
                            <div class="flex items-center justify-between">
                                <span class="text-xs print:text-[10px] font-bold text-foreground">Disciplina Inquebrável</span>
                                <span class="font-mono font-bold text-xs print:text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded print-badge-solid">{report.scoreAndDiscipline.streaks.discipline}d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs print:text-[10px] font-bold text-foreground">Controle Emocional</span>
                                <span class="font-mono font-bold text-xs print:text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded print-badge-solid">{report.scoreAndDiscipline.streaks.emotionalControl}d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs print:text-[10px] font-bold text-foreground">No-Tilt (Blindagem)</span>
                                <span class="font-mono font-bold text-xs print:text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded print-badge-solid">{report.scoreAndDiscipline.streaks.noTilt}d</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 3: COMPORTAMENTO (AUDITORIA IA) -->
        <section class="break-inside-avoid print-section pt-2 print:pt-0">
            <h2 class="text-xs print:text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 print:mb-1.5 flex items-center gap-2">
                <Brain class="w-4 h-4 print:w-3 print:h-3" /> 3. Auditoria Comportamental
            </h2>
            
            {#if report.behavior.topNegativeImpacts.length === 0 && report.behavior.topPositiveImpacts.length === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Sem comportamentos críticos detectados no período. Rotação operacional neutra.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 mt-2 print:mt-0">
                    <Card class="bg-rose-500/5 border-rose-500/20 shadow-none print-card-color">
                        <CardHeader class="pb-2 print:p-2 print:pb-1">
                            <CardTitle class="text-[10px] print:text-[8px] uppercase font-black tracking-widest text-rose-500 flex items-center gap-2">
                                <ShieldAlert class="w-3.5 h-3.5 print:w-3 print:h-3" /> Ofensores de Sistema (Top Punições)
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 print:space-y-1.5 print:p-2 print:pt-0">
                            {#each report.behavior.topNegativeImpacts as neg}
                                <div class="flex items-start justify-between border-b border-rose-500/10 pb-2 print:pb-1 last:border-0 last:pb-0">
                                    <div class="pr-4 print:pr-2">
                                        <p class="text-xs print:text-[10px] font-bold text-foreground leading-tight">{neg.title}</p>
                                        <p class="text-[10px] print:text-[8px] text-muted-foreground leading-tight mt-0.5">{neg.description}</p>
                                    </div>
                                    <Badge variant="outline" class="text-rose-500 border-rose-500/30 rounded-sm font-mono shrink-0 print:px-1 print:py-0 print-badge-outline">{neg.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topNegativeImpacts.length === 0}
                                <p class="text-xs print:text-[9px] text-muted-foreground">Sistema em perfeito funcionamento mecânico. Zero falhas.</p>
                            {/if}
                        </CardContent>
                    </Card>
                    <Card class="bg-emerald-500/5 border-emerald-500/20 shadow-none print-card-color">
                        <CardHeader class="pb-2 print:p-2 print:pb-1">
                            <CardTitle class="text-[10px] print:text-[8px] uppercase font-black tracking-widest text-emerald-500 flex items-center gap-2">
                                <Zap class="w-3.5 h-3.5 print:w-3 print:h-3" /> Edges Encontrados (Top Bônus)
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 print:space-y-1.5 print:p-2 print:pt-0">
                            {#each report.behavior.topPositiveImpacts as pos}
                                <div class="flex items-start justify-between border-b border-emerald-500/10 pb-2 print:pb-1 last:border-0 last:pb-0">
                                    <div class="pr-4 print:pr-2">
                                        <p class="text-xs print:text-[10px] font-bold text-foreground leading-tight">{pos.title}</p>
                                        <p class="text-[10px] print:text-[8px] text-muted-foreground leading-tight mt-0.5">{pos.description}</p>
                                    </div>
                                    <Badge variant="outline" class="text-emerald-500 border-emerald-500/30 rounded-sm font-mono shrink-0 print:px-1 print:py-0 print-badge-outline">+{pos.points}</Badge>
                                </div>
                            {/each}
                            {#if report.behavior.topPositiveImpacts.length === 0}
                                <p class="text-xs print:text-[9px] text-muted-foreground">Sem vantagens excepcionais contabilizadas.</p>
                            {/if}
                        </CardContent>
                    </Card>
                </div>
            {/if}
        </section>

        <!-- BLOCO 4: REFLEXÃO DO PÓS-MERCADO (DAILY REVIEWS) -->
        <section class="break-inside-avoid print-section pt-2 print:pt-0">
            <h2 class="text-xs print:text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 print:mb-1.5 flex items-center gap-2">
                <BookOpen class="w-4 h-4 print:w-3 print:h-3" /> 4. Diário & Reflexão Subjetiva
            </h2>

            {#if report.reflection.reviewCount === 0}
                <div class="p-8 text-center border border-dashed rounded-xl border-border/50 text-muted-foreground bg-muted/20">
                    Nenhum Daily Review encontrado na janela. É crucial formalizar o Pós-Mercado para evoluir.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2">
                    <Card class="bg-background/60 shadow-sm border-border/50 md:col-span-1 print-card flex flex-col justify-center">
                        <CardContent class="p-4 print:p-3 flex flex-col justify-center h-full">
                            <p class="text-[10px] print:text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-2 print:mb-1">Ritmo de Registro</p>
                            <div class="text-3xl print:text-xl font-black mb-1 print:mb-0 text-foreground">{report.reflection.reviewCount} <span class="text-sm print:text-[9px] font-medium text-muted-foreground tracking-normal">Reviews</span></div>
                            <div class="flex flex-col gap-1 print:gap-0 mt-3 print:mt-1">
                                <div class="flex items-center justify-between text-xs print:text-[9px]">
                                   <span class="text-emerald-500 font-bold">Good</span>
                                   <span class="font-mono text-muted-foreground">{report.reflection.distribution.good}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs print:text-[9px]">
                                   <span class="text-amber-500 font-bold">Neutral</span>
                                   <span class="font-mono text-muted-foreground">{report.reflection.distribution.neutral}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs print:text-[9px]">
                                   <span class="text-rose-500 font-bold">Bad</span>
                                   <span class="font-mono text-muted-foreground">{report.reflection.distribution.bad}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="bg-background/60 shadow-sm border-border/50 md:col-span-3 print-card">
                        <CardHeader class="pb-2 print:p-3 print:pb-1">
                            <CardTitle class="text-[10px] print:text-[8px] uppercase font-black tracking-widest text-muted-foreground">Extratos Relevantes do Diário</CardTitle>
                        </CardHeader>
                        <CardContent class="print:p-3 print:pt-0">
                            {#if report.reflection.relevantNotes.length === 0}
                                <p class="text-sm print:text-xs italic text-muted-foreground">As avaliações registradas não contêm textos extensos para análise qualitativa.</p>
                            {:else}
                                <div class="space-y-4 print:space-y-1.5">
                                    {#each report.reflection.relevantNotes as note}
                                        <div class="bg-muted/30 border-l-2 border-primary/40 p-3 print:p-1.5 print:px-2 text-sm print:text-[10px] italic text-foreground/80 leading-relaxed print:leading-tight rounded-r-md print-note">
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
            /* Margem mais fina para acomodar tudo em menos páginas */
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
