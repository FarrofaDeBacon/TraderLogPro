<script lang="ts">
  import { assetsStore } from "$lib/stores/assets.svelte";
    import { t } from "svelte-i18n";
    import { appStore } from "$lib/stores/app.svelte";

    let {
        value = $bindable(""),
        placeholder = $t("trades.wizard.messages.select_asset"),
        class: className = "",
    } = $props<{
        value: string;
        placeholder?: string;
        class?: string;
    }>();
</script>

<select
    bind:value
    class="flex h-10 w-full rounded-md border border-border/40 bg-card px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {className}"
>
    <option value="" disabled selected>{placeholder}</option>
    {#each assetsStore.assets as asset}
        <option value={asset.symbol}>
            {asset.symbol}
            {asset.name ? `- ${asset.name}` : ""}
        </option>
    {/each}
</select>
