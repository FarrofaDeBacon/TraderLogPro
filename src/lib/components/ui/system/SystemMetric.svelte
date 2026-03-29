<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    label: string;
    value: string | number;
    status?: "success" | "warning" | "danger" | "info" | "none";
    weight?: "black" | "bold";
    subvalue?: string | Snippet;
    variant?: "default" | "compact";
    valueClass?: string;
  }

  let { 
    label, 
    value, 
    status = "none", 
    weight = "bold",
    subvalue = "",
    variant = "default",
    valueClass = "",
    class: className,
    ...rest 
  }: Props = $props();

  const valueColors = {
    success: "text-status-success",
    warning: "text-status-warning",
    danger: "text-status-danger",
    info: "text-status-info",
    none: "text-foreground"
  };
</script>

<div class={cn("flex flex-col", variant === "default" ? "gap-1.5" : "gap-1", className)} {...rest}>
  <div class="flex items-center justify-between gap-2">
    <span class={cn(
      "font-black uppercase tracking-[var(--letter-spacing-institutional)] text-muted-foreground/60 leading-none truncate",
      variant === "compact" ? "text-[8px]" : "text-[9px]"
    )}>
      {label}
    </span>
  </div>
  
  <div class="flex flex-col">
    <span class={cn(
      "font-mono tabular-nums tracking-tight leading-none",
      variant === "compact" ? "text-xs" : "text-sm",
      weight === "black" ? "font-black" : "font-bold",
      valueColors[status],
      valueClass
    )}>
      {value}
    </span>
    
    {#if subvalue}
      <div class={cn(
        "text-muted-foreground/40 font-medium leading-none truncate",
        variant === "compact" ? "text-[8px] mt-0.5" : "text-[9px] mt-1"
      )}>
        {#if typeof subvalue === "string"}
          {subvalue}
        {:else}
          {@render subvalue()}
        {/if}
      </div>
    {/if}
  </div>
</div>
