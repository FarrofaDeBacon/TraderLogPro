<script lang="ts">
    import { t } from "svelte-i18n";
    import { Hammer, Receipt } from "lucide-svelte";
    import { SystemHeader } from "$lib/components/ui/system";
</script>

<div class="flex-1 flex flex-col space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
    <SystemHeader 
        title="Impostos & Tributação"
        subtitle="Cálculos automáticos e geração de DARF"
        icon={Receipt}
        variant="page"
    />

    <div
        class="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 border border-dashed border-border/40 rounded-3xl bg-muted/5 shadow-inner"
    >
        <div class="p-6 bg-muted/10 rounded-full border border-border/20">
            <Hammer class="w-12 h-12 text-muted-foreground/40" />
        </div>
        <h2 class="text-2xl font-black tracking-tight uppercase">
            Módulo em Construção
        </h2>
        <p class="text-xs text-muted-foreground max-w-[400px] font-bold uppercase tracking-widest opacity-60">
            Estamos implementando o dashboard de cálculo de imposto (DARF). Por
            enquanto, configure suas regras fiscais no menu de Configurações.
        </p>
        <div class="flex gap-4 pt-4">
            <a
                href="/settings/fiscal"
                class="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary/80 transition-colors"
            >
                Ir para Configurações Fiscais &rarr;
            </a>
        </div>
    </div>
</div>
