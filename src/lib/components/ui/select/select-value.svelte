<script lang="ts">
    import { Select as SelectPrimitive } from "bits-ui";

    let { placeholder = "", ...restProps } = $props();
</script>

<!-- @ts-ignore -->
<SelectPrimitive.Value {placeholder} data-slot="select-value" {...restProps} />
