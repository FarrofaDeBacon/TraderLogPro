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
    import * as Select from "$lib/components/ui/select";
    import { open } from "@tauri-apps/plugin-dialog";
    import { readTextFile } from "@tauri-apps/plugin-fs";
    import { validateLicenseKey } from "$lib/utils/license";

    let { onComplete } = $props();

    let step = $state(1);
    let totalSteps = 5;

    const LANGUAGES = [
        { value: "pt-BR", label: "🇧🇷 Português (BR)" },
        { value: "en", label: "🇺🇸 English" },
        { value: "es-ES", label: "🇪🇸 Español" },
        { value: "fr-FR", label: "🇫🇷 Français" },
    ];

    let selectedLanguage = $state($locale || "pt-BR");

    function applyLanguage(lang: string) {
        selectedLanguage = lang;
        locale.set(lang);
        localStorage.setItem("locale", lang);
    }
    let loading = $state(false);
    let progress = $state(0);

    let formData = $state({
        name: settingsStore.userProfile.name || "",
        email: settingsStore.userProfile.email || "",
        password: "",
        confirmPassword: "",
        licenseKey: "",
    });

    let recoveryKey = $state("");

    function generateKey() {
        // Simple grouped alphanumeric key
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";
        for (let i = 0; i < 16; i++) {
            if (i > 0 && i % 4 === 0) result += "-";
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

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
                    password_hash: formData.password, // Plaintext to backend which hashes it
                    recovery_hash: recoveryKey, // Plaintext to backend which hashes it
                    license_key: formData.licenseKey || null,
                },
            });
            progress = 30;

            // Log in the user in the frontend store
            localStorage.setItem("isLoggedIn", "true");
            settingsStore.isLoggedIn = true;
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
        if (step === 2) {
            if (!formData.name.trim()) {
                toast.error("Por favor, informe seu nome.");
                return;
            }
            if (!isTestAccount) {
                if (!formData.password) {
                    toast.error("Por favor, defina uma senha de acesso.");
                    return;
                }
                if (formData.password !== formData.confirmPassword) {
                    toast.error("As senhas não coincidem.");
                    return;
                }
                if (!recoveryKey) {
                    recoveryKey = generateKey();
                }
            }
        }

        // At Step 4 (License), if they didn't upload a license but clicked next, we can allow it as "Trial"
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
                        Setup Wizard
                    </p>
                </div>
            </div>
            <div class="text-right">
                <span
                    class="text-xs font-bold text-muted-foreground uppercase tracking-widest"
                >
                    {$t("setup.wizard.step")}
                    {step} / {totalSteps}
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
                <!-- LANGUAGE + WELCOME STEP: Language selector is first! -->
                <div
                    in:fly={{ y: 20, duration: 500 }}
                    out:fade={{ duration: 200 }}
                    class="space-y-6"
                >
                    <!-- Language Selector FIRST - before any translated text -->
                    <div class="w-full">
                        <p
                            class="text-xs font-black uppercase tracking-widest text-center text-muted-foreground mb-3"
                        >
                            🌐 Language / Idioma / Langue / Idioma
                        </p>
                        <div class="grid grid-cols-4 gap-2">
                            {#each LANGUAGES as lang}
                                <button
                                    type="button"
                                    onclick={() => applyLanguage(lang.value)}
                                    class="px-2 py-3 rounded-xl border text-sm font-bold transition-all duration-200 {selectedLanguage ===
                                    lang.value
                                        ? 'border-primary bg-primary/20 text-primary shadow-lg shadow-primary/20'
                                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700/50'}"
                                >
                                    {lang.label}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Welcome text AFTER language selector -->
                    <div
                        class="flex flex-col items-center text-center space-y-3 py-4"
                    >
                        <div
                            class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center"
                        >
                            <Sparkles
                                class="w-8 h-8 text-primary animate-pulse"
                            />
                        </div>
                        <h1 class="text-3xl font-black tracking-tighter">
                            {$t("setup.wizard.welcome.title")}
                        </h1>
                        <p class="text-muted-foreground text-base max-w-md">
                            {$t("setup.wizard.welcome.description")}
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
                            {$t("setup.wizard.profile.title")}
                        </h2>
                        <p class="text-muted-foreground">
                            {$t("setup.wizard.profile.description")}
                        </p>
                    </div>

                    <div class="space-y-4 pt-4">
                        <div class="space-y-2">
                            <Label for="name" class="font-bold"
                                >{$t("setup.wizard.profile.nameLabel")} *</Label
                            >
                            <Input
                                id="name"
                                bind:value={formData.name}
                                placeholder={$t(
                                    "setup.wizard.profile.namePlaceholder",
                                )}
                                class="h-12 text-lg focus-visible:ring-primary"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="email" class="font-bold"
                                >{$t("setup.wizard.profile.emailLabel")}</Label
                            >
                            <Input
                                id="email"
                                type="email"
                                bind:value={formData.email}
                                placeholder="email@example.com"
                                class="h-12 text-lg focus-visible:ring-primary"
                            />
                            {#if isTestAccount}
                                <p
                                    class="text-xs font-bold text-emerald-500 flex items-center gap-1 mt-1"
                                >
                                    <CheckCircle2 class="w-3 h-3" />
                                    {$t("setup.wizard.profile.testAccount")}
                                </p>
                            {:else}
                                <p class="text-xs text-muted-foreground mt-1">
                                    {$t("setup.wizard.profile.emailHint")}
                                </p>
                            {/if}
                        </div>
                    </div>

                    <!-- Password Configuration for App Security -->
                    <div class="space-y-4 pt-4 border-t border-zinc-800">
                        <div class="space-y-2">
                            <Label
                                for="password"
                                class="font-bold text-emerald-400"
                                >{$t(
                                    "setup.wizard.profile.passwordLabel",
                                )}</Label
                            >
                            <Input
                                id="password"
                                type="password"
                                bind:value={formData.password}
                                placeholder={$t(
                                    "setup.wizard.profile.passwordPlaceholder",
                                )}
                                class="h-12 text-lg focus-visible:ring-primary"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label
                                for="confirmPassword"
                                class="font-bold text-emerald-400"
                                >{$t(
                                    "setup.wizard.profile.confirmPasswordLabel",
                                )}</Label
                            >
                            <Input
                                id="confirmPassword"
                                type="password"
                                bind:value={formData.confirmPassword}
                                placeholder={$t(
                                    "setup.wizard.profile.confirmPasswordPlaceholder",
                                )}
                                class="h-12 text-lg focus-visible:ring-primary"
                            />
                        </div>
                    </div>
                </div>
            {:else if step === 3}
                <!-- RECOVERY KEY STEP -->
                <div
                    in:fly={{ y: 20, duration: 500 }}
                    out:fade={{ duration: 200 }}
                    class="space-y-6"
                >
                    <div class="space-y-2">
                        <h2
                            class="text-2xl font-black tracking-tight flex items-center gap-2 text-rose-500"
                        >
                            <AlertCircle class="w-6 h-6 text-rose-500" />
                            {$t("setup.wizard.recovery.title")}
                        </h2>
                        <p class="text-muted-foreground text-sm">
                            {$t("setup.wizard.recovery.description")}
                        </p>
                    </div>

                    <div
                        class="p-6 border border-rose-500/30 rounded-2xl bg-rose-500/5 flex flex-col items-center text-center space-y-4 mt-4 cursor-pointer hover:border-rose-500/60 transition-colors"
                        onclick={() => {
                            navigator.clipboard.writeText(recoveryKey);
                            toast.success($t("setup.wizard.recovery.copied"));
                        }}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) =>
                            e.key === "Enter" &&
                            navigator.clipboard.writeText(recoveryKey)}
                    >
                        <p
                            class="text-xs font-black uppercase tracking-widest text-rose-400 mb-2"
                        >
                            {$t("setup.wizard.recovery.keyLabel")}
                        </p>
                        <div
                            class="text-2xl font-mono font-black tracking-widest text-white selection:bg-rose-500"
                        >
                            {recoveryKey}
                        </div>
                        <p class="text-xs text-rose-400 mt-2">
                            {$t("setup.wizard.recovery.clickToCopy")}
                        </p>
                    </div>

                    <div
                        class="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl mt-4"
                    >
                        <p class="text-xs text-zinc-400 font-bold flex gap-2">
                            <span
                                class="text-rose-500 text-lg leading-none mt-[-2px]"
                                >!</span
                            >
                            {$t("setup.wizard.recovery.warning")}
                        </p>
                    </div>
                </div>
            {:else if step === 4}
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
                            {$t("setup.wizard.license.title")}
                        </h2>
                        <p class="text-muted-foreground">
                            {$t("setup.wizard.license.description")}
                            <br /><span class="text-xs opacity-70"
                                >{$t("setup.wizard.license.optional")}</span
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
                                {$t("setup.wizard.license.activated")}
                            </h3>
                            <p class="text-sm font-bold text-muted-foreground">
                                {$t("setup.wizard.license.planDetected")}: {licensePlanName}
                            </p>
                        {:else}
                            <div class="bg-primary/10 p-4 rounded-full">
                                <Key class="w-10 h-10 text-primary" />
                            </div>
                            <h3 class="font-black text-xl">
                                {$t("setup.wizard.license.import")}
                            </h3>

                            <Button
                                variant="outline"
                                class="h-12 px-6 rounded-full border-primary/50 hover:bg-primary/10 font-bold"
                                disabled={validatingLicense}
                                onclick={handleLicenseUpload}
                            >
                                {#if validatingLicense}
                                    {$t("setup.wizard.license.verifying")}
                                {:else}
                                    <Upload class="w-4 h-4 mr-2" />
                                    {$t("setup.wizard.license.selectFile")}
                                {/if}
                            </Button>
                        {/if}
                    </div>
                </div>
            {:else if step === 5}
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
                                {$t("setup.wizard.finish.ready")}, {formData.name.split(
                                    " ",
                                )[0]}!
                            </h2>
                            <p
                                class="text-muted-foreground text-lg max-w-sm mx-auto"
                            >
                                {$t("setup.wizard.finish.description")}
                            </p>
                            <Button
                                onclick={handleComplete}
                                class="h-16 px-12 text-xl font-bold rounded-full mt-8 shadow-xl shadow-primary/20"
                            >
                                {$t("setup.wizard.finish.startNow")}
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
                                        {$t(
                                            "setup.wizard.finish.savingProfile",
                                        )}
                                    {:else if progress < 60}
                                        {$t(
                                            "setup.wizard.finish.startingPlatform",
                                        )}
                                    {:else if progress < 90}
                                        {isTestAccount
                                            ? $t(
                                                  "setup.wizard.finish.generatingDemo",
                                              )
                                            : $t(
                                                  "setup.wizard.finish.configuringDb",
                                              )}
                                    {:else}
                                        {$t("setup.wizard.finish.finalizing")}
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
                    {$t("setup.wizard.nav.back")}
                </Button>

                <!-- Next or Complete Button -->
                {#if step < totalSteps}
                    <Button
                        onclick={nextStep}
                        class="px-8 font-black uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                        {#if step === 4 && !licenseUploaded}
                            {$t("setup.wizard.nav.skipTrial")}
                        {:else}
                            {$t("setup.wizard.nav.next")}
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
