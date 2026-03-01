<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import { addToast } from "$lib/stores/toast";
    import { onMount } from "svelte";
    import { fly, fade } from "svelte/transition";
    import {
        Save,
        Clock,
        AlertCircle,
        CheckCircle2,
        Info,
        CalendarDays,
    } from "lucide-svelte";

    interface Deadline {
        id?: string;
        week_number: number;
        deadline_date: string;
        description: string;
    }

    let schoolYear = $state("2025-2026");
    let quarter = $state(1);
    let deadlines = $state<Deadline[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let resolvedDistrictId = $state<string | null>(null);

    const isTeacher = $derived($profile?.role === "Teacher");
    const canEdit = $derived(!isTeacher);

    onMount(async () => {
        try {
            // Resolve district ID — supervisors have it directly, teachers get it through their school
            if ($profile?.district_id) {
                resolvedDistrictId = $profile.district_id;
                console.log("[v0] District ID from profile:", resolvedDistrictId);
            } else if ($profile?.school_id) {
                const { data, error } = await supabase
                    .from("schools")
                    .select("district_id")
                    .eq("id", $profile.school_id)
                    .single();
                
                if (error) {
                    console.error("[v0] Error resolving district from school:", error);
                } else {
                    resolvedDistrictId = data?.district_id || null;
                    console.log("[v0] District ID resolved from school:", resolvedDistrictId);
                }
            } else {
                console.error("[v0] No district_id or school_id found in profile:", $profile);
            }

            if (resolvedDistrictId) {
                await loadDeadlines();
            } else {
                addToast("warning", "Unable to load calendar for your school/district");
            }
        } catch (err) {
            console.error("[v0] Error in calendar onMount:", err);
            addToast("error", "Failed to load calendar");
        } finally {
            loading = false;
        }
    });

    async function loadDeadlines() {
        if (!resolvedDistrictId) return;

        const { data, error } = await supabase
            .from("academic_calendar")
            .select("*")
            .eq("school_year", schoolYear)
            .eq("quarter", quarter)
            .eq("district_id", resolvedDistrictId)
            .order("week_number", { ascending: true });

        if (error) {
            console.error("[v0] Error loading calendar:", error);
            return;
        }

        // Always ensure we have 10 weeks
        const existingWeeks = data || [];
        deadlines = Array.from({ length: 10 }, (_, i) => {
            const weekNum = i + 1;
            const weekData = existingWeeks.find(
                (w: any) => w.week_number === weekNum,
            );
            return {
                id: weekData?.id,
                week_number: weekNum,
                deadline_date: weekData?.deadline_date
                    ? (weekData.deadline_date as string).split("T")[0]
                    : "",
                description:
                    weekData?.description || `Week ${weekNum} Submission`,
            };
        });
    }

    async function saveWeek(weekData: any) {
        if (!canEdit) {
            addToast("error", "You don't have permission to edit the calendar");
            return;
        }

        if (!resolvedDistrictId) {
            addToast("error", "Unable to determine your district. Please refresh the page.");
            console.error("[v0] Save error: No district ID resolved");
            return;
        }

        if (!weekData.deadline_date) {
            addToast("error", "Please set a deadline date for this week");
            return;
        }

        const payload = {
            ...(weekData.id ? { id: weekData.id } : {}),
            school_year: schoolYear,
            quarter: quarter,
            week_number: weekData.week_number,
            deadline_date: new Date(weekData.deadline_date).toISOString(),
            description: weekData.description,
            district_id: resolvedDistrictId,
        };

        console.log("[v0] Saving week with payload:", payload);

        const { data, error } = await supabase
            .from("academic_calendar")
            .upsert(payload)
            .select();

        if (error) {
            console.error("[v0] Save error:", error);
            addToast(
                "error",
                `Failed to save Week ${weekData.week_number}: ${error.message}`,
            );
        } else {
            addToast("success", `Week ${weekData.week_number} updated!`);
            if (data && data[0]) {
                weekData.id = data[0].id;
            }
        }
    }

    function isPast(dateStr: string): boolean {
        if (!dateStr) return false;
        // Deadline is end of day (11:59:59 PM)
        const deadline = new Date(dateStr);
        deadline.setHours(23, 59, 59, 999);
        return new Date() > deadline;
    }

    function isUpcoming(dateStr: string): boolean {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);

        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDays = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        threeDays.setHours(23, 59, 59, 999);

        return d >= today && d <= threeDays;
    }

    $effect(() => {
        if (schoolYear || quarter) {
            loadDeadlines();
        }
    });
</script>

<svelte:head>
    <title>Academic Calendar — Smart E-VISION</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div
        class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
    >
        <div>
            <h1 class="text-3xl font-black text-text-primary tracking-tight">
                Academic Calendar
            </h1>
            <p class="text-base text-text-secondary mt-1 font-medium max-w-lg">
                Manage submission deadlines and institutional timeline for the
                current school year.
            </p>
        </div>

        <div
            class="flex items-center gap-3 p-1.5 bg-surface-muted rounded-2xl border border-border-subtle shadow-sm"
        >
            <select
                bind:value={schoolYear}
                class="px-4 py-2 bg-transparent border-none rounded-xl focus:ring-0 outline-none text-sm font-bold text-gov-blue cursor-pointer"
            >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
            </select>
            <div class="w-px h-4 bg-border-subtle"></div>
            <select
                bind:value={quarter}
                class="px-4 py-2 bg-transparent border-none rounded-xl focus:ring-0 outline-none text-sm font-bold text-gov-blue cursor-pointer"
            >
                <option value={1}>1st Quarter</option>
                <option value={2}>2nd Quarter</option>
                <option value={3}>3rd Quarter</option>
                <option value={4}>4th Quarter</option>
            </select>
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each Array(6) as _}
                <div class="glass-card-static p-8 h-36 animate-pulse"></div>
            {/each}
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8" in:fade>
            {#each deadlines as d, i (d.week_number)}
                <div
                    class="glass-card-static p-8 group relative overflow-hidden"
                    in:fly={{ y: 20, delay: i * 50 }}
                >
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-14 h-14 rounded-2xl bg-gov-blue text-white flex items-center justify-center font-black text-xl shadow-lg shadow-gov-blue/20"
                            >
                                {d.week_number}
                            </div>
                            <div>
                                <h3
                                    class="font-black text-text-primary text-lg"
                                >
                                    Week {d.week_number}
                                </h3>
                                <div class="flex items-center gap-1.5 mt-1">
                                    {#if !canEdit && d.deadline_date}
                                        {#if isPast(d.deadline_date)}
                                            <div
                                                class="flex items-center gap-1 text-[10px] font-black uppercase text-gov-red"
                                            >
                                                <AlertCircle size={10} />
                                                Expired
                                            </div>
                                        {:else if isUpcoming(d.deadline_date)}
                                            <div
                                                class="flex items-center gap-1 text-[10px] font-black uppercase text-gov-gold-dark"
                                            >
                                                <Clock size={10} />
                                                Upcoming
                                            </div>
                                        {:else}
                                            <div
                                                class="flex items-center gap-1 text-[10px] font-black uppercase text-gov-green"
                                            >
                                                <CheckCircle2 size={10} />
                                                Active
                                            </div>
                                        {/if}
                                    {:else}
                                        <div
                                            class="flex items-center gap-1 text-[10px] font-black uppercase text-text-muted"
                                        >
                                            <Info size={10} />
                                            Admin View
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        {#if canEdit}
                            <button
                                onclick={() => saveWeek(d)}
                                class="p-2.5 rounded-xl bg-gov-blue/5 text-gov-blue hover:bg-gov-blue hover:text-white active:scale-95 transition-all shadow-sm flex items-center justify-center"
                                title="Save Week {d.week_number}"
                            >
                                <Save size={20} strokeWidth={2.5} />
                            </button>
                        {/if}
                    </div>

                    <div class="space-y-4">
                        <div class="relative">
                            <label
                                class="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-gov-blue uppercase tracking-widest z-10"
                                for="date-{i}"
                            >
                                Due Date
                            </label>
                            {#if canEdit}
                                <input
                                    id="date-{i}"
                                    type="date"
                                    bind:value={d.deadline_date}
                                    class="w-full px-4 py-3.5 bg-white/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gov-blue/20 focus:border-gov-blue outline-none text-sm font-semibold transition-all"
                                />
                            {:else}
                                <p
                                    class="w-full px-4 py-3.5 bg-white/30 border border-gray-100 rounded-2xl text-sm font-semibold text-text-primary"
                                >
                                    {d.deadline_date
                                        ? new Date(
                                              d.deadline_date + "T00:00:00",
                                          ).toLocaleDateString("en-PH", {
                                              weekday: "long",
                                              month: "long",
                                              day: "numeric",
                                              year: "numeric",
                                          })
                                        : "Not set"}
                                </p>
                            {/if}
                        </div>

                        <div class="relative">
                            <label
                                class="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-text-muted uppercase tracking-widest z-10"
                                for="desc-{i}"
                            >
                                Notes / Purpose
                            </label>
                            {#if canEdit}
                                <input
                                    id="desc-{i}"
                                    type="text"
                                    bind:value={d.description}
                                    placeholder="e.g. DLL Submission..."
                                    class="w-full px-4 py-3.5 bg-white/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gov-blue/20 focus:border-gov-blue outline-none text-sm font-medium placeholder:text-gray-300 transition-all"
                                />
                            {:else}
                                <p
                                    class="w-full px-4 py-3.5 bg-white/30 border border-gray-100 rounded-2xl text-sm font-medium text-text-secondary"
                                >
                                    {d.description || "—"}
                                </p>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        {#if canEdit}
            <div
                class="mt-12 p-8 bg-surface border border-border-subtle rounded-[2.5rem] shadow-sm"
            >
                <div class="flex items-start gap-4">
                    <div
                        class="p-2.5 rounded-xl bg-gov-blue/10 text-gov-blue group-hover:bg-gov-blue group-hover:text-white transition-all"
                    >
                        <Info size={24} />
                    </div>
                    <div>
                        <h4 class="font-bold text-text-primary text-lg mb-1">
                            Operational Guidelines
                        </h4>
                        <p class="text-sm text-text-secondary leading-relaxed">
                            Each week is saved individually by clicking the <span
                                class="inline-flex items-center justify-center px-2 py-0.5 rounded bg-gov-blue/10 text-gov-blue font-bold text-[10px] uppercase"
                                >Save</span
                            >
                            icon. Deadlines are set to
                            <strong>11:59 PM</strong> of the selected date. Submissions
                            after this will be marked as "Late" or "Non-compliant"
                            automatically.
                        </p>
                    </div>
                </div>
            </div>
        {:else}
            <div
                class="mt-12 p-8 bg-surface border border-border-subtle rounded-[2.5rem] shadow-sm"
            >
                <div class="flex items-start gap-4">
                    <div
                        class="p-2.5 rounded-xl bg-gov-green/10 text-gov-green"
                    >
                        <CalendarDays size={24} />
                    </div>
                    <div>
                        <h4 class="font-bold text-text-primary text-lg mb-1">
                            Submission Protocols
                        </h4>
                        <p class="text-sm text-text-secondary leading-relaxed">
                            Submit your documents before the deadline to be
                            marked as
                            <strong>Compliant</strong>. Submissions after the
                            deadline are marked as <strong>Late</strong> or
                            <strong>Non-compliant</strong>. Contact your
                            supervisor if you need deadline adjustments.
                        </p>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
    /* Premium glass/card aesthetics */
    :global(.glass-card-static) {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(20px);
    }
</style>
