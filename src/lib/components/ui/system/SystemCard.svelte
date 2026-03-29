<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    status?: "success" | "warning" | "danger" | "info" | "primary" | "none";
    hover?: boolean;
    showGlow?: boolean;
  }

  let { 
    status = "none", 
    hover = false, 
    showGlow = false,
    class: className, 
    children,
    ...rest 
  }: Props = $props();

  const statusColors = {
    success: "border-l-status-success",
    warning: "border-l-status-warning",
    danger: "border-l-status-danger",
    info: "border-l-status-info",
    primary: "border-l-primary",
    none: ""
  };

  const glowColors = {
    success: "bg-status-success/5",
    warning: "bg-status-warning/5",
    danger: "bg-status-danger/5",
    info: "bg-status-info/5",
    primary: "bg-primary/5",
    none: "bg-primary/5"
  };
</script>

<div 
  class={cn(
    "card-glass",
    status !== "none" && "border-l-4",
    statusColors[status],
    hover && "hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300",
    className
  )}
  {...rest}
>
  {#if showGlow}
    <div class={cn(
      "absolute -left-4 -top-4 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-50",
      glowColors[status]
    )}></div>
  {/if}
  
  {@render children?.()}
</div>
