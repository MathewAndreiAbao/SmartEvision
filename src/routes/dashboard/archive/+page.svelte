<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import { onMount } from "svelte";

    interface Submission {
        id: string;
        file_name: string;
        file_hash: string;
        file_size: number;
        doc_type: string;
        status: string;
        week_number: number | null;
        subject: string | null;
        created_at: string;
        file_path: string;
    }

    let submissions = $state<Submission[]>([]);
    let loading = $state(true);
    let searchQuery = $state("");
    let viewMode = $state<"grid" | "list">("grid");
    let selectedMonth = $state<string>("all");

    const months = [
        "all",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    onMount(async () => {
        await loadSubmissions();
        loading = false;
    });

    async function loadSubmissions() {
        let query = supabase
            .from("submissions")
            .select("*")
            .order("created_at", { ascending: false });

        if ($profile?.role === "Teacher") {
            query = query.eq("user_id", $profile.id);
        }

        const { data } = await query;
        submissions = (data as Submission[]) || [];
    }

    const filteredSubmissions = $derived(() => {
        let filtered = submissions;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (s) =>
                    s.file_name.toLowerCase().includes(q) ||
                    s.file_hash.toLowerCase().includes(q) ||
                    s.doc_type?.toLowerCase().includes(q),
            );
        }

        if (selectedMonth !== "all") {
            filtered = filtered.filter((s) => {
                const monthName = new Date(s.created_at).toLocaleString("en", {
                    month: "long",
                });
                return monthName === selectedMonth;
            });
        }

        return filtered;
    });

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    async function getSignedUrl(path: string): Promise<string | null> {
        const { data, error } = await supabase.storage
            .from("submissions")
            .createSignedUrl(path, 60 * 60); // 1 hour expiry

        if (error) {
            console.error("Error getting signed URL:", error);
            return null;
        }
        return data.signedUrl;
    }

    async function handleView(sub: Submission) {
        // Extract path from storage. The path in DB might be full URL or relative.
        // Based on upload logic, it's likely 'uid/filename'.
        // Let's assume sub.file_path is accurate.
        // If file_path is full URL, we need to extract the relative path.
        // But schema says: Submissions are stored in 'submissions/{user_id}/{filename}'
        // And `file_path` in submissions table usually stores the path.

        const path = sub.file_path || `${sub.id}/${sub.file_name}`; // Fallback if needed
        const url = await getSignedUrl(path);
        if (url) {
            window.open(url, "_blank");
        } else {
            alert("Could not retrieve file. Please try again.");
        }
    }

    async function handleDownload(sub: Submission) {
        const path = sub.file_path || `${sub.id}/${sub.file_name}`;
        const { data, error } = await supabase.storage
            .from("submissions")
            .download(path);

        if (error) {
            console.error("Download error:", error);
            alert("Download failed.");
            return;
        }

        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = sub.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
</script>

<svelte:head>
    <title>Archive — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary">
            🗄️ Document Archive
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Browse and search your archived instructional records
        </p>
    </div>

    <!-- Toolbar -->
    <div
        class="glass-card-static p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
    >
        <!-- Search -->
        <div class="flex-1 relative">
            <span
                class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                >🔍</span
            >
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search by filename or SHA-256 hash..."
                class="w-full pl-11 pr-4 py-3 text-sm bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deped-blue/30 focus:border-deped-blue outline-none min-h-[48px]"
            />
        </div>

        <!-- Month Filter -->
        <select
            bind:value={selectedMonth}
            class="px-4 py-3 text-sm bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deped-blue/30 focus:border-deped-blue outline-none min-h-[48px]"
        >
            {#each months as month}
                <option value={month}
                    >{month === "all" ? "📅 All Months" : month}</option
                >
            {/each}
        </select>

        <!-- View Toggle -->
        <div class="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
                class="px-4 py-3 text-sm font-medium min-h-[48px] transition-colors {viewMode ===
                'grid'
                    ? 'bg-deped-blue text-white'
                    : 'bg-white/50 text-text-muted hover:text-text-primary'}"
                onclick={() => (viewMode = "grid")}
            >
                ▦ Grid
            </button>
            <button
                class="px-4 py-3 text-sm font-medium min-h-[48px] transition-colors {viewMode ===
                'list'
                    ? 'bg-deped-blue text-white'
                    : 'bg-white/50 text-text-muted hover:text-text-primary'}"
                onclick={() => (viewMode = "list")}
            >
                ☰ List
            </button>
        </div>
    </div>

    <!-- Content -->
    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each Array(6) as _}
                <div class="glass-card-static p-6 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
            {/each}
        </div>
    {:else if filteredSubmissions().length === 0}
        <div class="text-center py-20">
            <p class="text-5xl mb-4">📂</p>
            <p class="text-xl font-semibold text-text-primary">
                No documents found
            </p>
            <p class="text-base text-text-muted mt-2">
                {searchQuery
                    ? "Try a different search term"
                    : "Upload your first document to get started"}
            </p>
        </div>
    {:else if viewMode === "grid"}
        <!-- Grid View -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each filteredSubmissions() as sub}
                <div class="glass-card p-5 cursor-pointer">
                    <div class="flex items-start gap-4">
                        <div
                            class="w-12 h-12 rounded-xl bg-gradient-to-br from-deped-blue/10 to-deped-blue/5 flex items-center justify-center text-2xl flex-shrink-0"
                        >
                            {sub.doc_type === "DLL"
                                ? "📘"
                                : sub.doc_type === "ISP"
                                  ? "📗"
                                  : sub.doc_type === "ISR"
                                    ? "📙"
                                    : "📄"}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p
                                class="text-sm font-semibold text-text-primary truncate"
                            >
                                {sub.file_name}
                            </p>
                            <p class="text-xs text-text-muted mt-1">
                                {sub.doc_type} • Week {sub.week_number || "?"}
                            </p>
                            <div class="flex items-center justify-between mt-3">
                                <StatusBadge
                                    status={sub.status === "Compliant"
                                        ? "compliant"
                                        : sub.status === "Late"
                                          ? "late"
                                          : "pending"}
                                    size="sm"
                                />
                                <span class="text-xs text-text-muted"
                                    >{formatDate(sub.created_at)}</span
                                >
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex flex-col gap-2 flex-shrink-0 ml-2">
                            <button
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleView(sub);
                                }}
                                class="p-2 text-deped-blue hover:bg-deped-blue/10 rounded-lg transition-colors"
                                title="View"
                            >
                                👁️
                            </button>
                            <button
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(sub);
                                }}
                                class="p-2 text-deped-blue hover:bg-deped-blue/10 rounded-lg transition-colors"
                                title="Download"
                            >
                                ⬇️
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <!-- List View -->
        <div class="glass-card-static overflow-hidden">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-100">
                        <th
                            class="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wide"
                            >Document</th
                        >
                        <th
                            class="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wide hidden md:table-cell"
                            >Type</th
                        >
                        <th
                            class="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wide hidden lg:table-cell"
                            >Size</th
                        >
                        <th
                            class="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wide"
                            >Status</th
                        >
                        <th
                            class="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wide hidden sm:table-cell"
                            >Date</th
                        >
                        <th
                            class="px-6 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wide"
                            >Actions</th
                        >
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    {#each filteredSubmissions() as sub}
                        <tr class="hover:bg-white/40 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <span class="text-lg"
                                        >{sub.doc_type === "DLL"
                                            ? "📘"
                                            : sub.doc_type === "ISP"
                                              ? "📗"
                                              : "📄"}</span
                                    >
                                    <span
                                        class="text-sm font-medium text-text-primary"
                                        >{sub.file_name}</span
                                    >
                                </div>
                            </td>
                            <td
                                class="px-6 py-4 text-sm text-text-secondary hidden md:table-cell"
                                >{sub.doc_type}</td
                            >
                            <td
                                class="px-6 py-4 text-sm text-text-muted hidden lg:table-cell"
                                >{formatSize(sub.file_size)}</td
                            >
                            <td class="px-6 py-4">
                                <StatusBadge
                                    status={sub.status === "Compliant"
                                        ? "compliant"
                                        : sub.status === "Late"
                                          ? "late"
                                          : "pending"}
                                    size="sm"
                                />
                            </td>
                            <td class="px-6 py-4">
                                <span
                                    class="text-sm text-text-muted hidden sm:inline-block mr-4"
                                    >{formatDate(sub.created_at)}</span
                                >
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div
                                    class="flex items-center justify-end gap-2"
                                >
                                    <button
                                        onclick={() => handleView(sub)}
                                        class="p-2 text-text-muted hover:text-deped-blue hover:bg-deped-blue/10 rounded-lg transition-colors"
                                        title="View"
                                    >
                                        👁️
                                    </button>
                                    <button
                                        onclick={() => handleDownload(sub)}
                                        class="p-2 text-text-muted hover:text-deped-blue hover:bg-deped-blue/10 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        ⬇️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
