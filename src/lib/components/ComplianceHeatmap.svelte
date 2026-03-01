<script lang="ts">
  import { getComplianceColor } from "$lib/utils/useDashboardData";

  interface HeatmapCell {
    row: string;
    week: number;
    weekLabel: string;
    rate: number;
    count: number;
    tooltip: string;
  }

  interface Props {
    rows: string[];
    weeks: { week: number; label: string }[];
    cells: HeatmapCell[];
    onCellClick?: (row: string, week: number) => void;
  }

  let { rows, weeks, cells, onCellClick }: Props = $props();

  function getCellData(row: string, week: number): HeatmapCell | undefined {
    return cells.find((c) => c.row === row && c.week === week);
  }

  function getCellBg(rate: number): string {
    if (rate >= 80) return "bg-gov-green/70";
    if (rate >= 50) return "bg-gov-gold/60";
    if (rate > 0) return "bg-gov-red/50";
    return "bg-gray-100";
  }

  function getCellText(rate: number): string {
    if (rate >= 80) return "text-white";
    if (rate >= 50) return "text-gray-800";
    if (rate > 0) return "text-white";
    return "text-gray-400";
  }
</script>

<div class="overflow-x-auto">
  <table class="w-full text-xs">
    <thead>
      <tr>
        <th
          class="sticky left-0 z-10 bg-white/90 backdrop-blur px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider min-w-[140px]"
        >
          Name
        </th>
        {#each weeks as w}
          <th
            class="px-2 py-2 text-center text-text-muted font-semibold uppercase tracking-wider min-w-[50px]"
          >
            {w.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-50">
      {#each rows as row}
        <tr class="hover:bg-white/30 transition-colors">
          <td
            class="sticky left-0 z-10 bg-white/90 backdrop-blur px-3 py-2 font-medium text-text-primary truncate max-w-[160px]"
            title={row}
          >
            {row}
          </td>
          {#each weeks as w}
            {@const cell = getCellData(row, w.week)}
            <td class="px-1 py-1 text-center">
              <button
                class="w-full py-1.5 px-1 rounded-md transition-all hover:scale-110 {getCellBg(
                  cell?.rate || 0,
                )} {getCellText(cell?.rate || 0)} font-semibold cursor-pointer"
                title={cell?.tooltip || `${row} — ${w.label}: No data`}
                onclick={() => onCellClick?.(row, w.week)}
              >
                {cell ? `${cell.rate}%` : "—"}
              </button>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if rows.length === 0}
  <div class="p-8 text-center text-text-muted">
    No data available for heatmap
  </div>
{/if}

<!-- Legend -->
<div class="flex items-center gap-4 mt-3 px-3 text-xs text-text-muted">
  <span class="flex items-center gap-1.5">
    <span class="w-3 h-3 rounded-sm bg-gov-green/70"></span> ≥80%
  </span>
  <span class="flex items-center gap-1.5">
    <span class="w-3 h-3 rounded-sm bg-gov-gold/60"></span> 50-79%
  </span>
  <span class="flex items-center gap-1.5">
    <span class="w-3 h-3 rounded-sm bg-gov-red/50"></span> &lt;50%
  </span>
  <span class="flex items-center gap-1.5">
    <span class="w-3 h-3 rounded-sm bg-gray-100"></span> No data
  </span>
</div>
