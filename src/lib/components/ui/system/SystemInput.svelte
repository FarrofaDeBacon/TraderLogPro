<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLInputAttributes } from "svelte/elements";

  interface Props extends HTMLInputAttributes {
    label?: string;
    value?: string | number | null;
    class?: string;
    containerClass?: string;
    error?: string;
  }

  let { 
    label, 
    value = $bindable(""), 
    class: className,
    containerClass,
    error,
    ...rest 
  }: Props = $props();
</script>

<div class={cn("flex flex-col gap-2 w-full", containerClass)}>
  {#if label}
    <label 
      class="text-[9px] font-black uppercase tracking-[var(--letter-spacing-institutional)] text-muted-foreground/60 px-1 ml-1"
      for={rest.id}
    >
      {label}
    </label>
  {/if}
  
  <div class="relative group">
    <input
      bind:value={value}
      class={cn(
        "flex h-12 w-full rounded-full border border-white/5 bg-muted/10 px-6 py-2 text-sm transition-all duration-300 placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:border-primary/40 focus-visible:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted/15",
        error && "border-destructive/50 focus-visible:border-destructive/70",
        className
      )}
      {...rest}
    />
    
    {#if error}
      <p class="text-[9px] font-bold uppercase tracking-widest text-destructive mt-1.5 ml-4 animate-in fade-in slide-in-from-top-1">
        {error}
      </p>
    {/if}
  </div>
</div>
