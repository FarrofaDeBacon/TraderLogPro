<script lang="ts">
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { tradesStore } from "$lib/stores/trades.svelte";
  import { Button } from "$lib/components/ui/button";
  import { SystemCard, SystemHeader } from "$lib/components/ui/system";
  import QuickLog from "$lib/components/trades/QuickLog.svelte";
  import { CheckCircle2, Circle, ArrowRight, Zap, Lightbulb, Wallet, ShieldAlert, Rocket } from "lucide-svelte";
  import { cn } from "$lib/utils";
  import { t } from "svelte-i18n";

  // State derivation
  let hasAccount = $derived(accountsStore.accounts.length > 0);
  let hasProfile = $derived(riskSettingsStore.riskProfiles.length > 0);
  let hasPlan = $derived(riskSettingsStore.growthPlans.length > 0);

  // Derivação do passo atual
  let currentStep = $derived.by(() => {
     if (!hasAccount) return 1;
     if (!hasProfile) return 2;
     if (!hasPlan) return 3;
     return 4; // Primeiro trade
  });
</script>

<div class="w-full max-w-2xl mx-auto mt-4 md:mt-12 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
   <SystemCard status="primary" class="p-4 mb-10 bg-primary/5">
      <SystemHeader 
         title={$t("dashboard.onboarding_wizard.title")}
         subtitle={$t("dashboard.onboarding_wizard.subtitle")}
         icon={Lightbulb}
         variant="page"
         class="mb-0"
      />
   </SystemCard>

   <div class="space-y-4">
      <!-- Step 1: Conta -->
      <SystemCard 
         status={hasAccount ? "success" : currentStep === 1 ? "primary" : "info"}
         class={cn("transition-all duration-300", currentStep === 1 ? "ring-2 ring-primary scale-[1.02]" : "opacity-60")}
      >
         <div class="p-5">
            <div class="flex items-center gap-5">
               <div class="shrink-0 bg-background/40 p-2 rounded-xl border border-border/20 shadow-inner">
                  {#if hasAccount}
                     <CheckCircle2 class="w-6 h-6 text-emerald-500" />
                  {:else}
                     <div class="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[10px] font-black text-muted-foreground/40">1</div>
                  {/if}
               </div>
               <div class="flex-1">
                  <SystemHeader 
                     title={$t("dashboard.onboarding_wizard.step1.title")}
                     subtitle={$t("dashboard.onboarding_wizard.step1.subtitle")}
                     variant="compact"
                     class="mb-0"
                  />
               </div>
               {#if currentStep === 1}
                  <Button href="/settings" size="sm" class="shrink-0 group bg-primary font-black uppercase tracking-widest text-[10px] h-8 px-4">
                     {$t("dashboard.onboarding_wizard.step1.action")} <ArrowRight class="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
               {/if}
            </div>
         </div>
      </SystemCard>

      <!-- Step 2: Risk Profile -->
      <SystemCard 
         status={hasProfile ? "success" : currentStep === 2 ? "danger" : "info"}
         class={cn("transition-all duration-300", currentStep === 2 ? "ring-2 ring-rose-500 scale-[1.02]" : "opacity-60")}
      >
         <div class="p-5">
            <div class="flex items-center gap-5">
               <div class="shrink-0 bg-background/40 p-2 rounded-xl border border-border/20 shadow-inner">
                  {#if hasProfile}
                     <CheckCircle2 class="w-6 h-6 text-emerald-500" />
                  {:else}
                     <div class="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[10px] font-black text-muted-foreground/40">2</div>
                  {/if}
               </div>
               <div class="flex-1">
                  <SystemHeader 
                     title={$t("dashboard.onboarding_wizard.step2.title")}
                     subtitle={$t("dashboard.onboarding_wizard.step2.subtitle")}
                     variant="compact"
                     class="mb-0"
                  />
               </div>
               {#if currentStep === 2}
                  <Button href="/settings/risk" size="sm" class="shrink-0 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-[10px] h-8 px-4 group">
                     {$t("dashboard.onboarding_wizard.step2.action")} <ArrowRight class="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
               {/if}
            </div>
         </div>
      </SystemCard>

      <!-- Step 3: Growth Plan -->
      <SystemCard 
         status={hasPlan ? "success" : currentStep === 3 ? "warning" : "info"}
         class={cn("transition-all duration-300", currentStep === 3 ? "ring-2 ring-indigo-500 scale-[1.02]" : "opacity-60")}
      >
         <div class="p-5">
            <div class="flex items-center gap-5">
               <div class="shrink-0 bg-background/40 p-2 rounded-xl border border-border/20 shadow-inner">
                  {#if hasPlan}
                     <CheckCircle2 class="w-6 h-6 text-emerald-500" />
                  {:else}
                     <div class="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[10px] font-black text-muted-foreground/40">3</div>
                  {/if}
               </div>
               <div class="flex-1">
                  <SystemHeader 
                     title={$t("dashboard.onboarding_wizard.step3.title")}
                     subtitle={$t("dashboard.onboarding_wizard.step3.subtitle")}
                     variant="compact"
                     class="mb-0"
                  />
               </div>
               {#if currentStep === 3}
                  <Button href="/settings/risk/growth-plans" size="sm" class="shrink-0 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] h-8 px-4 group">
                     {$t("dashboard.onboarding_wizard.step3.action")} <ArrowRight class="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
               {/if}
            </div>
         </div>
      </SystemCard>

      <!-- Step 4: First Trade -->
      <SystemCard 
         status={currentStep === 4 ? "success" : "info"}
         class={cn("transition-all duration-500", currentStep === 4 ? "ring-2 ring-emerald-500 scale-[1.02] bg-emerald-500/5" : "opacity-60")}
      >
         <div class="p-5">
            <div class="flex items-center gap-5 mb-5">
               <div class="shrink-0 bg-background/40 p-2 rounded-xl border border-border/20 shadow-inner text-emerald-500">
                  <Zap class="w-6 h-6" />
               </div>
               <div class="flex-1">
                  <SystemHeader 
                     title={$t("dashboard.onboarding_wizard.step4.title")}
                     subtitle={$t("dashboard.onboarding_wizard.step4.subtitle")}
                     variant="compact"
                     class="mb-0"
                  />
               </div>
            </div>
            
            {#if currentStep === 4}
               <div class="mt-4 animate-in slide-in-from-bottom-4 bg-background/40 p-4 rounded-xl border border-border/40 backdrop-blur-sm shadow-inner">
                  <QuickLog />
               </div>
            {/if}
         </div>
      </SystemCard>
   </div>
</div>
