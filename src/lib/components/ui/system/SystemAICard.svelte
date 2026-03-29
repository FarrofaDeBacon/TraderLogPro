<script lang="ts">
  import { cn } from "$lib/utils";
  import SystemCard from "./SystemCard.svelte";
  import { BrainCircuit, Loader2, AlertCircle } from "lucide-svelte";
  import { fade, slide } from "svelte/transition";

  interface Props {
    title?: string;
    description?: string;
    status: "idle" | "loading" | "success" | "error";
    errorText?: string;
    class?: string;
    
    // Meta Info
    origin?: "cache" | "live";
    responseTimeMs?: number;

    // Snippets for different parts
    content?: import("svelte").Snippet;
    matrix?: import("svelte").Snippet;
    actions?: import("svelte").Snippet;
    idleActions?: import("svelte").Snippet;
    retryAction?: import("svelte").Snippet;
  }

  let { 
    title = "Análise (IA)", 
    description = "", 
    status,
    errorText = "Erro na análise.",
    class: className = "",
    origin,
    responseTimeMs,
    content,
    matrix,
    actions,
    idleActions,
    retryAction,
  }: Props = $props();
</script>

<SystemCard class={cn("relative overflow-hidden group p-3", className)}>
  <!-- Subtle Decoration -->
  <div class="absolute -left-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
  
  {#if status === "idle"}
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary/10 rounded-lg text-primary">
          <BrainCircuit class="w-4 h-4" />
        </div>
        <div>
          <h4 class="text-xs font-bold text-foreground/90 leading-tight">{title}</h4>
          {#if description}
            <p class="text-[10px] text-muted-foreground font-medium">{description}</p>
          {/if}
        </div>
      </div>
      {#if idleActions}
        {@render idleActions()}
      {/if}
    </div>

  {:else if status === "loading"}
    <div class="flex items-center justify-center gap-3 py-1" transition:fade>
      <Loader2 class="w-4 h-4 animate-spin text-primary/40" />
      <span class="text-[10px] font-black uppercase tracking-widest text-primary/50">
        Sintetizando correlações neurais...
      </span>
    </div>

  {:else if status === "error"}
    <div class="flex items-center justify-between gap-4 bg-status-danger/5 p-2 rounded-md border border-status-danger/10">
      <div class="flex items-center gap-2">
        <AlertCircle class="w-4 h-4 text-status-danger/60" />
        <span class="text-[10px] font-bold text-status-danger/80 uppercase tracking-tight">{errorText}</span>
      </div>
      {#if retryAction}
        {@render retryAction()}
      {/if}
    </div>

  {:else if status === "success"}
    <div class="flex flex-col md:flex-row gap-4 items-center" transition:slide>
      <!-- Content Section -->
      {#if content}
        <div class="flex-1 min-w-0 border-r border-border/10 pr-4 hidden md:block">
          {@render content()}
        </div>
      {/if}

      <!-- Matrix Section (Grids/Badges) -->
      {#if matrix}
        <div class="flex-[2] w-full">
          {@render matrix()}
        </div>
      {/if}

      <!-- Meta Info (Institutional Footer) -->
      <div class="flex flex-col items-end gap-1 shrink-0 pl-4 border-l border-border/10">
        <span class="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest">System Diagnostics</span>
        {#if origin || responseTimeMs}
          <div class="flex flex-col items-end">
            {#if origin}
              <span class={cn(
                "text-[9px] font-mono",
                origin === "cache" ? "text-status-success/50" : "text-primary/50"
              )}>
                {origin === "cache" ? "⚡ CACHE" : "☁️ LIVE"}
              </span>
            {/if}
            {#if responseTimeMs}
              <span class="text-[8px] font-mono text-muted-foreground/40">{responseTimeMs}ms</span>
            {/if}
          </div>
        {/if}
        {#if actions}
          <div class="mt-1">
            {@render actions()}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</SystemCard>
