<script lang="ts">
  import {
    BarChart3,
    Trophy,
    BookOpen,
    ShieldAlert,
    Zap,
    Printer,
    FileText,
    Brain
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
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
  const formatReportDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

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
      // Pequeno timeout opcional para garantir que o CSS aplique caso haja delay (geralmente imediato).
      window.print();
  }

</script>

<div class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col min-h-full print-safe bg-background print:bg-white pb-24 font-sans text-slate-800 dark:text-slate-100 print:text-black">
    
    <!-- CABEÇALHO DA ROTA / DOCUMENTO -->
    <header class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b-2 border-slate-200 dark:border-slate-800 print:border-black gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <FileText class="w-6 h-6 text-slate-900 dark:text-slate-100 print:text-black" />
                <h1 class="text-2xl font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100 print:text-black">
                    Relatório de Performance Executiva
                </h1>
            </div>
            <p class="text-sm font-medium text-slate-500 print:text-gray-600 uppercase tracking-widest pl-9">
                Período Auditado: {formatReportDate(dateRanges.start)} a {formatReportDate(dateRanges.end)}
            </p>
        </div>
        
        <div class="flex items-center gap-3 no-print">
            <Select type="single" bind:value={selectedPeriod}>
                <SelectTrigger class="w-[180px] h-10 bg-background border-slate-300 dark:border-slate-700 text-xs font-bold uppercase tracking-wider">
                   {selectedPeriod === 'hoje' ? 'Hoje' : selectedPeriod === 'semana' ? 'Esta Semana' : selectedPeriod === 'mes' ? 'Este Mês' : 'Mês Passado'}
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Esta Semana</SelectItem>
                    <SelectItem value="mes">Este Mês</SelectItem>
                    <SelectItem value="mes_passado">Mês Passado</SelectItem>
                </SelectContent>
            </Select>

            <Button onclick={handlePrint} class="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-bold h-10 gap-2 shadow-sm rounded-sm">
                <Printer class="w-4 h-4" />
                Imprimir Documento
            </Button>
        </div>
    </header>

    <!-- CORPO DO RELATÓRIO -->
    <div class="space-y-8 print:space-y-10">
        
        <!-- SECÇÃO 1: ESTATÍSTICA FINANCEIRA -->
        <section class="break-inside-avoid">
            <h2 class="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2 print:text-black border-l-2 border-slate-300 print:border-black pl-2">
                <BarChart3 class="w-3.5 h-3.5" /> 1. Desempenho e Estatística Financeira
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="py-6 px-4 text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 print:border-gray-300 print:text-gray-600 bg-slate-50 dark:bg-slate-900 print:bg-transparent">
                    Não houve atividade operacional (Trades) no período selecionado.
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800 print:bg-black border border-slate-200 dark:border-slate-800 print:border-black">
                    <div class="bg-white dark:bg-slate-950 print:bg-white p-5">
                        <p class="text-[10px] font-bold text-slate-500 print:text-gray-500 uppercase tracking-widest mb-1">Lucro/Prejuízo Líquido</p>
                        <p class="text-2xl font-bold tracking-tight {report.summary.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'} print-highlight">
                            {formatCurrency(report.summary.totalPnL)}
                        </p>
                    </div>
                    <div class="bg-white dark:bg-slate-950 print:bg-white p-5">
                        <p class="text-[10px] font-bold text-slate-500 print:text-gray-500 uppercase tracking-widest mb-1">Win Rate Geral</p>
                        <p class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 print:text-black">
                            {(report.summary.winRate * 100).toFixed(1)}%
                        </p>
                    </div>
                    <div class="bg-white dark:bg-slate-950 print:bg-white p-5">
                        <p class="text-[10px] font-bold text-slate-500 print:text-gray-500 uppercase tracking-widest mb-1">Fator de Lucro (PF)</p>
                        <p class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 print:text-black">
                            {report.summary.profitFactor.toFixed(2)}
                        </p>
                    </div>
                    <div class="bg-white dark:bg-slate-950 print:bg-white p-5">
                        <p class="text-[10px] font-bold text-slate-500 print:text-gray-500 uppercase tracking-widest mb-1">Volume Operacional</p>
                        <p class="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 print:text-black mt-1">
                            {report.summary.tradeCount} <span class="text-[11px] font-medium text-slate-500">Trades</span>
                        </p>
                    </div>
                </div>
            {/if}
        </section>

        <!-- SECÇÃO 2: SCORE ESPECÍFICO E DISCIPLINA -->
        <section class="break-inside-avoid">
            <h2 class="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2 print:text-black border-l-2 border-slate-300 print:border-black pl-2">
                <Trophy class="w-3.5 h-3.5" /> 2. Auditoria Qualitativa & Gestão de Risco
            </h2>
            
            {#if report.summary.tradeCount === 0}
                <div class="py-6 px-4 text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 print:border-gray-300 print:text-gray-600 bg-slate-50 dark:bg-slate-900 print:bg-transparent">
                    Auditoria indisponível devido à ausência de operações no período.
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <!-- Master Score Card -->
                    <div class="lg:col-span-3 border border-slate-200 dark:border-slate-800 print:border-black bg-white dark:bg-slate-950 print:bg-white p-6 flex flex-col sm:flex-row items-center sm:items-start gap-8">
                        
                        <div class="text-center shrink-0 flex flex-col items-center">
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-black mb-3 text-center">Score da Janela</p>
                            <div class="w-24 h-24 rounded-full border-4 flex items-center justify-center 
                                {report.scoreAndDiscipline.windowScore >= 80 ? 'border-emerald-600 text-emerald-600' : report.scoreAndDiscipline.windowScore >= 50 ? 'border-amber-500 text-amber-500' : 'border-rose-600 text-rose-600'} 
                                print:border-black print:text-black bg-slate-50 dark:bg-slate-900 print:bg-white">
                                <span class="text-4xl font-black">{report.scoreAndDiscipline.windowScore.toFixed(0)}</span>
                            </div>
                        </div>
                        
                        <div class="flex-1 w-full flex flex-col justify-center">
                            <p class="text-xs text-slate-500 dark:text-slate-400 print:text-gray-600 mb-4 italic">Esta avaliação reflete exclusivamente o grau de disciplina e acurácia durante o período demarcado.</p>
                            <div class="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div class="border-b border-slate-100 dark:border-slate-800 print:border-gray-300 pb-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 print:text-gray-700">Dimensão Execução</span>
                                        <span class="font-bold text-sm text-slate-900 dark:text-slate-100 print:text-black">{report.scoreAndDiscipline.executionScore.toFixed(0)}/100</span>
                                    </div>
                                </div>
                                <div class="border-b border-slate-100 dark:border-slate-800 print:border-gray-300 pb-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 print:text-gray-700">Dimensão Risco (Furos)</span>
                                        <span class="font-bold text-sm text-slate-900 dark:text-slate-100 print:text-black">{report.scoreAndDiscipline.riskScore.toFixed(0)}/100</span>
                                    </div>
                                </div>
                                <div class="border-b border-slate-100 dark:border-slate-800 print:border-gray-300 pb-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 print:text-gray-700">Dimensão Comportamental</span>
                                        <span class="font-bold text-sm text-slate-900 dark:text-slate-100 print:text-black">{report.scoreAndDiscipline.behaviorScore.toFixed(0)}/100</span>
                                    </div>
                                </div>
                                <div class="border-b border-slate-100 dark:border-slate-800 print:border-gray-300 pb-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 print:text-gray-700">Dimensão Subjetiva</span>
                                        <span class="font-bold text-sm text-slate-900 dark:text-slate-100 print:text-black">{report.scoreAndDiscipline.psychoScore.toFixed(0)}/100</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fechamento das Streaks -->
                    <div class="border border-slate-200 dark:border-slate-800 print:border-black bg-slate-50 dark:bg-slate-900 print:bg-white p-5 flex flex-col justify-center">
                        <p class="text-[10px] uppercase font-bold tracking-widest text-slate-500 print:text-black mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 print:border-black">Streaks Resultantes</p>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 print:text-black">Disciplina Limpa</span>
                                <span class="font-bold text-xs text-slate-900 dark:text-slate-100 print:text-black bg-white dark:bg-slate-950 print:bg-gray-100 border border-slate-200 print:border-black px-2 py-0.5">{report.scoreAndDiscipline.streaks.discipline}d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 print:text-black">Controle Emocional</span>
                                <span class="font-bold text-xs text-slate-900 dark:text-slate-100 print:text-black bg-white dark:bg-slate-950 print:bg-gray-100 border border-slate-200 print:border-black px-2 py-0.5">{report.scoreAndDiscipline.streaks.emotionalControl}d</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 print:text-black">Prevenção a Tilt</span>
                                <span class="font-bold text-xs text-slate-900 dark:text-slate-100 print:text-black bg-white dark:bg-slate-950 print:bg-gray-100 border border-slate-200 print:border-black px-2 py-0.5">{report.scoreAndDiscipline.streaks.noTilt}d</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <!-- SECÇÃO 3: AUDITORIA DE OFENSORES E EDGES -->
        <section class="break-inside-avoid">
            <h2 class="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2 print:text-black border-l-2 border-slate-300 print:border-black pl-2">
                <Brain class="w-3.5 h-3.5" /> 3. Matriz de Comportamento
            </h2>
            
            {#if report.behavior.topNegativeImpacts.length === 0 && report.behavior.topPositiveImpacts.length === 0}
                <div class="py-6 px-4 text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 print:border-gray-300 print:text-gray-600 bg-slate-50 dark:bg-slate-900 print:bg-transparent">
                    Nenhum comportamento mecânico desviante foi detectado. Rotação neutra.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-slate-200 dark:border-slate-800 print:border-black bg-white dark:bg-slate-950 print:bg-white p-5">
                        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 print:border-gray-200">
                            <ShieldAlert class="w-4 h-4 text-rose-600 dark:text-rose-500 print:text-black" />
                            <h3 class="text-[10px] uppercase font-bold tracking-widest text-rose-600 dark:text-rose-500 print:text-black">Ofensores Críticos (Alto Risco)</h3>
                        </div>
                        <div class="space-y-4">
                            {#each report.behavior.topNegativeImpacts as neg}
                                <div class="flex items-start justify-between group">
                                    <div class="pr-5">
                                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-black">{neg.title}</p>
                                        <p class="text-xs text-slate-600 dark:text-slate-400 print:text-gray-700 mt-1">{neg.description}</p>
                                    </div>
                                    <div class="text-xs font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 print:bg-transparent print:text-black print:border print:border-black px-2 py-1 rounded-sm shrink-0">
                                        {neg.points} pt
                                    </div>
                                </div>
                            {/each}
                            {#if report.behavior.topNegativeImpacts.length === 0}
                                <p class="text-xs font-semibold text-slate-500 print:text-gray-600">Nenhuma infração sistêmica registrada.</p>
                            {/if}
                        </div>
                    </div>

                    <div class="border border-slate-200 dark:border-slate-800 print:border-black bg-white dark:bg-slate-950 print:bg-white p-5">
                        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 print:border-gray-200">
                            <Zap class="w-4 h-4 text-emerald-600 dark:text-emerald-500 print:text-black" />
                            <h3 class="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-500 print:text-black">Padrões Positivos (Edges)</h3>
                        </div>
                        <div class="space-y-4">
                            {#each report.behavior.topPositiveImpacts as pos}
                                <div class="flex items-start justify-between group">
                                    <div class="pr-5">
                                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-black">{pos.title}</p>
                                        <p class="text-xs text-slate-600 dark:text-slate-400 print:text-gray-700 mt-1">{pos.description}</p>
                                    </div>
                                    <div class="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 print:bg-transparent print:text-black print:border print:border-black px-2 py-1 rounded-sm shrink-0">
                                        +{pos.points} pt
                                    </div>
                                </div>
                            {/each}
                            {#if report.behavior.topPositiveImpacts.length === 0}
                                <p class="text-xs font-semibold text-slate-500 print:text-gray-600">Nenhum evento formador de Vantagem Positiva validado.</p>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <!-- SECÇÃO 4: POST-MERCADO -->
        <section class="break-inside-avoid">
            <h2 class="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2 print:text-black border-l-2 border-slate-300 print:border-black pl-2">
                <BookOpen class="w-3.5 h-3.5" /> 4. Notas e Pós-Mercado
            </h2>

            {#if report.reflection.reviewCount === 0}
                <div class="py-6 px-4 text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 print:border-gray-300 print:text-gray-600 bg-slate-50 dark:bg-slate-900 print:bg-transparent">
                    Nenhum "Daily Review" preenchido neste período. O arquivo oficial carece de reflexões manuais.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="md:col-span-1 border border-slate-200 dark:border-slate-800 print:border-black bg-white dark:bg-slate-950 print:bg-white p-5 flex flex-col justify-center">
                        <p class="text-[10px] font-bold text-slate-500 print:text-black uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-800 print:border-gray-300 pb-2">Distribuição D/R</p>
                        <div class="text-4xl font-black text-slate-900 dark:text-slate-100 print:text-black">{report.reflection.reviewCount} <span class="text-xs font-bold text-slate-500 print:text-gray-600 uppercase tracking-widest block mt-1">Sessões Lidas</span></div>
                        <div class="mt-5 space-y-2">
                            <div class="flex items-center justify-between text-xs font-semibold">
                               <span class="text-emerald-600 print:text-black">Plano Seguido (Good)</span>
                               <span class="text-slate-900 dark:text-slate-100 print:text-black">{report.reflection.distribution.good}</span>
                            </div>
                            <div class="flex items-center justify-between text-xs font-semibold">
                               <span class="text-amber-600 print:text-black">Oscilação (Neutral)</span>
                               <span class="text-slate-900 dark:text-slate-100 print:text-black">{report.reflection.distribution.neutral}</span>
                            </div>
                            <div class="flex items-center justify-between text-xs font-semibold">
                               <span class="text-rose-600 print:text-black">Quebra Crítica (Bad)</span>
                               <span class="text-slate-900 dark:text-slate-100 print:text-black">{report.reflection.distribution.bad}</span>
                            </div>
                        </div>
                    </div>

                    <div class="md:col-span-3 border border-slate-200 dark:border-slate-800 print:border-black bg-slate-50 dark:bg-slate-900 print:bg-white p-5">
                        <p class="text-[10px] uppercase font-bold tracking-widest text-slate-500 print:text-black mb-4 border-b border-slate-200 dark:border-slate-700 print:border-gray-300 pb-2">Destituídas Relevantes do Diário</p>
                        {#if report.reflection.relevantNotes.length === 0}
                            <p class="text-sm italic text-slate-500 print:text-gray-500">As avaliações estão presentes materialmente, mas carecem de extensões textuais ou notas discursivas aptas para extração.</p>
                        {:else}
                            <div class="space-y-4">
                                {#each report.reflection.relevantNotes as note}
                                    <div class="bg-white dark:bg-slate-950 print:bg-transparent border-l-4 border-slate-400 print:border-black p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif italic print:text-black">
                                        "{note}"
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </section>

    </div>
</div>

<style>
    @media print {
        @page {
            /* Deixa uma margem controlável e informa o utilizador sobre remover Header/Footer nas configs do Browser */
            margin: 1.5cm;
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

        .print-safe {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
        }

        .break-inside-avoid {
            page-break-inside: avoid;
        }
    }
</style>
<!-- Trigger HMR -->
