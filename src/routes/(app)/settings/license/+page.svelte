<script lang="ts">
    import { t } from "svelte-i18n";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Separator } from "$lib/components/ui/separator";
    import { Badge } from "$lib/components/ui/badge";
    import { toast } from "svelte-sonner";
    import {
        Crown,
        CheckCircle2,
        AlertCircle,
        Calendar,
        Key,
        ShieldCheck,
        FileCode,
        Download,
        Upload,
        Trash2,
        Zap,
    } from "lucide-svelte";
    import { userProfileStore } from "$lib/stores/user-profile.svelte";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import {
        validateLicenseKey,
        activateLicenseOnline,
        type LicenseData,
    } from "$lib/utils/license";
    import { open } from "@tauri-apps/plugin-dialog";
    import { readFile } from "@tauri-apps/plugin-fs";

    // Machine PIN comes directly from backend v2
    const customerPin = $derived(userProfileStore.hardwareId);

    let activationEmail = $state(userProfileStore.userProfile.email || "");
    let isActivating = $state(false);
    let isOnlineActivating = $state(false);

    // Links de Checkout Reais (Fornecidos pelo usuário)
    const CHECKOUT_ANNUAL = "https://pay.hotmart.com/J105321674U?bid=1776001106781";
    const CHECKOUT_LIFETIME = "https://pay.hotmart.com/U105324624J?bid=1776001128443";

    function getCheckoutUrl(baseUrl: string) {
        const cleanEmail = activationEmail.trim();
        if (!cleanEmail) return baseUrl;
        const separator = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${separator}email=${encodeURIComponent(cleanEmail)}`;
    }

    // Diagnostic trace for license state
    $effect(() => {
        console.log("[License UI] Current License Details:", {
            details: userProfileStore.licenseDetails,
            planName: userProfileStore.licensePlanName,
            totalDays: userProfileStore.licenseTotalDays,
            daysRemaining: userProfileStore.licenseDaysRemaining,
        });
    });

    async function handleFileUpload() {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: "Licença", extensions: ["lic"] }],
            });

            if (selected && !Array.isArray(selected)) {
                console.log("[License] Selected file:", selected);
                isActivating = true;
                const fileContent = await readFile(selected);
                const text = new TextDecoder().decode(fileContent);

                // Validate
                const result = await validateLicenseKey(
                    text.trim(),
                    customerPin,
                );

                if (result.valid) {
                    userProfileStore.updateUserProfile({
                        license_key: text.trim(),
                    });
                    toast.success(
                        `Licença ${result.plan} ativada com sucesso!`,
                    );
                } else {
                    console.warn("Validation failed:", result.error);
                    toast.error(
                        result.error ||
                            "Arquivo de licença inválido para esta máquina.",
                    );
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar arquivo de licença.");
        } finally {
            isActivating = false;
        }
    }
    let isDeactivateDialogOpen = $state(false);

    async function handleDeactivate() {
        isDeactivateDialogOpen = true;
    }

    async function confirmDeactivate() {
        try {
            await userProfileStore.deactivateLicense();
            toast.success("Licença removida com sucesso.");
        } catch (e) {
            toast.error("Erro ao remover licença.");
        } finally {
            isDeactivateDialogOpen = false;
        }
    }

    async function handleOnlineActivation() {
        if (!activationEmail || !activationEmail.includes("@")) {
            toast.error("Por favor, informe um e-mail de compra válido.");
            return;
        }

        try {
            isOnlineActivating = true;
            toast.info("Conectando ao servidor de licenças...");
            
            const result = await activateLicenseOnline(activationEmail, customerPin);
            
            if (result.success && result.license) {
                // Now validate the result locally to ensure it matches this machine
                const validation = await validateLicenseKey(result.license, customerPin);
                
                if (validation.valid) {
                    await userProfileStore.updateUserProfile({
                        email: activationEmail,
                        license_key: result.license
                    });
                    toast.success(`Licença ${validation.plan} ativada com sucesso! Aproveite o ${validation.plan}.`);
                } else {
                    toast.error(validation.error || "A licença gerada não é válida para este dispositivo.");
                }
            } else {
                toast.error(result.error || "Não encontramos uma licença ativa para este e-mail.");
            }
        } catch (e) {
            console.error("[License] Activation Exception:", e);
            toast.error("Erro na comunicação com o servidor.");
        } finally {
            isOnlineActivating = false;
        }
    }
</script>

<div class="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex items-center justify-between">
        <div>
            <h3
                class="text-lg font-medium text-foreground flex items-center gap-2"
            >
                <Crown class="w-5 h-5 text-yellow-500" />
                {$t("settings.license.management")}
            </h3>
            <p class="text-sm text-muted-foreground">
                {$t("settings.license.subtitle")}
            </p>
        </div>
        <div class="flex items-center gap-3">
            {#if userProfileStore.licenseStatus === "active"}
                <Badge
                    variant="default"
                    class="bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1 text-xs uppercase tracking-widest font-bold"
                >
                    Assinatura {userProfileStore.licensePlanName} Ativa
                </Badge>
            {:else if userProfileStore.licenseStatus === "trial"}
                <Badge
                    variant="outline"
                    class="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 text-xs uppercase tracking-widest font-bold"
                >
                    {$t("settings.license.trialBadge")} ({userProfileStore.trialDaysLeft}
                    dias)
                </Badge>
            {:else}
                <Badge
                    variant="destructive"
                    class="px-3 py-1 text-xs uppercase tracking-widest font-bold"
                >
                    Expirada
                </Badge>
            {/if}

            {#if userProfileStore.userProfile.license_key}
                <Button
                    variant="destructive"
                    size="sm"
                    class="h-8 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border-rose-500/20 px-3"
                    onclick={handleDeactivate}
                >
                    <Trash2 class="w-4 h-4 mr-2" />
                    Remover Licença
                </Button>
            {/if}
        </div>
    </div>

    {#if userProfileStore.licenseStatus === "active" && userProfileStore.licenseDetails}
        <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div
                class="bg-card/50 backdrop-blur-md border border-border rounded-xl p-4 flex items-center gap-4"
            >
                <div
                    class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                >
                    <Crown class="w-5 h-5 text-primary" />
                </div>
                <div>
                    <p
                        class="text-[10px] text-muted-foreground uppercase font-bold tracking-tight"
                    >
                        Tipo de Licença
                    </p>
                    <p class="text-sm font-semibold text-foreground">
                        {userProfileStore.licensePlanName}
                    </p>
                </div>
            </div>

            {#if userProfileStore.licenseTotalDays}
                <div
                    class="bg-card/50 backdrop-blur-md border border-border rounded-xl p-4 flex items-center gap-4"
                >
                    <div
                        class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center"
                    >
                        <Calendar class="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <p
                            class="text-[10px] text-muted-foreground uppercase font-bold tracking-tight"
                        >
                            Duração Contratada
                        </p>
                        <p class="text-sm font-semibold text-foreground">
                            {userProfileStore.licenseTotalDays} dias
                        </p>
                    </div>
                </div>
            {:else if userProfileStore.licenseDetails?.plan === "Lifetime"}
                <div
                    class="bg-card/50 backdrop-blur-md border border-border rounded-xl p-4 flex items-center gap-4"
                >
                    <div
                        class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center"
                    >
                        <Calendar class="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <p
                            class="text-[10px] text-muted-foreground uppercase font-bold tracking-tight"
                        >
                            Duração Contratada
                        </p>
                        <p class="text-sm font-semibold text-foreground">
                            Vitalícia
                        </p>
                    </div>
                </div>
            {/if}

            {#if userProfileStore.licenseDaysRemaining !== null}
                <div
                    class="bg-card/50 backdrop-blur-md border border-border rounded-xl p-4 flex items-center gap-4"
                >
                    <div
                        class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center"
                    >
                        <ShieldCheck class="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <p
                            class="text-[10px] text-muted-foreground uppercase font-bold tracking-tight"
                        >
                            Restante
                        </p>
                        <p class="text-sm font-semibold text-foreground">
                            {userProfileStore.licenseDaysRemaining} dias
                        </p>
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Seção de Planos e Aquisição (Restauração Hotmart) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a 
            href={getCheckoutUrl(CHECKOUT_ANNUAL)} 
            target="_blank"
            class="group relative flex flex-col p-6 rounded-[2rem] bg-card border border-border hover:border-emerald-500/50 transition-all overflow-hidden shadow-sm"
        >
            <div class="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Tradicional</p>
                    <h4 class="text-xl font-black uppercase tracking-tighter">Faturamento Anual</h4>
                </div>
                <Zap class="w-5 h-5 text-emerald-500" />
            </div>
            <p class="text-[11px] text-muted-foreground mt-2 relative z-10">{$t("settings.license.perk1")}</p>
            <div class="mt-4 flex items-baseline gap-1 relative z-10">
                <span class="text-xs font-bold text-muted-foreground">R$</span>
                <span class="text-2xl font-black tracking-tighter">99</span>
                <span class="text-[10px] font-bold text-muted-foreground">/ano</span>
            </div>
        </a>

        <a 
            href={getCheckoutUrl(CHECKOUT_LIFETIME)} 
            target="_blank"
            class="group relative flex flex-col p-6 rounded-[2rem] bg-card border border-border hover:border-blue-500/50 transition-all overflow-hidden shadow-sm"
        >
            <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Legacy</p>
                    <h4 class="text-xl font-black uppercase tracking-tighter">Acesso Vitalício</h4>
                </div>
                <Crown class="w-5 h-5 text-blue-500" />
            </div>
            <p class="text-[11px] text-muted-foreground mt-2 relative z-10">{$t("settings.license.perk2")}</p>
            <div class="mt-4 flex items-baseline gap-1 relative z-10">
                <span class="text-xs font-bold text-muted-foreground">R$</span>
                <span class="text-2xl font-black tracking-tighter">499</span>
                <span class="text-[10px] font-bold text-muted-foreground">/único</span>
            </div>
        </a>
    </div>

    <Card.Root class="bg-primary/5 border-primary/20 shadow-lg shadow-primary/5 overflow-hidden">
        <Card.Header class="pb-2">
            <Card.Title class="text-sm flex items-center gap-2">
                <Zap class="w-4 h-4 text-primary" />
                Ativação Expressa (Recomendado)
            </Card.Title>
            <Card.Description class="text-xs">
                Se você já adquiriu o TraderLog Pro, basta informar seu e-mail abaixo para ativar instantaneamente.
            </Card.Description>
        </Card.Header>
        <Card.Content class="flex flex-col md:flex-row gap-4 items-end pb-4">
            <div class="flex-1 space-y-1.5">
                <label for="email" class="text-[10px] uppercase font-bold text-primary tracking-widest pl-1">E-mail da Compra</label>
                <div class="relative">
                    <input 
                        id="email"
                        type="email" 
                        bind:value={activationEmail}
                        placeholder="exemplo@email.com"
                        class="w-full h-10 px-4 bg-background/50 border border-primary/20 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30"
                    />
                </div>
            </div>
            <Button 
                class="h-10 px-8 font-black uppercase tracking-wider text-[11px] shadow-lg shadow-primary/10"
                disabled={isOnlineActivating || !customerPin}
                onclick={handleOnlineActivation}
            >
                {#if isOnlineActivating}
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Ativando...
                    </div>
                {:else}
                    Ativar Agora
                {/if}
            </Button>
        </Card.Content>
    </Card.Root>

    <Separator class="bg-border/40" />

    <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <!-- Passo 1: PIN -->
        <Card.Root class="bg-card/50 backdrop-blur-sm border-border">
            <Card.Header>
                <Card.Title class="text-base flex items-center gap-2">
                    <span
                        class="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs"
                        >1</span
                    >
                    {$t("settings.license.step1")}
                </Card.Title>
                <Card.Description>
                    {$t("settings.license.step1Desc")}
                </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div
                    class="p-4 bg-background/50 backdrop-blur-md rounded-lg border border-border space-y-3 shadow-inner"
                >
                    <div class="space-y-1">
                        <span
                            class="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter"
                            >{$t("settings.license.pinLabel")}</span
                        >
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <code
                                class="text-sm md:text-base font-mono text-primary font-bold tracking-tight bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
                            >
                                {customerPin ||
                                    $t("settings.license.incompleteData")}
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                class="h-8"
                                disabled={!customerPin}
                                onclick={() => {
                                    navigator.clipboard.writeText(customerPin);
                                    toast.success("PIN copiado!");
                                }}
                            >
                                <Download class="w-4 h-4 mr-2" />
                                {$t("settings.license.copy")}
                            </Button>
                        </div>
                    </div>
                    <p class="text-xs text-muted-foreground/80 leading-relaxed">
                        {$t("settings.license.sendPinInfo")}
                    </p>
                </div>

                <div class="pt-2 text-xs text-muted-foreground/60 italic">
                    {$t("settings.license.pinDisclaimer")}
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Passo 2: Upload -->
        <Card.Root class="bg-card/50 backdrop-blur-sm border-border">
            <Card.Header>
                <Card.Title class="text-base flex items-center gap-2">
                    <span
                        class="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs"
                        >2</span
                    >
                    {$t("settings.license.step2")}
                </Card.Title>
                <Card.Description>
                    {$t("settings.license.step2Desc")}
                </Card.Description>
            </Card.Header>
            <Card.Content
                class="flex flex-col items-center justify-center py-8 space-y-4 border-2 border-dashed border-border rounded-lg mx-6 mb-6 bg-muted/20"
            >
                <div
                    class="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center"
                >
                    <FileCode class="w-6 h-6 text-muted-foreground" />
                </div>
                <div class="text-center">
                    <p class="text-sm font-medium text-foreground/90">
                        {$t("settings.license.noFile")}
                    </p>
                    <p class="text-xs text-muted-foreground/60">
                        {$t("settings.license.formatAccepted")}
                    </p>
                </div>
                <Button
                    class="font-bold px-8"
                    onclick={handleFileUpload}
                    disabled={isActivating || !customerPin}
                >
                    {#if isActivating}
                        Ativando...
                    {:else}
                        <Upload class="w-4 h-4 mr-2" />
                        {$t("settings.license.loadFile")}
                    {/if}
                </Button>
            </Card.Content>
        </Card.Root>
    </div>

</div>

<AlertDialog.Root bind:open={isDeactivateDialogOpen}>
    <AlertDialog.Content class="bg-black/90 border-white/5 backdrop-blur-xl rounded-[2.5rem] p-8">
        <AlertDialog.Header>
            <AlertDialog.Title class="text-[14px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-3">
                <AlertCircle class="w-5 h-5" />
                Remover Licença Atual?
            </AlertDialog.Title>
            <AlertDialog.Description class="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest leading-relaxed pt-4">
                Esta ação removerá o acesso premium deste terminal imediatamente. Você voltará para o período de avaliação ou ficará sem acesso caso o mesmo já tenha expirado.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer class="gap-3 mt-8">
            <AlertDialog.Cancel class="rounded-full bg-white/5 border-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 h-12 px-8">
                {$t("general.cancel")}
            </AlertDialog.Cancel>
            <AlertDialog.Action 
                onclick={confirmDeactivate}
                class="rounded-full bg-rose-500 text-white hover:bg-rose-600 h-12 px-10 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 border-none"
            >
                Confirmar Remoção
            </AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>


