<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { supabase } from "$lib/utils/supabase";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import QRScanner from "$lib/components/QRScanner.svelte";
    import { onMount } from "svelte";
    import { lookupOfflineDoc, cacheVerifiedDoc } from "$lib/utils/offline";
    import {
        CheckCircle2,
        ShieldCheck,
        Clock,
        FileText,
        AlertCircle,
        WifiOff,
        Calendar,
        ScanLine,
        Download,
    } from "lucide-svelte";

    interface VerifyResult {
        file_name: string;
        doc_type: string;
        compliance_status: string | null;
        created_at: string;
        file_size: number;
        week_number: number | null;
        subject: string | null;
        school_year: string | null;
        teacher_name: string | null;
        school_name: string | null;
        teaching_load_subject: string | null;
        teaching_load_grade: string | null;
    }

    let result = $state<VerifyResult | null>(null);
    let notFound = $state(false);
    let loading = $state(true);
    let isOfflineData = $state(false);
    let showScanner = $state(false);

    const hash = $derived($page.params.hash);

    onMount(async () => {
        // 1. Check offline cache first (Phase 20.3)
        const cached = await lookupOfflineDoc(hash as string);
        if (cached) {
            result = cached;
            isOfflineData = true;
            loading = false;
        }

        // 2. Try fetching fresh data from Supabase
        try {
            const { data, error } = await supabase
                .from("submissions")
                .select(
                    `
                    file_name, doc_type, compliance_status, created_at, file_size, week_number, subject, school_year,
                    profiles:user_id ( full_name, schools:school_id ( name ) ),
                    teaching_loads ( subject, grade_level )
                `,
                )
                .eq("file_hash", hash)
                .maybeSingle();

            if (data) {
                const profileData = data.profiles as any;
                const teachingLoadData = data.teaching_loads as any;
                const freshResult = {
                    file_name: data.file_name,
                    doc_type: data.doc_type,
                    compliance_status: data.compliance_status,
                    created_at: data.created_at,
                    file_size: data.file_size,
                    week_number: data.week_number,
                    subject: data.subject,
                    school_year: data.school_year,
                    teacher_name: profileData?.full_name || null,
                    school_name: profileData?.schools?.name || null,
                    teaching_load_subject: teachingLoadData?.subject || null,
                    teaching_load_grade: teachingLoadData?.grade_level || null,
                };

                result = freshResult;
                isOfflineData = false;

                // Update cache for future offline use
                await cacheVerifiedDoc(hash as string, freshResult);
            } else if (!result) {
                notFound = true;
            }
        } catch (err) {
            if (!result) notFound = true;
        } finally {
            loading = false;
        }
    });

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const dateFormatted = date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        const timeFormatted = date.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
        return `${dateFormatted} at ${timeFormatted}`;
    }

    function handleScanResult(data: string) {
        showScanner = false;
        // Extract hash from verification URL or use raw data
        const hashMatch = data.match(/\/verify\/([a-f0-9]{64})/i);
        const scannedHash = hashMatch ? hashMatch[1] : data;
        if (scannedHash && /^[a-f0-9]{64}$/i.test(scannedHash)) {
            goto(`/verify/${scannedHash}`);
        }
    }

    function openScanner() {
        showScanner = true;
    }
</script>

<svelte:head>
    <title>Verify Document — Smart E-VISION</title>
</svelte:head>

<!-- QR Scanner Overlay for continuous scanning -->
{#if showScanner}
    <QRScanner
        onScan={handleScanResult}
        onClose={() => (showScanner = false)}
    />
{/if}

<div class="min-h-screen gradient-mesh flex items-center justify-center p-6">
    <div class="w-full max-w-lg animate-slide-up">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div
                class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-gov-blue to-gov-blue-dark flex items-center justify-center text-white text-2xl font-bold shadow-elevated mb-3"
            >
                E
            </div>
            <h1 class="text-xl font-bold text-text-primary">Smart E-VISION</h1>
            <p class="text-sm text-text-muted">Document Verification</p>
        </div>

        {#if loading}
            <div
                class="glass-card-static p-12 text-center"
                role="status"
                aria-label="Loading verification"
            >
                <div
                    class="w-12 h-12 border-4 border-gov-blue/20 border-t-gov-blue rounded-full animate-spin mx-auto mb-4"
                ></div>
                <p
                    class="text-text-muted font-bold uppercase tracking-widest text-xs"
                >
                    Authenticating Hash...
                </p>
            </div>
        {:else if notFound}
            <div
                class="glass-card-static p-10 text-center border-l-4 border-gov-red animate-shake"
                role="alert"
            >
                <AlertCircle size={48} class="text-gov-red mx-auto mb-4" />
                <h2
                    class="text-xl font-black text-gov-red mb-2 uppercase tracking-tight"
                >
                    Invalid Document
                </h2>
                <p class="text-sm text-text-secondary mb-6 font-medium">
                    The scanned hash does not match any official record in our
                    secure registry.
                </p>
                <div
                    class="p-3 bg-gov-red/5 rounded-lg border border-gov-red/10"
                >
                    <code class="text-[10px] text-gov-red font-mono break-all"
                        >{hash}</code
                    >
                </div>
            </div>
        {:else if result}
            <div
                class="glass-card-static overflow-hidden border-t-4 border-gov-green shadow-elevated"
                role="region"
                aria-label="Verification result"
            >
                <!-- Header Status -->
                <div
                    class="bg-gov-green/5 p-8 text-center border-b border-gray-100"
                >
                    <div
                        class="w-16 h-16 bg-gov-green rounded-full flex items-center justify-center text-white shadow-lg mx-auto mb-4 animate-bounce-subtle"
                    >
                        <CheckCircle2 size={32} />
                    </div>
                    <h2
                        class="text-2xl font-black text-gov-green tracking-tight uppercase"
                    >
                        Verified
                    </h2>
                    <div class="flex items-center justify-center gap-2 mt-2">
                        <ShieldCheck size={14} class="text-gov-green" />
                        <p
                            class="text-xs text-text-muted font-bold uppercase tracking-widest"
                        >
                            Official Smart E-VISION Record
                        </p>
                    </div>

                    {#if isOfflineData}
                        <div
                            class="inline-flex items-center gap-1.5 px-3 py-1 bg-gov-gold/10 text-gov-gold rounded-full text-[10px] font-black uppercase tracking-widest mt-4 border border-gov-gold/20"
                        >
                            <WifiOff size={10} />
                            Offline Mode Verification
                        </div>
                    {/if}
                </div>

                <div class="p-8 space-y-6">
                    <!-- Info Grid -->
                    <div class="grid grid-cols-1 gap-5">
                        <div class="flex items-start gap-4">
                            <div
                                class="p-2.5 rounded-xl bg-gray-50 text-text-muted"
                            >
                                <FileText size={20} />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p
                                    class="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1"
                                >
                                    Document Name
                                </p>
                                <p
                                    class="text-sm font-bold text-text-primary truncate"
                                >
                                    {result.file_name}
                                </p>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex items-start gap-4">
                                <div
                                    class="p-2.5 rounded-xl bg-gray-50 text-text-muted"
                                >
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p
                                        class="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1"
                                    >
                                        Status
                                    </p>
                                    <StatusBadge
                                        status={result.compliance_status ===
                                            "on-time" ||
                                        result.compliance_status === "compliant"
                                            ? "compliant"
                                            : result.compliance_status ===
                                                "late"
                                              ? "late"
                                              : "non-compliant"}
                                        size="sm"
                                    />
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div
                                    class="p-2.5 rounded-xl bg-gray-50 text-text-muted"
                                >
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p
                                        class="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1"
                                    >
                                        Upload Time
                                    </p>
                                    <p
                                        class="text-xs font-bold text-text-primary"
                                    >
                                        {formatDate(result.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="border-t border-gray-50 pt-5 space-y-4">
                            {#if result.teacher_name}
                                <div
                                    class="flex justify-between items-center text-sm"
                                >
                                    <span
                                        class="text-text-muted font-bold uppercase tracking-widest text-[10px]"
                                        >Submitted By</span
                                    >
                                    <span class="text-text-primary font-black"
                                        >{result.teacher_name}</span
                                    >
                                </div>
                            {/if}
                            {#if result.school_name}
                                <div
                                    class="flex justify-between items-center text-sm"
                                >
                                    <span
                                        class="text-text-muted font-bold uppercase tracking-widest text-[10px]"
                                        >Origination</span
                                    >
                                    <span class="text-text-primary font-black"
                                        >{result.school_name}</span
                                    >
                                </div>
                            {/if}
                            {#if result.doc_type}
                                <div
                                    class="flex justify-between items-center text-sm"
                                >
                                    <span
                                        class="text-text-muted font-bold uppercase tracking-widest text-[10px]"
                                        >Category</span
                                    >
                                    <span
                                        class="text-gov-blue font-black uppercase text-[10px] px-2 py-0.5 bg-gov-blue/5 rounded"
                                        >{result.doc_type}</span
                                    >
                                </div>
                            {/if}
                        </div>

                        <div
                            class="p-4 bg-surface-muted/50 rounded-2xl border border-gray-100"
                        >
                            <p
                                class="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2"
                            >
                                Registry Hash (SHA-256)
                            </p>
                            <code
                                class="text-[11px] font-mono text-gov-blue break-all leading-relaxed block"
                                >{hash}</code
                            >
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Action Buttons -->
        <div class="flex flex-col gap-3 mt-6">
            <!-- Scan Another Document Button (WBS 13.4 — Continuous Mobile QR) -->
            <button
                onclick={openScanner}
                class="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all min-h-[48px]"
                aria-label="Scan another QR code to verify a different document"
            >
                <ScanLine size={18} />
                Scan Another Document
            </button>

            <a
                href="/dashboard"
                class="block text-center text-sm text-text-muted hover:text-gov-blue transition-colors py-2"
            >
                BACK TO Smart E-VISION
            </a>
        </div>
    </div>
</div>
