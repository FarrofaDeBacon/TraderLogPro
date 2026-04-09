<script lang="ts">
    import { page } from "$app/stores";
    import { buttonVariants } from "$lib/components/ui/button";
    import { cn } from "$lib/utils";
    import { slide } from "svelte/transition";
    import {
        User,
        Wallet,
        Banknote,
        Receipt,
        Globe,
        Layers,
        Bitcoin,
        ShieldAlert,
        Target,
        Workflow,
        HeartPulse,
        TrendingUp,
        Tag,
        Activity,
        Clock,
        BarChart3,
        Plug,
        Database,
        Crown,
        Scale,
        ChevronDown,
        ChevronRight
    } from "lucide-svelte";

    import { t } from "svelte-i18n";

    // Define categories for the accordion
    const categories = [
        {
            id: "general",
            title: $t("settings.nav.sections.general"),
            items: [
                { href: "/settings/profile", title: $t("settings.nav.profile"), icon: User },
                { href: "/settings/license", title: $t("settings.nav.license"), icon: Crown },
            ]
        },
        {
            id: "registration",
            title: $t("settings.nav.sections.registration"),
            items: [
                { href: "/settings/accounts", title: $t("settings.nav.accounts"), icon: Wallet },
                { href: "/settings/currencies", title: $t("settings.nav.currencies"), icon: Banknote },
                { href: "/settings/fees", title: $t("settings.nav.fees"), icon: Receipt },
                { href: "/settings/markets", title: $t("settings.nav.markets"), icon: Globe },
                { href: "/settings/asset-types", title: $t("settings.nav.assetTypes"), icon: Layers },
                { href: "/settings/assets", title: $t("settings.nav.assets"), icon: Bitcoin },
            ]
        },
        {
            id: "fiscal",
            title: $t("settings.nav.sections.fiscal"),
            items: [
                { href: "/settings/fiscal/rules", title: $t("settings.nav.fiscal.rules"), icon: Scale },
                { href: "/settings/fiscal/profiles", title: $t("settings.nav.fiscal.profiles"), icon: Layers },
                { href: "/settings/fiscal/assignments", title: $t("settings.nav.fiscal.assignments"), icon: Tag },
            ]
        },
        {
            id: "risk",
            title: $t("settings.nav.risk"),
            items: [
                { href: "/settings/risk/asset-profiles", title: $t("settings.nav.assetProfiles"), icon: Layers },
                { href: "/settings/risk", title: $t("settings.nav.riskManagement"), icon: ShieldAlert },
                { href: "/settings/growth-plans", title: $t("settings.nav.growthPlans"), icon: TrendingUp },
                { href: "/risk-control", title: $t("nav.risk"), icon: Activity },
            ]
        },
        {
            id: "operational",
            title: $t("settings.nav.sections.operational"),
            items: [
                { href: "/settings/strategies", title: $t("settings.nav.strategies"), icon: Target },
                { href: "/settings/modalities", title: $t("settings.nav.modalities"), icon: Workflow },
            ]
        },
        {
            id: "analysis",
            title: $t("settings.nav.sections.analysis"),
            items: [
                { href: "/settings/emotional-states", title: $t("settings.nav.emotionalStates"), icon: HeartPulse },
                { href: "/settings/tags", title: $t("settings.nav.tags"), icon: Tag },
                { href: "/settings/indicators", title: $t("settings.nav.indicators"), icon: Activity },
                { href: "/settings/timeframes", title: $t("settings.nav.timeframes"), icon: Clock },
                { href: "/settings/chart-types", title: $t("settings.nav.chartTypes"), icon: BarChart3 },
            ]
        },
        {
            id: "system",
            title: $t("settings.nav.sections.system"),
            items: [
                { href: "/settings/api-integrations", title: $t("settings.nav.integrations"), icon: Plug },
                { href: "/settings/database", title: $t("settings.nav.database"), icon: Database },
            ]
        }
    ];

    // State for collapsible sections
    // Default: find which section contains the active route
    let activePath = $derived($page.url.pathname);
    let expandedSections = $state<Record<string, boolean>>({});

    // Effect to auto-expand the section of the current path on load
    $effect(() => {
        categories.forEach(cat => {
            if (cat.items.some(item => activePath.startsWith(item.href))) {
                expandedSections[cat.id] = true;
            }
        });
    });

    function toggleSection(id: string) {
        expandedSections[id] = !expandedSections[id];
    }
</script>

<nav
    class={cn(
        "flex flex-nowrap space-x-2 lg:flex-col lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-y-auto max-h-[calc(100vh-10rem)] custom-scrollbar pr-2 pb-2 lg:pb-10",
        "",
    )}
>
    {#each categories as category}
        <div class="flex flex-col w-full">
            <!-- Section Header -->
            <button
                type="button"
                onclick={() => toggleSection(category.id)}
                class="flex items-center justify-between w-full px-4 py-3 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest hover:text-foreground transition-colors group cursor-pointer"
            >
                <span>{category.title}</span>
                {#if expandedSections[category.id]}
                    <ChevronDown class="w-3 h-3 transition-transform" />
                {:else}
                    <ChevronRight class="w-3 h-3 transition-transform" />
                {/if}
            </button>

            <!-- Section Items -->
            {#if expandedSections[category.id]}
                <div transition:slide={{ duration: 200 }} class="flex flex-col space-y-1 pl-2 mb-2">
                    {#each category.items as item}
                        {@const Icon = item.icon}
                        <a
                            href={item.href}
                            class={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                                activePath === item.href
                                    ? "bg-secondary text-secondary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                "justify-start w-full",
                            )}
                        >
                            <Icon class="w-4 h-4 shrink-0" />
                            <span class="truncate">{item.title}</span>
                        </a>
                    {/each}
                </div>
            {/if}
        </div>
    {/each}
</nav>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }
</style>
