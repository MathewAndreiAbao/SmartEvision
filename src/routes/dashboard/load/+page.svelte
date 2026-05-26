<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { onMount } from "svelte";
    import { Edit, Trash2, Plus, BookOpen, Layers } from "lucide-svelte";
    import { fly } from "svelte/transition";

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
        const user = $profile;
        if (!user?.id) return;

        const { data } = await supabase
            .from("teaching_loads")
            .select("*")
            .eq("user_id", user.id)
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
            const user = $profile;
            if (!user?.id) {
                addToast("error", "User session not found");
                return;
            }
            const { error } = await supabase.from("teaching_loads").insert({
                user_id: user.id,
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

<div class="space-y-8">
    <!-- Header -->
    <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
        <div>
            <h1 class="text-3xl font-bold text-text-primary tracking-tight">
                Teaching Load
            </h1>
            <p class="text-base text-text-secondary mt-1 font-medium">
                Manage your academic assignments and grade levels
            </p>
        </div>
        <button
            onclick={openAdd}
            class="px-6 py-3 bg-gov-blue text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg hover:shadow-gov-blue/20 transition-all flex items-center gap-2 group"
        >
            <Plus
                size={16}
                class="group-hover:rotate-90 transition-transform"
            />
            Add New Load
        </button>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each Array(3) as _}
                <div class="gov-card-static p-8 animate-pulse">
                    <div class="h-6 bg-gray-100 rounded-full w-24 mb-6"></div>
                    <div class="h-8 bg-gray-100 rounded w-3/4 mb-4"></div>
                </div>
            {/each}
        </div>
    {:else if loads.length === 0}
        <div
            class="bg-white/50 backdrop-blur-md border border-dashed border-border-strong rounded-3xl p-20 text-center"
        >
            <div
                class="w-16 h-16 bg-gov-blue/10 text-gov-blue rounded-2xl flex items-center justify-center mx-auto mb-6"
            >
                <BookOpen size={32} strokeWidth={1.5} />
            </div>
            <p class="text-xl font-bold text-text-primary">
                No teaching loads configured
            </p>
            <p
                class="text-xs font-bold text-text-muted mt-2 uppercase tracking-widest"
            >
                ARCHIVE YOUR FIRST GRADE LEVEL & SUBJECT TO BEGIN
            </p>
            <button
                onclick={openAdd}
                class="mt-8 px-8 py-3 bg-gov-blue text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md hover:bg-gov-blue-dark transition-all"
            >
                Setup Initial Load
            </button>
        </div>
    {:else}
        <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
            {#each loads as load}
                <div
                    class="bg-white border border-border-subtle rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-gov-blue/20 transition-all group relative flex flex-col h-full"
                    in:fly={{ y: 20, duration: 400 }}
                >
                    <!-- Status Badge -->
                    <div class="absolute top-6 right-6">
                        <button
                            onclick={() => toggleActive(load)}
                            class="w-10 h-5.5 rounded-full relative transition-all shadow-inner {load.is_active
                                ? 'bg-gov-green'
                                : 'bg-gray-200'}"
                            aria-label="Toggle active status"
                            title={load.is_active ? "Active" : "Inactive"}
                        >
                            <span
                                class="absolute top-0.5 transition-all w-4.5 h-4.5 rounded-full bg-white shadow-sm {load.is_active
                                    ? 'translate-x-5'
                                    : 'translate-x-0.5'}"
                            ></span>
                        </button>
                    </div>

                    <div class="mb-6">
                        <div class="flex items-center gap-2 mb-3">
                            <Layers size={14} class="text-gov-blue" />
                            <span
                                class="px-2.5 py-1 bg-gov-blue/5 text-gov-blue text-[10px] font-bold uppercase tracking-widest rounded-full"
                            >
                                {load.grade_level}
                            </span>
                        </div>
                        <h4
                            class="text-lg font-bold text-text-primary leading-tight group-hover:text-gov-blue transition-colors"
                        >
                            {load.subject}
                        </h4>
                    </div>

                    <div
                        class="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between"
                    >
                        <div class="flex items-center gap-2">
                            <span
                                class="text-[10px] font-bold text-text-muted uppercase tracking-tighter"
                                >Modified Recently</span
                            >
                        </div>
                        <div class="flex items-center gap-1">
                            <button
                                onclick={() => openEdit(load)}
                                class="p-2 text-text-muted hover:text-gov-blue hover:bg-gov-blue/5 rounded-lg transition-all"
                                aria-label="Edit Load"
                                title="Edit Load"
                            >
                                <Edit size={16} strokeWidth={2} />
                            </button>
                            <button
                                onclick={() => handleDelete(load.id)}
                                class="p-2 text-text-muted hover:text-gov-red hover:bg-gov-red/5 rounded-lg transition-all"
                                aria-label="Delete Load"
                                title="Delete Load"
                            >
                                <Trash2 size={16} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
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
            class="gov-card-static p-8 w-full max-w-md animate-slide-up"
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
