<script lang="ts">
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { tradesStore } from "$lib/stores/trades.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import QuickLog from "$lib/components/trades/QuickLog.svelte";
  import { CheckCircle2, Circle, ArrowRight, Zap, Lightbulb, Wallet, ShieldAlert, Rocket } from "lucide-svelte";
  import { cn } from "$lib/utils";

  // State derivation
  let hasAccount = $derived(accountsStore.accounts.length > 0);
  let hasProfile = $derived(riskSettingsStore.riskProfiles.length > 0);
  let hasPlan = $derived(riskSettingsStore.growthPlans.length > 0);

  // If the user has configured the 3 core pillars, they move to Step 4 (trade)
  // The system unlocks step continuously.
  let currentStep = $derived.by(() => {
     if (!hasAccount) return 1;
     if (!hasProfile) return 2;
     if (!hasPlan) return 3;
     return 4; // First trade
  });

  let completedStepsCount = $derived(
     (hasAccount ? 1 : 0) + (hasProfile ? 1 : 0) + (hasPlan ? 1 : 0)
  );
</script>

<div class="w-full max-w-2xl mx-auto mt-4 md:mt-12 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
   <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-4 ring-1 ring-emerald-500/20">
         <Lightbulb class="w-6 h-6 text-emerald-500" />
      </div>
      <h2 class="text-2xl md:text-3xl font-black tracking-tight text-foreground">Prepare seu Cockpit</h2>
      <p class="text-sm md:text-base text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
         Siga os 4 passos absolutos para blindar seu capital e destrancar os Radares Analíticos da sua Home.
      </p>
   </div>

   <div class="space-y-4">
      <!-- Step 1: Conta -->
      <Card.Root class={cn("relative overflow-hidden transition-all duration-300", currentStep === 1 ? "ring-2 ring-primary shadow-xl scale-[1.02]" : "opacity-60 grayscale-[50%]")}>
         <Card.Content class="p-6">
            <div class="flex items-center gap-4">
               {#if hasAccount}
                  <CheckCircle2 class="w-8 h-8 text-emerald-500 shrink-0" />
               {:else}
                  <Circle class="w-8 h-8 text-muted-foreground shrink-0" />
               {/if}
               <div class="flex-1">
                  <h3 class="font-bold flex items-center gap-2">
                     <Wallet class="w-4 h-4 text-primary" />
                     1. Crie sua Conta de Trading
                  </h3>
                  <p class="text-xs text-muted-foreground mt-1">Conecte o capital base (BRL ou USD) para rastrearmos o lucro.</p>
               </div>
               {#if currentStep === 1}
                  <Button href="/settings" class="shrink-0 group">
                     Avançar <ArrowRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
               {/if}
            </div>
         </Card.Content>
      </Card.Root>

      <!-- Step 2: Risk Profile -->
      <Card.Root class={cn("relative overflow-hidden transition-all duration-300", currentStep === 2 ? "ring-2 ring-primary shadow-xl scale-[1.02]" : "opacity-60 grayscale-[50%]")}>
         <Card.Content class="p-6">
            <div class="flex items-center gap-4">
               {#if hasProfile}
                  <CheckCircle2 class="w-8 h-8 text-emerald-500 shrink-0" />
               {:else}
                  <Circle class="w-8 h-8 text-muted-foreground shrink-0" />
               {/if}
               <div class="flex-1">
                  <h3 class="font-bold flex items-center gap-2">
                     <ShieldAlert class="w-4 h-4 text-rose-500" />
                     2. Determine seu Risco Máximo
                  </h3>
                  <p class="text-xs text-muted-foreground mt-1">Configure Limites Diários de Perda para ligar a Trava Comportamental.</p>
               </div>
               {#if currentStep === 2}
                  <Button href="/settings/risk" class="shrink-0 bg-rose-600 hover:bg-rose-700 group">
                     Defender Capital <ArrowRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
               {/if}
            </div>
         </Card.Content>
      </Card.Root>

      <!-- Step 3: Growth Plan -->
      <Card.Root class={cn("relative overflow-hidden transition-all duration-300", currentStep === 3 ? "ring-2 ring-primary shadow-xl scale-[1.02]" : "opacity-60 grayscale-[50%]")}>
         <Card.Content class="p-6">
            <div class="flex items-center gap-4">
               {#if hasPlan}
                  <CheckCircle2 class="w-8 h-8 text-emerald-500 shrink-0" />
               {:else}
                  <Circle class="w-8 h-8 text-muted-foreground shrink-0" />
               {/if}
               <div class="flex-1">
                  <h3 class="font-bold flex items-center gap-2">
                     <Rocket class="w-4 h-4 text-indigo-500" />
                     3. Estruture seu Plano de Alavancagem
                  </h3>
                  <p class="text-xs text-muted-foreground mt-1">Crie as Fases de Crescimento para aumentar os Lotes matematicamente.</p>
               </div>
               {#if currentStep === 3}
                  <Button href="/settings/risk/growth-plans" class="shrink-0 bg-indigo-600 hover:bg-indigo-700 group">
                     Montar Plano <ArrowRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
               {/if}
            </div>
         </Card.Content>
      </Card.Root>

      <!-- Step 4: First Trade (Integrated QuickLog) -->
      <Card.Root class={cn("relative overflow-hidden transition-all duration-500", currentStep === 4 ? "ring-2 ring-emerald-500 shadow-2xl scale-[1.02] bg-emerald-950/20" : "opacity-60 grayscale-[80%]")}>
         <Card.Content class="p-6">
            <div class="flex items-center gap-4 mb-4">
               <Circle class="w-8 h-8 text-muted-foreground shrink-0" />
               <div class="flex-1">
                  <h3 class="font-bold flex items-center gap-2 text-emerald-500">
                     <Zap class="w-4 h-4" />
                     4. Registre seu Primeiro Trade
                  </h3>
                  <p class="text-xs text-muted-foreground mt-1">Você está 100% blindado. Utilize o QuickLog abaixo para dar vida às estatísticas da Home.</p>
               </div>
            </div>
            
            {#if currentStep === 4}
               <div class="mt-4 animate-in slide-in-from-bottom-4">
                  <QuickLog />
               </div>
            {/if}
         </Card.Content>
      </Card.Root>
   </div>
</div>
