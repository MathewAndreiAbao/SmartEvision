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
    import { addToast } from "$lib/stores/toast";
    import { onMount } from "svelte";

    let selectedFile = $state<File | null>(null);
    let docType = $state("DLL");
    let subject = $state("");
    let weekNumber = $state<number | undefined>();
    let currentPhase = $state<PipelinePhase>("transcoding");
    let progress = $state(0);
    let message = $state("");
    let processing = $state(false);
    let result = $state<PipelineResult | null>(null);
    let queueCount = $state(0);
    let processLog = $state<{ timestamp: string; message: string }[]>([]);

    onMount(async () => {
        queueCount = await getQueueSize();
    });

    function onFileSelected(file: File) {
        selectedFile = file;
        result = null;
    }

    async function handleUpload() {
        if (!selectedFile || !$profile) return;

        processing = true;
        result = null;

        const pipeline = runPipeline(selectedFile, {
            userId: $profile.id,
            docType,
            subject: subject || undefined,
            weekNumber,
        });

        processLog = [];
        const startTime = Date.now();

        for await (const event of pipeline) {
            currentPhase = event.phase;
            progress = event.progress;
            message = event.message;

            // Add to log if message changed
            if (
                processLog.length === 0 ||
                processLog[processLog.length - 1].message !== event.message
            ) {
                processLog = [
                    ...processLog,
                    {
                        timestamp: new Date().toLocaleTimeString(),
                        message: event.message,
                    },
                ];
            }

            if (event.phase === "done" && event.result) {
                result = event.result;
                addToast(
                    "success",
                    `Document uploaded successfully! Hash: ${event.result.fileHash.slice(0, 12)}...`,
                );
                selectedFile = null;
            }

            if (event.phase === "error") {
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
    <div class="mb-8 flex items-start justify-between">
        <div>
            <h1 class="text-2xl font-bold text-text-primary">
                📤 Upload Document
            </h1>
            <p class="text-base text-text-secondary mt-1">
                Submit your DLL, ISP, or ISR for archival
            </p>
        </div>

        {#if queueCount > 0}
            <div
                class="flex items-center gap-2 px-4 py-2 rounded-xl bg-deped-gold/10 text-deped-gold-dark text-sm font-semibold"
            >
                📡 {queueCount} file{queueCount > 1 ? "s" : ""} queued offline
                <button
                    onclick={async () => {
                        const { processQueue } = await import(
                            "$lib/utils/offline"
                        );
                        const result = await processQueue(true);
                        queueCount = await getQueueSize();
                    }}
                    class="ml-2 px-2 py-1 bg-deped-gold text-white text-xs rounded hover:bg-deped-gold-dark transition-colors"
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
                disabled={processing}
            />

            <!-- Metadata Inputs -->
            {#if selectedFile && !processing}
                <div class="glass-card-static p-6 animate-fade-in">
                    <h3 class="text-lg font-bold text-text-primary mb-4">
                        📋 Document Details
                    </h3>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <!-- Doc Type -->
                        <div>
                            <label
                                for="docType"
                                class="block text-sm font-semibold text-text-primary mb-2"
                                >Document Type</label
                            >
                            <select
                                id="docType"
                                bind:value={docType}
                                class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deped-blue/30 focus:border-deped-blue outline-none min-h-[48px]"
                            >
                                <option value="DLL"
                                    >Daily Lesson Log (DLL)</option
                                >
                                <option value="ISP"
                                    >Instructional Supervisory Plan (ISP)</option
                                >
                                <option value="ISR"
                                    >Instructional Supervisory Report (ISR)</option
                                >
                            </select>
                        </div>

                        <!-- Subject -->
                        <div>
                            <label
                                for="subject"
                                class="block text-sm font-semibold text-text-primary mb-2"
                                >Subject</label
                            >
                            <input
                                id="subject"
                                type="text"
                                bind:value={subject}
                                placeholder="e.g., Mathematics"
                                class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deped-blue/30 focus:border-deped-blue outline-none min-h-[48px]"
                            />
                        </div>

                        <!-- Week -->
                        <div>
                            <label
                                for="week"
                                class="block text-sm font-semibold text-text-primary mb-2"
                                >Week Number</label
                            >
                            <input
                                id="week"
                                type="number"
                                bind:value={weekNumber}
                                placeholder="e.g., 5"
                                min="1"
                                max="52"
                                class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deped-blue/30 focus:border-deped-blue outline-none min-h-[48px]"
                            />
                        </div>
                    </div>

                    <!-- Upload Button -->
                    <button
                        onclick={handleUpload}
                        class="mt-6 w-full py-4 bg-gradient-to-r from-deped-blue to-deped-blue-dark text-white text-lg font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 min-h-[56px] flex items-center justify-center gap-2"
                    >
                        🚀 Start Upload Pipeline
                    </button>
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
                        > SMART E-VISION PIPELINE v2.0 initialized...
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
                    class="glass-card-static p-6 border-l-4 border-deped-green animate-fade-in"
                >
                    <div class="flex items-center gap-3 mb-3">
                        <span class="text-2xl">✅</span>
                        <h3 class="text-lg font-bold text-deped-green">
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
                                class="font-mono text-xs text-deped-blue ml-1 break-all"
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
                    ℹ️ How It Works
                </h3>
                <ol class="space-y-3 text-sm text-text-secondary">
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-deped-blue/10 text-deped-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >1</span
                        >
                        <span
                            ><strong>Transcode</strong> — Word files are converted
                            to PDF</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-deped-blue/10 text-deped-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >2</span
                        >
                        <span
                            ><strong>Compress</strong> — Files are optimized to &lt;1MB</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-deped-blue/10 text-deped-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >3</span
                        >
                        <span
                            ><strong>Hash</strong> — SHA-256 fingerprint for integrity</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-deped-blue/10 text-deped-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >4</span
                        >
                        <span
                            ><strong>Stamp</strong> — Verification QR code is embedded</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <span
                            class="w-7 h-7 rounded-full bg-deped-blue/10 text-deped-blue text-xs font-bold flex items-center justify-center flex-shrink-0"
                            >5</span
                        >
                        <span
                            ><strong>Sync</strong> — Uploaded to secure cloud storage</span
                        >
                    </li>
                </ol>
            </div>

            <div class="glass-card-static p-6 border-l-4 border-deped-gold">
                <h3 class="text-lg font-bold text-text-primary mb-3">
                    🔐 Security & Integrity
                </h3>
                <p class="text-sm text-text-secondary mb-3">
                    Your documents are secured with <strong>SHA-256</strong> digital
                    fingerprinting.
                </p>
                <ul class="space-y-2 text-xs text-text-muted">
                    <li class="flex gap-2">
                        <span>🛡️</span>
                        <span
                            ><strong>Anti-Tampering:</strong> Any change to the file
                            content will alter its hash, making it invalid.</span
                        >
                    </li>
                    <li class="flex gap-2">
                        <span>🚫</span>
                        <span
                            ><strong>No Duplicates:</strong> The system automatically
                            rejects files that have already been archived.</span
                        >
                    </li>
                    <li class="flex gap-2">
                        <span>✅</span>
                        <span
                            ><strong>Verifiable:</strong> Each document gets a unique
                            QR code for instant authenticity checks.</span
                        >
                    </li>
                </ul>
            </div>

            <div class="glass-card-static p-6">
                <h3 class="text-lg font-bold text-text-primary mb-3">
                    📡 Offline Mode
                </h3>
                <p class="text-sm text-text-secondary leading-relaxed">
                    No internet? No problem. Your files are queued locally and
                    will auto-sync when your connection is restored.
                </p>
            </div>
        </div>
    </div>
</div>
