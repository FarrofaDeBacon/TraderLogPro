<script lang="ts">
    import { userProfileStore } from "$lib/stores/user-profile.svelte";
    import { TriangleAlert, Lock, ExternalLink, ShieldCheck, Mail, Loader2 } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import SystemCard from "$lib/components/ui/system/SystemCard.svelte";
    import { t } from "svelte-i18n";
    import { fade, scale } from "svelte/transition";
    import { toast } from "svelte-sonner";

    const HOTMART_URL = "https://hotmart.com/traderlogpro-placeholder"; // Placeholder

    let email = $state(userProfileStore.userProfile.email || "");
    let isActivating = $state(false);

    // Links de Checkout (Substitua pelos seus links reais)
    const CHECKOUT_ANNUAL = "https://pay.hotmart.com/ID_OFERTA_ANUAL";
    const CHECKOUT_LIFETIME = "https://pay.hotmart.com/ID_OFERTA_VITALICIO";

    function getCheckoutUrl(baseUrl: string) {
        const cleanEmail = email.trim();
        if (!cleanEmail) return baseUrl;
        const separator = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${separator}email=${encodeURIComponent(cleanEmail)}`;
    }

    async function handleActivate() {
        if (!email || !email.includes("@")) {
            toast.error($t("license.blocker.invalidEmail"));
            return;
        }

        isActivating = true;
        try {
            const res = await userProfileStore.activateOnline(email);
            if (res.success) {
                toast.success($t("license.blocker.activatedSuccess"));
            } else {
                toast.error(res.error || $t("license.blocker.activatedError"));
            }
        } finally {
            isActivating = false;
        }
    }
</script>

<div
    class="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
    in:fade={{ duration: 400 }}
>
    <!-- Background Decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px]"></div>
    </div>

    <div class="w-full max-w-4xl relative z-10" in:scale={{ start: 0.95, duration: 400, delay: 100 }}>
        <SystemCard>
            <div class="p-8 md:p-12 space-y-10">
                <!-- Header -->
                <div class="flex flex-col items-center text-center space-y-4">
                    <div class="w-20 h-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center border border-destructive/20 relative">
                        <Lock class="w-10 h-10 text-destructive" />
                        {#if userProfileStore.licenseStatus === 'expired'}
                            <div class="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                Expired
                            </div>
                        {:else}
                            <div class="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                Trial
                            </div>
                        {/if}
                    </div>
                    
                    <div class="space-y-2">
                        <h1 class="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
                            {#if userProfileStore.userProfile.in_guarantee}
                                Pagamento Confirmado!
                            {:else}
                                {$t("license.blocker.title")}
                            {/if}
                        </h1>
                        <p class="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                            {#if userProfileStore.userProfile.in_guarantee}
                                <span class="text-emerald-500 font-bold block mb-2">OPÇÃO A: Sua licença definitiva será liberada após o período de garantia (7 dias).</span>
                                Enquanto isso, o seu acesso está totalmente liberado via servidor.
                            {:else}
                                {$t("license.blocker.description")}
                            {/if}
                        </p>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-8">
                    <!-- Step 01: Escolher Plano -->
                    <div class="space-y-6">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black text-[10px] font-black">01</span>
                            <h3 class="text-xs font-black uppercase tracking-widest text-slate-300">Escolha seu Plano</h3>
                        </div>

                        <div class="grid grid-cols-1 gap-4">
                            <!-- Plano Anual -->
                            <a 
                                href={getCheckoutUrl(CHECKOUT_ANNUAL)} 
                                target="_blank"
                                class="group relative flex flex-col p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-emerald-500/50 transition-all overflow-hidden"
                            >
                                <div class="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div class="flex justify-between items-start relative z-10">
                                    <div>
                                        <p class="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Tradicional</p>
                                        <h4 class="text-xl font-black uppercase tracking-tighter">Faturamento Anual</h4>
                                    </div>
                                    <ExternalLink class="w-4 h-4 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <p class="text-[11px] text-slate-400 mt-2 relative z-10">Ideal para traders focados em consistência.</p>
                                <div class="mt-4 flex items-baseline gap-1 relative z-10">
                                    <span class="text-xs font-bold text-slate-500">R$</span>
                                    <span class="text-2xl font-black tracking-tighter">99</span>
                                    <span class="text-[10px] font-bold text-slate-500">/ano</span>
                                </div>
                            </a>

                            <!-- Plano Vitalício -->
                            <a 
                                href={getCheckoutUrl(CHECKOUT_LIFETIME)} 
                                target="_blank"
                                class="group relative flex flex-col p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/50 transition-all overflow-hidden"
                            >
                                <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div class="flex justify-between items-start relative z-10">
                                    <div>
                                        <p class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Legacy</p>
                                        <h4 class="text-xl font-black uppercase tracking-tighter">Acesso Vitalício</h4>
                                    </div>
                                    <ExternalLink class="w-4 h-4 text-slate-500 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <p class="text-[11px] text-slate-400 mt-2 relative z-10">Pagamento único para acesso para toda a vida.</p>
                                <div class="mt-4 flex items-baseline gap-1 relative z-10">
                                    <span class="text-xs font-bold text-slate-500">R$</span>
                                    <span class="text-2xl font-black tracking-tighter">499</span>
                                    <span class="text-[10px] font-bold text-slate-500">/único</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    <!-- Step 02: Ativação Digital -->
                    <div class="space-y-6">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-black text-[10px] font-black">02</span>
                            <h3 class="text-xs font-black uppercase tracking-widest text-slate-300">Ativação Digital</h3>
                        </div>

                        <div class="bg-white/5 p-8 rounded-[2rem] border border-white/5 space-y-6">
                            <div class="space-y-2 text-left">
                                <Label class="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-500">Insira o e-mail da compra</Label>
                                <div class="relative">
                                    <Input
                                        bind:value={email}
                                        placeholder="seu@email.com"
                                        class="h-14 rounded-full px-6 bg-black/40 border-white/10 focus:border-blue-500/50 transition-all text-sm font-bold"
                                        disabled={isActivating}
                                    />
                                    <Mail class="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                </div>
                            </div>

                            <Button
                                class="w-full h-16 rounded-full bg-white text-black hover:bg-slate-200 font-black uppercase tracking-widest text-xs transition-all flex gap-3 shadow-xl"
                                onclick={handleActivate}
                                disabled={isActivating || !email}
                            >
                                {#if isActivating}
                                    <Loader2 class="w-5 h-5 animate-spin" />
                                    Processando...
                                {:else}
                                    <ShieldCheck class="w-5 h-5" />
                                    Ativar Terminal Agora
                                {/if}
                            </Button>

                            <p class="text-center text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                A ativação é instantânea após o processamento da Hotmart.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Footer Info -->
                <div class="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div class="flex items-center gap-4 group cursor-help">
                        <div class="p-3 bg-slate-500/10 rounded-2xl border border-white/5 group-hover:bg-slate-500/20 transition-colors">
                            <TriangleAlert class="w-5 h-5 text-slate-400" />
                        </div>
                        <div class="text-left">
                            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Machine Hardware Signature</p>
                            <p class="text-[13px] font-mono font-black text-slate-300 tracking-tighter">{userProfileStore.hardwareId || '---'}</p>
                        </div>
                    </div>
                    
                    <div class="text-right">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                            TraderLog Pro Engine v5.1
                        </p>
                        <p class="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                            Built for Precision. Codified for Growth.
                        </p>
                    </div>
                </div>
            </div>
        </SystemCard>
    </div>
</div>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>
