<script lang="ts">
  import { modalitiesStore } from "$lib/stores/modalities.svelte";
    import { Plus, Trash2, Save, X } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { appStore } from "$lib/stores/app.svelte";
import type { TaxProfile, TaxProfileEntry } from "$lib/types";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { t } from "svelte-i18n";
    import { toast } from "svelte-sonner";

    let {
        open = $bindable(false),
        profileId = $bindable<string | null>(null),
        onSave = undefined,
    }: {
        open?: boolean;
        profileId?: string | null;
        onSave?: () => void;
    } = $props();

    let formData = $state<Omit<TaxProfile, "id">>({
        name: "",
        description: "",
    });

    let newEntryData = $state({
        modality_id: "",
        tax_rule_id: "",
    });

    // Local entries for new profiles (not yet in DB)
    let localEntries = $state<Omit<TaxProfileEntry, "id" | "tax_profile_id">[]>(
        [],
    );

    // Determine mode (New vs Edit) based on profileId
    $effect(() => {
        if (open) {
            if (profileId) {
                const p = financialConfigStore.taxProfiles.find(
                    (x) => x.id === profileId,
                );
                if (p) {
                    formData = {
                        name: p.name,
                        description: p.description || "",
                    };
                }
                localEntries = [];
            } else {
                formData = { name: "", description: "" };
                localEntries = [];
            }
        }
    });

    // Entries for this profile
    let currentEntries = $derived.by(() => {
        if (!profileId) return localEntries;
        return financialConfigStore.getEntriesForProfile(profileId);
    });

    let isSubmitting = $state(false);

    async function handleSaveProfile() {
        if (!formData.name) {
            toast.error($t("fiscal.settings.profiles.error.nameRequired"));
            return;
        }

        if (isSubmitting) return;
        isSubmitting = true;

        try {
            if (profileId) {
                // Editando existente
                await financialConfigStore.updateTaxProfile(profileId, formData);
                toast.success($t("fiscal.settings.profiles.success.update"));
            } else {
                // Criando novo
                const newId = await financialConfigStore.addTaxProfile(formData);

                // Salvar quaisquer regras locais que construímos
                for (const entry of localEntries) {
                    await financialConfigStore.addTaxProfileEntry({
                        tax_profile_id: newId,
                        modality_id: entry.modality_id,
                        tax_rule_id: entry.tax_rule_id,
                    });
                }
                toast.success($t("fiscal.settings.profiles.success.create"));
            }

            // FECHAR modal e resetar estado
            open = false;
            profileId = null;
            localEntries = [];
            if (onSave) onSave();
        } catch (e) {
            console.error("Erro ao salvar perfil:", e);
            toast.error($t("fiscal.settings.profiles.error.saveError"));
        } finally {
            isSubmitting = false;
        }
    }

    let isAddingEntry = $state(false);

    async function addEntry() {
        if (!newEntryData.modality_id || !newEntryData.tax_rule_id) {
            toast.error($t("fiscal.settings.profiles.error.selectRequired"));
            return;
        }

        if (isAddingEntry) return;
        isAddingEntry = true;

        try {
            // Check duplicate modality
            const exists = profileId
                ? financialConfigStore
                      .getEntriesForProfile(profileId)
                      .some((e) => e.modality_id === newEntryData.modality_id)
                : localEntries.some(
                      (e) => e.modality_id === newEntryData.modality_id,
                  );

            if (exists) {
                toast.error(
                    $t("fiscal.settings.profiles.error.duplicateModality"),
                );
                return;
            }

            if (profileId) {
                // Add directly to DB if editing
                await financialConfigStore.addTaxProfileEntry({
                    tax_profile_id: profileId,
                    modality_id: newEntryData.modality_id,
                    tax_rule_id: newEntryData.tax_rule_id,
                });
                toast.success($t("fiscal.settings.profiles.success.ruleAdded"));
            } else {
                // Add to local list if creating
                localEntries.push({
                    modality_id: newEntryData.modality_id,
                    tax_rule_id: newEntryData.tax_rule_id,
                });
                toast.success(
                    $t("fiscal.settings.profiles.success.ruleAddedDraft"),
                );
            }

            // Reset inputs
            newEntryData = { modality_id: "", tax_rule_id: "" };
        } catch (e) {
            console.error("Erro ao adicionar entrada:", e);
            toast.error($t("fiscal.settings.profiles.error.errorAddEntry"));
        } finally {
            isAddingEntry = false;
        }
    }

    async function removeEntry(entry: any) {
        if (profileId) {
            await financialConfigStore.deleteTaxProfileEntry(entry.id);
            toast.success($t("fiscal.settings.profiles.success.ruleRemoved"));
        } else {
            localEntries = localEntries.filter(
                (e) => e.modality_id !== entry.modality_id,
            );
            toast.success(
                $t("fiscal.settings.profiles.success.ruleRemovedDraft"),
            );
        }
    }

    // Helpers for display
    function getModalityName(id: string) {
        return modalitiesStore.modalities.find((m) => m.id === id)?.name || "N/A";
    }
    function getRuleName(id: string) {
        const r = financialConfigStore.taxRules.find((r) => r.id === id);
        return r ? `${r.name} (${r.tax_rate}%)` : "N/A";
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden"
    >
        <div class="px-6 pt-6 pb-2">
            <Dialog.Header>
                <Dialog.Title>
                    {profileId
                        ? $t("fiscal.settings.profiles.form.titleEdit")
                        : $t("fiscal.settings.profiles.form.titleNew")}
                </Dialog.Title>
                <Dialog.Description>
                    {$t("fiscal.settings.profiles.form.description")}
                </Dialog.Description>
            </Dialog.Header>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-2">
            <div class="grid gap-6">
                <!-- Profile Basic Info -->
                <div class="grid gap-3">
                    <div class="grid grid-cols-4 items-center gap-4">
                        <Label class="text-right"
                            >{$t("fiscal.settings.profiles.form.name")}</Label
                        >
                        <Input
                            bind:value={formData.name}
                            class="col-span-3"
                            placeholder={$t(
                                "fiscal.settings.profiles.form.namePlaceholder",
                            )}
                        />
                    </div>
                    <div class="grid grid-cols-4 items-center gap-4">
                        <Label class="text-right"
                            >{$t(
                                "fiscal.settings.profiles.form.descriptionLabel",
                            )}</Label
                        >
                        <Input
                            bind:value={formData.description}
                            class="col-span-3"
                            placeholder={$t(
                                "fiscal.settings.profiles.form.descriptionPlaceholder",
                            )}
                        />
                    </div>
                </div>

                <Separator />

                <!-- Profile Entries (Rules) -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h4
                            class="text-sm font-semibold flex items-center gap-2"
                        >
                            <Plus class="w-4 h-4 text-primary" />
                            {$t(
                                "fiscal.settings.profiles.form.rulesByModality",
                            )}
                        </h4>
                    </div>

                    <!-- Add Rule Bar (Always Visible) -->
                    <div
                        class="flex gap-2 items-end bg-muted/20 p-3 rounded-lg border border-dashed border-primary/20"
                    >
                        <div class="space-y-1.5 flex-1">
                            <Label
                                class="text-[10px] uppercase text-muted-foreground font-bold px-1"
                                >{$t(
                                    "fiscal.settings.profiles.form.modality",
                                )}</Label
                            >
                            <Select.Root
                                type="single"
                                bind:value={newEntryData.modality_id}
                            >
                                <Select.Trigger
                                    class="h-9 text-xs bg-background"
                                >
                                    {modalitiesStore.modalities.find(
                                        (m) =>
                                            m.id === newEntryData.modality_id,
                                    )?.name ||
                                        $t(
                                            "fiscal.settings.profiles.form.select",
                                        )}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each modalitiesStore.modalities as mod}
                                        <Select.Item value={mod.id}>
                                            {mod.name}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <div class="space-y-1.5 flex-1">
                            <Label
                                class="text-[10px] uppercase text-muted-foreground font-bold px-1"
                                >{$t(
                                    "fiscal.settings.profiles.form.rule",
                                )}</Label
                            >
                            <Select.Root
                                type="single"
                                bind:value={newEntryData.tax_rule_id}
                            >
                                <Select.Trigger
                                    class="h-9 text-xs bg-background"
                                >
                                    {financialConfigStore.taxRules.find(
                                        (r) =>
                                            r.id === newEntryData.tax_rule_id,
                                    )?.name ||
                                        $t(
                                            "fiscal.settings.profiles.form.select",
                                        )}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each financialConfigStore.taxRules as r}
                                        <Select.Item value={r.id}>
                                            {r.name} ({r.tax_rate}%)
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <Button
                            size="sm"
                            class="h-9 px-4"
                            onclick={addEntry}
                            disabled={!newEntryData.modality_id ||
                                !newEntryData.tax_rule_id}
                        >
                            <Plus class="w-4 h-4" />
                        </Button>
                    </div>

                    <!-- Entries List -->
                    <div class="space-y-2">
                        {#each currentEntries as entry}
                            <div
                                class="flex items-center justify-between p-3 text-sm bg-card border rounded-lg shadow-sm hover:border-primary/30 transition-colors"
                            >
                                <div class="grid grid-cols-2 gap-4 flex-1">
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="w-2 h-2 rounded-full bg-primary animate-pulse"
                                        ></div>
                                        <span class="font-semibold"
                                            >{getModalityName(
                                                entry.modality_id,
                                            )}</span
                                        >
                                    </div>
                                    <div
                                        class="text-muted-foreground flex items-center justify-end gap-2"
                                    >
                                        <span
                                            class="px-2 py-0.5 bg-muted rounded text-[11px] border border-muted-foreground/10"
                                        >
                                            {getRuleName(entry.tax_rule_id)}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-7 w-7 ml-2 text-destructive hover:bg-destructive/10"
                                    onclick={() => removeEntry(entry)}
                                >
                                    <Trash2 class="w-4 h-4" />
                                </Button>
                            </div>
                        {:else}
                            <div
                                class="py-10 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/5 opacity-60"
                            >
                                <Plus
                                    class="w-8 h-8 mb-2 text-muted-foreground/30"
                                />
                                <span class="text-sm text-muted-foreground"
                                    >{$t(
                                        "fiscal.settings.profiles.form.emptyRules",
                                    )}</span
                                >
                                <span
                                    class="text-[10px] text-muted-foreground/50"
                                    >{$t(
                                        "fiscal.settings.profiles.form.addModalityHint",
                                    )}</span
                                >
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        <div class="p-6 border-t bg-muted/10">
            <Dialog.Footer class="gap-2 sm:gap-0">
                <Button variant="outline" onclick={() => (open = false)}
                    >{$t("general.cancel")}</Button
                >
                <Button
                    onclick={handleSaveProfile}
                    class="px-8 flex gap-2"
                    disabled={isSubmitting}
                >
                    {#if isSubmitting}
                        <span class="loading loading-spinner loading-xs"></span>
                        {$t("fiscal.settings.profiles.form.saving")}
                    {:else}
                        <Save class="w-4 h-4" />
                        {profileId
                            ? $t("fiscal.settings.profiles.form.update")
                            : $t("fiscal.settings.profiles.form.save")}
                    {/if}
                </Button>
            </Dialog.Footer>
        </div>
    </Dialog.Content>
</Dialog.Root>

