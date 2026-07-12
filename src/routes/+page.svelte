<script lang="ts">
    import { profile, authLoading } from "$lib/utils/auth";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { theme } from "$lib/stores/theme";
    import {
        BadgeCheck,
        BellRing,
        BookOpen,
        FileCheck2,
        Layers3,
        LogIn,
        Mail,
        MapPin,
        Moon,
        Phone,
        ShieldCheck,
        Sun,
        Workflow,
    } from "lucide-svelte";
    import { fly } from "svelte/transition";

    const features = [
        {
            title: "DLL Monitoring",
            description:
                "Track daily lesson logs and monitor submission timeliness for each teacher.",
            icon: FileCheck2,
        },
        {
            title: "Compliance Tracking",
            description:
                "Keep school and district compliance visible through a simple weekly overview.",
            icon: ShieldCheck,
        },
        {
            title: "Review Workflow",
            description:
                "Support teacher revisions, remarks, and approvals in a clear review timeline.",
            icon: Workflow,
        },
        {
            title: "QR Verification",
            description:
                "Verify document authenticity instantly through secure QR code stamping.",
            icon: ShieldCheck,
        },
        {
            title: "Reports & Archive",
            description:
                "Generate concise reports and preserve document history for future reference.",
            icon: Layers3,
        },
        {
            title: "Notifications",
            description:
                "Receive real-time alerts for submissions, reviews, and compliance updates.",
            icon: BellRing,
        },
    ];

    const faqs = [
        {
            question: "Who can use CEDIMS?",
            answer:
                "The system is intended for teachers, school heads, master teachers, and district supervisors in Calapan East District.",
        },
        {
            question: "What documents are monitored?",
            answer:
                "DLLs, ISPs, and ISRs can be submitted and tracked through the same workflow.",
        },
        {
            question: "How does the review process work?",
            answer:
                "Teachers upload DLLs, master teachers review with comments, teachers can revise if needed, and all remarks are preserved in a threaded timeline.",
        },
        {
            question: "Is the system available offline?",
            answer:
                "The platform supports offline-ready submissions and later sync when a network connection is available.",
        },
        {
            question: "How are documents verified?",
            answer:
                "Each submission is assigned a unique QR code and file hash. Anyone can scan the code to verify document authenticity and review the audit trail.",
        },
    ];

    onMount(() => {
        theme.init();
        const unsubscribe = profile.subscribe((p) => {
            if (p) {
                goto("/dashboard");
            }
        });

        return unsubscribe;
    });
</script>

<svelte:head>
    <title>CEDIMS — Calapan East District Instructional Monitoring System</title>
</svelte:head>

<div class="min-h-screen bg-surface-muted text-text-primary">
    <header class="border-b border-border-subtle bg-surface-white/90 backdrop-blur">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <a href="/" class="flex shrink-0 items-center gap-2 sm:gap-3">
                <img src="/app_icon.png" alt="CEDIMS" class="h-9 w-9 sm:h-10 sm:w-10 rounded-lg" />
                <div class="hidden xs:block">
                    <p class="text-sm font-semibold text-text-primary">CEDIMS</p>
                    <p class="text-[10px] font-semibold uppercase tracking-[0.25em] text-gov-blue">
                        Instructional Monitoring
                    </p>
                </div>
            </a>
            {#if !$authLoading}
                {#if $profile}
                    <button onclick={() => goto("/dashboard")} class="gov-btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5">
                        Open Dashboard
                    </button>
                {:else}
                    <div class="flex items-center gap-1.5 sm:gap-3">
                        <button
                            onclick={() => theme.toggle()}
                            class="rounded-xl border border-border-subtle p-2 sm:p-2.5 text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
                            aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {#if $theme === 'dark'}
                                <Sun size={16} />
                            {:else}
                                <Moon size={16} />
                            {/if}
                        </button>
                        <button onclick={() => goto("/auth/login")} class="hidden sm:inline-flex text-sm font-semibold text-text-secondary transition hover:text-gov-blue">
                            Sign In
                        </button>
                        <button onclick={() => goto("/auth/login")} class="gov-btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5">
                            <LogIn size={14} class="sm:size-[16]" />
                            <span class="hidden xs:inline">Access</span> Portal                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    </header>

    <main>
        <section class="mx-auto grid max-w-7xl gap-8 sm:gap-10 px-4 sm:px-6 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div in:fly={{ y: 18, duration: 400 }} class="max-w-2xl">
                <div class="mb-4 sm:mb-5 inline-flex items-center gap-2 rounded-full border border-gov-blue/10 bg-gov-blue/5 px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-gov-blue">
                    <BadgeCheck size={12} class="sm:size-[14]" />
                    DepEd Calapan East District
                </div>
                <h1 class="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-text-primary">
                    A clearer way to monitor instructional compliance.
                </h1>
                <p class="mt-4 sm:mt-5 text-base sm:text-lg leading-7 sm:leading-8 text-text-secondary">
                    CEDIMS helps teachers, school leaders, and district supervisors manage DLL submissions, review records, and compliance tracking in one professional, easy-to-use system.
                </p>
                <div class="mt-6 sm:mt-8 flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <button onclick={() => goto("/auth/login")} class="gov-btn-primary px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base">
                        <LogIn size={16} class="sm:size-[18]" />
                        Sign In
                    </button>
                    <a href="#about" class="gov-btn-secondary px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base text-center">
                        Learn More
                    </a>
                </div>
                <div class="mt-6 sm:mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-text-secondary">
                    <span class="inline-flex items-center gap-1.5"><BookOpen size={14} class="sm:size-[16]" /> Guided workflow</span>
                    <span class="inline-flex items-center gap-1.5"><BellRing size={14} class="sm:size-[16]" /> Review notifications</span>
                    <span class="inline-flex items-center gap-1.5"><ShieldCheck size={14} class="sm:size-[16]" /> Secure records</span>
                </div>
            </div>

            <div in:fly={{ y: 18, duration: 500, delay: 100 }} class="rounded-3xl border border-border-subtle bg-surface-white p-4 sm:p-6 shadow-sm">
                <div class="rounded-2xl border border-border-subtle bg-surface-muted p-4 sm:p-6">
                    <div class="flex items-center gap-3">
                        <div class="rounded-full bg-gov-blue/10 p-2 text-gov-blue">
                            <FileCheck2 size={16} class="sm:size-[18]" />
                        </div>
                        <p class="text-sm font-semibold text-text-primary">What is CEDIMS?</p>
                    </div>
                    <p class="mt-3 sm:mt-4 text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">
                        The Calapan East District Instructional Monitoring System streamlines the submission, review, and compliance tracking of Daily Lesson Logs (DLLs), Instructional Supervision Plans (ISPs), and Instructional Supervision Reports (ISRs) across all schools in the district.
                    </p>
                    <div class="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-xs text-text-secondary">
                        <BadgeCheck size={12} class="shrink-0 text-gov-blue" />
                        Bulusan ES · Guinobatan ES · Ibaba ES · Salong ES · Suqui ES
                    </div>
                </div>
            </div>
        </section>

        <section id="about" class="border-y border-border-subtle bg-surface-white">
            <div class="mx-auto grid max-w-7xl gap-6 sm:gap-8 px-4 sm:px-6 py-12 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
                <div>
                    <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">About CEDIMS</p>
                    <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">A professional system for instructional monitoring and accountability.</h2>
                </div>
                <div class="grid gap-3 sm:gap-4 text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary sm:grid-cols-2">
                    <div class="rounded-2xl border border-border-subtle p-4 sm:p-5">
                        <p class="font-semibold text-text-primary">Mission</p>
                        <p class="mt-1.5 sm:mt-2">Support dependable instructional documentation and timely compliance monitoring across the district.</p>
                    </div>
                    <div class="rounded-2xl border border-border-subtle p-4 sm:p-5">
                        <p class="font-semibold text-text-primary">Vision</p>
                        <p class="mt-1.5 sm:mt-2">Create a transparent, data-informed environment for quality instructional supervision.</p>
                    </div>
                    <div class="rounded-2xl border border-border-subtle p-4 sm:p-5">
                        <p class="font-semibold text-text-primary">Objectives</p>
                        <p class="mt-1.5 sm:mt-2">Standardize submission workflows, simplify review, and improve visibility for school and district leaders.</p>
                    </div>
                    <div class="rounded-2xl border border-border-subtle p-4 sm:p-5">
                        <p class="font-semibold text-text-primary">Benefits</p>
                        <p class="mt-1.5 sm:mt-2">Less confusion, faster follow-up, and clearer records for every instructional document.</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
            <div class="max-w-2xl">
                <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">Core features</p>
                <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">A focused platform that keeps monitoring practical and manageable.</h2>
            </div>
            <div class="mt-6 sm:mt-8 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {#each features as feature}
                    <div class="rounded-2xl border border-border-subtle bg-surface-white p-5 sm:p-6 shadow-sm">
                        <div class="mb-3 sm:mb-4 inline-flex rounded-xl bg-gov-blue/10 p-2.5 sm:p-3 text-gov-blue">
                            <svelte:component this={feature.icon} size={18} />
                        </div>
                        <h3 class="font-semibold text-text-primary">{feature.title}</h3>
                        <p class="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">{feature.description}</p>
                    </div>
                {/each}
            </div>
        </section>

        <section class="border-y border-border-subtle bg-surface-white">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
                <div class="grid gap-6 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">Workflow</p>
                        <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">From submission to review in a simple path.</h2>
                    </div>
                    <div class="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                        {#each ["Teacher uploads DLL", "Master Teacher reviews & remarks", "Teacher revises if needed", "District compliance reports"] as step, index}
                            <div class="rounded-2xl border border-border-subtle bg-surface-muted p-3 sm:p-4 text-center">
                                <div class="mx-auto mb-2 sm:mb-3 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gov-blue text-xs sm:text-sm font-semibold text-white">{index + 1}</div>
                                <p class="text-xs sm:text-sm font-semibold text-text-primary">{step}</p>
                            </div>
                        {/each}
                    </div>
                    <div class="mt-4 sm:mt-6 rounded-2xl border border-dashed border-gov-blue/20 bg-gov-blue/5 p-3 sm:p-4 text-center text-xs sm:text-sm text-text-secondary">
                        Complete history maintained — nothing overwrites previous remarks
                    </div>
                </div>
            </div>
        </section>

        <section class="border-y border-border-subtle bg-surface-white">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
                <div class="grid gap-6 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">Verification</p>
                        <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">Authenticate documents in seconds.</h2>
                        <p class="mt-3 sm:mt-4 text-sm sm:text-base leading-7 sm:leading-8 text-text-secondary">
                            Every uploaded document receives a unique QR stamp. Scan it with any device to verify authenticity and review the audit trail.
                        </p>
                    </div>
                    <div class="grid gap-3 sm:gap-4 grid-cols-2">
                        <div class="rounded-2xl border border-border-subtle bg-surface-muted p-4 sm:p-5 text-center">
                            <div class="mx-auto mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gov-blue/10 text-gov-blue">
                                <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                            </div>
                            <p class="text-xs sm:text-sm font-semibold text-text-primary">QR Stamp on Export</p>
                            <p class="mt-1 text-[10px] sm:text-xs text-text-secondary">Each PDF export includes a scannable QR code</p>
                        </div>
                        <div class="rounded-2xl border border-border-subtle bg-surface-muted p-4 sm:p-5 text-center">
                            <div class="mx-auto mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gov-blue/10 text-gov-blue">
                                <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                            </div>
                            <p class="text-xs sm:text-sm font-semibold text-text-primary">Tamper Detection</p>
                            <p class="mt-1 text-[10px] sm:text-xs text-text-secondary">File hash verification ensures document integrity</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="mx-auto max-w-7xl px-4 sm:px-6 pb-12 sm:pb-16 lg:px-8">
            <div class="grid gap-6 sm:gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div class="rounded-3xl border border-border-subtle bg-surface-white p-6 sm:p-8 shadow-sm">
                    <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">FAQ</p>
                    <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">Common questions about CEDIMS.</h2>
                    <div class="mt-5 sm:mt-6 space-y-2 sm:space-y-3">
                        {#each faqs as item}
                            <details class="rounded-2xl border border-border-subtle p-3 sm:p-4">
                                <summary class="cursor-pointer text-sm sm:text-base font-semibold text-text-primary">{item.question}</summary>
                                <p class="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">{item.answer}</p>
                            </details>
                        {/each}
                    </div>
                </div>
                <div class="rounded-3xl border border-border-subtle bg-gov-blue p-6 sm:p-8 text-white shadow-sm">
                    <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-text-muted">Contact</p>
                    <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold">Calapan East District Office</h2>
                    <div class="mt-5 sm:mt-6 space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-100">
                        <div class="flex items-center gap-2 sm:gap-3"><Mail size={14} class="sm:size-[16]" /> support@cedims.gov.ph</div>
                        <div class="flex items-center gap-2 sm:gap-3"><Phone size={14} class="sm:size-[16]" /> (043) 288-1234</div>
                        <div class="flex items-center gap-2 sm:gap-3"><MapPin size={14} class="sm:size-[16]" /> Calapan City, Oriental Mindoro</div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="border-t border-border-subtle bg-surface-white">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 lg:px-8">
            <div class="grid gap-6 sm:gap-8 text-center sm:text-left sm:grid-cols-3">
                <div>
                    <div class="inline-flex sm:flex items-center gap-2">
                        <img src="/app_icon.png" alt="CEDIMS" class="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
                        <p class="text-sm font-semibold text-text-primary">CEDIMS</p>
                    </div>
                    <p class="mt-1.5 sm:mt-2 text-xs sm:text-sm text-text-secondary">Calapan East District Instructional Monitoring System</p>
                    <p class="mt-1 text-[10px] sm:text-xs text-text-muted">Version 2.0</p>
                </div>
                <div>
                    <p class="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">DepEd Calapan East District</p>
                    <div class="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-text-secondary">
                        <p>Calapan City, Oriental Mindoro</p>
                        <p>(043) 288-1234</p>
                        <p>support@cedims.gov.ph</p>
                    </div>
                </div>
                <div class="sm:text-right">
                    <p class="text-[10px] sm:text-xs text-text-muted">&copy; 2026 CEDIMS. All rights reserved.</p>
                    <p class="mt-1 text-[10px] sm:text-xs text-text-muted">Built for the Department of Education</p>
                </div>
            </div>
        </div>    </footer>
</div>
