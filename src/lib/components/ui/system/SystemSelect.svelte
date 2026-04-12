<script lang="ts">
    import * as Select from "$lib/components/ui/select";
    import { cn } from "$lib/utils";
    import { ChevronDown } from "lucide-svelte";
    
    interface Option {
        value: string;
        label: string;
    }

    interface Props {
        label?: string;
        value?: string ;
        options: Option[];
        placeholder?: string;
        class?: string;
        containerClass?: string;
        icon?: import("svelte").Snippet;
        disabled?: boolean;
    }

    let { 
        label, 
        value = $bindable(""), 
        options = [], 
        placeholder = "Selecione...",
        class: className,
        containerClass,
        icon,
        disabled = false
    }: Props = $props();

    let selectedLabel = $derived(
        options.find(opt => opt.value === value)?.label || placeholder
    );

</script>

<div class={cn("flex flex-col gap-2 w-full", containerClass)}>
    {#if label}
        <label class="text-[9px] font-black uppercase tracking-[var(--letter-spacing-institutional)] text-muted-foreground/60 px-1 ml-1">
            {label}
        </label>
    {/if}

    <Select.Root 
        type="single" 
        bind:value 
        disabled={disabled}
        portal={null}
    >
        <Select.Trigger 
            class={cn(
                "h-12 w-full rounded-full border border-white/5 bg-muted/10 px-6 transition-all duration-300 hover:bg-muted/15 focus:border-primary/40 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 flex items-center justify-between group",
                className
            )}
        >
            <div class="flex items-center gap-3 overflow-hidden">
                {#if icon}
                    <div class="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        {@render icon()}
                    </div>
                {/if}
                <span class={cn(
                    "text-sm truncate",
                    !value && "text-muted-foreground/40"
                )}>
                    {selectedLabel}
                </span>
            </div>
            <ChevronDown class="w-4 h-4 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
        </Select.Trigger>
        
        <Select.Content class="bg-card/90 backdrop-blur-xl border-white/10 rounded-[1.5rem] shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-200">
            <div class="max-h-60 overflow-y-auto custom-scrollbar">
                {#each options as option}
                    <Select.Item 
                        value={option.value}
                        class="rounded-full px-4 py-2 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors focus:bg-primary/10 focus:text-primary active:scale-[0.98] transition-transform"
                    >
                        {option.label}
                    </Select.Item>
                {/each}
            </div>
        </Select.Content>
    </Select.Root>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }
</style>
