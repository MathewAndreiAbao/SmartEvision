<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import { onMount } from "svelte";
    import { normalizeComplianceStatus } from "$lib/utils/useDashboardData";
    import { fly, fade } from "svelte/transition";
    import {
        Folder,
        FolderOpen,
        FileText,
        ChevronRight,
        Home,
        Search,
        Download,
        Eye,
        ArrowLeft,
        School,
        User,
        Calendar,
    } from "lucide-svelte";

    // ── Types ──
    interface Submission {
        id: string;
        user_id: string;
        file_name: string;
        file_hash: string;
        file_size: number;
        doc_type: string;
        compliance_status: string;
        week_number: number | null;
        subject: string | null;
        created_at: string;
        file_path: string;
        uploader?: {
            full_name: string;
            school_id: string | null;
            district_id: string | null;
        };
        school_name?: string;
    }

    interface PathSegment {
        type: "root" | "docType" | "school" | "teacher" | "week";
        id: string;
        label: string;
    }

    interface FolderItem {
        id: string;
        label: string;
        count: number;
        type: "docType" | "school" | "teacher" | "week";
        icon?: string;
    }

    // ── State ──
    let allSubmissions = $state<Submission[]>([]);
    let schoolsMap = $state<Record<string, string>>({});
    let teachersMap = $state<Record<string, string>>({});
    let loading = $state(true);
    let searchQuery = $state("");
    let currentPath = $state<PathSegment[]>([
        { type: "root", id: "root", label: "Archive" },
    ]);

    // ── Lifecycle ──
    onMount(async () => {
        await loadData();
        loading = false;
    });

    // ── Data Fetching ──
    async function loadData() {
        const userProfile = $profile;
        if (!userProfile) return;

        const role = userProfile.role;

        if (role === "Teacher") {
            // Teacher: only own submissions
            const { data } = await supabase
                .from("submissions")
                .select("*")
                .eq("user_id", userProfile.id)
                .order("created_at", { ascending: false });
            allSubmissions = (data as Submission[]) || [];
        } else if (role === "Master Teacher" || role === "School Head") {
            // School-scoped: fetch submissions from teachers at the same school
            if (!userProfile.school_id) return;

            const { data } = await supabase
                .from("submissions")
                .select(
                    "*, uploader:profiles!inner(full_name, school_id, district_id)",
                )
                .eq("profiles.school_id", userProfile.school_id)
                .order("created_at", { ascending: false });

            allSubmissions = ((data as any[]) || []).map((s) => ({
                ...s,
                uploader: s.uploader,
            }));

            // Build teachers map
            const tMap: Record<string, string> = {};
            for (const s of allSubmissions) {
                if (s.user_id && s.uploader?.full_name) {
                    tMap[s.user_id] = s.uploader.full_name;
                }
            }
            teachersMap = tMap;
        } else if (role === "District Supervisor") {
            // District-scoped: fetch submissions from all schools in district
            if (!userProfile.district_id) return;

            // First get all schools in the district
            const { data: schoolsData } = await supabase
                .from("schools")
                .select("id, name")
                .eq("district_id", userProfile.district_id);

            const schools = schoolsData || [];
            const sMap: Record<string, string> = {};
            for (const s of schools) {
                sMap[s.id] = s.name;
            }
            schoolsMap = sMap;

            const schoolIds = schools.map((s) => s.id);
            if (schoolIds.length === 0) return;

            // Fetch all submissions from teachers in those schools
            const { data } = await supabase
                .from("submissions")
                .select(
                    "*, uploader:profiles!inner(full_name, school_id, district_id)",
                )
                .in("profiles.school_id", schoolIds)
                .order("created_at", { ascending: false });

            allSubmissions = ((data as any[]) || []).map((s) => ({
                ...s,
                uploader: s.uploader,
                school_name:
                    sMap[s.uploader?.school_id || ""] || "Unknown School",
            }));

            // Build teachers map
            const tMap: Record<string, string> = {};
            for (const s of allSubmissions) {
                if (s.user_id && s.uploader?.full_name) {
                    tMap[s.user_id] = s.uploader.full_name;
                }
            }
            teachersMap = tMap;
        }
    }

    // ── Navigation ──
    function navigateTo(segment: PathSegment) {
        currentPath = [...currentPath, segment];
    }

    function navigateToBreadcrumb(index: number) {
        currentPath = currentPath.slice(0, index + 1);
    }

    function goBack() {
        if (currentPath.length > 1) {
            currentPath = currentPath.slice(0, -1);
        }
    }

    // ── Current Level & Filtering ──
    const currentLevel = $derived(currentPath[currentPath.length - 1]);

    // Get submissions filtered by the current path
    const filteredByPath = $derived.by(() => {
        let filtered = allSubmissions;
        for (const seg of currentPath) {
            if (seg.type === "docType") {
                filtered = filtered.filter((s) => s.doc_type === seg.id);
            } else if (seg.type === "school") {
                filtered = filtered.filter(
                    (s) => s.uploader?.school_id === seg.id,
                );
            } else if (seg.type === "teacher") {
                filtered = filtered.filter((s) => s.user_id === seg.id);
            } else if (seg.type === "week") {
                filtered = filtered.filter(
                    (s) => String(s.week_number) === seg.id,
                );
            }
        }
        // Apply search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (s) =>
                    s.file_name.toLowerCase().includes(q) ||
                    s.doc_type?.toLowerCase().includes(q) ||
                    s.uploader?.full_name?.toLowerCase().includes(q) ||
                    s.file_hash?.toLowerCase().includes(q),
            );
        }
        return filtered;
    });

    // Determine what folders to show at the current level
    const currentFolders = $derived.by((): FolderItem[] => {
        const role = $profile?.role;
        const depth = currentPath.length; // 1 = root, 2 = level 1, etc.

        if (role === "Teacher") {
            // Teacher: root → weeks
            if (depth === 1) {
                return getWeekFolders(filteredByPath);
            }
            return []; // leaf = files
        }

        if (role === "Master Teacher" || role === "School Head") {
            // MT/SH: root → docTypes → teachers → weeks
            if (depth === 1) return getDocTypeFolders(filteredByPath);
            if (depth === 2) return getTeacherFolders(filteredByPath);
            if (depth === 3) return getWeekFolders(filteredByPath);
            return []; // leaf = files
        }

        if (role === "District Supervisor") {
            // DS: root → docTypes → schools → teachers → weeks
            if (depth === 1) return getDocTypeFolders(filteredByPath);
            if (depth === 2) return getSchoolFolders(filteredByPath);
            if (depth === 3) return getTeacherFolders(filteredByPath);
            if (depth === 4) return getWeekFolders(filteredByPath);
            return []; // leaf = files
        }

        return [];
    });

    // Whether we're at the file/leaf level
    const isFileLevel = $derived(
        currentFolders.length === 0 ||
            (searchQuery &&
                filteredByPath.length > 0 &&
                currentFolders.length === 0),
    );

    // ── Folder Generators ──
    function getDocTypeFolders(subs: Submission[]): FolderItem[] {
        const grouped = new Map<string, number>();
        for (const s of subs) {
            const dt = s.doc_type || "Other";
            grouped.set(dt, (grouped.get(dt) || 0) + 1);
        }
        return Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dt, count]) => ({
                id: dt,
                label: dt,
                count,
                type: "docType" as const,
            }));
    }

    function getSchoolFolders(subs: Submission[]): FolderItem[] {
        const grouped = new Map<string, number>();
        for (const s of subs) {
            const sid = s.uploader?.school_id;
            if (sid) {
                grouped.set(sid, (grouped.get(sid) || 0) + 1);
            }
        }
        return Array.from(grouped.entries())
            .sort(([a], [b]) =>
                (schoolsMap[a] || a).localeCompare(schoolsMap[b] || b),
            )
            .map(([sid, count]) => ({
                id: sid,
                label: schoolsMap[sid] || "Unknown School",
                count,
                type: "school" as const,
            }));
    }

    function getTeacherFolders(subs: Submission[]): FolderItem[] {
        const grouped = new Map<string, number>();
        for (const s of subs) {
            if (s.user_id) {
                grouped.set(s.user_id, (grouped.get(s.user_id) || 0) + 1);
            }
        }
        return Array.from(grouped.entries())
            .sort(([a], [b]) =>
                (teachersMap[a] || a).localeCompare(teachersMap[b] || b),
            )
            .map(([uid, count]) => ({
                id: uid,
                label: teachersMap[uid] || "Unknown Teacher",
                count,
                type: "teacher" as const,
            }));
    }

    function getWeekFolders(subs: Submission[]): FolderItem[] {
        const grouped = new Map<string, number>();
        for (const s of subs) {
            const wk =
                s.week_number != null ? String(s.week_number) : "Unassigned";
            grouped.set(wk, (grouped.get(wk) || 0) + 1);
        }
        return Array.from(grouped.entries())
            .sort(([a], [b]) => {
                const na = parseInt(a);
                const nb = parseInt(b);
                if (isNaN(na) && isNaN(nb)) return a.localeCompare(b);
                if (isNaN(na)) return 1;
                if (isNaN(nb)) return -1;
                return na - nb;
            })
            .map(([wk, count]) => ({
                id: wk,
                label: wk === "Unassigned" ? "Unassigned" : `Week ${wk}`,
                count,
                type: "week" as const,
            }));
    }

    // ── File Helpers ──
    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function formatSize(bytes: number): string {
        if (!bytes) return "—";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    async function getSignedUrl(path: string): Promise<string | null> {
        const { data, error } = await supabase.storage
            .from("submissions")
            .createSignedUrl(path, 60 * 60);
        if (error) {
            console.error("Error getting signed URL:", error);
            return null;
        }
        return data.signedUrl;
    }

    async function handleView(sub: Submission) {
        const path = sub.file_path || `${sub.id}/${sub.file_name}`;
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

    function getFolderColor(type: string): string {
        switch (type) {
            case "docType":
                return "from-gov-blue/15 to-gov-blue/5 text-gov-blue";
            case "school":
                return "from-gov-green/15 to-gov-green/5 text-gov-green";
            case "teacher":
                return "from-gov-gold/15 to-gov-gold/5 text-gov-gold-dark";
            case "week":
                return "from-indigo-100 to-indigo-50 text-indigo-600";
            default:
                return "from-gray-100 to-gray-50 text-gray-600";
        }
    }

    function getFolderIcon(type: string) {
        switch (type) {
            case "school":
                return School;
            case "teacher":
                return User;
            case "week":
                return Calendar;
            default:
                return Folder;
        }
    }

    function getSubtitle(): string {
        const role = $profile?.role;
        if (role === "Teacher")
            return "Browse and search your archived instructional records";
        if (role === "District Supervisor")
            return "Browse all archived documents across your district";
        return "Browse all archived documents in your school";
    }
</script>

<svelte:head>
    <title>Archive — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Document Archive</h1>
        <p class="text-base text-text-secondary mt-1">{getSubtitle()}</p>
    </div>

    <!-- Breadcrumb + Search Bar -->
    <div
        class="glass-card-static p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
    >
        <!-- Breadcrumb -->
        <div class="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {#if currentPath.length > 1}
                <button
                    onclick={goBack}
                    class="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                    title="Go back"
                >
                    <ArrowLeft size={18} />
                </button>
            {/if}
            {#each currentPath as seg, i}
                {#if i > 0}
                    <ChevronRight
                        size={14}
                        class="text-text-muted flex-shrink-0 mx-0.5"
                    />
                {/if}
                <button
                    onclick={() => navigateToBreadcrumb(i)}
                    class="text-sm font-medium px-2 py-1 rounded-md transition-colors whitespace-nowrap flex-shrink-0
                        {i === currentPath.length - 1
                        ? 'text-gov-blue bg-gov-blue/5 font-bold'
                        : 'text-text-muted hover:text-text-primary hover:bg-gray-100'}"
                >
                    {#if i === 0}
                        <span class="flex items-center gap-1.5">
                            <Home size={14} />
                            Archive
                        </span>
                    {:else}
                        {seg.label}
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Search -->
        <div class="relative flex-shrink-0 w-full sm:w-64">
            <Search
                size={16}
                class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search files..."
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none min-h-[44px]"
            />
        </div>
    </div>

    <!-- Content -->
    {#if loading}
        <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
            {#each Array(10) as _}
                <div class="glass-card-static p-6 animate-pulse">
                    <div
                        class="w-12 h-12 bg-gray-200 rounded-xl mx-auto mb-3"
                    ></div>
                    <div
                        class="h-3 bg-gray-200 rounded w-3/4 mx-auto mb-2"
                    ></div>
                    <div class="h-2 bg-gray-100 rounded w-1/2 mx-auto"></div>
                </div>
            {/each}
        </div>
    {:else if !isFileLevel && currentFolders.length > 0}
        <!-- Folder Grid -->
        <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            in:fade={{ duration: 200 }}
        >
            {#each currentFolders as folder, i (folder.id)}
                {@const IconComp = getFolderIcon(folder.type)}
                <button
                    class="gov-card p-5 text-left cursor-pointer group"
                    onclick={() =>
                        navigateTo({
                            type: folder.type,
                            id: folder.id,
                            label: folder.label,
                        })}
                    in:fly={{ y: 20, duration: 300, delay: i * 40 }}
                >
                    <div
                        class="w-12 h-12 rounded-xl bg-gradient-to-br {getFolderColor(
                            folder.type,
                        )} flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform duration-200"
                    >
                        <IconComp size={22} />
                    </div>
                    <p
                        class="text-sm font-semibold text-text-primary text-center truncate leading-tight"
                        title={folder.label}
                    >
                        {folder.label}
                    </p>
                    <p class="text-xs text-text-muted text-center mt-1.5">
                        {folder.count}
                        {folder.count === 1 ? "file" : "files"}
                    </p>
                </button>
            {/each}
        </div>
    {:else if filteredByPath.length === 0}
        <!-- Empty State -->
        <div class="text-center py-20" in:fade={{ duration: 300 }}>
            <div
                class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4"
            >
                <FolderOpen size={28} class="text-text-muted" />
            </div>
            <p class="text-lg font-semibold text-text-primary">
                {searchQuery ? "No matching files" : "This folder is empty"}
            </p>
            <p class="text-sm text-text-muted mt-2">
                {searchQuery
                    ? "Try a different search term"
                    : "No documents have been uploaded yet"}
            </p>
        </div>
    {:else}
        <!-- File List -->
        <div class="space-y-2" in:fade={{ duration: 200 }}>
            <!-- File count header -->
            <div class="flex items-center justify-between px-2 mb-3">
                <p
                    class="text-xs text-text-muted font-semibold uppercase tracking-wider"
                >
                    {filteredByPath.length}
                    {filteredByPath.length === 1 ? "file" : "files"}
                </p>
            </div>

            {#each filteredByPath as sub, i (sub.id)}
                <div
                    class="gov-card-static p-4 flex items-center gap-4 hover:bg-white/80 transition-colors group"
                    in:fly={{ y: 12, duration: 250, delay: i * 30 }}
                >
                    <!-- File Icon -->
                    <div
                        class="w-10 h-10 rounded-xl bg-gradient-to-br from-gov-blue/10 to-gov-blue/5 flex items-center justify-center flex-shrink-0"
                    >
                        <FileText size={18} class="text-gov-blue" />
                    </div>

                    <!-- File Info -->
                    <div class="flex-1 min-w-0">
                        <p
                            class="text-sm font-semibold text-text-primary truncate"
                            title={sub.file_name}
                        >
                            {sub.file_name}
                        </p>
                        <div
                            class="flex items-center gap-2 mt-1 text-xs text-text-muted flex-wrap"
                        >
                            <span
                                class="px-1.5 py-0.5 bg-gray-100 rounded font-medium text-text-secondary"
                            >
                                {sub.doc_type}
                            </span>
                            {#if sub.week_number != null}
                                <span>Week {sub.week_number}</span>
                            {/if}
                            {#if sub.uploader?.full_name && $profile?.role !== "Teacher"}
                                <span>• {sub.uploader.full_name}</span>
                            {/if}
                            <span>• {formatDate(sub.created_at)}</span>
                            {#if sub.file_size}
                                <span class="hidden sm:inline"
                                    >• {formatSize(sub.file_size)}</span
                                >
                            {/if}
                        </div>
                    </div>

                    <!-- Status Badge -->
                    <div class="flex-shrink-0 hidden sm:block">
                        <StatusBadge
                            status={normalizeComplianceStatus(
                                sub.compliance_status,
                            )}
                            size="sm"
                        />
                    </div>

                    <!-- Actions -->
                    <div
                        class="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                        <button
                            onclick={(e) => {
                                e.stopPropagation();
                                handleView(sub);
                            }}
                            class="p-2 text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 rounded-lg transition-all"
                            title="View"
                        >
                            <Eye size={16} />
                        </button>
                        <button
                            onclick={(e) => {
                                e.stopPropagation();
                                handleDownload(sub);
                            }}
                            class="p-2 text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 rounded-lg transition-all"
                            title="Download"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
