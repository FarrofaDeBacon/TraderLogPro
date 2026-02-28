<script lang="ts">
    import { onMount, tick } from "svelte";
    import { invoke } from "@tauri-apps/api/core";
    import { settingsStore } from "$lib/stores/settings.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import {
        ChevronRight,
        ChevronLeft,
        User,
        CheckCircle2,
        Rocket,
        Sparkles,
        Key,
        Upload,
        AlertCircle,
    } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import { fade, fly, slide, scale } from "svelte/transition";
    import { t, locale } from "svelte-i18n";
    import { open } from "@tauri-apps/plugin-dialog";
    import { readTextFile } from "@tauri-apps/plugin-fs";
    import { validateLicenseKey } from "$lib/utils/license";

    let { onComplete } = $props();

    let step = $state(1);
    let totalSteps = 4;
    let loading = $state(false);
    let progress = $state(0);

    let formData = $state({
        name: settingsStore.userProfile.name || "",
        email: settingsStore.userProfile.email || "",
        licenseKey: "",
    });

    // We keep a flag to determine if it's the test account
    let isTestAccount = $derived(
        formData.email.trim().toLowerCase() === "teste@traderlog.com" ||
            formData.email.trim().toLowerCase() === "test@traderlog.com",
    );

    let validatingLicense = $state(false);
    let licenseUploaded = $state(false);
    let licensePlanName = $state("");

    onMount(() => {
        console.log("[Wizard] Mounted. Fast onboarding initiated.");
    });

    async function handleLicenseUpload() {
        try {
            const selected = await open({
                multiple: false,
                filters: [
                    { name: "Licença TraderLog Pro", extensions: ["lic"] },
                ],
            });

            if (selected && typeof selected === "string") {
                validatingLicense = true;
                const text = await readTextFile(selected);
                const rawKey = text.trim();

                // Get customer ID to validate against
                let customerId = "";
                if (settingsStore.hardwareId) {
                    customerId = settingsStore.hardwareId;
                } else {
                    customerId = "temp-onboarding-id"; // fallback before saving
                }

                const result = await validateLicenseKey(rawKey, customerId);

                if (result.valid) {
                    formData.licenseKey = rawKey;
                    licenseUploaded = true;
                    licensePlanName = result.plan;
                    toast.success("Licença verificada com sucesso!");
                } else {
                    toast.error(
                        "Arquivo de licença inválido para esta máquina.",
                    );
                }
            }
        } catch (e) {
            console.error("License upload error:", e);
            toast.error("Erro ao ler arquivo de licença.");
        } finally {
            validatingLicense = false;
        }
    }

    async function handleComplete() {
        loading = true;
        progress = 10;

        try {
            // 1. Save Basic Profile
            await invoke("save_user_profile", {
                profile: {
                    ...settingsStore.userProfile,
                    name: formData.name || "Trader",
                    email: formData.email,
                    main_currency: "BRL",
                    language: "pt-BR",
                    theme: "dark",
                    license_key: formData.licenseKey || null,
                },
            });
            progress = 30;

            // Update store immediately
            settingsStore.userProfile.name = formData.name || "Trader";
            settingsStore.userProfile.email = formData.email;
            if (formData.licenseKey) {
                settingsStore.userProfile.license_key = formData.licenseKey;
                await settingsStore.refreshLicenseStatus();
            }

            // 2. Seeding Configuration Defaults
            await invoke("ensure_defaults");
            progress = 60;

            // 3. Demo Data (ONLY for test account)
            if (isTestAccount) {
                console.log(
                    "[Wizard] Test Account detected. Generating demo data...",
                );
                await invoke("seed_demo_data", {
                    modules: [
                        "account:real",
                        "account:simulador",
                        "markets:m1",
                    ],
                });
            }
            progress = 90;

            // 4. Complete Onboarding
            console.log("[Wizard] Completing onboarding in backend...");
            await invoke("complete_onboarding");
            progress = 100;

            toast.success("Configuração concluída!");
            settingsStore.userProfile.onboarding_completed = true;

            setTimeout(() => {
                loading = false;
                onComplete();
            }, 800);
        } catch (error) {
            console.error("Onboarding Error:", error);
            toast.error("Erro durante a configuração: " + (error as string));
            loading = false;
            progress = 0;
        }
    }

    function nextStep() {
        // Validation check for Step 2
        if (step === 2 && !formData.name.trim()) {
            toast.error("Por favor, informe seu nome.");
            return;
        }

        // At Step 3, if they didn't upload a license but clicked next, we can allow it as "Trial"
        // provided we want to allow trial mode.
        // For simplicity, we just move forward (settingsStore handles Trial assignment anyway).

        if (step < totalSteps) step++;
    }

    function prevStep() {
        if (step > 1) step--;
    }
</script>

<div
    class="fixed inset-0 z-50 bg-background flex items-center justify-center p-4"
>
    <div class="max-w-2xl w-full">
        <!-- Progress Header -->
        <div class="mb-8 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="bg-primary/10 p-2 rounded-lg">
                    <Rocket class="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 class="text-xl font-bold font-display tracking-tight">
                        TraderLog Pro
                    </h2>
                    <p
                        class="text-xs text-muted-foreground uppercase tracking-widest font-black"
                    >
                        Startup Wizard
                    </p>
                </div>
            </div>
            <div class="text-right">
                <span
                    class="text-xs font-bold text-muted-foreground uppercase tracking-widest"
                >
                    Passo {step} de {totalSteps}
                </span>
                <div
                    class="w-32 h-1.5 bg-muted rounded-full mt-1 overflow-hidden"
                >
                    <div
                        class="h-full bg-primary transition-all duration-500 ease-out"
                        style="width: {(step / totalSteps) * 100}%"
                    ></div>
                </div>
            </div>
        </div>

        <div class="relative min-h-[350px]">
            {#if step === 1}
                <!-- WELCOME STEP -->
                <div
                    in:fly={{ y: 20, duration: 500 }}
                    out:fade={{ duration: 200 }}
                    class="space-y-6"
                >
                    <div
                        class="flex flex-col items-center text-center space-y-4 py-8"
                    >
                        <div
                            class="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4"
                        >
                            <Sparkles
                                class="w-10 h-10 text-primary animate-pulse"
                            />
                        </div>
                        <h1 class="text-4xl font-black tracking-tighter">
                            {$t("setup.wizard.welcome.title")}
                        </h1>
                        <p class="text-muted-foreground text-lg max-w-md">
                            Estamos configurando o seu espaço de trabalho.
                        </p>
                    </div>
                </div>
            {:else if step === 2}
                <!-- PROFILE STEP -->
                <div
                    in:fly={{ y: 20, duration: 500 }}
                    out:fade={{ duration: 200 }}
                    class="space-y-6"
                >
                    <div class="space-y-2">
                        <h2
                            class="text-2xl font-black tracking-tight flex items-center gap-2"
                        >
                            <User class="w-6 h-6 text-primary" />
                            Gostaríamos de te conhecer
                        </h2>
                        <p class="text-muted-foreground">
                            Insira suas informações básicas para o perfil.
                        </p>
                    </div>

                    <div class="space-y-4 pt-4">
                        <div class="space-y-2">
                            <Label for="name" class="font-bold"
                                >Como devemos te chamar? *</Label
                            >
                            <Input
                                id="name"
                                bind:value={formData.name}
                                placeholder="Seu nome"
                                class="h-12 text-lg focus-visible:ring-primary"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="email" class="font-bold"
                                >E-mail ou Chave de Acesso</Label
                            >
                            <Input
                                id="email"
                                type="email"
                                bind:value={formData.email}
                                placeholder="email@exemplo.com"
                                class="h-12 text-lg focus-visible:ring-primary"
                            />
                            {#if isTestAccount}
                                <p
                                    class="text-xs font-bold text-emerald-500 flex items-center gap-1 mt-1"
                                >
                                    <CheckCircle2 class="w-3 h-3" /> Conta de Teste
                                    reconhecida. Dados de demonstração serão injetados.
                                </p>
                            {:else}
                                <p class="text-xs text-muted-foreground mt-1">
                                    Usado para recuperação ou vinculo de licença
                                    especial.
                                </p>
                            {/if}
                        </div>
                    </div>
                </div>
            {:else if step === 3}
                <!-- LICENSE STEP -->
                <div
                    in:fly={{ y: 20, duration: 500 }}
                    out:fade={{ duration: 200 }}
                    class="space-y-6"
                >
                    <div class="space-y-2">
                        <h2
                            class="text-2xl font-black tracking-tight flex items-center gap-2"
                        >
                            <Key class="w-6 h-6 text-primary" />
                            Ativação de Licença
                        </h2>
                        <p class="text-muted-foreground">
                            Se você possui uma Licença TraderLog Pro, selecione
                            o arquivo `.lic` agora.
                            <br /><span class="text-xs opacity-70"
                                >Opcional: Você pode pular este passo para usar
                                a versão Trial gratuita.</span
                            >
                        </p>
                    </div>

                    <div
                        class="p-6 border-2 rounded-2xl bg-muted/30 border-dashed flex flex-col items-center text-center space-y-4 pt-8"
                    >
                        {#if licenseUploaded}
                            <div class="bg-emerald-500/10 p-4 rounded-full">
                                <CheckCircle2
                                    class="w-10 h-10 text-emerald-500"
                                />
                            </div>
                            <h3 class="font-black text-xl text-emerald-500">
                                Licença Ativada!
                            </h3>
                            <p class="text-sm font-bold text-muted-foreground">
                                Plano detectado: {licensePlanName}
                            </p>
                        {:else}
                            <div class="bg-primary/10 p-4 rounded-full">
                                <Key class="w-10 h-10 text-primary" />
                            </div>
                            <h3 class="font-black text-xl">Importar Licença</h3>

                            <Button
                                variant="outline"
                                class="h-12 px-6 rounded-full border-primary/50 hover:bg-primary/10 font-bold"
                                disabled={validatingLicense}
                                onclick={handleLicenseUpload}
                            >
                                {#if validatingLicense}
                                    Verificando...
                                {:else}
                                    <Upload class="w-4 h-4 mr-2" />
                                    Selecionar Arquivo .lic
                                {/if}
                            </Button>
                        {/if}
                    </div>
                </div>
            {:else if step === 4}
                <!-- FINISH STEP -->
                <div
                    in:fly={{ y: 20, duration: 500 }}
                    out:fade={{ duration: 200 }}
                    class="space-y-8 flex flex-col items-center justify-center h-full"
                >
                    {#if !loading && progress === 0}
                        <div class="text-center space-y-4">
                            <div
                                class="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle2 class="w-12 h-12 text-primary" />
                            </div>
                            <h2 class="text-3xl font-black tracking-tight">
                                Tudo pronto, {formData.name.split(" ")[0]}!
                            </h2>
                            <p
                                class="text-muted-foreground text-lg max-w-sm mx-auto"
                            >
                                Clique no botão abaixo para concluir a
                                inicialização.
                            </p>
                            <Button
                                onclick={handleComplete}
                                class="h-16 px-12 text-xl font-bold rounded-full mt-8 shadow-xl shadow-primary/20"
                            >
                                Começar Agora
                            </Button>
                        </div>
                    {:else}
                        <!-- LOADING STATE -->
                        <div class="w-full space-y-8 text-center pt-8">
                            <div class="relative w-32 h-32 mx-auto">
                                <svg
                                    class="w-full h-full"
                                    viewBox="0 0 100 100"
                                >
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="8"
                                        class="text-muted"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="8"
                                        stroke-dasharray="283"
                                        stroke-dashoffset={283 -
                                            (283 * progress) / 100}
                                        class="text-primary transition-all duration-500 ease-out"
                                        transform="rotate(-90 50 50)"
                                    />
                                </svg>
                                <div
                                    class="absolute inset-0 flex items-center justify-center"
                                >
                                    <span class="text-2xl font-black"
                                        >{progress}%</span
                                    >
                                </div>
                            </div>
                            <div class="space-y-2">
                                <h3 class="text-xl font-bold animate-pulse">
                                    {#if progress < 30}
                                        Salvando Perfil...
                                    {:else if progress < 60}
                                        Iniciando Plataforma...
                                    {:else if progress < 90}
                                        {isTestAccount
                                            ? "Gerando Trades de Teste..."
                                            : "Configurando Banco de Dados..."}
                                    {:else}
                                        Finalizando tudo...
                                    {/if}
                                </h3>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Navigation Footer -->
        {#if !loading && progress !== 100}
            <div class="mt-12 flex justify-between items-center border-t pt-6">
                <!-- Back Button -->
                <Button
                    variant="ghost"
                    onclick={prevStep}
                    disabled={step === 1}
                    class="font-bold text-muted-foreground uppercase tracking-widest text-xs {step ===
                    1
                        ? 'opacity-0 pointer-events-none'
                        : ''}"
                >
                    <ChevronLeft class="w-4 h-4 mr-2" />
                    Voltar
                </Button>

                <!-- Next or Complete Button -->
                {#if step < totalSteps}
                    <Button
                        onclick={nextStep}
                        class="px-8 font-black uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                        {#if step === 3 && !licenseUploaded}
                            Pular Trial
                        {:else}
                            Próximo
                        {/if}
                        <ChevronRight class="w-4 h-4 ml-2" />
                    </Button>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    @keyframes pulse {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
    .animate-pulse {
        animation: pulse 2s infinite ease-in-out;
    }
</style>
