<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { onMount } from "svelte";

    let trendCanvas: HTMLCanvasElement;
    let barCanvas: HTMLCanvasElement;
    let loading = $state(true);
    let period = $state<"quarter" | "semester" | "year">("quarter");

    onMount(async () => {
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);

        // Trend Line Chart
        new Chart(trendCanvas, {
            type: "line",
            data: {
                labels: [
                    "Week 1",
                    "Week 2",
                    "Week 3",
                    "Week 4",
                    "Week 5",
                    "Week 6",
                    "Week 7",
                    "Week 8",
                ],
                datasets: [
                    {
                        label: "Compliance Rate (%)",
                        data: [65, 72, 78, 74, 82, 88, 85, 91],
                        borderColor: "#0038A8",
                        backgroundColor: "rgba(0, 56, 168, 0.1)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: (v) => v + "%" },
                    },
                },
            },
        });

        // Stacked Bar Chart
        new Chart(barCanvas, {
            type: "bar",
            data: {
                labels: [
                    "Bulusan ES",
                    "Guinobatan ES",
                    "Ibaba ES",
                    "Salong ES",
                    "Suqui ES",
                ],
                datasets: [
                    {
                        label: "Compliant",
                        data: [18, 22, 15, 20, 17],
                        backgroundColor: "#008751",
                    },
                    {
                        label: "Late",
                        data: [4, 2, 6, 3, 5],
                        backgroundColor: "#FCD116",
                    },
                    {
                        label: "Non-compliant",
                        data: [2, 1, 4, 2, 3],
                        backgroundColor: "#CE1126",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
                },
            },
        });

        loading = false;
    });
</script>

<svelte:head>
    <title>Analytics — Smart E-VISION</title>
</svelte:head>

<div>
    <div class="mb-8 flex items-start justify-between">
        <div>
            <h1 class="text-2xl font-bold text-text-primary">📈 Analytics</h1>
            <p class="text-base text-text-secondary mt-1">
                Compliance trends and data visualization
            </p>
        </div>

        <select
            bind:value={period}
            class="px-4 py-3 text-sm bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"
        >
            <option value="quarter">This Quarter</option>
            <option value="semester">This Semester</option>
            <option value="year">School Year</option>
        </select>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Trend Line -->
        <div class="glass-card-static p-6">
            <h3 class="text-lg font-bold text-text-primary mb-4">
                📉 Compliance Trend
            </h3>
            <div class="h-72">
                <canvas bind:this={trendCanvas}></canvas>
            </div>
        </div>

        <!-- Stacked Bar -->
        <div class="glass-card-static p-6">
            <h3 class="text-lg font-bold text-text-primary mb-4">
                📊 School Comparison
            </h3>
            <div class="h-72">
                <canvas bind:this={barCanvas}></canvas>
            </div>
        </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div class="glass-card-static p-6 text-center">
            <p class="text-4xl font-bold text-deped-blue">91%</p>
            <p class="text-sm text-text-muted mt-2">Current Week Compliance</p>
        </div>
        <div class="glass-card-static p-6 text-center">
            <p class="text-4xl font-bold text-deped-green">+26%</p>
            <p class="text-sm text-text-muted mt-2">Improvement Since Week 1</p>
        </div>
        <div class="glass-card-static p-6 text-center">
            <p class="text-4xl font-bold text-deped-gold-dark">3</p>
            <p class="text-sm text-text-muted mt-2">Schools Above 80% Target</p>
        </div>
    </div>
</div>
