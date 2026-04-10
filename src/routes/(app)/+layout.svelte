<script lang="ts">
    import { onMount } from "svelte";
    import AppSidebar from "$lib/components/app-sidebar/AppSidebar.svelte";
    import { sidebarState } from "$lib/stores/sidebar.svelte";
    import { appStore } from "$lib/stores/app.svelte";
    import { userProfileStore } from "$lib/stores/user-profile.svelte";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import OnboardingWizard from "$lib/components/setup/OnboardingWizard.svelte";
    import LicenseBanner from "$lib/components/layout/LicenseBanner.svelte";
    import TrialBlocker from "$lib/components/layout/TrialBlocker.svelte";
    import AutoTradeDetectionDialog from "$lib/components/trades/AutoTradeDetectionDialog.svelte";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    import { safeInvoke } from "$lib/services/tauri";

    let { children } = $props();
    let dataLoaded = $state(false);

    onMount(async () => {
        console.log("[Layout] App layout mounted, data handled by root.");

        // --- DIAGNOSTICS ---
        safeInvoke("diagnostic_dump_trades").catch((e) => console.error(e));
        safeInvoke("diagnostic_dump_users").catch((e) => console.error(e));
        // -------------------

        dataLoaded = true;
    });

    $inspect(userProfileStore.userProfile.onboarding_completed).with(
        (type, val) => {
            console.log(`[Layout] Onboarding record state (${type}):`, val);
        },
    );

    async function handleOnboardingComplete() {
        console.log("[Layout] Onboarding complete, refreshing data...");
        await Promise.all([appStore.loadData(), tradesStore.loadTrades()]);
    }
</script>

{#if dataLoaded}
    {#if userProfileStore.licenseStatus === 'expired'}
        <TrialBlocker />
    {/if}

    {#if !userProfileStore.userProfile.onboarding_completed}
        <OnboardingWizard onComplete={handleOnboardingComplete} />
    {:else}
        <div
            class="grid min-h-screen w-full transition-all duration-300 bg-background md:grid-cols-[var(--sidebar-width)_1fr] print:flex print:flex-col print:bg-white"
            style="--sidebar-width: {sidebarState.isCollapsed
                ? '70px'
                : '280px'};"
        >
            <div class="print:hidden h-full">
                <AppSidebar />
            </div>
            <div class="flex flex-col min-w-0 print:w-full print:block">
                <div class="print:hidden">
                    <LicenseBanner />
                </div>
                <AutoTradeDetectionDialog />
                <main
                    class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 min-w-0 print:p-0 print:m-0 print:block print:w-full print:max-w-none"
                >
                    {@render children()}
                </main>
            </div>
        </div>
    {/if}
{/if}
