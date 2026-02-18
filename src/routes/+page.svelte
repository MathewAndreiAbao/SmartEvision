<script lang="ts">
    const features = [
        {
            icon: "📱",
            title: "Progressive Web App",
            desc: "Install on any device. Works on Windows, Android, and iOS — no app store required.",
        },
        {
            icon: "🔐",
            title: "SHA-256 Integrity",
            desc: "Every document is fingerprinted with cryptographic hashing to ensure tamper-evident storage.",
        },
        {
            icon: "🔍",
            title: "Smart OCR",
            desc: "Auto-detects document type, week number, and school year from uploaded files.",
        },
        {
            icon: "📡",
            title: "Offline-First",
            desc: "Upload documents without internet. They auto-sync when connectivity is restored.",
        },
        {
            icon: "📎",
            title: "QR Verification",
            desc: "Every archived document gets a verification QR code — verifiable even when printed.",
        },
        {
            icon: "📊",
            title: "Compliance Tracking",
            desc: '"First Monday" submission monitoring across the district with real-time dashboards.',
        },
    ];

    const schools = [
        "Bulusan Elementary School",
        "Guinobatan Elementary School",
        "Ibaba Elementary School",
        "Salong Elementary School",
        "Suqui Elementary School",
    ];
</script>

<svelte:head>
    <title>Smart E-VISION — Digital Archiving for DepEd</title>
    <meta
        name="description"
        content="A Progressive Web App for Instructional Supervision Archiving in DepEd Calapan City, Calapan East District"
    />
</svelte:head>

<div class="min-h-screen gradient-mesh">
    <!-- Navigation Bar -->
    <nav
        class="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/30"
    >
        <div
            class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
        >
            <div class="flex items-center gap-3">
                <div
                    class="w-10 h-10 rounded-xl bg-gradient-to-br from-deped-blue to-deped-blue-dark flex items-center justify-center text-white text-lg font-bold shadow-md"
                >
                    E
                </div>
                <span class="text-lg font-bold text-text-primary"
                    >Smart E-VISION</span
                >
            </div>
            <a
                href="/auth/login"
                class="px-6 py-3 bg-gradient-to-r from-deped-blue to-deped-blue-dark text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[48px] flex items-center"
            >
                Sign In
            </a>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div class="animate-slide-up">
            <div
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-deped-blue/10 text-deped-blue text-sm font-semibold mb-8"
            >
                <span>🏫</span> DepEd Calapan City — Calapan East District
            </div>

            <h1
                class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary leading-tight mb-6"
            >
                Smart
                <span
                    class="bg-gradient-to-r from-deped-blue to-deped-blue-light bg-clip-text text-transparent"
                    >E-VISION</span
                >
            </h1>

            <p
                class="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-4 leading-relaxed"
            >
                A Progressive Web App for
                <strong class="text-text-primary"
                    >Instructional Supervision Archiving</strong
                >
            </p>

            <p class="text-base text-text-muted max-w-2xl mx-auto mb-10">
                Secure, offline-capable, and paperless digital archiving of
                Daily Lesson Logs, Instructional Supervisory Plans, and Reports
                — the foundation for Technical Assistance.
            </p>

            <div
                class="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
                <a
                    href="/auth/login"
                    class="px-8 py-4 bg-gradient-to-r from-deped-blue to-deped-blue-dark text-white text-lg font-bold rounded-2xl shadow-elevated hover:shadow-2xl hover:scale-105 transition-all duration-300 min-h-[56px] flex items-center gap-2"
                >
                    Get Started <span>→</span>
                </a>
                <a
                    href="#features"
                    class="px-8 py-4 bg-white/70 backdrop-blur-sm border border-white/40 text-text-primary text-lg font-semibold rounded-2xl shadow-card hover:shadow-card-hover hover:scale-105 transition-all duration-300 min-h-[56px] flex items-center gap-2"
                >
                    Learn More <span>↓</span>
                </a>
            </div>
        </div>
    </section>

    <!-- Features Grid -->
    <section id="features" class="max-w-7xl mx-auto px-6 py-20">
        <div class="text-center mb-14">
            <h2 class="text-3xl font-bold text-text-primary mb-3">
                Emerging Technologies
            </h2>
            <p class="text-lg text-text-secondary">
                Built with client-side innovation — zero server costs
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each features as feature, i}
                <div
                    class="glass-card p-7 group"
                    style="animation-delay: {i * 100}ms"
                >
                    <div
                        class="w-14 h-14 rounded-2xl bg-gradient-to-br from-deped-blue/10 to-deped-blue/5 flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform duration-300"
                    >
                        {feature.icon}
                    </div>
                    <h3 class="text-lg font-bold text-text-primary mb-2">
                        {feature.title}
                    </h3>
                    <p class="text-sm text-text-secondary leading-relaxed">
                        {feature.desc}
                    </p>
                </div>
            {/each}
        </div>
    </section>

    <!-- Pilot Schools -->
    <section class="max-w-7xl mx-auto px-6 py-20">
        <div class="glass-card-static p-10">
            <div class="text-center mb-10">
                <h2 class="text-3xl font-bold text-text-primary mb-3">
                    Pilot Schools
                </h2>
                <p class="text-lg text-text-secondary">
                    Calapan East District — 5 Elementary Schools
                </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {#each schools as school}
                    <div
                        class="flex items-center gap-3 px-5 py-4 rounded-xl bg-white/50 border border-white/30 hover:bg-white/80 transition-colors"
                    >
                        <span class="text-xl">🏫</span>
                        <span class="text-sm font-semibold text-text-primary"
                            >{school}</span
                        >
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-white/20 bg-white/40 backdrop-blur-sm">
        <div class="max-w-7xl mx-auto px-6 py-10 text-center">
            <div class="flex items-center justify-center gap-3 mb-4">
                <div
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-deped-blue to-deped-blue-dark flex items-center justify-center text-white text-sm font-bold"
                >
                    E
                </div>
                <span class="text-base font-bold text-text-primary"
                    >Smart E-VISION 2.0</span
                >
            </div>
            <p class="text-sm text-text-muted">
                © 2025 DepEd Calapan City Division — Calapan East District
            </p>
            <p class="text-xs text-text-muted mt-2">
                A Progressive Web Application for Instructional Supervision
                Archiving
            </p>
        </div>
    </footer>
</div>
