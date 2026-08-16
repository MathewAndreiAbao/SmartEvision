<script lang="ts">
    import { supabase, getRows } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import { onMount } from "svelte";
    import FolderCard from "$lib/components/FolderCard.svelte";
    import { normalizeComplianceStatus } from "$lib/utils/useDashboardData";
    import {
        canViewArchivedDocument,
        canAddReviewRemarks,
    } from "$lib/utils/documentPermissions";
    import { shareVerification } from "$lib/utils/shareIntegration";
    import { addToast } from "$lib/stores/toast";
    import { fly, fade } from "svelte/transition";
    import {
        FolderOpen,
        FileText,
        ChevronRight,
        Home,
        Search,
        Download,
        Eye,
        MessageSquare,
        Share2,
        X,
        ArrowLeft,
        FileSpreadsheet,
    } from "lucide-svelte";
    import { exportStyledExcel } from "$lib/utils/excelExport";
    import type { ReportOptions } from "$lib/utils/excelExport";
    import { cacheMetadata, getCachedMetadata } from "$lib/utils/offline";

    // â”€â”€ Types â”€â”€
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
        teaching_load_id: string | null;
        created_at: string;
        file_path: string;
        uploader?: {
            full_name: string;
            school_id: string | null;
            district_id: string | null;
            avatar_url?: string | null;
        };
        school_name?: string;
        school_avatar?: string | null;
    }

    interface PathSegment {
        type: "root" | "docType" | "school" | "teacher" | "subject" | "week";
        id: string;
        label: string;
    }

    interface FolderItem {
        id: string;
        label: string;
        count: number;
        type: "docType" | "school" | "teacher" | "subject" | "week";
        icon?: string;
        avatar_url?: string | null;
    }

    // â”€â”€ State â”€â”€
    let allSubmissions = $state<Submission[]>([]);
    let schoolsMap = $state<Record<string, { label: string; avatar_url: string | null }>>({});
    let teachersMap = $state<Record<string, { label: string; avatar_url: string | null }>>({});
    let loading = $state(true);
    let loadError = $state<string | null>(null);
    let searchQuery = $state("");
    let currentPage = $state(1);
    const pageSize = 10;
    let currentPath = $state<PathSegment[]>([
        { type: "root", id: "root", label: "Archive" },
    ]);

    // â”€â”€ Remarks & Review Status â”€â”€
    let reviewsMap = $state<Record<string, { reviewer_comment: string | null; status: string | null; return_reason: string | null }>>({});
    let statusFilter = $state<"all" | "for-checking" | "checked">("all");

    let remarkModalOpen = $state(false);
    let remarkTarget = $state<Submission | null>(null);
    let remarkText = $state("");
    let existingRemark = $state<string | null>(null);
    let savingRemark = $state(false);

    const canReview = $derived(
        $profile ? canAddReviewRemarks($profile.role) : false,
    );

    function openRemarkModal(sub: Submission) {
        remarkTarget = sub;
        remarkText = "";
        existingRemark = reviewsMap[sub.id]?.reviewer_comment || null;
        remarkText = existingRemark || "";
        remarkModalOpen = true;
    }

    function closeRemarkModal() {
        remarkModalOpen = false;
        remarkTarget = null;
    }

    async function saveRemark() {
        if (!canReview) {
            addToast(
                "error",
                "You don't have permission to add remarks",
            );
            return;
        }
        if (!remarkTarget || !remarkText.trim() || !$profile) return;
        savingRemark = true;
        const { error } = await supabase.from("dll_reviews").upsert({
            submission_id: remarkTarget.id,
            reviewer_id: $profile.id,
            reviewer_comment: remarkText.trim(),
            status: "needs-check",
        }, { onConflict: "submission_id" });
        savingRemark = false;
        if (error) {
            addToast("error", "Failed to save remark: " + error.message);
        } else {
            reviewsMap[remarkTarget.id] = {
                reviewer_comment: remarkText.trim(),
                status: "needs-check",
                return_reason: null,
            };
            addToast("success", "Remark saved successfully");
            closeRemarkModal();
        }
    }

    // â”€â”€ Lifecycle â”€â”€
    onMount(async () => {
        await loadData();
        loading = false;
    });

    // â”€â”€ Data Fetching â”€â”€
    async function loadData() {
        loadError = null;
        const userProfile = $profile;
        if (!userProfile) return;

        const role = userProfile.role;

        // â”€â”€ Offline: restore cached archive view ─â”€
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            const cached = await getCachedMetadata(`archive_state_${role}_${userProfile.id}`);
            if (cached?.data) {
                allSubmissions = cached.data.submissions || [];
                schoolsMap = cached.data.schoolsMap || {};
                teachersMap = cached.data.teachersMap || {};
                reviewsMap = cached.data.reviewsMap || {};
                console.log("[archive] Loaded archive from offline cache");
                return;
            }
            allSubmissions = [];
            loadError = "You are offline and no cached archive is available on this device yet.";
            return;
        }

        try {

        if (role === "Teacher") {
            const { data } = await supabase
                .from("submissions")
                .select("*")
                .eq("user_id", userProfile.id)
                .eq("doc_type", "DLL")
                .order("created_at", { ascending: false });
            allSubmissions = getRows<Submission>(data);
        } else if (role === "Master Teacher") {
            if (!userProfile.school_id) return;

            const { data } = await supabase
                .from("submissions")
                .select(
                    "*, uploader:profiles!inner(full_name, school_id, district_id, avatar_url)",
                )
                .eq("profiles.school_id", userProfile.school_id)
                .in("doc_type", ["DLL", "ISP", "ISR"])
                .order("created_at", { ascending: false });

            allSubmissions = getRows<Submission>(data);
            teachersMap = buildTeachersMap(allSubmissions);
        } else if (role === "School Head") {
            if (!userProfile.school_id) return;

            const { data } = await supabase
                .from("submissions")
                .select(
                    "*, uploader:profiles!inner(full_name, school_id, district_id, avatar_url)",
                )
                .eq("profiles.school_id", userProfile.school_id)
                .in("doc_type", ["DLL", "ISP", "ISR"])
                .order("created_at", { ascending: false });

            allSubmissions = getRows<Submission>(data);
            teachersMap = buildTeachersMap(allSubmissions);
        } else if (role === "District Supervisor") {
            // District-scoped: fetch submissions from all schools in district
            if (!userProfile.district_id) return;

            // First get all schools in the district
            const { data: schoolsData } = await supabase
                .from("schools")
                .select("id, name, avatar_url")
                .eq("district_id", userProfile.district_id);

            const schools = schoolsData || [];
            const sMap: Record<string, { label: string; avatar_url: string | null }> = {};
            for (const s of schools) {
                sMap[s.id] = {
                    label: s.name,
                    avatar_url: s.avatar_url || null
                };
            }
            schoolsMap = sMap;

            const schoolIds = schools.map((s) => s.id);
            if (schoolIds.length === 0) return;

            // Fetch all submissions from teachers in those schools
            const { data } = await supabase
                .from("submissions")
                .select(
                    "*, uploader:profiles!inner(full_name, school_id, district_id, avatar_url)",
                )
                .in("profiles.school_id", schoolIds)
                .in("doc_type", ["DLL", "ISP", "ISR"])
                .order("created_at", { ascending: false });

            allSubmissions = getRows<Submission>(data).map((s) => {
                const schoolInfo = sMap[s.uploader?.school_id || ""];
                return {
                    ...s,
                    uploader: s.uploader,
                    school_name: schoolInfo?.label || "Unknown School",
                    school_avatar: schoolInfo?.avatar_url || null
                };
            });

            teachersMap = buildTeachersMap(allSubmissions);
        }

        // â”€â”€ Resolve missing school names â”€â”€
        const missingSchoolIds = [...new Set(allSubmissions
            .filter(s => s.uploader?.school_id && !schoolsMap[s.uploader.school_id])
            .map(s => s.uploader!.school_id!)
        )];
        if (missingSchoolIds.length > 0) {
            const { data: missingSchools } = await supabase
                .from("schools")
                .select("id, name, avatar_url")
                .in("id", missingSchoolIds);
            if (missingSchools) {
                for (const ms of missingSchools) {
                    schoolsMap[ms.id] = { label: ms.name, avatar_url: ms.avatar_url || null };
                }
            }
        }

        // â”€â”€ Resolve missing subjects from teaching_loads â”€â”€
        const missingSubjectLoadIds = [...new Set(allSubmissions
            .filter(s => !s.subject && s.teaching_load_id)
            .map(s => s.teaching_load_id!)
        )];
        if (missingSubjectLoadIds.length > 0) {
            const { data: loads } = await supabase
                .from("teaching_loads")
                .select("id, subject")
                .in("id", missingSubjectLoadIds);
            if (loads) {
                const loadSubjectMap: Record<string, string> = {};
                for (const l of loads) {
                    loadSubjectMap[l.id] = l.subject;
                }
                for (const s of allSubmissions) {
                    if (!s.subject && s.teaching_load_id && loadSubjectMap[s.teaching_load_id]) {
                        s.subject = loadSubjectMap[s.teaching_load_id];
                    }
                }
            }
        }

        // Fallback: resolve subjects for submissions without teaching_load_id
        const userIdsWithMissingSubject = [...new Set(allSubmissions
            .filter(s => !s.subject && !s.teaching_load_id && s.user_id)
            .map(s => s.user_id!)
        )];
        if (userIdsWithMissingSubject.length > 0) {
            const { data: userLoads } = await supabase
                .from("teaching_loads")
                .select("user_id, subject")
                .in("user_id", userIdsWithMissingSubject)
                .eq("is_active", true);
            if (userLoads) {
                const userSubjectMap: Record<string, string> = {};
                for (const l of userLoads) {
                    if (!userSubjectMap[l.user_id]) {
                        userSubjectMap[l.user_id] = l.subject;
                    }
                }
                for (const s of allSubmissions) {
                    if (!s.subject && !s.teaching_load_id && s.user_id && userSubjectMap[s.user_id]) {
                        s.subject = userSubjectMap[s.user_id];
                    }
                }
            }
        }

        // Re-map school_name for DS submissions now that schoolsMap is complete
        for (const s of allSubmissions) {
            if (s.uploader?.school_id) {
                const info = schoolsMap[s.uploader.school_id];
                if (info) {
                    s.school_name = info.label;
                    s.school_avatar = info.avatar_url || null;
                }
            }
        }

        // Fill in missing teacher names
        const missingTeacherIds = [...new Set(allSubmissions
            .filter(s => s.user_id && !teachersMap[s.user_id])
            .map(s => s.user_id!)
        )];
        if (missingTeacherIds.length > 0) {
            const { data: missingProfiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", missingTeacherIds);
            if (missingProfiles) {
                for (const p of missingProfiles) {
                    teachersMap[p.id] = { label: p.full_name || p.id.slice(0, 8), avatar_url: null };
                }
            }
        }

        // Fetch dll_reviews for all loaded submissions
        const ids = allSubmissions.map((s) => s.id);
        if (ids.length > 0) {
            const { data: reviews } = await supabase
                .from("dll_reviews")
                .select("submission_id, reviewer_comment, status, return_reason")
                .in("submission_id", ids);
            if (reviews) {
                const map: Record<string, { reviewer_comment: string | null; status: string | null; return_reason: string | null }> = {};
                for (const r of reviews) {
                    map[r.submission_id] = {
                        reviewer_comment: r.reviewer_comment,
                        status: r.status,
                        return_reason: r.return_reason,
                    };
                }
                reviewsMap = map;
            }
        }

        // â”€â”€ Cache finalized state for offline viewing ─â”€
        try {
            await cacheMetadata(`archive_state_${role}_${userProfile.id}`, {
                submissions: allSubmissions,
                schoolsMap,
                teachersMap,
                reviewsMap,
            });
        } catch (e) {
            console.warn("[archive] Failed to cache archive state:", e);
        }
        } catch (err) {
            console.error("[archive] Failed to load data:", err);
            loadError = 'Failed to load archive data. Please try refreshing the page.';
        }
    }

    // â”€â”€ Navigation â”€â”€
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

    // â”€â”€ Current Level & Filtering â”€â”€
    const currentLevel = $derived(currentPath[currentPath.length - 1]);

    // Get submissions filtered by the current path
    const filteredByPath = $derived.by(() => {
        let filtered = allSubmissions.filter((s) => canViewArchivedDocument($profile?.role || '', s.doc_type));
        for (const seg of currentPath) {
            if (seg.type === "docType") {
                filtered = filtered.filter((s) => s.doc_type === seg.id);
            } else if (seg.type === "school") {
                filtered = filtered.filter(
                    (s) => s.uploader?.school_id === seg.id,
                );
            } else if (seg.type === "teacher") {
                filtered = filtered.filter((s) => s.user_id === seg.id);
            } else if (seg.type === "subject") {
                filtered = filtered.filter((s) => (s.subject || (s.doc_type === "DLL" ? "Unassigned" : s.doc_type)) === seg.id);
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
        // Status filter (for DLL review status)
        if (statusFilter !== "all") {
            filtered = filtered.filter((s) => {
                const hasReview = !!reviewsMap[s.id];
                return statusFilter === "checked" ? hasReview : !hasReview;
            });
        }
        return filtered;
    });

    // Determine what folders to show at the current level
    const currentFolders = $derived.by((): FolderItem[] => {
        const role = $profile?.role;
        const depth = currentPath.length;

        if (role === "Teacher") {
            if (depth === 1) return getSubjectFolders(filteredByPath);
            if (depth === 2) return getWeekFolders(filteredByPath);
            return [];
        }

        if (role === "Master Teacher" || role === "School Head" || role === "District Supervisor") {
            if (depth === 1) return getDocTypeFolders(filteredByPath);
            if (depth === 2) return getSchoolFolders(filteredByPath);
            if (depth === 3) return getTeacherFolders(filteredByPath);
            const currentDocType = currentPath.find(p => p.type === "docType");
            if (depth === 4) {
                if (currentDocType?.id === "DLL") return getSubjectFolders(filteredByPath);
                return [];
            }
            if (depth === 5) return getWeekFolders(filteredByPath);
            return [];
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

    // â”€â”€ Pagination â”€â”€
    const totalPages = $derived(Math.ceil(filteredByPath.length / pageSize) || 1);
    const paginatedData = $derived(filteredByPath.slice((currentPage - 1) * pageSize, currentPage * pageSize));

    $effect(() => {
        searchQuery;
        currentPage = 1;
    });

    // â”€â”€ Folder Generators â”€â”€
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
                (schoolsMap[a]?.label || a).localeCompare(schoolsMap[b]?.label || b),
            )
            .map(([sid, count]) => {
                const info = schoolsMap[sid];
                return {
                    id: sid,
                    label: info?.label || "Unknown School",
                    count,
                    type: "school" as const,
                    avatar_url: info?.avatar_url || null
                };
            });
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
                (teachersMap[a]?.label || a).localeCompare(teachersMap[b]?.label || b),
            )
            .map(([uid, count]) => {
                const info = teachersMap[uid];
                return {
                    id: uid,
                    label: info?.label || "Unknown Teacher",
                    count,
                    type: "teacher" as const,
                    avatar_url: info?.avatar_url || null
                };
            });
    }

    function getSubjectFolders(subs: Submission[]): FolderItem[] {
        const grouped = new Map<string, number>();
        for (const s of subs) {
            const sub = s.subject || (s.doc_type === "DLL" ? "Unassigned" : s.doc_type);
            grouped.set(sub, (grouped.get(sub) || 0) + 1);
        }
        return Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([sub, count]) => ({
                id: sub,
                label: sub,
                count,
                type: "subject" as const,
            }));
    }

    function getWeekFolders(subs: Submission[]): FolderItem[] {
        const grouped = new Map<string, number>();
        for (const s of subs) {
            if (s.doc_type !== "DLL") continue;
            const wk = String(s.week_number);
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

    // â”€â”€ File Helpers â”€â”€
    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function formatSize(bytes: number): string {
        if (!bytes) return "â€”";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    async function getSignedUrl(path: string): Promise<string | null> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return null;

            const res = await fetch('/api/storage/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ key: path, intent: 'download' })
            });

            if (!res.ok) throw new Error('Failed to get download URL');
            const { url } = await res.json();
            return url;
        } catch (err) {
            console.error("Error getting R2 signed URL:", err);
            return null;
        }
    }

    async function handleView(sub: Submission) {
        const path = sub.file_path || `${sub.id}/${sub.file_name}`;
        const url = await getSignedUrl(path);
        if (url) {
            window.open(url, "_blank");
        } else {
            addToast("error", "Could not retrieve file. Please try again.");
        }
    }

    async function handleDownload(sub: Submission) {
        const path = sub.file_path || `${sub.id}/${sub.file_name}`;
        const url = await getSignedUrl(path);
        
        if (!url) {
            addToast("error", "Download failed: could not generate secure link.");
            return;
        }

        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = sub.file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            addToast("success", `${sub.file_name} downloaded`);
        } catch (err) {
            console.error("Download error:", err);
            addToast("error", "Download failed during retrieval.");
        }
    }

    async function handleShare(sub: Submission) {
        const result = await shareVerification(sub.file_hash, sub.file_name);
        if (result?.success) {
            if (result.method === 'clipboard') {
                addToast("success", "Verification link copied to clipboard");
            }
        } else if (result?.error) {
            addToast("error", "Share failed: " + result.error);
        } else {
            addToast("info", "Share cancelled");
        }
    }

    function buildTeachersMap(subs: Submission[]) {
        const tMap: Record<string, { label: string; avatar_url: string | null }> = {};
        for (const s of subs) {
            if (s.user_id && s.uploader?.full_name) {
                tMap[s.user_id] = {
                    label: s.uploader.full_name,
                    avatar_url: s.uploader.avatar_url || null
                };
            }
        }
        return tMap;
    }

    function exportAsCSV() {
        const subs = filteredByPath;
        const rows: string[] = [];
        rows.push('File Name,Document Type,Subject,Week,Teacher,School,Status,Date');
        for (const s of subs) {
            const teacher = s.uploader?.full_name || 'Unknown';
            const school = s.school_name || (s.uploader?.school_id ? schoolsMap[s.uploader.school_id]?.label || 'Unknown' : '');
            const date = new Date(s.created_at).toISOString().split('T')[0];
            rows.push(`"${s.file_name}","${s.doc_type}","${s.subject || ''}","${s.week_number ?? ''}","${teacher}","${school}","${s.compliance_status}","${date}"`);
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cedims-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast("success", `Exported ${subs.length} records as CSV`);
    }

    async function exportAsExcel() {
        const subs = filteredByPath;
        if (subs.length === 0) {
            addToast("info", "No records to export");
            return;
        }
        try {
            const date = new Date().toISOString().split("T")[0];

            const rows = subs.map((s) => [
                s.file_name || "",
                s.doc_type || "",
                s.subject || (s.doc_type === "DLL" ? "Unassigned" : s.doc_type || ""),
                s.week_number ?? "",
                s.uploader?.full_name || teachersMap[s.user_id]?.label || "",
                s.school_name ||
                    (s.uploader?.school_id
                        ? schoolsMap[s.uploader.school_id]?.label
                        : "") ||
                    "",
                normalizeComplianceStatus(s.compliance_status),
                new Date(s.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }),
            ]);

            const opts: ReportOptions = {
                fileName: `cedims-export-${date}.xlsx`,
                title: "Document Archive Export",
                subtitle: "CEDIMS – Document Archive",
                meta: [
                    { label: "View", value: currentPath.map((p) => p.label).join(" › ") || "Archive" },
                    { label: "Generated By", value: $profile?.full_name || "—" },
                    { label: "Role", value: $profile?.role || "—" },
                    { label: "Records", value: String(subs.length) },
                ],
                tables: [
                    {
                        title: "Submission Records",
                        headers: [
                            "File Name",
                            "Document Type",
                            "Subject",
                            "Week",
                            "Teacher",
                            "School",
                            "Status",
                            "Date Submitted",
                        ],
                        rows,
                    },
                ],
            };

            const msg = await exportStyledExcel(opts);
            addToast("success", msg);
        } catch (err) {
            console.error("[archive] Excel export failed:", err);
            addToast("error", "Could not generate the Excel report");
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
    <title>Archive â€” CEDIMS</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Document Archive</h1>
        <p class="text-base text-text-secondary mt-1">{getSubtitle()}</p>
    </div>

    <!-- Breadcrumb + Search Bar -->
    <div
        class="gov-card-static p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
    >
        <!-- Breadcrumb -->
        <div class="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {#if currentPath.length > 1}
                <button
                    onclick={goBack}
                    class="p-2 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
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
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-muted'}"
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
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-surface-muted border border-border-subtle rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none min-h-[44px]"
            />
        </div>

        <!-- Status Filter -->
        <div class="flex items-center gap-1 bg-surface-muted border border-border-subtle rounded-xl p-1">
            {#each ["all", "for-checking", "checked"] as opt}
                <button
                    onclick={() => (statusFilter = opt as typeof statusFilter)}
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all {statusFilter === opt ? 'bg-gov-blue text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}"
                >
                    {opt === "all" ? "All" : opt === "for-checking" ? "For Checking" : "Checked"}
                </button>
            {/each}
        </div>

        <!-- Export Buttons -->
        <div class="flex items-center gap-2 flex-shrink-0">
            <button
                onclick={exportAsExcel}
                class="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-gov-green text-white hover:bg-gov-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredByPath.length === 0}
                title="Download professionally formatted Excel report"
            >
                <FileSpreadsheet size={16} />
                <span class="hidden sm:inline">Export Excel</span>
            </button>
            <button
                onclick={exportAsCSV}
                class="flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-xl bg-gov-green/10 text-gov-green hover:bg-gov-green/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredByPath.length === 0}
                title="Download plain CSV"
            >
                <Download size={16} />
                <span class="hidden sm:inline text-xs">CSV</span>
            </button>
        </div>
    </div>

    <!-- Content -->
    {#if loadError}
        <div class="gov-card-static p-6 text-center">
            <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
            </div>
            <p class="text-red-600 dark:text-red-400 font-medium mb-2">Something went wrong</p>
            <p class="text-sm text-text-muted mb-4">{loadError}</p>
            <button onclick={() => { loadData(); }} class="px-4 py-2 bg-gov-blue text-white text-sm font-bold rounded-xl hover:bg-gov-blue-dark transition-colors">
                Try Again
            </button>
        </div>
    {:else if loading}
        <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
            {#each Array(10) as _}
                <div class="gov-card-static p-6 animate-pulse">
                    <div
                        class="w-12 h-12 bg-surface-muted rounded-xl mx-auto mb-3"
                    ></div>
                    <div
                        class="h-3 bg-surface-muted rounded w-3/4 mx-auto mb-2"
                    ></div>
                    <div class="h-2 bg-surface-muted rounded w-1/2 mx-auto"></div>
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
                <FolderCard
                    label={folder.label}
                    count={folder.count}
                    type={folder.type}
                    avatar_url={folder.avatar_url}
                    onclick={() => navigateTo({ type: folder.type, id: folder.id, label: folder.label })}
                    transitionDelay={i * 40}
                />
            {/each}
        </div>
    {:else if filteredByPath.length === 0}
        <!-- Empty State -->
        <div class="text-center py-20" in:fade={{ duration: 300 }}>
            <div
                class="w-16 h-16 rounded-md bg-surface-muted flex items-center justify-center mx-auto mb-4"
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
        <!-- File Grid -->
        <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            in:fade={{ duration: 200 }}
        >
            {#each paginatedData as sub, i (sub.id)}
                <div
                    class="gov-card p-0 overflow-hidden flex flex-col group h-[220px]"
                    in:fly={{ y: 12, duration: 250, delay: i * 30 }}
                >
                    <!-- Card Top: Icon & Status -->
                    <div
                        class="p-5 flex-1 flex flex-col items-center text-center relative"
                    >
                        <!-- Top Floating Status -->
                        <div class="absolute top-3 right-3">
                            <StatusBadge
                                status={normalizeComplianceStatus(
                                    sub.compliance_status,
                                )}
                                size="sm"
                            />
                        </div>

                        <!-- Centered Icon -->
                        <div
                            class="w-14 h-14 rounded-md bg-gradient-to-br from-gov-blue/10 to-gov-blue/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-gov-blue/15 transition-all duration-300 shadow-sm"
                        >
                            <FileText size={28} class="text-gov-blue" />
                        </div>

                        <!-- Filename -->
                        <h4
                            class="text-sm font-bold text-text-primary line-clamp-2 px-2 leading-tight mb-2"
                            title={sub.file_name}
                        >
                            {sub.file_name}
                        </h4>

                        <!-- Metadata Row -->
                        <div
                            class="flex flex-wrap items-center justify-center gap-1.5 mt-auto"
                        >
                            {#if sub.doc_type === 'DLL'}
                                {#if reviewsMap[sub.id]?.status === 'approved'}
                                    <span class="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold rounded uppercase tracking-wider">
                                        Approved
                                    </span>
                                {:else if reviewsMap[sub.id]?.status === 'returned'}
                                    <span class="px-2 py-0.5 bg-gov-red/10 text-gov-red text-[10px] font-bold rounded uppercase tracking-wider">
                                        Returned
                                    </span>
                                {:else if reviewsMap[sub.id]}
                                    <span class="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold rounded uppercase tracking-wider">
                                        Checked
                                    </span>
                                {:else}
                                    <span class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded uppercase tracking-wider">
                                        For Checking
                                    </span>
                                {/if}
                            {/if}
                            <span
                                class="px-2 py-0.5 bg-gov-blue/5 text-gov-blue text-[10px] font-bold rounded uppercase tracking-wider"
                            >
                                {sub.doc_type}
                            </span>
                            {#if sub.week_number != null}
                                <span
                                    class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold rounded uppercase tracking-wider"
                                >
                                    W{sub.week_number}
                                </span>
                            {/if}
                        </div>
                    </div>

                    <!-- Card Footer: Metadata & Actions -->
                    <div
                        class="px-4 py-3 bg-surface-muted border-t border-border-subtle flex items-center justify-between"
                    >
                        <div class="flex flex-col">
                            <span
                                class="text-[10px] font-semibold text-text-muted uppercase tracking-tight"
                            >
                                {formatDate(sub.created_at)}
                            </span>
                            {#if sub.file_size}
                                <span
                                    class="text-[10px] text-text-muted/70 font-medium"
                                >
                                    {formatSize(sub.file_size)}
                                </span>
                            {/if}
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex items-center gap-1">
                            <button
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleView(sub);
                                }}
                                class="p-2 text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 rounded-lg transition-all"
                                title="View Information"
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                onclick={(e) => {
                                    e.stopPropagation();
                                    openRemarkModal(sub);
                                }}
                                class="p-2 text-text-muted hover:text-gov-gold-dark hover:bg-gov-gold/10 rounded-lg transition-all"
                                title="Remarks / Comments"
                            >
                                <MessageSquare size={16} />
                            </button>
                            <button
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(sub);
                                }}
                                class="p-2 text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 rounded-lg transition-all"
                                title="Download File"
                            >
                                <Download size={16} />
                            </button>
                            <button
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleShare(sub);
                                }}
                                class="p-2 text-text-muted hover:text-gov-gold-dark hover:bg-gov-gold/10 rounded-lg transition-all"
                                title="Share Verification Link"
                            >
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-6">
            <p class="text-sm text-text-muted">
                Showing {(currentPage - 1) * pageSize + 1}&ndash;{Math.min(currentPage * pageSize, filteredByPath.length)} of {filteredByPath.length} files
            </p>
            <div class="flex items-center gap-2">
                <button
                    onclick={() => { if (currentPage > 1) currentPage--; }}
                    disabled={currentPage <= 1}
                    class="px-4 py-2 text-sm font-bold rounded-xl transition-all {currentPage <= 1 ? 'bg-surface-muted text-text-muted/50 cursor-not-allowed' : 'bg-surface-muted text-text-primary hover:bg-surface-muted'}"
                >
                    Previous
                </button>
                <span class="px-3 py-1.5 text-sm font-bold text-gov-blue bg-gov-blue/5 rounded-lg">
                    {currentPage} / {totalPages}
                </span>
                <button
                    onclick={() => { if (currentPage < totalPages) currentPage++; }}
                    disabled={currentPage >= totalPages}
                    class="px-4 py-2 text-sm font-bold rounded-xl transition-all {currentPage >= totalPages ? 'bg-surface-muted text-text-muted/50 cursor-not-allowed' : 'bg-surface-muted text-text-primary hover:bg-surface-muted'}"
                >
                    Next
                </button>
            </div>
        </div>
    {/if}
</div>

<!-- Remarks Modal -->
{#if remarkModalOpen && remarkTarget}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onclick={closeRemarkModal}
        onkeydown={(e) => { if (e.key === 'Escape') closeRemarkModal(); }}
        role="presentation"
        tabindex="-1"
    >
        <div
            class="bg-surface-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => { if (e.key === 'Escape') closeRemarkModal(); }}
            role="dialog"
            aria-modal="true"
            tabindex="-1"
        >
            <div class="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <h3 class="text-lg font-bold text-text-primary">
                    {#if existingRemark}
                        Remark
                    {:else if canReview}
                        Add Remark
                    {:else}
                        View Remarks
                    {/if}
                </h3>
                <button
                    onclick={closeRemarkModal}
                    class="p-1 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-lg transition-all"
                >
                    <X size={18} />
                </button>
            </div>

            <div class="px-6 py-4">
                {#if existingRemark}
                    <!-- View existing remark (everyone, including Master Teacher) -->
                    {#if remarkTarget && reviewsMap[remarkTarget.id]?.status === 'returned'}
                        <div class="p-4 bg-gov-red/10 border border-gov-red/30 rounded-xl mb-3">
                            <p class="text-xs font-bold uppercase tracking-wider text-gov-red mb-1">Returned for Revisions</p>
                            <p class="text-sm text-text-primary leading-relaxed">
                                {reviewsMap[remarkTarget.id]?.return_reason || 'No reason provided'}
                            </p>
                        </div>
                    {:else if remarkTarget && reviewsMap[remarkTarget.id]?.status === 'approved'}
                        <div class="p-4 bg-gov-green/10 border border-gov-green/30 rounded-xl mb-3">
                            <p class="text-xs font-bold uppercase tracking-wider text-gov-green">Approved & Compliant</p>
                        </div>
                    {/if}
                    <div class="p-4 bg-gov-gold/5 border border-gov-gold/20 rounded-xl">
                        <p class="text-sm text-text-primary leading-relaxed">{existingRemark}</p>
                        <p class="text-[10px] text-text-muted mt-2 font-medium">Reviewed by supervisor</p>
                    </div>
                    <div class="flex justify-end mt-4">
                        <button
                            onclick={closeRemarkModal}
                            class="px-5 py-2 bg-surface-muted text-text-primary text-sm font-bold rounded-xl hover:bg-surface-muted transition-all"
                        >
                            Close
                        </button>
                    </div>
                {:else}
                    {#if canReview}
                        <!-- Add new remark (Master Teacher, School Head, District Supervisor) -->
                        <textarea
                            bind:value={remarkText}
                            placeholder="Enter your remarks for this DLL..."
                            rows="4"
                            class="w-full p-3 border border-border-subtle rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gov-blue/30"
                        ></textarea>
                        <div class="flex justify-end gap-2 mt-4">
                            <button
                                onclick={closeRemarkModal}
                                class="px-4 py-2 text-sm font-semibold text-text-muted hover:text-text-primary transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onclick={saveRemark}
                                disabled={!remarkText.trim() || savingRemark}
                                class="px-5 py-2 bg-gov-gold-dark text-white text-sm font-bold rounded-xl hover:bg-gov-gold-dark/90 disabled:opacity-50 transition-all"
                            >
                                {savingRemark ? "Saving..." : "Save Remark"}
                            </button>
                        </div>
                    {:else}
                        <div class="p-4 bg-surface-muted border border-border-subtle rounded-xl">
                            <p class="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Remarks</p>
                            <p class="text-sm text-text-muted">
                                No remarks have been added for this document yet.
                            </p>
                        </div>
                        <div class="flex justify-end mt-4">
                            <button
                                onclick={closeRemarkModal}
                                class="px-5 py-2 bg-surface-muted text-text-primary text-sm font-bold rounded-xl hover:bg-surface-muted transition-all"
                            >
                                Close
                            </button>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </div>
{/if}
