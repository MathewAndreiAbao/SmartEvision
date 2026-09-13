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

    // How the system maps onto SDG 4, stated against the actual UN target
    // numbers rather than as a general claim about education.
    const sdgTargets = [
        {
            target: "4.c",
            title: "Supply of qualified teachers",
            contribution:
                "Master Teachers and School Heads review lesson logs and leave remarks, so supervision becomes continuous coaching instead of an annual check.",
        },
        {
            target: "4.1",
            title: "Effective learning outcomes",
            contribution:
                "Tracking Daily Lesson Log completion against deadlines keeps lesson planning consistent across every class in the district.",
        },
        {
            target: "4.5",
            title: "Equal access",
            contribution:
                "Uploads work on low-bandwidth mobile connections and complete on their own once signal returns, so remote schools are monitored on the same footing.",
        },
        {
            target: "4.a",
            title: "Effective learning environments",
            contribution:
                "District-wide compliance data shows which schools need support, directing attention to where instruction needs strengthening.",
        },
    ];

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
            title: "Remarks & Checking",
            description:
                "Capture reviewer remarks and track the checking status of every submission in the archive.",
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
                "Receive real-time alerts for submissions, checking status, and compliance updates.",
            icon: BellRing,
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
    <title>CEDIMS — Calapan East District Instructional Monitoring System · Powered by Smart E-VISION</title>
</svelte:head>

<div class="min-h-dvh bg-surface-muted text-text-primary">
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
                    <button onclick={() => goto("/dashboard")} class="gov-btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5">Dashboard</button>
                {:else}
                    <button onclick={() => goto("/auth/login")} class="gov-btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 inline-flex items-center gap-2">
                        <LogIn size={14} class="sm:size-[16]" />
                        <span>Sign in</span>
                    </button>
                {/if}
            {/if}
        </div>
    </header>

    <main>
        <!-- Hero Section -->
        <section class="border-b border-border-subtle bg-surface-white">
            <div class="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 py-12 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:items-center">
                <div in:fly={{ x: -24, duration: 500 }}>
                    <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">Calapan East District</p>
                    <h1 class="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary">Instructional Monitoring Made Simple</h1>
                    <p class="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg leading-8 sm:leading-8 text-text-secondary">
                        CEDIMS streamlines the submission, checking, and compliance tracking of Daily Lesson Logs across all schools in the district.
                    </p>
                    <div class="mt-6 sm:mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-text-secondary">
                        <span class="inline-flex items-center gap-1.5"><BookOpen size={14} class="sm:size-[16]" /> Guided workflow</span>
                        <span class="inline-flex items-center gap-1.5"><BellRing size={14} class="sm:size-[16]" /> Real-time alerts</span>
                        <span class="inline-flex items-center gap-1.5"><ShieldCheck size={14} class="sm:size-[16]" /> Secure records</span>
                    </div>
                </div>

                <div in:fly={{ y: 18, duration: 500, delay: 100 }} class="rounded-3xl border border-border-subtle bg-surface-muted p-6 sm:p-8 shadow-sm">
                    <div class="rounded-2xl border border-border-subtle bg-surface-white p-4 sm:p-6">
                        <div class="flex items-center gap-3">
                            <div class="rounded-full bg-gov-blue/10 p-2 text-gov-blue">
                                <FileCheck2 size={16} class="sm:size-[18]" />
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-text-primary">What is CEDIMS?</p>
                                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">Quality Education Tracking</p>
                            </div>
                        </div>
                        <p class="mt-3 sm:mt-4 text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">
                            Track submissions, monitor compliance, verify documents, and maintain a complete audit trail—all in one place.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Core Features -->
        <section class="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
            <div class="max-w-2xl mb-8 sm:mb-12">
                <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">What You Get</p>
                <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">Six core features for instructional monitoring.</h2>
            </div>
            <div class="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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

        <!-- SDG 4 - Prominent -->
        <section id="sdg" class="border-y border-border-subtle bg-surface-white">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 lg:px-8">
                <div class="text-center mb-12 sm:mb-16">
                    <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">Sustainable Development Goal 4</p>
                    <h2 class="mt-2 sm:mt-3 text-2xl sm:text-4xl font-bold text-text-primary">Supporting Quality Education</h2>
                    <p class="mt-3 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base leading-7 text-text-secondary">
                        CEDIMS directly contributes to the UN Sustainable Development Goal 4 by ensuring consistent, equitable quality education monitoring across the district.
                    </p>
                </div>

                <!-- Large SDG Icon -->
                <div class="flex justify-center mb-12 sm:mb-16">
                    <img
                        src="/sdg-4-quality-education.svg"
                        alt="United Nations Sustainable Development Goal 4: Quality Education"
                        width="280"
                        height="280"
                        loading="lazy"
                        class="h-56 w-56 sm:h-80 sm:w-80 md:h-96 md:w-96 rounded-2xl shadow-lg"
                    />
                </div>

                <!-- SDG Targets Grid -->
                <div class="grid gap-4 sm:gap-5 sm:grid-cols-2">
                    {#each sdgTargets as item}
                        <div class="rounded-2xl border border-border-subtle bg-surface-muted p-4 sm:p-6">
                            <p class="text-xs font-bold uppercase tracking-[0.15em] text-gov-red">Target {item.target}</p>
                            <p class="mt-2 sm:mt-3 text-base font-semibold text-text-primary">{item.title}</p>
                            <p class="mt-2 sm:mt-3 text-xs sm:text-sm leading-6 text-text-secondary">{item.contribution}</p>
                        </div>
                    {/each}
                </div>
            </div>
        </section>

        <!-- How It Works -->
        <section class="border-b border-border-subtle bg-surface-white">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
                <div class="max-w-2xl mb-8 sm:mb-12">
                    <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">Simple Workflow</p>
                    <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">From upload to compliance in four steps.</h2>
                </div>
                <div class="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                    {#each ["Teacher uploads DLL", "Supervisor remarks & checks", "Teacher revises if needed", "District reports compliance"] as step, index}
                        <div class="rounded-2xl border border-border-subtle bg-surface-muted p-3 sm:p-4 text-center">
                            <div class="mx-auto mb-2 sm:mb-3 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gov-blue text-xs sm:text-sm font-semibold text-white">{index + 1}</div>
                            <p class="text-xs sm:text-sm font-semibold text-text-primary">{step}</p>
                        </div>
                    {/each}
                </div>
                <div class="mt-6 sm:mt-8 rounded-2xl border border-dashed border-gov-blue/20 bg-gov-blue/5 p-3 sm:p-4 text-center text-xs sm:text-sm text-text-secondary">
                    ✓ Complete history maintained—nothing overwrites previous remarks
                </div>
            </div>
        </section>

        <!-- Document Verification -->
        <section class="border-b border-border-subtle bg-surface-white">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
                <div class="max-w-2xl mb-8 sm:mb-12">
                    <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-gov-blue">Security</p>
                    <h2 class="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-text-primary">Authenticate in seconds with QR stamps.</h2>
                    <p class="mt-3 sm:mt-4 text-sm sm:text-base leading-7 text-text-secondary">
                        Every uploaded document receives a unique QR code. Scan it with any device to verify authenticity and review the audit trail.
                    </p>
                </div>
                <div class="grid gap-4 sm:gap-5 sm:grid-cols-2">
                    <div class="rounded-2xl border border-border-subtle bg-surface-muted p-4 sm:p-5 text-center">
                        <div class="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gov-blue/10 text-gov-blue">
                            <svg class="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                        </div>
                        <p class="text-sm font-semibold text-text-primary">QR Stamp on Export</p>
                        <p class="mt-1.5 text-xs text-text-secondary">Each PDF includes a scannable QR code</p>
                    </div>
                    <div class="rounded-2xl border border-border-subtle bg-surface-muted p-4 sm:p-5 text-center">
                        <div class="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gov-blue/10 text-gov-blue">
                            <svg class="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        </div>
                        <p class="text-sm font-semibold text-text-primary">Tamper Detection</p>
                        <p class="mt-1.5 text-xs text-text-secondary">File hash verification ensures integrity</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Contact CTA -->
        <section class="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
            <div class="rounded-3xl border border-border-subtle bg-gov-blue p-6 sm:p-8 md:p-10 text-white text-center">
                <h2 class="text-2xl sm:text-3xl font-bold">Questions?</h2>
                <p class="mt-2 sm:mt-3 text-sm sm:text-base text-slate-100">Contact the Calapan East District Office</p>
                <div class="mt-6 sm:mt-8 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-100">
                    <div class="flex items-center justify-center gap-2 sm:gap-3"><Mail size={14} class="sm:size-[16]" /> support@cedims.gov.ph</div>
                    <div class="flex items-center justify-center gap-2 sm:gap-3"><Phone size={14} class="sm:size-[16]" /> (043) 288-1234</div>
                    <div class="flex items-center justify-center gap-2 sm:gap-3"><MapPin size={14} class="sm:size-[16]" /> Calapan City, Oriental Mindoro</div>
                </div>
            </div>
        </section>
    </main>

    <footer class="border-t border-border-subtle bg-surface-white">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 lg:px-8">
            <div class="grid gap-6 sm:gap-8 text-center sm:text-left sm:grid-cols-2">
                <div>
                    <div class="inline-flex sm:flex items-center gap-2">
                        <img src="/app_icon.png" alt="CEDIMS" class="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
                        <p class="text-sm font-semibold text-text-primary">CEDIMS</p>
                    </div>
                    <p class="mt-1.5 sm:mt-2 text-xs sm:text-sm text-text-secondary">Calapan East District Instructional Monitoring System</p>
                    <p class="mt-1 text-[10px] sm:text-xs text-text-muted">Powered by Smart E-VISION</p>
                </div>
                <div class="sm:text-right">
                    <p class="text-[10px] sm:text-xs text-text-muted">&copy; 2026 CEDIMS. All rights reserved.</p>
                    <p class="mt-1 text-[10px] sm:text-xs text-text-muted">Built for the Department of Education</p>
                </div>
            </div>
        </div>
    </footer>
</div>
