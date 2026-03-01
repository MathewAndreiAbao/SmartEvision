<script lang="ts">
  interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    align?: "left" | "center" | "right";
    render?: (value: any, row: any) => string;
  }

  interface Props {
    columns: Column[];
    rows: any[];
    onRowClick?: (row: any) => void;
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
  }

  let {
    columns,
    rows,
    onRowClick,
    searchable = false,
    searchPlaceholder = "Search...",
    emptyMessage = "No data found",
  }: Props = $props();

  let searchQuery = $state("");
  let sortKey = $state("");
  let sortDir = $state<"asc" | "desc">("desc");

  const filteredRows = $derived(() => {
    let result = [...rows];

    // Search filter
    if (searchable && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          return val != null && String(val).toLowerCase().includes(q);
        }),
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal || "");
        const bStr = String(bVal || "");
        return sortDir === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "desc";
    }
  }

  function getAlignClass(align?: string): string {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  }
</script>

{#if searchable}
  <div class="px-6 py-3 border-b border-gray-100">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder={searchPlaceholder}
      class="w-full px-4 py-2.5 text-sm bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none"
    />
  </div>
{/if}

{#if filteredRows().length === 0}
  <div class="p-10 text-center text-text-muted">
    <p class="text-3xl mb-2">📭</p>
    <p class="font-medium">{emptyMessage}</p>
  </div>
{:else}
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-gray-100">
          {#each columns as col}
            <th
              class="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider {getAlignClass(
                col.align,
              )}"
            >
              {#if col.sortable}
                <button
                  class="inline-flex items-center gap-1 hover:text-text-primary transition-colors"
                  onclick={() => toggleSort(col.key)}
                >
                  {col.label}
                  {#if sortKey === col.key}
                    <span class="text-gov-blue"
                      >{sortDir === "asc" ? "↑" : "↓"}</span
                    >
                  {/if}
                </button>
              {:else}
                {col.label}
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        {#each filteredRows() as row}
          <tr
            class="hover:bg-white/40 transition-colors {onRowClick
              ? 'cursor-pointer'
              : ''}"
            onclick={() => onRowClick?.(row)}
          >
            {#each columns as col}
              <td
                class="px-6 py-4 text-sm {getAlignClass(col.align)} {col.key ===
                columns[0]?.key
                  ? 'font-medium text-text-primary'
                  : 'text-text-secondary'}"
              >
                {col.render
                  ? col.render(row[col.key], row)
                  : (row[col.key] ?? "—")}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
