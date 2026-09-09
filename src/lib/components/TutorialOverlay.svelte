<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { hasSeenTutorial, markTutorialSeen, tutorialReplayRequested } from "$lib/stores/tutorial";
    import { fade, scale } from "svelte/transition";
    import { focusTrap } from "$lib/actions/focusTrap";
    import {
        BadgeCheck,
        CloudUpload,
        ShieldCheck,
        Archive,
        Map,
        TrendingUp,
        X,
    } from "lucide-svelte";

    interface Step {
        icon: any;
        title: string;
        description: string;
    }

    const stepsByRole: Record<string, Step[]> = {
        Teacher: [
            {
                icon: CloudUpload,
                title: "Upload your DLLs",
                description:
                    "Use the Upload tab to submit your Daily Lesson Logs. Smart detection will pre-fill your teaching load and week automatically.",
            },
            {
                icon: Archive,
                title: "Track your files",
                description:
                    "My Files shows every submission you've made, its checking status, and any remarks from your supervisor.",
            },
        ],
        "Master Teacher": [
            {
                icon: CloudUpload,
                title: "Upload DLL, ISP & ISR",
                description:
                    "You can submit your own Daily Lesson Logs as well as Individual School Plans and Reports.",
            },
            {
                icon: ShieldCheck,
                title: "Monitor your school",
                description:
                    "The School tab shows compliance trends and lets you review teacher submissions.",
            },
        ],
        "School Head": [
            {
                icon: CloudUpload,
                title: "Upload ISP & ISR",
                description: "Submit your Individual School Plans and Reports here.",
            },
            {
                icon: ShieldCheck,
                title: "Oversee your staff",
                description:
                    "The Staff tab tracks compliance across your school and lets you add remarks on submissions.",
            },
        ],
        "District Supervisor": [
            {
                icon: Map,
                title: "Monitor every school",
                description:
                    "The Schools tab gives you a district-wide compliance view across all schools.",
            },
            {
                icon: TrendingUp,
                title: "Catch issues early",
                description:
                    "Alerts surfaces schools and teachers falling behind so you can follow up quickly.",
            },
        ],
    };

    let visible = $state(false);
    let stepIndex = $state(0);
    let steps = $state<Step[]>([]);
    let checkedUserId: string | null = null;

    function buildSteps(p: NonNullable<typeof $profile>): Step[] {
        return [
            {
                icon: BadgeCheck,
                title: `Welcome, ${p.full_name?.split(" ")[0] || "there"}!`,
                description:
                    "Here's a quick look at what you can do in CEDIMS as a " + p.role + ".",
            },
            ...(stepsByRole[p.role] || []),
        ];
    }

    $effect(() => {
        const p = $profile;
        if (p && checkedUserId !== p.id) {
            checkedUserId = p.id;
            if (!hasSeenTutorial(p.id)) {
                steps = buildSteps(p);
                stepIndex = 0;
                visible = true;
            }
        }
    });

    // Manual replay trigger (Settings > "Replay Tutorial"), independent of
    // the once-per-user guard above since this layout stays mounted across navigation.
    $effect(() => {
        if ($tutorialReplayRequested && $profile) {
            steps = buildSteps($profile);
            stepIndex = 0;
            visible = true;
            tutorialReplayRequested.set(false);
        }
    });

    function next() {
        if (stepIndex < steps.length - 1) {
            stepIndex++;
        } else {
            finish();
        }
    }

    function finish() {
        visible = false;
        if ($profile) markTutorialSeen($profile.id);
    }
</script>

{#if visible && steps.length > 0}
    {@const step = steps[stepIndex]}
    {@const StepIcon = step.icon}
    <div
        class="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        transition:fade={{ duration: 150 }}
        role="presentation"
    >
        <div
            class="w-full max-w-sm bg-surface-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome tour"
            tabindex="-1"
            use:focusTrap
            transition:scale={{ start: 0.96, duration: 180 }}
        >
            <div class="relative px-6 pt-8 pb-6 text-center">
                <button
                    onclick={finish}
                    class="absolute top-4 right-4 p-1.5 rounded-full text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
                    aria-label="Skip tutorial"
                >
                    <X size={18} />
                </button>
                <div class="mx-auto w-16 h-16 rounded-full bg-gov-blue/10 flex items-center justify-center mb-4">
                    <StepIcon size={30} class="text-gov-blue" strokeWidth={2} />
                </div>
                <h2 class="text-xl font-bold text-text-primary">{step.title}</h2>
                <p class="text-sm text-text-secondary mt-2 leading-relaxed">{step.description}</p>
            </div>

            <div class="px-6 pb-6">
                <div class="flex items-center justify-center gap-1.5 mb-4">
                    {#each steps as _, i}
                        <span
                            class="h-1.5 rounded-full transition-all {i === stepIndex
                                ? 'w-6 bg-gov-blue'
                                : 'w-1.5 bg-border-strong'}"
                        ></span>
                    {/each}
                </div>
                <div class="flex gap-3">
                    {#if stepIndex < steps.length - 1}
                        <button
                            onclick={finish}
                            class="flex-1 py-3 rounded-xl border border-border-strong text-text-primary text-sm font-bold hover:bg-surface-muted transition-colors"
                        >
                            Skip
                        </button>
                    {/if}
                    <button
                        onclick={next}
                        class="flex-1 py-3 rounded-xl bg-gov-blue text-white text-sm font-bold hover:bg-gov-blue-dark transition-colors"
                    >
                        {stepIndex < steps.length - 1 ? "Next" : "Get Started"}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
