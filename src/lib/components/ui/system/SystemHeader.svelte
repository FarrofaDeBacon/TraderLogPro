<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Component } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle?: string;
    icon?: any;
    variant?: "page" | "section" | "compact";
    actions?: import("svelte").Snippet;
    leading?: import("svelte").Snippet;
  }

  let { 
    title, 
    subtitle = "", 
    icon: Icon, 
    variant = "section",
    actions,
    leading,
    class: className,
    ...rest 
  }: Props = $props();
</script>

<div class={cn(
  "flex flex-col md:flex-row justify-between items-center gap-4 w-full",
  variant === "page" ? "mb-4" : variant === "compact" ? "mb-1.5" : "mb-2",
  className
)} {...rest}>
    <div class="flex items-center gap-3 w-full md:w-auto">
    {#if leading}
      <div class="shrink-0">
        {@render leading()}
      </div>
    {/if}
    
    <div class="flex items-center gap-3">
      {#if Icon}
        <div class={cn(
          "shrink-0 flex items-center justify-center rounded-xl",
          variant === "page" 
            ? "w-10 h-10 bg-primary/10 text-primary border border-primary/20" 
            : "text-muted-foreground/60"
        )}>
          <Icon class={cn(variant === "page" ? "w-5 h-5" : "w-3.5 h-3.5")} />
        </div>
      {/if}
      
      <div class="flex flex-col justify-center">
        <h2 class={cn(
          "font-black uppercase leading-none tracking-tight",
          variant === "page" 
            ? "text-xl" // Absolute Institutional Standard
            : variant === "compact"
              ? "text-[10px] tracking-widest text-foreground/80"
              : "text-[9px] tracking-[var(--letter-spacing-institutional)] text-muted-foreground/60"
        )}>
          {title}
        </h2>
        {#if subtitle}
          <p class={cn(
            "leading-none uppercase tracking-widest",
            variant === "page" 
                ? "text-[10px] font-bold mt-2 opacity-50" // Absolute Institutional Standard
                : variant === "compact" 
                    ? "text-[9px] mt-0.5 opacity-60" 
                    : "text-[10px] mt-1 opacity-60"
          )}>
            {subtitle}
          </p>
        {/if}
      </div>
    </div>
  </div>

  {#if actions}
    <div class="flex items-center gap-2 w-full md:w-auto">
      {@render actions()}
    </div>
  {/if}
</div>
