<script lang="ts">
    import FileDropZone from "$lib/components/FileDropZone.svelte";
    import UploadProgress from "$lib/components/UploadProgress.svelte";
    import {
        runPipeline,
        type PipelinePhase,
        type PipelineResult,
    } from "$lib/utils/pipeline";
    import { getQueueSize } from "$lib/utils/offline";
    import { profile } from "$lib/utils/auth";
    import { settings } from "$lib/stores/settings";
    import { addToast } from "$lib/stores/toast";
    import { supabase } from "$lib/utils/supabase";
    import { onMount, untrack } from "svelte";
    import { extractMetadata, type DocMetadata } from "$lib/utils/ocr";

    interface TeachingLoad {
        id: string;
        subject: string;
        grade_level: string;
    }

    let selectedFile = $state<File | null>(null);
    let docType = $state("DLL");
    let subject = $state("");
    let weekNumber = $state<number | undefined>();
    let teachingLoadId = $state<string>("");
    let teachingLoads = $state<TeachingLoad[]>([]);
    let loadingTeachingLoads = $state(true);
    let currentPhase = $state<PipelinePhase>("transcoding");
    let progress = $state(0);
    let message = $state("");
    let processing = $state(false);
    let result = $state<PipelineResult | null>(null);
    let queueCount = $state(0);
    let processLog = $state<{ timestamp: string; message: string }[]>([]);
    let currentDeadline = $state<any>(null);
    let submissionAlreadyExists = $state(false);
    let ocrConfidence = $state<number | null>(null);
    let fileSizeWarning = $state(false);
    let detectingMetadata = $state(false);
    let detectedMetadata = $state<any>(null);

    // Watch for changes that could invalidate uniqueness
    $effect(() => {
        if (teachingLoadId && weekNumber && docType && $profile) {
            checkExistingSubmission();
        } else {
            submissionAlreadyExists = false;
        }
    });

    async function checkExistingSubmission() {
        const { data, error } = await supabase
            .from("submissions")
            .select("id")
            .eq("teaching_load_id", teachingLoadId)
            .eq("week_number", weekNumber)
            .eq("doc_type", docType)
            .eq("school_year", "2025-2026") // Should ideally match current active SY
            .maybeSingle();

        if (error) {
            console.error("[v0] Error checking existence:", error);
            return;
        }
        submissionAlreadyExists = !!data;
    }

    // Watch weekNumber and fetch deadline
    $effect(() => {
        if (weekNumber && $profile?.district_id) {
            fetchCurrentDeadline(weekNumber, $profile.district_id);
        } else {
            currentDeadline = null;
        }
    });

    async function fetchCurrentDeadline(wk: number, districtId: string) {
        const { data } = await supabase
            .from("academic_calendar")
            .select("deadline_date, description")
            .eq("district_id", districtId)
            .eq("week_number", wk)
            .maybeSingle();
        currentDeadline = data;
    }

    onMount(async () => {
        queueCount = await getQueueSize();

        // Fetch teaching loads for the current user
        if ($profile) {
            const { data, error } = await supabase
                .from("teaching_loads")
                .select("id, subject, grade_level")
                .eq("user_id", $profile.id)
                .eq("is_active", true)
                .order("subject, grade_level");

            if (error) {
                console.error(
                    "[v0] Error fetching teaching loads:",
                    error.message,
                );
                addToast("error", "Failed to load teaching loads");
            } else if (data) {
                teachingLoads = data;
                if (teachingLoads.length > 0) {
                    teachingLoadId = teachingLoads[0].id;
                }
            }

            // Also fetch current week deadline immediately
            const { getWeekNumber } = await import(
                "$lib/utils/useDashboardData"
            );
            const wk = getWeekNumber();
            if ($profile.district_id) {
                fetchCurrentDeadline(wk, $profile.district_id);
            }
        }
        loadingTeachingLoads = false;
    });

    function mapTeachingLoad(metadata: Partial<DocMetadata>): string {
        if (!metadata.subject) return teachingLoadId;

        const sub = metadata.subject.toUpperCase();
        const grade = metadata.gradeLevel;

        // Try exact subject match first
        const exactMatch = teachingLoads.find(
            (l) =>
                l.subject.toUpperCase() === sub &&
                (!grade || l.grade_level === grade),
        );
        if (exactMatch) return exactMatch.id;

        // Try subject name contains or common mappings
        const fuzzyMatch = teachingLoads.find((l) => {
            const loadSub = l.subject.toUpperCase();
            // GMRC / EsP mapping
            if (sub === "GMRC" || sub.includes("PAGPAPAKATAO")) {
                return (
                    loadSub === "GMRC" ||
                    loadSub.includes("ESP") ||
                    loadSub.includes("VALUES")
                );
            }
            // AP mapping
            if (sub === "AP" || sub.includes("PANLIPUNAN")) {
                return loadSub === "AP" || loadSub.includes("SOCIAL");
            }
            return loadSub.includes(sub) || sub.includes(loadSub);
        });

        return fuzzyMatch ? fuzzyMatch.id : "";
    }

    function parseDocDate(dateStr: string | null): Date | null {
        if (!dateStr) return null;
        try {
            console.log("[upload] Attempting to parse date from:", dateStr);
            // Extract the month and day part using regex to ignore any surrounding garbage
            const match = dateStr.match(
                /(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-zA-Z]*\s+\d{1,2}/i,
            );

            if (!match) {
                console.log(
                    "[upload] Could not find Month Day pattern in string",
                );
                return null;
            }

            const cleaned = match[0];
            const yearMatch = dateStr.match(/\d{4}/);
            const year = yearMatch
                ? yearMatch[0]
                : new Date().getFullYear().toString();

            const finalDateStr = `${cleaned}, ${year}`;
            console.log("[upload] Parsed clean date string:", finalDateStr);

            const d = new Date(finalDateStr);
            return isNaN(d.getTime()) ? null : d;
        } catch (e) {
            console.error("[upload] Date parse error:", e);
            return null;
        }
    }

    async function lookupWeekByDate(date: Date, districtId: string) {
        // Find the week where this document's date is between (deadline - 10 days) and (deadline)
        // This prevents dates from months ago jumping forward to the first future deadline.
        const isoDate = date.toISOString();

        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 10);
        const isoEndDate = endDate.toISOString();

        console.log(
            `[upload] Looking up week between: ${isoDate} and ${isoEndDate}, district: ${districtId}`,
        );

        const { data, error } = await supabase
            .from("academic_calendar")
            .select("week_number, deadline_date")
            .gte("deadline_date", isoDate)
            .lte("deadline_date", isoEndDate)
            .eq("district_id", districtId)
            .order("deadline_date", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("[upload] Calendar lookup error:", error);
            return null;
        }

        console.log(`[upload] Lookup result:`, data);
        return data ? data.week_number : null;
    }

    async function onFileSelected(file: File) {
        if ($settings.maintenance_mode) {
            addToast(
                "error",
                "System is currently under maintenance. Uploads are disabled.",
            );
            return;
        }
        selectedFile = file;
        result = null;
        ocrConfidence = null;
        fileSizeWarning =
            file.size > $settings.max_upload_size_mb * 1024 * 1024;

        // Start Smart Detection
        detectingMetadata = true;
        try {
            const metadata = await extractMetadata(file);
            console.log("[upload] OCR metadata result:", metadata);
            detectedMetadata = metadata;

            if (metadata.docType !== "Unknown") {
                docType = metadata.docType;
            }

            // Priority 1: Explicitly stated Week Number
            if (metadata.weekNumber) {
                weekNumber = metadata.weekNumber;
            }
            // Priority 2: Derive Week Number from Date if missing
            else if (metadata.date && $profile?.district_id) {
                const docDate = parseDocDate(metadata.date);
                if (docDate) {
                    const derivedWeek = await lookupWeekByDate(
                        docDate,
                        $profile.district_id,
                    );
                    if (derivedWeek) {
                        weekNumber = derivedWeek;
                        console.log(
                            `[upload] Derived week ${weekNumber} from date ${metadata.date}`,
                        );
                    }
                }
            }

            if (metadata.confidence) {
                ocrConfidence = metadata.confidence;
            }

            // Auto-map teaching load
            const mappedId = mapTeachingLoad(metadata);
            if (mappedId) teachingLoadId = mappedId;

            const { speak } = await import("$lib/utils/voiceGuide");
            speak("Smart detection complete. Fields updated.");
        } catch (err) {
            console.error("[upload] OCR error:", err);
        } finally {
            detectingMetadata = false;
        }
    }

    async function handleUpload() {
        if ($settings.maintenance_mode) {
            addToast(
                "error",
                "System maintenance is active. Upload cancelled.",
            );
            return;
        }
        if (!selectedFile || !$profile || !teachingLoadId) {
            addToast("error", "Please select a teaching load before uploading");
            return;
        }

        processing = true;
        result = null;

        // Voice Guidance feedback
        const { speak, VoicePrompts } = await import("$lib/utils/voiceGuide");
        speak(VoicePrompts.UPLOAD_START);

        const pipeline = runPipeline(selectedFile, {
            userId: $profile.id,
            docType,
            subject: subject || undefined,
            weekNumber,
            teachingLoadId,
            enforceOcr: $settings.enforce_ocr,
            submissionWindowDays: $settings.submission_window_days,
            preDetectedMetadata: detectedMetadata,
        });

        processLog = [];
        const startTime = Date.now();

        for await (const event of pipeline) {
            currentPhase = event.phase;
            progress = event.progress;
            message = event.message;

            // Add to log if message changed (WBS 14.5 Granular Progress)
            if (
                processLog.length === 0 ||
                processLog[processLog.length - 1].message !== event.message
            ) {
                processLog = [
                    ...processLog,
                    {
                        timestamp: new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        }),
                        message: event.message,
                    },
                ];
            }

            if (event.metadata) {
                if (event.metadata.docType !== "Unknown") {
                    docType = event.metadata.docType;
                }
                if (event.metadata.weekNumber) {
                    weekNumber = event.metadata.weekNumber;
                }
                if (event.metadata.confidence !== undefined) {
                    ocrConfidence = event.metadata.confidence;
                }
                const { speak } = await import("$lib/utils/voiceGuide");
                speak("Smart detection complete. Details updated.");
            }

            if (event.phase === "done" && event.result) {
                result = event.result;
                speak(VoicePrompts.UPLOAD_COMPLETE);
                addToast(
                    "success",
                    `Document uploaded successfully! Hash: ${event.result.fileHash.slice(0, 12)}...`,
                );
                selectedFile = null;
            }

            if (event.phase === "error") {
                const { speak, VoicePrompts } = await import(
                    "$lib/utils/voiceGuide"
                );
                speak(VoicePrompts.ERROR);
                addToast("error", event.message);
            }
        }

        processing = false;
        queueCount = await getQueueSize();
    }
</script>

<svelte:head>
    <title>Upload Document — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div
        class="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
        <div>
            <h1
                class="text-2xl font-bold text-text-primary flex items-center gap-2"
            >
                Upload Document <span
                    class="text-[10px] opacity-20 font-mono font-normal"
                    >UPLOAD_PAGE_V2</span
                >
            </h1>
            <p class="text-base text-text-secondary mt-1">
                Submit your DLL, ISP, or ISR for archival
            </p>
            {#if currentDeadline}
                <div
                    class="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gov-blue/5 border border-gov-blue/10 text-xs font-semibold text-gov-blue"
                >
                    Deadline: {new Date(
                        currentDeadline.deadline_date,
                    ).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })}
                    {#if currentDeadline.week_number}
                        · Week {currentDeadline.week_number}
                    {/if}
                </div>
            {/if}
        </div>

        {#if queueCount > 0}
            <div
                class="flex items-center justify-between sm:justify-end gap-2 px-4 py-2 rounded-xl bg-gov-gold/10 text-gov-gold-dark text-sm font-semibold w-full sm:w-auto"
            >
                <div class="flex items-center gap-2">
                    <span class="relative flex h-2 w-2">
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-gov-gold opacity-75"
                        ></span>
                        <span
                            class="relative inline-flex rounded-full h-2 w-2 bg-gov-gold"
                        ></span>
                    </span>
                    {queueCount} file{queueCount > 1 ? "s" : ""} queued offline
                </div>
                <button
                    onclick={async () => {
                        const { processQueue } = await import(
                            "$lib/utils/offline"
                        );
                        const result = await processQueue(true);
                        queueCount = await getQueueSize();
                    }}
                    class="px-3 py-1 bg-gov-gold text-white text-xs rounded-lg hover:bg-gov-gold-dark transition-colors shadow-sm"
                >
                    Sync Now
                </button>
            </div>
        {/if}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Upload Area -->
        <div class="lg:col-span-2 space-y-6">
            <!-- File Drop Zone -->
            <FileDropZone
                onfileselected={onFileSelected}
                disabled={processing || $settings.maintenance_mode}
                maxSizeMb={$settings.max_upload_size_mb}
            />

            {#if $settings.maintenance_mode}
                <div
                    class="p-4 bg-gov-red/10 border border-gov-red/20 rounded-2xl text-gov-red text-center font-bold animate-pulse"
                    role="alert"
                >
                    🚩 SYSTEM MAINTENANCE ACTIVE: UPLOADS ARE TEMPORARILY
                    DISABLED
                </div>
            {/if}

            <!-- Metadata Inputs -->
            {#if selectedFile && !processing}
                <div class="glass-card-static p-6 animate-fade-in">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold text-text-primary">
                            Smart Detection Results
                        </h3>
                        {#if detectingMetadata}
                            <div
                                class="flex items-center gap-2 text-gov-blue text-xs font-bold animate-pulse"
                            >
                                <svg
                                    class="animate-spin h-4 w-4"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        class="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        stroke-width="4"
                                        fill="none"
                                    ></circle>
                                    <path
                                        class="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                ANALYZING DOCUMENT...
                            </div>
                        {:else}
                            <div
                                class="text-[10px] font-bold text-gov-green bg-gov-green/5 px-2 py-1 rounded-md border border-gov-green/10"
                            >
                                SCAN COMPLETE
                            </div>
                        {/if}
                    </div>

                    {#if detectingMetadata}
                        <div class="space-y-4 py-8">
                            <div
                                class="h-12 bg-surface-muted/30 rounded-xl animate-pulse"
                            ></div>
                            <div class="grid grid-cols-2 gap-4">
                                <div
                                    class="h-20 bg-surface-muted/30 rounded-xl animate-pulse"
                                ></div>
                                <div
                                    class="h-20 bg-surface-muted/30 rounded-xl animate-pulse"
                                ></div>
                            </div>
                        </div>
                    {:else}
                        <div class="space-y-6 animate-fade-in">
                            <!-- Matched Teaching Load -->
                            <div
                                class="p-4 rounded-2xl bg-gov-blue/5 border border-gov-blue/10"
                            >
                                <div
                                    class="flex justify-between items-start mb-1"
                                >
                                    <span
                                        class="text-[10px] font-bold text-gov-blue uppercase tracking-widest"
                                        >Matched Teaching Load</span
                                    >
                                    <button
                                        onclick={() => {
                                            const newId = prompt(
                                                "Enter Teaching Load ID or select from list (Manual Select)",
                                            );
                                            if (newId) teachingLoadId = newId;
                                        }}
                                        class="text-[10px] font-bold text-text-muted hover:text-gov-blue transition-colors uppercase"
                                    >
                                        Change
                                    </button>
                                </div>
                                <p class="text-lg font-bold text-text-primary">
                                    {#if teachingLoadId}
                                        {teachingLoads.find(
                                            (l) => l.id === teachingLoadId,
                                        )?.subject || "Unknown"} - {teachingLoads
                                            .find(
                                                (l) => l.id === teachingLoadId,
                                            )
                                            ?.grade_level.toLowerCase()
                                            .includes("grade")
                                            ? ""
                                            : "Grade "}{teachingLoads.find(
                                            (l) => l.id === teachingLoadId,
                                        )?.grade_level || ""}
                                    {:else}
                                        <span class="text-gov-red"
                                            >No matching load found</span
                                        >
                                    {/if}
                                </p>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <!-- Doc Type -->
                                <div
                                    class="p-4 rounded-2xl bg-surface-muted/30 border border-border-subtle"
                                >
                                    <div
                                        class="flex justify-between items-start mb-1"
                                    >
                                        <span
                                            class="text-[10px] font-bold text-text-muted uppercase tracking-widest"
                                            >Document Type</span
                                        >
                                        <button
                                            onclick={() =>
                                                (docType =
                                                    docType === "DLL"
                                                        ? "ISP"
                                                        : "DLL")}
                                            class="text-[10px] font-bold text-gov-blue/60 hover:text-gov-blue transition-colors uppercase"
                                        >
                                            Switch
                                        </button>
                                    </div>
                                    <p
                                        class="text-base font-bold text-text-primary"
                                    >
                                        {docType}
                                    </p>
                                </div>

                                <!-- Week -->
                                <div
                                    class="p-4 rounded-2xl bg-surface-muted/30 border border-border-subtle"
                                >
                                    <div
                                        class="flex justify-between items-start mb-1"
                                    >
                                        <span
                                            class="text-[10px] font-bold text-text-muted uppercase tracking-widest"
                                            >Week Number</span
                                        >
                                        <button
                                            onclick={() => {
                                                const w = prompt(
                                                    "Enter Week Number",
                                                    weekNumber?.toString(),
                                                );
                                                if (w) weekNumber = parseInt(w);
                                            }}
                                            class="text-[10px] font-bold text-gov-blue/60 hover:text-gov-blue transition-colors uppercase"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <p
                                        class="text-base font-bold text-text-primary"
                                    >
                                        Week {weekNumber || "?"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    {/if}

                    {#if ocrConfidence !== null && !detectingMetadata}
                        <div
                            class="mt-6 p-4 rounded-2xl bg-white border border-border-subtle flex items-center justify-between shadow-sm"
                        >
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-2.5 h-2.5 rounded-full {ocrConfidence >
                                    80
                                        ? 'bg-gov-green'
                                        : ocrConfidence > 50
                                          ? 'bg-gov-gold'
                                          : 'bg-gov-red'} shadow-sm animate-pulse"
                                ></div>
                                <div>
                                    <p
                                        class="text-[10px] font-black text-text-primary uppercase tracking-tighter"
                                    >
                                        AI Extraction Integrity
                                    </p>
                                    <p class="text-[9px] text-text-muted">
                                        Reliability of automated metadata
                                    </p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p
                                    class="text-sm font-black {ocrConfidence >
                                    80
                                        ? 'text-gov-green'
                                        : ocrConfidence > 50
                                          ? 'text-gov-gold-dark'
                                          : 'text-gov-red'}"
                                >
                                    {Math.round(ocrConfidence)}%
                                </p>
                            </div>
                        </div>
                    {/if}

                    <!-- Action Button -->
                    {#if !detectingMetadata}
                        {#if submissionAlreadyExists}
                            <div
                                class="mt-6 p-4 bg-gov-red/10 border border-gov-red/30 rounded-xl text-gov-red text-sm font-semibold flex items-center justify-center gap-2"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    /></svg
                                >
                                Already archived for Week {weekNumber}
                            </div>
                        {:else}
                            <button
                                onclick={handleUpload}
                                disabled={!teachingLoadId || processing}
                                class="mt-6 w-full py-4 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white text-lg font-extrabold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:grayscale transition-all duration-300 min-h-[60px] flex items-center justify-center gap-3 uppercase tracking-wide"
                            >
                                {#if processing}
                                    <svg
                                        class="animate-spin h-5 w-5"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            class="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            stroke-width="4"
                                            fill="none"
                                        ></circle>
                                        <path
                                            class="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Processing...
                                {:else}
                                    <svg
                                        class="w-6 h-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        ><path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                        /></svg
                                    >
                                    Confirm & Archive Document
                                {/if}
                            </button>
                        {/if}
                    {/if}
                </div>
            {/if}

            <!-- Processing Progress -->
            <div class="animate-fade-in">
                <UploadProgress {currentPhase} {progress} {message} />

                <!-- Process Log -->
                <div
                    class="mt-4 p-4 rounded-xl bg-gray-900 font-mono text-xs text-green-400 h-48 overflow-y-auto"
                >
                    <div
                        class="mb-2 text-gray-500 border-b border-gray-800 pb-1"
                    >
                        > Smart E-VISION PIPELINE v2.0 initialized...
                    </div>
                    {#each processLog as log}
                        <div class="mb-1">
                            <span class="text-gray-600">[{log.timestamp}]</span>
                            {log.message}
                        </div>
                    {/each}
                    {#if currentPhase !== "done" && currentPhase !== "error"}
                        <div class="animate-pulse">_</div>
                    {/if}
                </div>
            </div>

            <!-- Result -->
            {#if result}
                <div
                    class="glass-card-static p-6 border-l-4 border-gov-green animate-fade-in"
                >
                    <div class="flex items-center gap-3 mb-3">
                        <h3 class="text-lg font-bold text-gov-green">
                            Upload Successful!
                        </h3>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span class="text-text-muted">File:</span>
                            <span class="font-medium text-text-primary ml-1"
                                >{result.fileName}</span
                            >
                        </div>
                        <div>
                            <span class="text-text-muted">Size:</span>
                            <span class="font-medium text-text-primary ml-1"
                                >{(result.fileSize / 1024).toFixed(0)} KB</span
                            >
                        </div>
                        <div class="col-span-2">
                            <span class="text-text-muted">SHA-256:</span>
                            <code
                                class="font-mono text-xs text-gov-blue ml-1 break-all"
                                >{result.fileHash}</code
                            >
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Sidebar Info -->
        <div class="space-y-6">
            <div class="glass-card-static p-6">
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    How It Works
                </h3>
                <ol class="space-y-3 text-sm text-text-secondary">
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >1</span
                        >
                        <span
                            ><strong>Transcode</strong> — Word files are converted
                            to PDF</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >2</span
                        >
                        <span
                            ><strong>Compress</strong> — Files are optimized to &lt;1MB</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >3</span
                        >
                        <span
                            ><strong>Hash</strong> — SHA-256 fingerprint for integrity</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >4</span
                        >
                        <span
                            ><strong>Stamp</strong> — Verification QR code is embedded</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >5</span
                        >
                        <span
                            ><strong>Sync</strong> — Uploaded to secure cloud storage</span
                        >
                    </li>
                </ol>
            </div>

            <div class="glass-card-static p-6 border-l-4 border-gov-gold">
                <h3 class="text-lg font-bold text-text-primary mb-3">
                    Security & Integrity
                </h3>
                <p class="text-sm text-text-secondary mb-3">
                    Your documents are secured with <strong>SHA-256</strong> digital
                    fingerprinting.
                </p>
                <ul class="space-y-2 text-xs text-text-muted">
                    <li class="flex gap-2">
                        <span
                            ><strong>Anti-Tampering:</strong> Any change to the file
                            content will alter its hash, making it invalid.</span
                        >
                    </li>
                    <li class="flex gap-2">
                        <span
                            ><strong>No Duplicates:</strong> The system automatically
                            rejects files that have already been archived.</span
                        >
                    </li>
                    <li class="flex gap-2">
                        <span
                            ><strong>Verifiable:</strong> Each document gets a unique
                            QR code for instant authenticity checks.</span
                        >
                    </li>
                </ul>
            </div>

            <div class="glass-card-static p-6">
                <h3 class="text-lg font-bold text-text-primary mb-3">
                    System Status
                </h3>
                <p class="text-sm text-text-secondary leading-relaxed">
                    No internet? No problem. Your files are queued locally and
                    will auto-sync when your connection is restored.
                </p>
            </div>
        </div>
    </div>
</div>
