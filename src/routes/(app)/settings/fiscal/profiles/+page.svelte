<script lang="ts">
    import { modalitiesStore } from "$lib/stores/modalities.svelte";
    import { Plus, Pencil, Trash2, ShieldAlert, Scale, Info } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Separator } from "$lib/components/ui/separator";
    import { appStore } from "$lib/stores/app.svelte";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { t } from "svelte-i18n";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { toast } from "svelte-sonner";
    import ProfileEditor from "../ProfileEditor.svelte";
    import { SystemHeader } from "$lib/components/ui/system";

    // Profile Editor State
    let isProfileEditorOpen = $state(false);
    let editingProfileId = $state<string | null>(null);

    // Delete Modal State
    let isDeleteOpen = $state(false);
    let deleteId = $state<string | null>(null);

    function openNewProfile() {
        editingProfileId = null;
        isProfileEditorOpen = true;
    }

    function openEditProfile(id: string) {
        editingProfileId = id;
        isProfileEditorOpen = true;
    }

    function requestDelete(id: string) {
        deleteId = id;
        isDeleteOpen = true;
    }

    async function confirmDelete() {
        if (deleteId) {
            const result = await financialConfigStore.deleteTaxProfile(deleteId);

            if (!result.success) {
                toast.error(result.error || $t("general.error"));
            } else {
                toast.success($t("general.deleteSuccess"));
            }
            deleteId = null;
        }
    }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
    <SystemHeader 
        title={$t("fiscal.settings.profiles.title")}
        description={$t("fiscal.settings.profiles.description")}
    >
        {#snippet actions()}
            <Button 
                onclick={openNewProfile} 
                class="h-10 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-full shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest"
            >
                <Plus class="w-4 h-4 mr-2" />
                {$t("fiscal.settings.profiles.new")}
            </Button>
        {/snippet}
    </SystemHeader>

    <div class="grid gap-6 pt-4 md:grid-cols-2">
        {#each financialConfigStore.taxProfiles as profile}
            <div
                class="group flex flex-col p-6 rounded-[2rem] border bg-card/40 border-white/5 hover:border-emerald-500/50 transition-all shadow-xl relative overflow-hidden h-full"
            >
                <!-- Header Section -->
                <div class="flex justify-between items-start mb-6 relative z-10">
                    <div class="space-y-1">
                        <h4 class="font-bold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                            {profile.name}
                        </h4>
                        {#if profile.description}
                            <p class="text-xs text-white/40 leading-relaxed max-w-[200px]">
                                {profile.description}
                            </p>
                        {/if}
                    </div>
                    <div class="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-9 w-9 rounded-full text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400"
                            onclick={() => openEditProfile(profile.id)}
                        >
                            <Pencil class="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-9 w-9 rounded-full text-white/40 hover:bg-destructive hover:text-white"
                            onclick={() => requestDelete(profile.id)}
                        >
                            <Trash2 class="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <!-- Modality Layout Hub -->
                <div class="mt-auto relative z-10">
                    <div class="grid grid-cols-2 gap-3 mb-2">
                        {#each ['DayTrade', 'SwingTrade'] as modType}
                            {@const entry = financialConfigStore.getEntriesForProfile(profile.id).find(e => {
                                const m = modalitiesStore.modalities.find(mod => mod.id === e.modality_id);
                                return m?.id === modType;
                            })}
                            {@const rule = entry ? financialConfigStore.taxRules.find(r => r.id === entry.tax_rule_id) : null}
                            
                            <div class="flex flex-col p-4 rounded-2xl bg-white/[0.02] border border-white/5 group/mod hover:border-white/10 transition-colors h-full">
                                <div class="flex items-center justify-between mb-3">
                                    <span class="text-[9px] font-bold uppercase tracking-widest text-white/20">
                                        {modType === 'DayTrade' ? 'Day Trade' : 'Swing Trade'}
                                    </span>
                                    {#if rule}
                                        <div class="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    {:else}
                                        <div class="h-1.5 w-1.5 rounded-full bg-white/10"></div>
                                    {/if}
                                </div>

                                {#if rule}
                                    <div class="space-y-1">
                                        <p class="text-xs font-bold text-white truncate max-w-full">
                                            {rule.name}
                                        </p>
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-[10px] font-mono font-bold text-emerald-500">{rule.tax_rate}%</span>
                                            <span class="text-[9px] font-bold text-white/20 uppercase tracking-tight">Alíquota</span>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="flex flex-col justify-center h-full min-h-[40px]">
                                        <p class="text-[10px] italic text-white/20 font-medium leading-tight">
                                            Não configurado
                                        </p>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Decorative Background Element -->
                <div class="absolute -right-8 -bottom-8 opacity-[0.03] text-white">
                    <Scale size={120} />
                </div>
            </div>
        {:else}
            <div
                class="col-span-full flex flex-col items-center justify-center p-12 border border-dashed border-white/5 rounded-[2.5rem] text-muted-foreground/30 h-[320px] bg-white/[0.01]"
            >
                <div class="p-4 bg-white/[0.03] rounded-3xl mb-4">
                    <Scale class="w-12 h-12 opacity-10" />
                </div>
                <span class="text-sm font-bold uppercase tracking-widest">{$t("fiscal.settings.profiles.empty")}</span>
                <Button variant="link" onclick={openNewProfile} class="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mt-2"
                    >{$t("fiscal.settings.profiles.create")}</Button
                >
            </div>
        {/each}
    </div>
</div>

<ProfileEditor
    bind:open={isProfileEditorOpen}
    bind:profileId={editingProfileId}
/>

<DeleteConfirmationModal bind:open={isDeleteOpen} onConfirm={confirmDelete} />

