<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { onMount } from "svelte";

    interface TeachingLoad {
        id: string;
        grade_level: string;
        subject: string;
        is_active: boolean;
    }

    let loads = $state<TeachingLoad[]>([]);
    let loading = $state(true);
    let showModal = $state(false);
    let editingId = $state<string | null>(null);
    let gradeLevel = $state("Grade 1");
    let subject = $state("");

    const gradeLevels = [
        "Kindergarten",
        "Grade 1",
        "Grade 2",
        "Grade 3",
        "Grade 4",
        "Grade 5",
        "Grade 6",
    ];

    onMount(async () => {
        await loadTeachingLoads();
        loading = false;
    });

    async function loadTeachingLoads() {
        const { data } = await supabase
            .from("teaching_loads")
            .select("*")
            .eq("user_id", $profile!.id)
            .order("grade_level");

        loads = (data as TeachingLoad[]) || [];
    }

    function openAdd() {
        editingId = null;
        gradeLevel = "Grade 1";
        subject = "";
        showModal = true;
    }

    function openEdit(load: TeachingLoad) {
        editingId = load.id;
        gradeLevel = load.grade_level;
        subject = load.subject;
        showModal = true;
    }

    async function handleSave() {
        if (!subject.trim()) {
            addToast("warning", "Please enter a subject");
            return;
        }

        if (editingId) {
            const { error } = await supabase
                .from("teaching_loads")
                .update({ grade_level: gradeLevel, subject: subject.trim() })
                .eq("id", editingId);
            if (error) {
                addToast("error", error.message);
                return;
            }
            addToast("success", "Teaching load updated");
        } else {
            const { error } = await supabase.from("teaching_loads").insert({
                user_id: $profile!.id,
                grade_level: gradeLevel,
                subject: subject.trim(),
            });
            if (error) {
                addToast("error", error.message);
                return;
            }
            addToast("success", "Teaching load added");
        }

        showModal = false;
        await loadTeachingLoads();
    }

    async function toggleActive(load: TeachingLoad) {
        await supabase
            .from("teaching_loads")
            .update({ is_active: !load.is_active })
            .eq("id", load.id);
        await loadTeachingLoads();
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to remove this teaching load?"))
            return;
        await supabase.from("teaching_loads").delete().eq("id", id);
        addToast("success", "Teaching load removed");
        await loadTeachingLoads();
    }
</script>

<svelte:head>
    <title>Teaching Load — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8 flex items-start justify-between">
        <div>
            <h1 class="text-2xl font-bold text-text-primary">Teaching Load</h1>
            <p class="text-base text-text-secondary mt-1">
                Manage your subjects and grade levels
            </p>
        </div>
        <button
            onclick={openAdd}
            class="px-6 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[48px] flex items-center gap-2"
        >
            + Add Load
        </button>
    </div>

    {#if loading}
        <div class="space-y-3">
            {#each Array(3) as _}
                <div class="glass-card-static p-5 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
            {/each}
        </div>
    {:else if loads.length === 0}
        <div class="text-center py-20">
            <p class="text-xl font-semibold text-text-primary">
                No teaching loads yet
            </p>
            <p class="text-base text-text-muted mt-2">
                Add your grade levels and subjects to start
            </p>
            <button
                onclick={openAdd}
                class="mt-6 px-6 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl shadow-md min-h-[48px]"
            >
                + Add Your First Load
            </button>
        </div>
    {:else}
        <div class="glass-card-static overflow-hidden">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-100">
                        <th
                            class="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase"
                            >Grade Level</th
                        >
                        <th
                            class="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase"
                            >Subject</th
                        >
                        <th
                            class="px-6 py-4 text-center text-xs font-semibold text-text-muted uppercase"
                            >Active</th
                        >
                        <th
                            class="px-6 py-4 text-right text-xs font-semibold text-text-muted uppercase"
                            >Actions</th
                        >
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    {#each loads as load}
                        <tr class="hover:bg-white/40 transition-colors">
                            <td
                                class="px-6 py-4 text-sm font-medium text-text-primary"
                                >{load.grade_level}</td
                            >
                            <td class="px-6 py-4 text-sm text-text-secondary"
                                >{load.subject}</td
                            >
                            <td class="px-6 py-4 text-center">
                                <button
                                    onclick={() => toggleActive(load)}
                                    class="w-12 h-7 rounded-full relative transition-colors {load.is_active
                                        ? 'bg-gov-green'
                                        : 'bg-gray-300'}"
                                    aria-label="Toggle active"
                                >
                                    <span
                                        class="absolute top-0.5 transition-transform w-6 h-6 rounded-full bg-white shadow {load.is_active
                                            ? 'translate-x-5'
                                            : 'translate-x-0.5'}"
                                    ></span>
                                </button>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button
                                    onclick={() => openEdit(load)}
                                    class="text-gov-blue hover:text-gov-blue-dark text-sm font-medium mr-3 min-h-[48px]"
                                    >Edit</button
                                >
                                <button
                                    onclick={() => handleDelete(load.id)}
                                    class="text-gov-red hover:text-red-700 text-sm font-medium min-h-[48px]"
                                    >Delete</button
                                >
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<!-- Modal -->
{#if showModal}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onclick={() => (showModal = false)}
        onkeydown={(e) => e.key === "Escape" && (showModal = false)}
        role="dialog"
        tabindex="-1"
    >
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="glass-card-static p-8 w-full max-w-md animate-slide-up"
            onclick={(e) => e.stopPropagation()}
            onkeydown={() => {}}
            role="document"
        >
            <h2 class="text-xl font-bold text-text-primary mb-6">
                {editingId ? "Edit" : "Add"} Teaching Load
            </h2>

            <div class="space-y-5">
                <div>
                    <label
                        for="grade"
                        class="block text-sm font-semibold text-text-primary mb-2"
                        >Grade Level</label
                    >
                    <select
                        id="grade"
                        bind:value={gradeLevel}
                        class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"
                    >
                        {#each gradeLevels as gl}
                            <option value={gl}>{gl}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label
                        for="subjectInput"
                        class="block text-sm font-semibold text-text-primary mb-2"
                        >Subject</label
                    >
                    <input
                        id="subjectInput"
                        type="text"
                        bind:value={subject}
                        placeholder="e.g., Mathematics"
                        class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"
                    />
                </div>
            </div>

            <div class="flex gap-3 mt-8">
                <button
                    onclick={() => (showModal = false)}
                    class="flex-1 py-3 border border-gray-200 text-text-secondary font-semibold rounded-xl min-h-[48px] hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onclick={handleSave}
                    class="flex-1 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl min-h-[48px] shadow-md hover:shadow-lg transition-all"
                >
                    {editingId ? "Update" : "Add"}
                </button>
            </div>
        </div>
    </div>
{/if}
